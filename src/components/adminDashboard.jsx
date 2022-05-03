/* eslint-disable prettier/prettier */
import {
  Alert,
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  FormSection,
  Label,
  Spinner,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core'
import CaretDownIcon from '@patternfly/react-icons/dist/esm/icons/caret-down-icon'
import * as _ from 'lodash'
import React, { useState } from 'react'
import { InfoCircleIcon } from '@patternfly/react-icons'
import {
  DBaaSInventoryCRName,
  DBaaSOperatorName,
  cockroachdbProviderName,
  cockroachdbProviderType,
  crunchyProviderName,
  crunchyProviderType,
  mongoProviderName,
  mongoProviderType,
} from '../const'
import {
  disableNSSelection,
  enableNSSelection,
  fetchDbaasCSV,
  fetchInventoriesByNSAndRules,
  fetchObjectsByNamespace,
  fetchObjectsClusterOrNS,
  isDbaasConnectionUsed,
} from '../utils'
import AdminConnectionsTable from './adminConnectionsTable'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import FormHeader from './form/formHeader'
import InstanceListFilter from './instanceListFilter'
import { handleCancel, handleTryAgain } from './instanceListPage'
import './_dbaas-import-view.css'

const AdminDashboard = () => {
  const [noInstances, setNoInstances] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [fetchInstancesFailed, setFetchInstancesFailed] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [inventories, setInventories] = useState([])
  const [dbaasConnectionList, setDbaasConnectionList] = useState([])
  const [serviceBindingList, setServiceBindingList] = useState([])
  const [inventoryInstances, setInventoryInstances] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [dBaaSOperatorNameWithVersion, setDBaaSOperatorNameWithVersion] = useState()
  const [textInputNameValue, setTextInputNameValue] = useState('')

  const currentNS = window.location.pathname.split('/')[3]

  const filteredInstances = React.useMemo(
    () =>
      inventoryInstances?.filter((instance) => {
        const nameStr = instance.instanceName
        return nameStr.toLowerCase().includes(textInputNameValue.toLowerCase())
      }),
    [inventoryInstances, textInputNameValue]
  )

  const dropdownItems = [
    <DropdownItem
      key="link"
      href={`/k8s/ns/${currentNS}/clusterserviceversions/${dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/~new`}
    >
      Import Database Provider Account
    </DropdownItem>,
    <DropdownItem
      key="dbinstancelink"
      href={`/k8s/ns/${currentNS}/rhoda-create-database-instance`}
      isDisabled={noInstances}
    >
      Create Database Instance
    </DropdownItem>,
  ]

  const dbProviderTitle = (
    <div>
      Database Access <Label className="ocs-preview-badge extra-left-margin">Service Preview</Label>
    </div>
  )

  const mapDBaaSConnectionsAndServiceBindings = async () => {
    const newDbaasConnectionList = dbaasConnectionList
    const newServiceBindingList = serviceBindingList
    const newConnectionAndServiceBindingList = []

    if (newDbaasConnectionList.length > 0) {
      newDbaasConnectionList.forEach((dbaasConnection) => {
        const connectionObj = {
          instanceID: dbaasConnection?.spec?.instanceID,
          instanceName: dbaasConnection?.metadata?.name,
          connectionStatus: _.isEmpty(dbaasConnection?.status) ? '-' : dbaasConnection?.status?.conditions[0]?.reason,
          errMsg: 'N/A',
          applications: [],
          users: [],
          namespace: _.isEmpty(dbaasConnection?.metadata?.namespace) ? '-' : dbaasConnection?.metadata?.namespace,
          providerAcct: dbaasConnection?.spec?.inventoryRef?.name,
          providerNamespace: dbaasConnection?.spec?.inventoryRef?.namespace,
        }
        if (!_.isEmpty(dbaasConnection?.status) && dbaasConnection?.status?.conditions[0]?.status !== 'True') {
          connectionObj.errMsg = dbaasConnection?.status?.conditions[0]?.message
        }
        if (newServiceBindingList.find((serviceBinding) => isDbaasConnectionUsed(serviceBinding, dbaasConnection))) {
          newServiceBindingList.forEach((serviceBinding) => {
            if (isDbaasConnectionUsed(serviceBinding, dbaasConnection)) {
              const newConnectionObj = _.extend({}, connectionObj)
              newConnectionObj.applications.push(serviceBinding.spec?.application)
              if (serviceBinding.metadata?.annotations?.['servicebinding.io/requester'] !== undefined) {
                const obj = JSON.parse(serviceBinding.metadata?.annotations?.['servicebinding.io/requester'])
                newConnectionObj.users.push(obj.username)
              } else {
                newConnectionObj.users.push('--')
              }
            }
          })
        }
        newConnectionAndServiceBindingList.push(connectionObj)
      })
    }

    inventories?.forEach((inventory) => {
      let dbProvider
      if (inventory.providername === crunchyProviderType) {
        dbProvider = crunchyProviderName
      } else if (inventory.providername === mongoProviderType) {
        dbProvider = mongoProviderName
      } else if (inventory.providername === cockroachdbProviderType) {
        dbProvider = cockroachdbProviderName
      }
      if (inventory.instances?.length > 0) {
        for (let dbInstance of inventory.instances) {
          const inventoryInstance = {}
          inventoryInstance.instanceName = dbInstance.name
          inventoryInstance.dbProvider = dbProvider
          inventoryInstance.providerAcct = inventory.name
          inventoryInstance.alert = inventory.alert
          inventoryInstance.instanceID = dbInstance.instanceID
          inventoryInstance.connections = []
          if (newConnectionAndServiceBindingList.length === 0) {
            inventoryInstance.connections.push(['--', '--', '--', '--'])
          } else {
            for (let connection of newConnectionAndServiceBindingList) {
              if (
                connection.instanceID === dbInstance.instanceID &&
                inventory.name === connection.providerAcct &&
                connection.providerNamespace === inventory.namespace
              ) {
                for (let i = 0; i < connection.applications.length; i++) {
                  if (i === 0) {
                    inventoryInstance.connections.push([
                      connection.namespace,
                      'Yes',
                      connection.users[i],
                      connection.applications[i].name,
                    ])
                  } else {
                    inventoryInstance.connections.push([
                      '--',
                      'Yes',
                      connection.users[i],
                      connection.applications[i].name,
                    ])
                  }
                }
                if (connection.applications.length === 0) {
                  inventoryInstance.connections.push([connection.namespace, 'No', '--', '--'])
                }
              }
            }
            if (inventoryInstance.connections.length === 0) {
              inventoryInstance.connections.push(['--', '--', '--', '--'])
            }
          }
          inventoryInstances.push(inventoryInstance)
        }
      }
    })
    setInventoryInstances(inventoryInstances)
  }

  const fetchServiceBindings = async () => {
    const serviceBindings = await fetchObjectsClusterOrNS('binding.operators.coreos.com', 'v1alpha1', 'servicebindings')
    setServiceBindingList(serviceBindings)
  }

  const fetchDBaaSConnections = async () => {
    const connections = await fetchObjectsClusterOrNS('dbaas.redhat.com', 'v1alpha1', 'dbaasconnections')
    setDbaasConnectionList(connections)
  }

  const fetchInstances = async () => {
    const inventoriesAll = []
    const inventoryItems = await fetchInventoriesByNSAndRules().catch((error) => {
      setFetchInstancesFailed(true)
      setStatusMsg(error)
    })
    if (inventoryItems.length > 0) {
      let filteredInventories = _.filter(inventoryItems, (inventory) => inventory.status?.instances !== undefined)
      filteredInventories.forEach((inventory, index) => {
        const obj = { id: 0, name: '', namespace: '', instances: [], status: {}, providername: '', alert: '' }
        obj.id = index
        obj.name = inventory.metadata?.name
        obj.namespace = inventory.metadata?.namespace
        obj.status = inventory.status
        obj.providername = inventory.spec?.providerRef?.name

        let inventoryReadyCondition = inventory?.status?.conditions?.find(
          (condition) => condition.type?.toLowerCase() === 'inventoryready'
        )
        let specSyncedCondition = inventory?.status?.conditions?.find(
          (condition) => condition.type?.toLowerCase() === 'specsynced'
        )
        if (specSyncedCondition.type === 'SpecSynced') {
          inventory.status?.instances?.map((instance) => (instance.provider = inventory.spec?.providerRef?.name))
          obj.instances = inventory.status?.instances
          if (specSyncedCondition.status === 'False' || inventoryReadyCondition.status === 'False') {
            obj.alert = 'alert'
          }
        }

        inventoriesAll.push(obj)
      })
      setInventories(inventoriesAll)
      setShowResults(true)
    } else {
      setNoInstances(true)
      setShowResults(true)
    }
  }

  const onToggle = (isOpen) => {
    setIsOpen(isOpen)
  }
  const onSelect = (event) => {
    setIsOpen(!isOpen)
    onFocus()
  }
  const onFocus = () => {
    const element = document.getElementById('toggle-id-4')
    element.focus()
  }

  const fetchCSV = async () => {
    const dbaasCSV = await fetchDbaasCSV(currentNS, DBaaSOperatorName)
    setDBaaSOperatorNameWithVersion(dbaasCSV.metadata?.name)
  }

  const goToCreateProviderPage = () => {
    window.location.pathname = `/k8s/ns/${currentNS}/clusterserviceversions/${dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/~new`
  }

  const displayInstancesFailed = () => {
    return (
      <EmptyState>
        <EmptyStateIcon variant="container" component={InfoCircleIcon} className="warning-icon" />
        <Title headingLevel="h2" size="md">
          Database instances retrieval failed
        </Title>
        <EmptyStateBody>Database instances could not be retrieved. Please try again.</EmptyStateBody>
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
    )
  }

  React.useEffect(() => {
    disableNSSelection()
    fetchInstances()
    fetchDBaaSConnections()
    fetchServiceBindings()
    fetchCSV()

    return () => {
      enableNSSelection()
    }
  }, [])

  React.useEffect(() => {
    mapDBaaSConnectionsAndServiceBindings()
  }, [dbaasConnectionList, serviceBindingList, inventories])

  return (
    <FlexForm className="instance-table-container">
      <FormBody flexLayout>
        {!showResults ? (
          <EmptyState>
            <EmptyStateIcon variant="container" component={Spinner} />
            <Title size="lg" headingLevel="h3">
              Fetching Provider Accounts and database instances...
            </Title>
          </EmptyState>
        ) : (
          <>
            {fetchInstancesFailed ? (
              displayInstancesFailed()
            ) : (
              <>
                <Split>
                  <SplitItem isFilled>
                    <FormHeader
                      title={dbProviderTitle}
                      helpText="Import database provider account and view your database instances"
                      marginBottom="lg"
                    />
                  </SplitItem>
                  <SplitItem>
                    <Dropdown
                      onSelect={onSelect}
                      position={DropdownPosition.right}
                      toggle={
                        <DropdownToggle onToggle={onToggle} toggleIndicator={CaretDownIcon} isPrimary id="toggle-id-4">
                          Configuration
                        </DropdownToggle>
                      }
                      isOpen={isOpen}
                      dropdownItems={dropdownItems}
                    />
                  </SplitItem>
                </Split>
                <Divider />
                <InstanceListFilter
                  textInputNameValue={textInputNameValue}
                  setTextInputNameValue={setTextInputNameValue}
                />
                <FormSection fullWidth flexLayout className="no-top-margin">
                  <AdminConnectionsTable
                    filteredInstances={filteredInstances}
                    dBaaSOperatorNameWithVersion={dBaaSOperatorNameWithVersion}
                    inventoryInstances={inventoryInstances}
                    noInstances={noInstances}
                  />
                </FormSection>
              </>
            )}
          </>
        )}
      </FormBody>
    </FlexForm>
  )
}

export default AdminDashboard
