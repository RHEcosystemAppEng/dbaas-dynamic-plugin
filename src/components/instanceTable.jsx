import React from 'react';
import _ from 'lodash';
import {
    Table,
    TableHeader,
    TableBody,
    RowSelectVariant,
    wrappable
} from '@patternfly/react-table';
import {
    Title,
    EmptyState,
    EmptyStateIcon,
    Spinner,
    Button,
    Alert,
    AlertActionCloseButton
} from '@patternfly/react-core';
class InstanceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentNS: window.location.pathname.split('/')[3],
            columns: [
                { title: 'ID', transforms: [wrappable] },
                { title: 'Instance', transforms: [wrappable] },
                { title: 'Provider', transforms: [wrappable] },
            ],
            rows: [],
            selectedInstance: {},
            alert: {
                isActive: false,
                msg: "",
                type: ""
            },
            inventoryName: props.data.name ? props.data.name : ""
        };
        this.onSelect = this.onSelect.bind(this);
        this.getRows = this.getRows.bind(this);
        this.submitInstances = this.submitInstances.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.closeAlert = this.closeAlert.bind(this);

    }

    componentDidUpdate(prevProps) {
        if (this.props.data.instances && this.props.data.instances.length > 0 && !_.isEqual(prevProps.data.instances, this.props.data.instances)) {
            this.getRows(this.props.data.instances);
        }
    }

    componentDidMount() {
        this.getRows(this.props.data.instances);
    }

    getRows(data) {
        let rowList = [];
        if (data) {
            _.forEach(data, rowData => {
                rowList.push({ cells: [rowData.instanceID, rowData.name, rowData.provider] })
            })
        };

        this.setState({ rows: rowList });
    };

    onSelect(event, isSelected, rowId) {
        let rows = this.state.rows.map((oneRow, index) => {
            oneRow.selected = rowId === index;
            return oneRow;
        });
        this.setState({
            selectedInstance: this.props.data.instances[rowId],
            rows: rows
        });
    }

    submitInstances() {

        let newBody = {
            apiVersion: "dbaas.redhat.com/v1alpha1",
            kind: "DBaaSConnection",
            metadata: {
                name: this.state.selectedInstance.name,
                namespace: this.state.currentNS,
            },
            spec: {
                inventoryRef: {
                    name: this.state.inventoryName,
                    namespace: this.state.currentNS,
                },
                instanceId: this.state.selectedInstance.instanceID
            }
        };

        let requestOpts = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(newBody),
        };
        fetch(
            '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + this.state.currentNS + '/dbaasconnections',
            requestOpts
        )
            .then((response) => response.json())
            .then((data) => this.setState({
                postResponse: data,
                alert: {
                    isActive: true,
                    msg: "Instance has been successfully connected",
                    type: "success"
                }
            }))
            .catch(err => {
                this.setState({
                    alert: {
                        isActive: true,
                        msg: err.message,
                        type: "error"
                    }
                })
            })
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        this.submitInstances();
    };

    closeAlert() {
        this.setState({ alert: { isActive: false } })
    }

    render() {
        const { columns, rows, alert } = this.state;
        const { isSelectable, isLoading } = this.props;

        if (isLoading) {
            return (
                <EmptyState>
                    <EmptyStateIcon variant="container" component={Spinner} />
                    <Title size="lg" headingLevel="h3">
                        Fetching instances from Atlas...
                    </Title>
                </EmptyState>
            )
        }

        return (
            <React.Fragment>
                {this.state.alert.isActive ? (<Alert variant={alert.type} title={alert.msg} actionClose={<AlertActionCloseButton onClose={this.closeAlert} />} />) : null}
                <Table
                    onSelect={isSelectable ? this.onSelect : null}
                    selectVariant={isSelectable ? RowSelectVariant.radio : null}
                    aria-label="Instance Table"
                    cells={columns}
                    rows={rows}
                >
                    <TableHeader />
                    <TableBody />
                </Table>
                <br />
                <br />
                {isSelectable ?
                    <div className={isLoading ? "hide" : null}>
                        <Button id="instance-select-button" variant="primary" onClick={this.handleSubmit} isDisabled={_.isEmpty(this.state.selectedInstance)}>
                            Connect
                        </Button>
                    </div>
                    :
                    null}
            </React.Fragment>
        );
    }
}

export default InstanceTable;