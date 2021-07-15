import React from "react";
import * as _ from 'lodash';
import InstanceTable from "./instanceTable";
import {
    Tabs,
    Tab,
    TabTitleText,
    Title,
    EmptyState,
    EmptyStateIcon,
    Spinner
} from '@patternfly/react-core';
import TimesCircleIcon from '@patternfly/react-icons/dist/js/icons/times-circle-icon';
class InstancesForm extends React.Component {
    constructor(props) {
        super(props);
        this.fetchInventoryTimerID = 0;
        this.state = {
            currentNS: window.location.pathname.split('/')[3],
            showResults: false,
            inventory: { instances: [] },
            hasInstanceUpdated: false,
            activeTabKey: 0,
            noInstances: false,
            fetchInstancesFailed: false,
            statusMsg: ''
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.dbaaSServiceStatus !== prevProps.dbaaSServiceStatus && this.state.inventory.instances.length == 0 && !this.state.hasInstanceUpdated) {
            this.fetchInventoryTimerID = setInterval(() => {
                this.fetchInventory();
            }, 3000);
        }
    }

    componentWillUnmount() {
        clearInterval(this.fetchInventoryTimerID);
    }

    fetchInventory = () => {
        let requestOpts = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        };
        const { currentCreatedInventoryInfo } = this.props;

        fetch(
            '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + this.state.currentNS + '/dbaasinventories/' + currentCreatedInventoryInfo?.metadata?.name,
            requestOpts
        )
            .then((response) => response.json())
            .then((data) => this.parsePayload(data));
    };

    parsePayload = (responseJson) => {
        let { selectedDBProvider } = this.props;

        if (responseJson?.status?.conditions[0]?.type === "SpecSynced") {
            if (responseJson?.status?.conditions[0]?.status === "False") {
                this.setState({
                    fetchInstancesFailed: true,
                    statusMsg: responseJson?.status?.conditions[0]?.message,
                    showResults: true
                })
            }
            if (responseJson?.status?.conditions[0]?.status === "True") {
                if (_.isEmpty(responseJson?.status?.instances)) {
                    this.setState({
                        noInstances: true,
                        statusMsg: "No DB Instance in this inventory",
                        showResults: true
                    })
                } else {
                    responseJson?.status?.instances.map(instance => {
                        instance.provider = responseJson?.spec?.provider?.name
                    })
                    this.setState({
                        inventory: { instances: responseJson?.status?.instances },
                        hasInstanceUpdated: true,
                        showResults: true
                    });
                }
            }

        } else {
            setTimeout(() => { console.error("Could not connect with DB provider") }, 30000);
        }
    }

    handleTabClick = (event, tabIndex) => {
        event.preventDefault();
        this.setState({
            activeTabKey: tabIndex
        });
    };


    render() {
        const { showResults, inventory, activeTabKey, fetchInstancesFailed, noInstances, statusMsg } = this.state;

        if (!showResults) {
            return (
                <EmptyState>
                    <EmptyStateIcon variant="container" component={Spinner} />
                    <Title size="lg" headingLevel="h3">
                        Fetching inventory...
                    </Title>
                </EmptyState>
            )
        }

        if (showResults && fetchInstancesFailed || noInstances) {
            return (
                <EmptyState>
                    <EmptyStateIcon variant="container" component={TimesCircleIcon} />
                    <Title size="lg" headingLevel="h3">
                        {statusMsg}
                    </Title>
                </EmptyState>
            )
        }

        return (
            <form id="instances-form">
                <div className="instance-table">
                    <InstanceTable isLoading={!showResults} data={inventory} isSelectable={false} />
                </div>
            </form>
        );
    }
}

export default InstancesForm;