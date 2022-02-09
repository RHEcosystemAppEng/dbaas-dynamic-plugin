import * as React from 'react'
import * as _ from 'lodash'
import './_dbaas-import-view.css'
import {
  Title,
  TextInput,
  Label,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Button,
  ActionGroup,
  Alert,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateSecondaryActions,
  Spinner,
  Divider,
  ValidatedOptions,
} from '@patternfly/react-core'
import { InfoCircleIcon, CheckCircleIcon } from '@patternfly/react-icons'
import FormHeader from './form/formHeader'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import { mongoProviderType, crunchyProviderType } from '../const'
import {
  getCSRFToken,
  fetchInventoryNamespaces,
  fetchObjectsByNamespace,
  disableNSSelection,
  enableNSSelection,
} from '../utils'

const LoadingView = () => {
  return (
    <React.Fragment>
      <EmptyState>
        <EmptyStateIcon variant="container" component={Spinner} />
        <Title size="lg" headingLevel="h3">
          Creating Database Instance...
        </Title>
      </EmptyState>
    </React.Fragment>
  )
}

const FailedView = ({ handleTryAgain, handleCancel, statusMsg }) => {
  return (
    <React.Fragment>
      <EmptyState>
        <EmptyStateIcon variant="container" component={InfoCircleIcon} className="error-icon" />
        <Title headingLevel="h2" size="md">
          Database instance creation failed
        </Title>
        <EmptyStateBody>Database instance creation failed. Please try again.</EmptyStateBody>
        <Alert variant="danger" isInline title="An error occured" className="co-alert co-break-word extra-top-margin">
          <div>{statusMsg}</div>
        </Alert>
        <Button variant="primary" onClick={handleTryAgain}>
          Try Again
        </Button>
        <EmptyStateSecondaryActions>
          <Button variant="link" onClick={handleCancel}>
            Close
          </Button>
        </EmptyStateSecondaryActions>
      </EmptyState>
    </React.Fragment>
  )
}

const SuccessView = ({ goToInstancesPage }) => {
  return (
    <React.Fragment>
      <EmptyState>
        <EmptyStateIcon variant="container" component={CheckCircleIcon} className="success-icon" />
        <Title headingLevel="h2" size="md">
          Database instance creation started
        </Title>
        <EmptyStateBody>
          The database instance is being created, please click the button below to view it.
        </EmptyStateBody>
        <Button variant="primary" onClick={goToInstancesPage}>
          View Instances
        </Button>
      </EmptyState>
    </React.Fragment>
  )
}

