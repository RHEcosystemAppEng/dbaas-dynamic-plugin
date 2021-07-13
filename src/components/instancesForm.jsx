import React from "react";
import * as _ from 'lodash';
import InstanceTable from "./instanceTable";
import { currentNS } from '../const';
import {
    Tabs,
    Tab,
    TabTitleText,
    Title,
    EmptyState,
    EmptyStateIcon,
    Spinner
} from '@patternfly/react-core';
class InstancesForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showResults: false,
            inventories: [],
            hasInstanceUpdated: false,
            activeTabKey: 0
        };
    }

    componentDidUpdate() {
        if (this.props.dbaaSServiceStatus && this.state.inventories.length == 0 && !this.state.hasInstanceUpdated) {
            setInterval(() => {
                this.fetchInventories();
            }, 3000)
        }
    }

    fetchInventories = () => {
        var requestOpts = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        };
        fetch(
            '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + currentNS + '/dbaasinventories?limit=250',
            requestOpts
        )
            .then((response) => response.json())
            .then((data) => this.parsePayload(data));
    };

    parsePayload = (responseJson) => {
        let inventories = [];
        let { selectedDBProvider } = this.props;

        if (responseJson.items) {
            let filteredInventories = _.filter(responseJson.items, inventory => {
                return inventory.spec?.provider?.name === selectedDBProvider && inventory.status?.conditions[0]?.status !== "False"
            })
            filteredInventories?.forEach((inventory, index) => {
                let obj = { id: 0, name: "", instances: [] };
                obj.id = index;
                obj.name = inventory.metadata.name;
                inventory.status?.instances?.map((instance) => {
                    return instance.provider = inventory.spec?.provider?.name;
                })
                obj.instances = inventory.status?.instances;
                inventories.push(obj);
            });
            this.setState({
                inventories: inventories,
                hasInstanceUpdated: true,
                showResults: true
            });
        }
    }

    handleTabClick = (event, tabIndex) => {
        event.preventDefault();
        this.setState({
            activeTabKey: tabIndex
        });
    };


    render() {
        const { showResults, inventories, activeTabKey } = this.state;

        if (!showResults) {
            return (
                <EmptyState>
                    <EmptyStateIcon variant="container" component={Spinner} />
                    <Title size="lg" headingLevel="h3">
                        Fetching inventories...
                    </Title>
                </EmptyState>
            )
        }

        return (
            <Tabs activeKey={activeTabKey} onSelect={this.handleTabClick} isBox className="inventory-tabs">
                {inventories.map((inventory) => {
                    return (
                        <Tab eventKey={inventory?.id} title={<TabTitleText>{inventory?.name}</TabTitleText>}>
                            <form id="instances-form">
                                <div className="instance-table">
                                    <InstanceTable isLoading={!showResults} data={inventory} isSelectable={false} />
                                </div>
                            </form>
                        </Tab>
                    )
                })}
            </Tabs>
        );
    }
}

export default InstancesForm;