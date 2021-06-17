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
import { getActiveNamespace } from '@console/internal/actions/ui';

class InstanceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            columns: [
                { title: 'Instance' },
                { title: 'Size', transforms: [wrappable] },
                { title: 'Provider', transforms: [wrappable] },
                { title: 'Region', transforms: [wrappable] },
                { title: 'ID' }
            ],
            rows: [],
            selectedInstance: {},
            alert: {
                isActive: false,
                msg: "",
                type: ""
            },
            currentNS: getActiveNamespace()
        };
        this.onSelect = this.onSelect.bind(this);
        this.getRows = this.getRows.bind(this);
        this.submitInstances = this.submitInstances.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.closeAlert = this.closeAlert.bind(this);

    }

    componentDidUpdate(prevProps) {
        if (this.props.data && this.props.data.length > 0 && !_.isEqual(prevProps.data, this.props.data)) {
            this.getRows(this.props.data);
        }
    }

    getRows(data) {
        let rowList = [];
        if (data) {
            _.forEach(data, rowData => {
                rowList.push({ cells: [rowData.name, rowData.instanceSizeName, rowData.providerName, rowData.regionName, rowData.id] })
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
            selectedInstance: this.props.data[rowId],
            rows: rows
        });
    }

    submitInstances() {
        let patch = [
            {
                "op": "add",
                "path": "/spec/selectedForImport",
                "value": [this.state.selectedInstance.id]
            }
        ]
        let requestOpts = {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            },
            body: JSON.stringify(patch),
        };
        fetch(
            '/api/kubernetes/apis/dbaas.redhat.com/v1/namespaces/' + this.state.currentNS + '/dbaasservices/atlas-dbaas-service',
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
            <div>
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
            </div>
        );
    }
}

export default InstanceTable;