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
  ValidatedOptions,
} from '@patternfly/react-core'
import { getCSRFToken } from '../utils'
import { fetchInventoryNamespaces } from '../utils'

class ProviderAccountForm extends React.Component {
  constructor(props) {
    super(props)
    this.handleDBProviderSelection = this.handleDBProviderSelection.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.validateField = this.validateField.bind(this)
    this.validateForm = this.validateForm.bind(this)
    this.validateInventoryNameField = this.validateInventoryNameField.bind(this)

    this.state = {
      credentials: {},
      currentNS: window.location.pathname.split('/')[3],
      inventoryName: '',
      inventoryNamespaces: [],
      selectedDBProvider: {},
      dbProviderOptions: [{ value: '', label: 'Select provider' }],
      postResponse: '',
      showError: false,
      showResults: true,
      error: {},
      isFormValid: false,
      isInventoryNameFieldValid: '',
    }
  }

  async componentDidUpdate(prevProps, prevState) {
    if (!_.isEmpty(this.props.dbProviderInfo) && prevProps.dbProviderInfo !== this.props.dbProviderInfo) {
      let dbProviderList = []
      this.state.inventoryNamespaces = await fetchInventoryNamespaces()
      if (this.state.inventoryNamespaces.includes(this.state.currentNS)) {
        this.props.dbProviderInfo.items.forEach((dbProvider) => {
          dbProviderList.push({ value: dbProvider?.metadata?.name, label: dbProvider?.spec?.provider?.displayName })
        })
      } else {
        this.state.showResults = false
      }
      this.setState({ dbProviderOptions: this.state.dbProviderOptions.concat(dbProviderList) })
    }
    if (
      prevState.isInventoryNameFieldValid !== this.state.isInventoryNameFieldValid &&
      !_.isEmpty(this.state.selectedDBProvider)
    ) {
      this.validateForm()
    }
  }

  validateForm = () => {
    let isValid = _.every(this.state.selectedDBProvider?.spec?.credentialFields, (field) => {
      return field.isValid === ValidatedOptions.default
    })
    isValid = isValid && this.state.isInventoryNameFieldValid === ValidatedOptions.default
    this.setState({ isFormValid: isValid })
  }

  validateInventoryNameField = (value) => {
    if (_.isEmpty(value)) {
      this.setState({ isInventoryNameFieldValid: ValidatedOptions.error })
    } else {
      this.setState({ isInventoryNameFieldValid: ValidatedOptions.default })
    }
  }

  validateField = (value, field) => {
    let newProviderObj = _.extend({}, this.state.selectedDBProvider)
    let currentField = _.find(newProviderObj?.spec?.credentialFields, (credentialField) => {
      return credentialField.key === field.key
    })

    if (currentField) {
      if (_.isEmpty(value)) {
        currentField.isValid = ValidatedOptions.error
      } else {
        currentField.isValid = ValidatedOptions.default
      }
    }

    this.setState({ selectedDBProvider: newProviderObj })
  }

  handleDBProviderSelection = (value) => {
    if (!_.isEmpty(this.props.dbProviderInfo)) {
      let provider = _.find(this.props.dbProviderInfo.items, (dbProvider) => {
        return dbProvider.metadata?.name === value
      })
      if (provider?.spec?.credentialFields) {
        provider.spec.credentialFields.forEach((field) => {
          field.isValid = ''
        })
      }
      this.setState({ selectedDBProvider: provider })
    }
  }

  handleCancel = () => {
    window.history.back()
  }

  handleSubmit = async (event) => {
    event.preventDefault()

    let secretName = 'dbaas-vendor-credentials-' + Date.now()
    const { selectedDBProvider, inventoryName, credentials, isFormValid } = this.state

    if (!isFormValid) return

    let labelsMap = new Map([['related-to', 'dbaas-operator']])
    let providerName = ''
    let labelKey = 'type'

    providerName = selectedDBProvider?.metadata?.name
    if (providerName.includes('mongodb')) {
      labelKey = 'atlas.mongodb.com/type'
    }
    labelsMap.set(labelKey, 'credentials')

    let newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: this.state.currentNS,
        labels: Object.fromEntries(labelsMap),
      },
      stringData: credentials,
      type: 'Opaque',
    }

    let postSecretRequestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
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
        'X-CSRFToken': getCSRFToken(),
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
            name: selectedDBProvider?.metadata?.name,
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
              'X-CSRFToken': getCSRFToken(),
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
    const {
      selectedDBProvider,
      showError,
      error,
      inventoryName,
      dbProviderOptions,
      credentials,
      isFormValid,
      isInventoryNameFieldValid,
    } = this.state

    return (
      <Form id="provider-account-form" isWidthLimited onSubmit={this.handleSubmit}>
        <FormGroup
          label="Name"
          fieldId="inventory-name"
          isRequired
          validated={isInventoryNameFieldValid}
          helperTextInvalid="This is a required field"
        >
          <TextInput
            isRequired
            type="text"
            id="inventory-name"
            name="inventory-name"
            value={inventoryName}
            onChange={(value) => {
              this.setState({ inventoryName: value })
              this.validateInventoryNameField(value)
            }}
            onBlur={(event) => {
              this.validateInventoryNameField(event.target.value)
            }}
            validated={isInventoryNameFieldValid}
          />
        </FormGroup>
        {this.state.showResults ? (
          <div>
            {!_.isEmpty(this.state.inventoryNamespaces) ? (
              <FormGroup label="Database provider" fieldId="db-provider">
                <FormSelect
                  value={selectedDBProvider?.metadata?.name}
                  onChange={this.handleDBProviderSelection}
                  aria-label="Database Provider"
                >
                  {dbProviderOptions.map((option, index) => (
                    <FormSelectOption key={index} value={option.value} label={option.label} />
                  ))}
                </FormSelect>
              </FormGroup>
            ) : null}
          </div>
        ) : (
          <Alert
            variant="warning"
            isInline
            title="Invalid Namespace for Provider Account Creation"
            className="co-alert co-break-word"
          >
            {!_.isEmpty(this.state.inventoryNamespaces) ? (
              <div>
                Switch to one of these valid Tenant namespaces and retry:
                <ul>
                  {_.map(this.state.inventoryNamespaces, (namespace, index) => (
                    <li key={index}>{namespace}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>no tenant namespaces detected</div>
            )}
          </Alert>
        )}
        {!_.isEmpty(selectedDBProvider) ? (
          <React.Fragment>
            <div className="section-subtitle extra-top-margin no-bottom-padding">Account Credentials</div>
            {selectedDBProvider?.spec?.credentialFields.map((field) => {
              return (
                <FormGroup
                  label={field.displayName}
                  fieldId={field.key}
                  isRequired={field.required}
                  helperTextInvalid="This is a required field"
                  validated={field.isValid}
                >
                  <TextInput
                    isRequired={field.required}
                    type={field.type === 'maskedstring' ? 'password' : 'text'}
                    id={field.key}
                    name={field.key}
                    value={credentials[field.key]}
                    validated={field.isValid}
                    onChange={(value) => {
                      this.setState((prevState) => {
                        let newCredentials = Object.assign({}, prevState.credentials)
                        newCredentials[field.key] = value.toString('base64')
                        return { credentials: newCredentials }
                      })
                      this.validateField(value, field)
                      this.validateForm()
                    }}
                    onBlur={(event) => {
                      this.validateField(event.target.value, field)
                      this.validateForm()
                    }}
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
          <Button
            variant="primary"
            type="submit"
            className="submit-button"
            isDisabled={_.isEmpty(selectedDBProvider) || !isFormValid}
          >
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
