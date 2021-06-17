import React from "react";
import InstanceTable from "./instanceTable";
import { getActiveNamespace } from '@console/internal/actions/ui';

class InstancesForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showResults: false,
            instances: [],
            hasInstanceUpdated: false,
            currentNS: getActiveNamespace()
        };
        // eslint-disable-next-line
        this.fetchInstances = this.fetchInstances.bind(this);
        // eslint-disable-next-line
        this.parsePayload = this.parsePayload.bind(this);
    }

    componentDidUpdate() {
        if (this.props.dbaaSServiceStatus && this.state.instances.length == 0 && !this.state.hasInstanceUpdated) {
            setInterval(() => {
                this.fetchInstances();
            }, 3000)
        }
    }

    fetchInstances() {
        var requestOpts = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        };
        fetch(
            '/api/kubernetes/apis/dbaas.redhat.com/v1/namespaces/' + this.state.currentNS + '/dbaasservices/atlas-dbaas-service',
            requestOpts
        )
            .then((response) => response.json())
            .then((data) => this.parsePayload(data));
    };

    parsePayload(responseJson) {
        let instances = [];

        if (responseJson.status) {
            responseJson?.status?.projects?.forEach(function (value) {
                value?.clusters?.forEach(function (value) {
                    instances.push(value);
                });

            });
            this.setState({
                instances: instances,
                hasInstanceUpdated: true,
                showResults: true
            });
        }
    }


    render() {
        return (
            <form id="instances-form">
                <div className="instance-table">
                    <InstanceTable isLoading={!this.state.showResults} data={this.state.instances} isSelectable={false} />
                </div>
            </form>
        );
    }
}

export default InstancesForm;