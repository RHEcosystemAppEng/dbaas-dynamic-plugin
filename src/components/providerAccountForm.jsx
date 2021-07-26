import React from "react";
import * as _ from 'lodash';
import { Button, Alert, Form, FormGroup, TextInput, ActionGroup, FormSelect, FormSelectOption, FormSelectOptionGroup } from '@patternfly/react-core';
import { MONGODB_PROVIDER_NAME, CRUNCHY_PROVIDER_NAME } from "../const";

class ProviderAccountForm extends React.Component {
    constructor(props) {
        super(props);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.state = {
            currentNS: window.location.pathname.split('/')[3],
            inventoryName: 'my-db-provider-account',
            selectedDBProvider: '',
            dbProviderOptions: [
                { value: '', label: 'Select provider' },
                { value: MONGODB_PROVIDER_NAME, label: 'MongoDB Atlas' },
                { value: CRUNCHY_PROVIDER_NAME, label: 'Crunchy Bridge' },
            ],
            orgId: "",
            orgPublicKey: "",
            orgPrivateKey: "",
            postResponse: "",
            showError: false,
            error: {}
        };
    }

    handleCancel = () => {
        window.history.back();
    };

    handleSubmit = async (event) => {
        event.preventDefault();

        let secretName = "dbaas-vendor-credentials-" + Date.now();
        const { selectedDBProvider, inventoryName } = this.state;

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
                        name: selectedDBProvider
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
                if (data.status === "Failure") {
                    this.setState({ showError: true, error: data })
                } else {
                    this.props.setCurrentCreatedInventoryInfo(data);
                    let patchPayload = [
                        {
                            "op": "add",
                            "path": "/metadata/ownerReferences",
                            "value": [
                                {
                                    "apiVersion": "dbaas.redhat.com/v1alpha1",
                                    "kind": "DBaaSInventory",
                                    "name": inventoryName,
                                    "uid": data.metadata.uid,
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
                            if (data.status === "Failure") {
                                this.setState({ showError: true, error: data });
                            } else {
                                this.props.setDBaaSServiceStatus();
                            }
                        })
                        .catch((err) => {
                            if (err?.response?.status == 404) {
                                console.warn(err);
                            } else {
                                console.warn(err);
                            }
                        });
                }
            })
    };

    render() {
        const { selectedDBProvider, showError, error, inventoryName, dbProviderOptions } = this.state;

        return (
            <Form id="provider-account-form" isWidthLimited onSubmit={this.handleSubmit} >
                <FormGroup label="Name" fieldId="inventory-name" isRequired>
                    <TextInput
                        isRequired
                        type="text"
                        id="inventory-name"
                        name="inventory-name"
                        value={inventoryName}
                        onChange={value => this.setState({ inventoryName: value })}
                    />
                </FormGroup>
                <FormGroup label="Database provider" fieldId="db-provider">
                    <FormSelect value={selectedDBProvider} onChange={value => { this.setState({ selectedDBProvider: value }) }} aria-label="Database Provider">
                        {dbProviderOptions.map((option, index) => (
                            <FormSelectOption key={index} value={option.value} label={option.label} />
                        ))}
                    </FormSelect>
                </FormGroup>
                {selectedDBProvider
                    ?
                    <React.Fragment>
                        <div className="section-subtitle extra-top-margin no-botton-padding" >Account Credentials</div>
                        <FormGroup label="Organization ID" fieldId="organization-id" isRequired>
                            <TextInput
                                isRequired
                                type="text"
                                id="organization-id"
                                name="organization-id"
                                value={this.state.orgId}
                                onChange={value => this.setState({ orgId: value })}
                            />
                        </FormGroup>
                        <FormGroup label="Organization Public Key" fieldId="organization-public-key" isRequired>
                            <TextInput
                                isRequired
                                type="text"
                                id="organization-public-key"
                                name="organization-public-key"
                                value={this.state.orgPublicKey}
                                onChange={value => this.setState({ orgPublicKey: value })}
                            />
                        </FormGroup>
                        <FormGroup label="Organization Private Key" fieldId="organization-private-key" isRequired>
                            <TextInput
                                isRequired
                                type="text"
                                id="organization-private-key"
                                name="organization-private-key"
                                value={this.state.orgPrivateKey}
                                onChange={value => this.setState({ orgPrivateKey: value })}
                            />
                        </FormGroup>
                    </React.Fragment>
                    :
                    null
                }
                {showError
                    ?
                    <Alert variant="danger" isInline title={error.reason} className="co-alert co-break-word" >
                        {error.details?.causes
                            ?
                            <ul>
                                {_.map(error.details?.causes, (err, index) => (
                                    <li key={index}>{err.message}</li>
                                ))}
                            </ul>
                            :
                            <div>{error.message}</div>
                        }
                    </Alert>
                    :
                    null}
                <ActionGroup>
                    <Button variant="primary" type="submit" className="submit-button" isDisabled={selectedDBProvider.length === 0}>
                        Create
                    </Button>
                    <Button variant="secondary" onClick={this.handleCancel}>
                        Cancel
                    </Button>
                </ActionGroup>
            </Form>
        );
    }
}

export default ProviderAccountForm;