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
  rdsProviderName,
  rdsProviderType,
  DBAAS_API_VERSION,
} from '../const'
import {
  fetchDbaasCSV,
  fetchObjectsClusterOrNS,
  isDbaasConnectionUsed,
  fetchInventoriesAndMapByNSAndRules,
  filterInventoriesByConnNSandProvision,
} from '../utils'
import AdminConnectionsTable from './adminConnectionsTable'
import FormBody from './form/formBody'
import FormHeader from './form/formHeader'
import InstanceListFilter from './instanceListFilter'
import { handleCancel, handleTryAgain } from './instanceListPage'
import './_dbaas-import-view.css'

const AdminDashboard = () => {
  const [noInstances, setNoInstances] = useState(false)
  const [noProvisionableInstances, setNoProvisionableInstances] = useState(true)
  const [statusMsg, setStatusMsg] = useState('')
  const [fetchInstancesFailed, setFetchInstancesFailed] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [inventories, setInventories] = useState([])
  const [dbaasConnectionList, setDbaasConnectionList] = useState([])
  const [serviceBindingList, setServiceBindingList] = useState([])
  const [inventoryInstances, setInventoryInstances] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [dBaaSOperatorNameWithVersion, setDBaaSOperatorNameWithVersion] = useState('')
  const [textInputNameValue, setTextInputNameValue] = useState('')
  const [installNamespace, setInstallNamespace] = useState('')
  const [allNamespaces, setAllNamespaces] = useState(true)
  const [retrieve, setRetrieve] = useState(true)
  const [initialLanding, setInitialLanding] = useState(true)

  const currentNS = window.location.pathname.split('/')[3]

  const filteredInstances = React.useMemo(
    () =>
      inventoryInstances?.filter((instance) => {
        const nameStr = instance.serviceName
        return nameStr.toLowerCase().includes(textInputNameValue.toLowerCase())
      }),
    [inventoryInstances, textInputNameValue]
  )

  const dropdownItems = [
    <DropdownItem
      key="link"
      href={`/k8s/ns/${currentNS}/dbaas-admin-dashboard/import-provider-account`}
      isDisabled={allNamespaces}
    >
      Import Database Provider Account
    </DropdownItem>,
    <DropdownItem
      key="dbinstancelink"
      href={`/k8s/ns/${currentNS}/dbaas-create-database-instance`}
      isDisabled={noProvisionableInstances}
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
    let invInstances = []

    if (newDbaasConnectionList.length > 0) {
      newDbaasConnectionList.forEach((dbaasConnection) => {
        const connectionObj = {
          serviceID: dbaasConnection?.spec?.databaseServiceID,
          serviceName: dbaasConnection?.metadata?.name,
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
      let dbProvider = ''
      dbProvider = inventory.providername
      if (inventory.providername === crunchyProviderType) {
        dbProvider = crunchyProviderName
      } else if (inventory.providername === mongoProviderType) {
        dbProvider = mongoProviderName
      } else if (inventory.providername === cockroachdbProviderType) {
        dbProvider = cockroachdbProviderName
      } else if (inventory.providername === rdsProviderType) {
        dbProvider = rdsProviderName
      }
      if (inventory.instances?.length > 0) {
        for (let dbInstance of inventory.instances) {
          const inventoryInstance = {}
          inventoryInstance.serviceName = dbInstance.serviceName
          inventoryInstance.dbProvider = dbProvider
          inventoryInstance.providerAcct = inventory.name
          inventoryInstance.alert = inventory.alert
          inventoryInstance.serviceID = dbInstance.serviceID
          inventoryInstance.connections = []
          if (newConnectionAndServiceBindingList.length === 0) {
            inventoryInstance.connections.push(['--', '--', '--', '--'])
          } else {
            for (let connection of newConnectionAndServiceBindingList) {
              if (
                connection.serviceID === dbInstance.serviceID &&
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
          invInstances.push(inventoryInstance)
        }
      }
    })
    setInventoryInstances(invInstances)
  }

  const fetchServiceBindings = async () => {
    if (!_.isEmpty(installNamespace)) {
      const serviceBindings = await fetchObjectsClusterOrNS(
        'binding.operators.coreos.com',
        'v1alpha1',
        'servicebindings',
        installNamespace
      )
      setServiceBindingList(serviceBindings)
    }
  }

  const fetchDBaaSConnections = async () => {
    if (!_.isEmpty(installNamespace)) {
      const connections = await fetchObjectsClusterOrNS(
        'dbaas.redhat.com',
        DBAAS_API_VERSION,
        'dbaasconnections',
        installNamespace
      )
      setDbaasConnectionList(connections)
    }
  }

  const fetchInstances = async () => {
    if (!_.isEmpty(installNamespace)) {
      const inventoryData = await fetchInventoriesAndMapByNSAndRules(installNamespace).catch((error) => {
        setFetchInstancesFailed(true)
        setStatusMsg(error)
      })

      if (!allNamespaces) {
        let provisionItems = await filterInventoriesByConnNSandProvision(inventoryData, currentNS)
        if (provisionItems.length > 0) {
          setNoProvisionableInstances(false)
        } else setNoProvisionableInstances(true)
      }

      const inventoriesAll = []
      if (inventoryData.inventoryList.length > 0) {
        let filteredInventories = _.filter(
          inventoryData.inventoryList,
          (inventory) => inventory.status?.databaseServices !== undefined
        )
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
            inventory.status?.databaseServices?.map(
              (instance) => (instance.provider = inventory.spec?.providerRef?.name)
            )
            obj.instances = inventory.status?.databaseServices
            if (specSyncedCondition.status === 'False' || inventoryReadyCondition.status === 'False') {
              if (specSyncedCondition.reason === 'AuthenticationError') {
                obj.alert = 'Can not establish a connection to this database instance.'
              } else {
                obj.alert = 'alert'
              }
            }
          }

          if (allNamespaces || obj.namespace === currentNS) {
            inventoriesAll.push(obj)
          }
        })
      }
      setInventories(inventoriesAll)
      setInitialLanding(false)
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

  const fetchCSV = async (currentNS = '') => {
    let dbaasCSV = await fetchDbaasCSV(currentNS, DBaaSOperatorName)
    if (!_.isEmpty(dbaasCSV)) {
      setDBaaSOperatorNameWithVersion(dbaasCSV?.metadata?.name)
      setInstallNamespace(dbaasCSV?.metadata?.annotations['olm.operatorNamespace'])
    } else {
      setShowResults(true)
      setInitialLanding(false)
    }
  }

  const goToCreateProviderPage = () => {
    if (!allNamespaces) {
      window.location.pathname = `/k8s/ns/${currentNS}/clusterserviceversions/${dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/~new`
    }
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
    setShowResults(false)
    setNoInstances(true)
    setNoProvisionableInstances(true)
    if (window.location.pathname.split('/')[2] === 'ns') {
      setAllNamespaces(false)
      fetchCSV(currentNS)
    } else {
      setAllNamespaces(true)
      fetchCSV('')
    }
    if (retrieve) {
      setRetrieve(false)
    } else setRetrieve(true)
  }, [currentNS])

  React.useEffect(() => {
    fetchInstances()
  }, [retrieve, installNamespace, allNamespaces])

  React.useEffect(() => {
    fetchDBaaSConnections()
    fetchServiceBindings()
  }, [inventories, installNamespace])

  React.useEffect(() => {
    mapDBaaSConnectionsAndServiceBindings()
  }, [inventories, dbaasConnectionList, serviceBindingList])

  React.useEffect(() => {
    if (inventoryInstances.length > 0) {
      setNoInstances(false)
    } else setNoInstances(true)
    setShowResults(true)
  }, [inventoryInstances])

  return (
    <div className="instance-table-container">
      <FormBody flexLayout>
        {!showResults || initialLanding ? (
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
                      helpText="Create and view database instances, or import a database provider account."
                      marginBottom="lg"
                    />
                  </SplitItem>
                  <SplitItem>
                    <Dropdown
                      onSelect={onSelect}
                      position={DropdownPosition.right}
                      toggle={
                        <DropdownToggle onToggle={onToggle} toggleIndicator={CaretDownIcon} isPrimary id="toggle-id-4">
                          Configure
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
    </div>
  )
}

export default AdminDashboard
