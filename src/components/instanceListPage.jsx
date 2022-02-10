import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  Label,
  Spinner,
  Title,
  Split,
  SplitItem,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import * as _ from 'lodash'
import * as React from 'react'
import {
  crunchyProviderName,
  crunchyProviderType,
  cockroachdbProviderType,
  mongoProviderName,
  mongoProviderType,
  cockroachdbProviderName,
} from '../const'
import {
  fetchInventoryNamespaces,
  fetchObjectsByNamespace,
  fetchObjectsClusterOrNS,
  isDbaasConnectionUsed,
  disableNSSelection,
} from '../utils'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import FormHeader from './form/formHeader'
import InstanceListFilter from './instanceListFilter'
import InstanceTable from './instanceTable'
import './_dbaas-import-view.css'

export const handleTryAgain = () => {
  location.reload()
}

export const handleCancel = () => {
  window.history.back()
}

export async function fetchInventoriesByNSAndRules() {
  let inventoryNamespaces = await fetchInventoryNamespaces()
  let inventoryItems = await fetchObjectsByNamespace(
    'dbaas.redhat.com',
    'v1alpha1',
    'dbaasinventories',
    inventoryNamespaces
  ).catch(function (error) {
    setFetchInstancesFailed(true)
    setStatusMsg(error)
  })

  return inventoryItems
}

