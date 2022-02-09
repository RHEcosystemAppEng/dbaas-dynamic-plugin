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
} from '@patternfly/react-core'
import { InfoCircleIcon, CheckCircleIcon } from '@patternfly/react-icons'
import FormHeader from './form/formHeader'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import ProviderAccountForm from './providerAccountForm'
import { fetchInventoryNamespaces, fetchObjectsByNamespace } from './instanceListPage'
import { mongoProviderType, crunchyProviderType } from '../const'
import { getCSRFToken } from '../utils'

const LoadingView = () => {
  return (
    <React.Fragment>
      <EmptyState>
        <EmptyStateIcon variant="container" component={Spinner} />
        <Title size="lg" headingLevel="h3">
          Provisioning Provider Cluster...
        </Title>
      </EmptyState>
    </React.Fragment>
  )
}

const FailedView = ({ handleTryAgain, handleCancel, statusMsg }) => {
  return (
    <React.Fragment>
      <EmptyState>
        <EmptyStateIcon variant="container" component={InfoCircleIcon} className="warning-icon" />
        <Title headingLevel="h2" size="md">
          Provider cluster provision failed
        </Title>
        <EmptyStateBody>Provider cluster provision failed. Please try again.</EmptyStateBody>
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
          Provider cluster provision successfully
        </Title>
        <EmptyStateBody>
          The Provider Cluster has been provisioned, please click the button below to view it.
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
  const [clusterName, setClusterName] = React.useState('my-db-cluster')
  const [projectName, setProjectName] = React.useState('my-db-project')
  const [statusMsg, setStatusMsg] = React.useState('')
  const [showResults, setShowResults] = React.useState(false)
  const [clusterProvisionFailed, setClusterProvisionFailed] = React.useState(false)
  const [clusterProvisionSuccess, setClusterProvisionSuccess] = React.useState(false)
  const [provisionRequestFired, setProvisionRequestFired] = React.useState(false)
  const currentNS = window.location.pathname.split('/')[3]

  const goToInstancesPage = () => {}

  const handleTryAgain = () => {
    location.reload()
  }

  const handleCancel = () => {
    window.history.back()
  }

  const provisionDBCluster = (e) => {
    e.preventDefault()

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
          cloudProvider: 'AWS', //TODO: should not be hard coded
          cloudRegion: 'US_EAST_1', //TODO: should not be hard coded
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
          setClusterProvisionSuccess(true)
          setShowResults(true)
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

  const handleInventorySelection = (value) => {
    let inventory = _.find(inventories, (inv) => {
      return inv.name === value
    })
    setSelectedInventory(inventory)
  }

  const handleDBProviderSelection = (value) => {
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
          dbProviderList.push({ value: dbProvider?.metadata?.name, label: dbProvider?.spec?.provider?.displayName })
        })
        setProviderList(providerList.concat(dbProviderList))
      })
      .catch((err) => {
        console.error(err)
      })
  }

  React.useEffect(() => {
    fetchProviderInfo()
    fetchInventoriesByNSAndRules()
  }, [])

  return (
    <FlexForm className="instance-table-container" onSubmit={provisionDBCluster}>
      <FormBody flexLayout>
        <FormHeader
          title="Provider Cluster Provision"
          helpText="Provision trial database provider clusters."
          marginBottom="lg"
        />
        {!showResults && provisionRequestFired ? <LoadingView /> : null}
        {provisionRequestFired && showResults && clusterProvisionFailed ? (
          <FailedView handleTryAgain={handleTryAgain} handleCancel={handleCancel} statusMsg={statusMsg} />
        ) : null}
        {provisionRequestFired && showResults && clusterProvisionSuccess ? (
          <SuccessView goToInstancesPage={goToInstancesPage} />
        ) : null}

        {!provisionRequestFired ? (
          <React.Fragment>
            <FormGroup label="Database Provider" fieldId="database-provider" className="half-width-selection">
              <FormSelect
                value={selectedDBProvider.value}
                onChange={handleDBProviderSelection}
                aria-label="Database Provider"
              >
                {providerList?.map((provider, index) => (
                  <FormSelectOption key={index} value={provider.value} label={provider.label} />
                ))}
              </FormSelect>
            </FormGroup>
            {selectedDBProvider.value === crunchyProviderType ? (
              <Alert
                variant="warning"
                isInline
                title="Please use the link to provision trial cluster for Crunchy Bridge"
                className="co-alert co-break-word half-width-selection"
              >
                <a href="">link to crunchy</a>
              </Alert>
            ) : (
              <React.Fragment>
                <FormGroup label="Provider Account" fieldId="provider-account" className="half-width-selection">
                  <FormSelect
                    value={selectedInventory.name}
                    onChange={handleInventorySelection}
                    aria-label="Provider Account"
                  >
                    {filteredInventories?.map((inventory, index) => (
                      <FormSelectOption key={index} value={inventory.name} label={inventory.name} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Cluster Name" fieldId="cluster-name" isRequired className="half-width-selection">
                  <TextInput
                    isRequired
                    type="text"
                    id="cluster-name"
                    name="cluster-name"
                    value={clusterName}
                    onChange={(value) => setClusterName(value)}
                  />
                </FormGroup>
                {selectedDBProvider.value === mongoProviderType ? (
                  <FormGroup label="Project Name" fieldId="project-name" isRequired className="half-width-selection">
                    <TextInput
                      isRequired
                      type="text"
                      id="project-name"
                      name="project-name"
                      value={projectName}
                      onChange={(value) => setProjectName(value)}
                    />
                  </FormGroup>
                ) : null}
                <ActionGroup>
                  <Button id="cluster-provision-button" variant="primary" type="submit">
                    Provision
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