const ProviderClusterProvisionPage = () => {
  const [providerList, setProviderList] = React.useState([{ value: '', label: 'Select database provider' }])
  const [selectedDBProvider, setSelectedDBProvider] = React.useState({})
  const [inventories, setInventories] = React.useState([])
  const [filteredInventories, setFilteredInventories] = React.useState([{ name: 'Select provider account' }])
  const [selectedInventory, setSelectedInventory] = React.useState({})
  const [clusterName, setClusterName] = React.useState('')
  const [projectName, setProjectName] = React.useState('')
  const [statusMsg, setStatusMsg] = React.useState('')
  const [showResults, setShowResults] = React.useState(false)
  const [clusterProvisionFailed, setClusterProvisionFailed] = React.useState(false)
  const [clusterProvisionSuccess, setClusterProvisionSuccess] = React.useState(false)
  const [provisionRequestFired, setProvisionRequestFired] = React.useState(false)
  const [isDBProviderFieldValid, setIsDBProviderFieldValid] = React.useState('')
  const [isDBProviderFieldDisabled, setIsDBProviderFieldDisabled] = React.useState(false)
  const [isInventoryFieldValid, setIsInventoryFieldValid] = React.useState('')
  const [isInventoryFieldDisabled, setIsInventoryFieldDisabled] = React.useState(false)
  const [isInstanceNameFieldValid, setIsInstanceNameFieldValid] = React.useState('')
  const [isProjectNameFieldValid, setIsProjectNameFieldValid] = React.useState('')
  const [isFormValid, setIsFormValid] = React.useState(false)
  const currentNS = window.location.pathname.split('/')[3]
  const devSelectedDBProviderName = window.location.pathname.split('/db/')[1]?.split('/pa/')[0]
  const devSelectedProviderAccountName = window.location.pathname.split('/pa/')[1]
  const checkDBClusterStatusIntervalID = React.useRef()
  const checkDBClusterStatusTimeoutID = React.useRef()

  const detectSelectedDBProviderAndProviderAccount = () => {
    if (!_.isEmpty(devSelectedDBProviderName) && !_.isEmpty(providerList)) {
      let provider = _.find(providerList, (dbProvider) => {
        return dbProvider.value === devSelectedDBProviderName
      })
      setSelectedDBProvider(provider)
      filterInventoriesByProvider(provider)
      setIsDBProviderFieldValid(ValidatedOptions.default)
      setIsDBProviderFieldDisabled(true)
    }

    if (!_.isEmpty(devSelectedProviderAccountName) && !_.isEmpty(inventories)) {
      let inventory = inventories.find((inv) => {
        return inv.name === devSelectedProviderAccountName
      })
      setSelectedInventory(inventory)
      setIsInventoryFieldValid(ValidatedOptions.default)
      setIsInventoryFieldDisabled(true)
    }
  }

  const goToInstancesPage = () => {
    if (!_.isEmpty(devSelectedDBProviderName) && !_.isEmpty(devSelectedProviderAccountName)) {
      window.location.pathname = `/k8s/ns/${currentNS}/${devSelectedDBProviderName}`
    } else {
      window.location.pathname = `/k8s/ns/${currentNS}/rhoda-admin-dashboard`
    }
  }

  const handleTryAgain = () => {
    location.reload()
  }

  const handleCancel = () => {
    window.history.back()
  }

  const checkDBClusterStatus = (clusterName) => {
    if (!_.isEmpty(clusterName)) {
      let requestOpts = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }

      fetch(
        '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + currentNS + '/dbaasinstances/' + clusterName,
        requestOpts
      )
        .then((response) => response.json())
        .then((responseJson) => {
          let provisionReadyCondition = responseJson?.status?.conditions?.find((condition) => {
            return condition.type?.toLowerCase() === 'provisionready'
          })
          let instanceReadyCondition = responseJson?.status?.conditions?.find((condition) => {
            return condition.type?.toLowerCase() === 'instanceready'
          })

          if (responseJson?.status?.phase?.toLowerCase() === 'creating') {
            if (instanceReadyCondition?.status.toLowerCase() === 'false') {
              setClusterProvisionSuccess(true)
              clearInterval(checkDBClusterStatusIntervalID.current)
              clearTimeout(checkDBClusterStatusTimeoutID.current)
              setShowResults(true)
            }
          } else if (responseJson?.status?.phase?.toLowerCase() === 'failed') {
            if (provisionReadyCondition?.status.toLowerCase() === 'false') {
              setClusterProvisionFailed(true)
              setStatusMsg(provisionReadyCondition?.message)
              clearInterval(checkDBClusterStatusIntervalID.current)
              clearTimeout(checkDBClusterStatusTimeoutID.current)
              setShowResults(true)
            }
          } else {
            if (!checkDBClusterStatusTimeoutID.current) {
              checkDBClusterStatusTimeoutID.current = setTimeout(() => {
                setClusterProvisionFailed(true)
                setStatusMsg('Could not connect with database provider')
                clearInterval(checkDBClusterStatusIntervalID.current)
                setShowResults(true)
              }, 30000)
            }
          }
        })
    }
  }

  const provisionDBCluster = (e) => {
    e.preventDefault()

    if (!isFormValid) return

    let otherInstanceParams = {}

    if (selectedDBProvider.value === mongoProviderType) {
      otherInstanceParams = { projectName: projectName }
    }

    let requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify({
        apiVersion: 'dbaas.redhat.com/v1alpha1',
        kind: 'DBaaSInstance',
        metadata: {
          name: clusterName,
          namespace: currentNS,
        },
        spec: {
          name: clusterName,
          inventoryRef: {
            name: selectedInventory.name,
            namespace: currentNS,
          },
          otherInstanceParams: otherInstanceParams,
        },
      }),
    }
    fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + currentNS + '/dbaasinstances', requestOpts)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'Failure') {
          setProvisionRequestFired(true)
          setClusterProvisionFailed(true)
          setStatusMsg(data.message)
          setShowResults(true)
        } else {
          setProvisionRequestFired(true)
          checkDBClusterStatusIntervalID.current = setInterval(() => {
            checkDBClusterStatus(data?.metadata?.name)
          }, 3000)
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

  const filterInventoriesByProvider = (provider) => {
    if (!_.isEmpty(provider)) {
      let filteredInventoryList = _.filter(inventories, (inventory) => {
        return inventory.providerRef?.name === provider.value
      })
      setFilteredInventories(filteredInventoryList)

      //Set the first inventory as the selected inventory by default
      if (filteredInventoryList.length > 0) {
        setSelectedInventory(filteredInventoryList[0])
      }

      if (_.isEmpty(filteredInventoryList)) {
        setIsInventoryFieldValid(ValidatedOptions.error)
      } else {
        setIsInventoryFieldValid(ValidatedOptions.default)
      }
    }
  }

  const parseInventories = (inventoryItems) => {
    if (inventoryItems.length > 0) {
      let inventories = []

      inventoryItems.forEach((inventory, index) => {
        let obj = { id: 0, name: '', namespace: '', instances: [], status: {}, providerRef: {} }
        obj.id = index
        obj.name = inventory.metadata.name
        obj.namespace = inventory.metadata.namespace
        obj.status = inventory.status
        obj.providerRef = inventory.spec?.providerRef

        if (
          inventory.status?.conditions[0]?.status !== 'False' &&
          inventory.status?.conditions[0]?.type === 'SpecSynced'
        ) {
          inventory.status?.instances?.map((instance) => {
            return (instance.provider = inventory.spec?.providerRef?.name)
          })
          obj.instances = inventory.status?.instances
        }

        inventories.push(obj)
      })
      setInventories(inventories)
    }
  }

  async function fetchInventoriesByNSAndRules() {
    let inventoryNamespaces = await fetchInventoryNamespaces()
    let inventoryItems = await fetchObjectsByNamespace(
      'dbaas.redhat.com',
      'v1alpha1',
      'dbaasinventories',
      inventoryNamespaces
    ).catch(function (error) {
      console.log(error)
    })

    parseInventories(inventoryItems)

    return inventoryItems
  }

  const validateForm = () => {
    let isValid =
      isDBProviderFieldValid === ValidatedOptions.default &&
      isInventoryFieldValid === ValidatedOptions.default &&
      isInstanceNameFieldValid === ValidatedOptions.default

    if (selectedDBProvider.value === mongoProviderType) {
      isValid = isValid && isProjectNameFieldValid === ValidatedOptions.default
    }

    setIsFormValid(isValid)
  }

  const handleProjectNameChange = (value) => {
    if (_.isEmpty(value)) {
      setIsProjectNameFieldValid(ValidatedOptions.error)
    } else {
      setIsProjectNameFieldValid(ValidatedOptions.default)
    }
    setProjectName(value)
  }

  const handleInstanceNameChange = (value) => {
    if (_.isEmpty(value)) {
      setIsInstanceNameFieldValid(ValidatedOptions.error)
    } else {
      setIsInstanceNameFieldValid(ValidatedOptions.default)
    }
    setClusterName(value)
  }

  const handleInventorySelection = (value) => {
    if (_.isEmpty(value)) {
      setIsInventoryFieldValid(ValidatedOptions.error)
    } else {
      setIsInventoryFieldValid(ValidatedOptions.default)
    }
    let inventory = _.find(inventories, (inv) => {
      return inv.name === value
    })
    setSelectedInventory(inventory)
  }

  const handleDBProviderSelection = (value) => {
    if (_.isEmpty(value)) {
      setIsDBProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsDBProviderFieldValid(ValidatedOptions.default)
    }
    if (!_.isEmpty(providerList)) {
      let provider = _.find(providerList, (dbProvider) => {
        return dbProvider.value === value
      })
      setSelectedDBProvider(provider)
      filterInventoriesByProvider(provider)
    }
  }

  const fetchProviderInfo = () => {
    let requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/dbaasproviders', requestOpts)
      .then((response) => response.json())
      .then((data) => {
        let dbProviderList = []
        data.items?.forEach((dbProvider) => {
          dbProviderList.push({
            value: dbProvider?.metadata?.name,
            label: dbProvider?.spec?.provider?.displayName,
            externalProvisionInfo: {
              url: dbProvider?.spec?.externalProvisionURL,
              desc: dbProvider?.spec?.externalProvisionDescription,
            },
          })
        })
        setProviderList(providerList.concat(dbProviderList))
      })
      .catch((err) => {
        console.error(err)
      })
  }

  React.useEffect(() => {
    disableNSSelection()
    fetchProviderInfo()
    fetchInventoriesByNSAndRules()

    return () => {
      clearInterval(checkDBClusterStatusIntervalID.current)
      enableNSSelection()
    }
  }, [])

  React.useEffect(() => {
    validateForm()
  }, [
    isDBProviderFieldValid,
    isInstanceNameFieldValid,
    isInventoryFieldValid,
    isProjectNameFieldValid,
    selectedDBProvider,
  ])

  React.useEffect(() => {
    if (!_.isEmpty(providerList) && !_.isEmpty(inventories)) {
      detectSelectedDBProviderAndProviderAccount()
    }
  }, [providerList, inventories])

  return (
    <FlexForm className="instance-table-container" onSubmit={provisionDBCluster}>
      <FormBody flexLayout>
        <FormHeader
          title="Create Database Instance"
          helpText="Creating an instance allows it to be connected to an application"
          marginBottom="lg"
        />
        <Divider />
        {!showResults && provisionRequestFired ? <LoadingView /> : null}
        {provisionRequestFired && showResults && clusterProvisionFailed ? (
          <FailedView handleTryAgain={handleTryAgain} handleCancel={handleCancel} statusMsg={statusMsg} />
        ) : null}
        {provisionRequestFired && showResults && clusterProvisionSuccess ? (
          <SuccessView goToInstancesPage={goToInstancesPage} />
        ) : null}

        {!provisionRequestFired ? (
          <React.Fragment>
            <Alert
              variant="info"
              isInline
              title="Information to create a Production database instance"
              className="co-info co-break-word"
            >
              <p>
                For more information about creating a production database instance, please select a Database Provider
                below.
              </p>
              {!_.isEmpty(selectedDBProvider) ? (
                <a href={selectedDBProvider?.externalProvisionInfo?.url} target="_blank" rel="noopener noreferrer">
                  Create a production database instance
                </a>
              ) : null}
            </Alert>
            <FormGroup
              label="Database Provider"
              fieldId="database-provider"
              isRequired
              className="half-width-selection"
              helperTextInvalid="This is a required field"
              validated={isDBProviderFieldValid}
            >
              <FormSelect
                isDisabled={isDBProviderFieldDisabled}
                isRequired
                value={selectedDBProvider.value}
                onChange={handleDBProviderSelection}
                aria-label="Database Provider"
                validated={isDBProviderFieldValid}
              >
                {providerList?.map((provider, index) => (
                  <FormSelectOption key={index} value={provider.value} label={provider.label} />
                ))}
              </FormSelect>
            </FormGroup>
            {selectedDBProvider?.value === crunchyProviderType ? null : (
              <React.Fragment>
                <FormGroup
                  label="Provider Account"
                  fieldId="provider-account"
                  isRequired
                  className="half-width-selection"
                  helperTextInvalid="This is a required field"
                  validated={isInventoryFieldValid}
                >
                  <FormSelect
                    isDisabled={isInventoryFieldDisabled}
                    isRequired
                    value={selectedInventory.name}
                    onChange={handleInventorySelection}
                    aria-label="Provider Account"
                    validated={isInventoryFieldValid}
                  >
                    {filteredInventories?.map((inventory, index) => (
                      <FormSelectOption key={index} value={inventory.name} label={inventory.name} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup
                  label="Instance Name"
                  fieldId="instance-name"
                  isRequired
                  className="half-width-selection"
                  helperTextInvalid="This is a required field"
                  validated={isInstanceNameFieldValid}
                >
                  <TextInput
                    isRequired
                    type="text"
                    id="instance-name"
                    name="instance-name"
                    value={clusterName}
                    onChange={handleInstanceNameChange}
                    validated={isInstanceNameFieldValid}
                  />
                </FormGroup>
                {selectedDBProvider.value === mongoProviderType ? (
                  <FormGroup
                    label="Project Name"
                    fieldId="project-name"
                    isRequired
                    className="half-width-selection"
                    helperTextInvalid="This is a required field"
                    validated={isProjectNameFieldValid}
                  >
                    <TextInput
                      isRequired
                      type="text"
                      id="project-name"
                      name="project-name"
                      value={projectName}
                      onChange={handleProjectNameChange}
                      validated={isProjectNameFieldValid}
                    />
                  </FormGroup>
                ) : null}
                <ActionGroup>
                  <Button id="cluster-provision-button" variant="primary" type="submit" isDisabled={!isFormValid}>
                    Create
                  </Button>
                  <Button variant="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                </ActionGroup>
              </React.Fragment>
            )}
          </React.Fragment>
        ) : null}
      </FormBody>
    </FlexForm>
  )
}

export default ProviderClusterProvisionPage
