import React from "react";
import * as _ from 'lodash';
import {MONGODB_PROVIDER_NAME} from '../const';

class CredentialsForm extends React.Component {
    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.state = {
            currentNS: window.location.pathname.split('/')[3],
            orgId: "",
            orgPublicKey: "",
            orgPrivateKey: "",
            postResponse: "",
        };
    }

    handleSubmit = async (event) => {
        event.preventDefault();

        let secretName = "dbaas-vendor-credentials-" + Date.now();
        let inventoryName = "dbaas-inventory-" + Date.now();

        let newSecret = {
            apiVersion: "v1",
            kind: "Secret",
            metadata: {
                name: secretName,
                namespace: this.state.currentNS,
                labels: {
                    "related-to": "dbaas-operator",
                    type: "dbaas-vendor-credentials",
                },
            },
            stringData: {
                orgId: this.state.orgId.toString("base64"),
                publicApiKey: this.state.orgPublicKey.toString("base64"),
                privateApiKey: this.state.orgPrivateKey.toString("base64"),
            },
            type: "Opaque",
        };

        let postSecretRequestOpts = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(newSecret),
        };

        fetch(
            "api/kubernetes/api/v1/namespaces/" + this.state.currentNS + "/secrets",
            postSecretRequestOpts
        )
            .then((response) => response.json())
            .then((data) => {
                this.setState({ postResponse: data });

            })
            .catch((err) => {
                if (err?.response?.status == 404) {
                    console.warn(err);
                } else {
                    console.warn(err);
                }
            });

        let requestOpts = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                apiVersion: "dbaas.redhat.com/v1alpha1",
                kind: "DBaaSInventory",
                metadata: {
                    name: inventoryName,
                    namespace: this.state.currentNS,
                    labels: {
                        "related-to": "dbaas-operator",
                        type: "dbaas-vendor-service",
                    },
                },
                spec: {
                    provider: {
                        name: MONGODB_PROVIDER_NAME
                    },
                    credentialsRef: {
                        name: secretName,
                        namespace: this.state.currentNS,
                    }
                },
            }),
        };
        fetch(
            '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + this.state.currentNS + '/dbaasinventories',
            requestOpts
        )
            .then((response) => response.json())
            .then((data) => {
                this.setState({ postResponse: data})

                let patchPayload = [
                    {
                        "op": "add",
                        "path": "/metadata/ownerReferences",
                        "value": [
                            {
                                "apiVersion": "dbaas.redhat.com/v1alpha1",
                                "kind": "DBaaSInventory",
                                "name": inventoryName,
                                "uid": this.state.postResponse.metadata.uid,
                                "controller": true,
                                "blockOwnerDeletion": false,
                            }
                        ]
                    }
                ];

                let patchSecretRequestOpts = {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json-patch+json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(patchPayload),
                };

                fetch(
                    "api/kubernetes/api/v1/namespaces/" + this.state.currentNS + "/secrets/" + secretName,
                    patchSecretRequestOpts
                )
                    .then((response) => response.json())
                    .then((data) => {
                        this.setState({ postResponse: data });

                    })
                    .catch((err) => {
                        if (err?.response?.status == 404) {
                            console.warn(err);
                        } else {
                            console.warn(err);
                        }
                    });
            })

        this.props.setDBaaSServiceStatus();
        this.props.setActiveTab(2)
    };

    render() {
        return (
            <form
                id="credentials-form"
                onSubmit={this.handleSubmit}
            >
                <div className="radio-div">
                    <label className="text-field-label" htmlFor="orgId">
                        Organization ID
            </label>
                    <br />
                    <input
                        id="orgId"
                        className="text-field"
                        value={this.state.orgId}
                        name="orgId"
                        onChange={(event) => this.setState({ orgId: event.target.value })}
                    />
                    <br />
                    <label className="text-field-label" htmlFor="orgPublicKey">
                        Organization Public Key
            </label>
                    <br />
                    <input
                        id="orgPublicKey"
                        className="text-field"
                        value={this.state.orgPublicKey}
                        name="orgPublicKey"
                        onChange={(event) =>
                            this.setState({ orgPublicKey: event.target.value })
                        }
                    />
                    <br />
                    <label className="text-field-label" htmlFor="orgPrivateKey">
                        Organization Private Key
            </label>
                    <br />
                    <input
                        id="orgPrivateKey"
                        className="text-field"
                        value={this.state.orgPrivateKey}
                        name="orgPrivateKey"
                        onChange={(event) =>
                            this.setState({ orgPrivateKey: event.target.value })
                        }
                    />
                    <br />
                    <button id="credential-select-button" className="select-button">
                        Submit
            </button>
                </div>
            </form>
        );
    }
}

export default CredentialsForm;