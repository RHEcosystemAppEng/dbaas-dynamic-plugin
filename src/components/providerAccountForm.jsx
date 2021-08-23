import React from 'react'
import * as _ from 'lodash'
import {
  Button,
  Alert,
  Form,
  FormGroup,
  TextInput,
  ActionGroup,
  FormSelect,
  FormSelectOption,
  FormSelectOptionGroup,
} from '@patternfly/react-core'

class ProviderAccountForm extends React.Component {
  constructor(props) {
    super(props)
    this.handleDBProviderSelection = this.handleDBProviderSelection.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)

    this.state = {
      credentials: {},
      currentNS: window.location.pathname.split('/')[3],
      inventoryName: 'my-db-provider-account',
      selectedDBProvider: {},
      dbProviderOptions: [{ value: '', label: 'Select provider' }],
      postResponse: '',
      showError: false,
      error: {},
    }
  }

  componentDidUpdate(prevProps) {
    if (!_.isEmpty(this.props.dbProviderInfo) && prevProps.dbProviderInfo !== this.props.dbProviderInfo) {
      let dbProviderList = []
      this.props.dbProviderInfo.items.forEach((dbProvider) => {
        dbProviderList.push({ value: dbProvider?.metadata?.name, label: dbProvider?.spec?.provider?.displayName })
      })
      this.setState({ dbProviderOptions: this.state.dbProviderOptions.concat(dbProviderList) })
    }
  }

  handleDBProviderSelection = (value) => {
    if (!_.isEmpty(this.props.dbProviderInfo)) {
      let provider = _.find(this.props.dbProviderInfo.items, (dbProvider) => {
        return dbProvider.metadata?.name === value
      })
      this.setState({ selectedDBProvider: provider })
    }
  }

  handleCancel = () => {
    window.history.back()
  }

  handleSubmit = async (event) => {
    event.preventDefault()

    let secretName = 'dbaas-vendor-credentials-' + Date.now()
    const { selectedDBProvider, inventoryName, credentials } = this.state

    let newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: this.state.currentNS,
        labels: {
          'related-to': 'dbaas-operator',
          type: 'dbaas-vendor-credentials',
        },
      },
      stringData: credentials,
      type: 'Opaque',
    }

    let postSecretRequestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(newSecret),
    }

    fetch('api/kubernetes/api/v1/namespaces/' + this.state.currentNS + '/secrets', postSecretRequestOpts)
      .then((response) => response.json())
      .then((data) => {
        this.setState({ postResponse: data })
      })
      .catch((err) => {
        if (err?.response?.status == 404) {
          console.warn(err)
        } else {
          console.warn(err)
        }
      })

    let requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        apiVersion: 'dbaas.redhat.com/v1alpha1',
        kind: 'DBaaSInventory',
        metadata: {
          name: inventoryName,
          namespace: this.state.currentNS,
          labels: {
            'related-to': 'dbaas-operator',
            type: 'dbaas-vendor-service',
          },
        },
        spec: {
          providerRef: {
            name: selectedDBProvider.metadata?.name,
          },
          credentialsRef: {
            name: secretName,
            namespace: this.state.currentNS,
          },
        },
      }),
    }
    fetch(
      '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + this.state.currentNS + '/dbaasinventories',
      requestOpts
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'Failure') {
          this.setState({ showError: true, error: data })
        } else {
          this.props.setCurrentCreatedInventoryInfo(data)
          let patchPayload = [
            {
              op: 'add',
              path: '/metadata/ownerReferences',
              value: [
                {
                  apiVersion: 'dbaas.redhat.com/v1alpha1',
                  kind: 'DBaaSInventory',
                  name: inventoryName,
                  uid: data.metadata.uid,
                  controller: true,
                  blockOwnerDeletion: false,
                },
              ],
            },
          ]

          let patchSecretRequestOpts = {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json-patch+json',
              Accept: 'application/json',
            },
            body: JSON.stringify(patchPayload),
          }

          fetch(
            'api/kubernetes/api/v1/namespaces/' + this.state.currentNS + '/secrets/' + secretName,
            patchSecretRequestOpts
          )
            .then((response) => response.json())
            .then((data) => {
              if (data.status === 'Failure') {
                this.setState({ showError: true, error: data })
              } else {
                this.props.setDBaaSServiceStatus(true)
              }
            })
            .catch((err) => {
              if (err?.response?.status == 404) {
                console.warn(err)
              } else {
                console.warn(err)
              }
            })
        }
      })
  }

  render() {
    const { selectedDBProvider, showError, error, inventoryName, dbProviderOptions, credentials } = this.state

    return (
      <Form id="provider-account-form" isWidthLimited onSubmit={this.handleSubmit}>
        <FormGroup label="Name" fieldId="inventory-name" isRequired>
          <TextInput
            isRequired
            type="text"
            id="inventory-name"
            name="inventory-name"
            value={inventoryName}
            onChange={(value) => this.setState({ inventoryName: value })}
          />
        </FormGroup>
        <FormGroup label="Database provider" fieldId="db-provider">
          <FormSelect
            value={selectedDBProvider.metadata?.name}
            onChange={this.handleDBProviderSelection}
            aria-label="Database Provider"
          >
            {dbProviderOptions.map((option, index) => (
              <FormSelectOption key={index} value={option.value} label={option.label} />
            ))}
          </FormSelect>
        </FormGroup>
        {!_.isEmpty(selectedDBProvider) ? (
          <React.Fragment>
            <div className="section-subtitle extra-top-margin no-bottom-padding">Account Credentials</div>
            {selectedDBProvider.spec?.credentialFields.map((field) => {
              return (
                <FormGroup label={field.displayName} fieldId={field.key} isRequired={field.required}>
                  <TextInput
                    isRequired={field.required}
                    type={field.type === 'maskedstring' ? 'password' : 'text'}
                    id={field.key}
                    name={field.key}
                    value={credentials[field.key]}
                    onChange={(value) =>
                      this.setState((prevState) => {
                        let newCredentials = Object.assign({}, prevState.credentials)
                        newCredentials[field.key] = value.toString('base64')
                        return { credentials: newCredentials }
                      })
                    }
                  />
                </FormGroup>
              )
            })}
          </React.Fragment>
        ) : null}
        {showError ? (
          <Alert variant="danger" isInline title={error.reason} className="co-alert co-break-word">
            {error.details?.causes ? (
              <ul>
                {_.map(error.details?.causes, (err, index) => (
                  <li key={index}>{err.message}</li>
                ))}
              </ul>
            ) : (
              <div>{error.message}</div>
            )}
          </Alert>
        ) : null}
        <ActionGroup>
          <Button variant="primary" type="submit" className="submit-button" isDisabled={_.isEmpty(selectedDBProvider)}>
            Create
          </Button>
          <Button variant="secondary" onClick={this.handleCancel}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    )
  }
}

export default ProviderAccountForm