const InstanceListPage = () => {
  const [noInstances, setNoInstances] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState('')
  const [fetchInstancesFailed, setFetchInstancesFailed] = React.useState(false)
  const [textInputIDValue, setTextInputIDValue] = React.useState('')
  const [showResults, setShowResults] = React.useState(false)
  const [inventories, setInventories] = React.useState([])
  const [selectedDBProvider, setSelectedDBProvider] = React.useState('')
  const [dbProviderName, setDBProviderName] = React.useState()
  const [selectedInventory, setSelectedInventory] = React.useState({})
  const [dbaasConnectionList, setDbaasConnectionList] = React.useState([])
  const [serviceBindingList, setServiceBindingList] = React.useState([])
  const [connectionAndServiceBindingList, setConnectionAndServiceBindingList] = React.useState([])

  const currentNS = window.location.pathname.split('/')[3]

  const dbProviderTitle = (
    <div>
      Connect {dbProviderName} <Label className="ocs-preview-badge extra-left-margin">Service Preview</Label>
    </div>
  )
  const filteredInstances = React.useMemo(
    () => selectedInventory?.instances?.filter((instance) => instance.instanceID.includes(textInputIDValue)),
    [selectedInventory.instances, textInputIDValue]
  )

  const mapDBaaSConnectionsAndServiceBindings = () => {
    let newDbaasConnectionList = dbaasConnectionList
    let newServiceBindingList = serviceBindingList
    let newConnectionAndServiceBindingList = []

    if (newDbaasConnectionList.length > 0) {
      newDbaasConnectionList.forEach((dbaasConnection) => {
        if (
          selectedInventory?.instances?.find((instance) => instance.instanceID === dbaasConnection.spec?.instanceID)
        ) {
          let connectionObj = {
            instanceID: dbaasConnection?.spec?.instanceID,
            instanceName: dbaasConnection?.metadata?.name,
            connectionStatus: _.isEmpty(dbaasConnection?.status) ? '-' : dbaasConnection?.status?.conditions[0]?.reason,
            errMsg: 'N/A',
            applications: [],
            namespace: _.isEmpty(dbaasConnection?.metadata?.namespace) ? '-' : dbaasConnection?.metadata?.namespace,
          }
          if (!_.isEmpty(dbaasConnection?.status) && dbaasConnection?.status?.conditions[0]?.status !== 'True') {
            connectionObj.errMsg = dbaasConnection?.status?.conditions[0]?.message
          }
          if (
            newServiceBindingList.find((serviceBinding) => {
              return isDbaasConnectionUsed(serviceBinding, dbaasConnection)
            })
          ) {
            newServiceBindingList.forEach((serviceBinding) => {
              if (isDbaasConnectionUsed(serviceBinding, dbaasConnection)) {
                let newConnectionObj = _.extend({}, connectionObj)
                newConnectionObj.applications.push(serviceBinding.spec?.application)
              }
            })
          }
          newConnectionAndServiceBindingList.push(connectionObj)
        }
      })
    }

    setConnectionAndServiceBindingList(newConnectionAndServiceBindingList)
  }

  async function fetchServiceBindings() {
    let serviceBindings = await fetchObjectsClusterOrNS('binding.operators.coreos.com', 'v1alpha1', 'servicebindings')
    setServiceBindingList(serviceBindings)
  }

  async function fetchDBaaSConnections() {
    let connections = await fetchObjectsClusterOrNS('dbaas.redhat.com', 'v1alpha1', 'dbaasconnections')
    setDbaasConnectionList(connections)
  }

  const checkInventoryStatus = (inventory) => {
    if (inventory?.status?.conditions[0]?.type === 'SpecSynced') {
      if (inventory?.status?.conditions[0]?.status === 'False') {
        setFetchInstancesFailed(true)
        setStatusMsg(inventory?.status?.conditions[0]?.message)
      }
    } else {
      setFetchInstancesFailed(true)
      setStatusMsg('Could not connect with database provider')
    }
    setShowResults(true)
  }

  const handleInventorySelection = (value) => {
    let inventory = _.find(inventories, (inv) => {
      return inv.name === value
    })
    setSelectedInventory(inventory)

    //clear filter value when switch inventory
    setTextInputIDValue('')
    setShowResults(false)
    checkInventoryStatus(inventory)
  }

  const parseSelectedDBProvider = () => {
    let dbProviderType = _.last(window.location.pathname.split('/'))
    if (dbProviderType === crunchyProviderType) {
      setDBProviderName(crunchyProviderName)
    }
    if (dbProviderType === mongoProviderType) {
      setDBProviderName(mongoProviderName)
    }
    if (dbProviderType === cockroachdbProviderType) {
      setDBProviderName(cockroachdbProviderName)
    }
    setSelectedDBProvider(dbProviderType)
  }

  async function fetchInstances() {
    let inventories = []
    let inventoryItems = await fetchInventoriesByNSAndRules()

    if (inventoryItems.length > 0) {
      let filteredInventories = _.filter(inventoryItems, (inventory) => {
        return inventory.spec?.providerRef?.name === selectedDBProvider
      })
      filteredInventories.forEach((inventory, index) => {
        let obj = { id: 0, name: '', namespace: '', instances: [], status: {} }
        obj.id = index
        obj.name = inventory.metadata.name
        obj.namespace = inventory.metadata.namespace
        obj.status = inventory.status

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

      //Set the first inventory as the selected inventory by default
      if (inventories.length > 0) {
        setSelectedInventory(inventories[0])
      }
      setShowResults(true)
    } else {
      setNoInstances(true)
      setStatusMsg('There is no Provider Account.')
      setShowResults(true)
    }
  }

  React.useEffect(() => {
    disableNSSelection()
    parseSelectedDBProvider()
    if (!_.isEmpty(selectedDBProvider)) {
      fetchInstances()
    }
  }, [currentNS, selectedDBProvider])

  React.useEffect(() => {
    fetchDBaaSConnections()
    fetchServiceBindings()
  }, [currentNS, selectedDBProvider, selectedInventory])

  React.useEffect(() => {
    mapDBaaSConnectionsAndServiceBindings()
  }, [dbaasConnectionList, serviceBindingList, selectedInventory])

  return (
    <FlexForm className="instance-table-container">
      <FormBody flexLayout>
        <FormHeader
          title={dbProviderTitle}
          helpText="The selected database instance will be added to the topology view."
          marginBottom="lg"
        />
        {!showResults ? (
          <EmptyState>
            <EmptyStateIcon variant="container" component={Spinner} />
            <Title size="lg" headingLevel="h3">
              Fetching Provider Accounts...
            </Title>
          </EmptyState>
        ) : (
          <React.Fragment>
            {fetchInstancesFailed || noInstances ? (
              <EmptyState>
                <EmptyStateIcon variant="container" component={InfoCircleIcon} className="warning-icon" />
                <Title headingLevel="h2" size="md">
                  Database instances retrieval failed
                </Title>
                <EmptyStateBody>Database instances could not be retrieved. Please try again.</EmptyStateBody>
                <Alert
                  variant="danger"
                  isInline
                  title="An error occured"
                  className="co-alert co-break-word extra-top-margin"
                >
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
            ) : (
              <React.Fragment>
                <FormGroup label="Provider Account" fieldId="provider-account" className="provider-account-selection">
                  <FormSelect
                    value={selectedInventory.name}
                    onChange={handleInventorySelection}
                    aria-label="Provider Account"
                  >
                    {inventories?.map((inventory, index) => (
                      <FormSelectOption key={index} value={inventory.name} label={inventory.name} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Database Instance" fieldId="instance-id-filter">
                  <Split>
                    <SplitItem>
                      <InstanceListFilter
                        textInputIDValue={textInputIDValue}
                        setTextInputIDValue={setTextInputIDValue}
                      />
                    </SplitItem>
                    <SplitItem>
                      <Button
                        component="a"
                        href={`/k8s/ns/${currentNS}/rhoda-create-database-instance/db/${selectedDBProvider}/pa/${selectedInventory?.name}`}
                        variant="secondary"
                        className="extra-left-margin"
                      >
                        Create Database Instance
                      </Button>
                    </SplitItem>
                  </Split>
                </FormGroup>
                <FormSection fullWidth flexLayout className="no-top-margin">
                  <InstanceTable
                    connectionAndServiceBindingList={connectionAndServiceBindingList}
                    isLoading={!showResults}
                    data={selectedInventory}
                    isSelectable={selectedInventory?.instances?.length > 0 && filteredInstances.length > 0}
                    filteredInstances={filteredInstances}
                  />
                </FormSection>
              </React.Fragment>
            )}
          </React.Fragment>
        )}
      </FormBody>
    </FlexForm>
  )
}

export default InstanceListPage
