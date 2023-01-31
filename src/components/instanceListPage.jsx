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
import { ExclamationTriangleIcon, ExternalLinkAltIcon, InfoCircleIcon, PlusCircleIcon } from '@patternfly/react-icons'
import * as _ from 'lodash'
import * as React from 'react'
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk'
import {
  crunchyProviderType,
  mongoProviderType,
  cockroachdbProviderType,
  rdsProviderType,
  DBaaSInventoryCRName,
  DBaaSOperatorName,
  mongoShortName,
  crunchyShortName,
  cockroachShortName,
  rdsShortName,
  DBAAS_API_GROUP,
  DBAAS_API_VERSION,
} from '../const'
import { DBAAS_PROVIDER_KIND } from '../catalog/const'
import {
  fetchInventoriesAndMapByNSAndRules,
  fetchObjectsClusterOrNS,
  isDbaasConnectionUsed,
  disableNSSelection,
  filterInventoriesByConnNS,
  fetchDbaasCSV,
  filterInventoriesByConnNSandProvision,
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

const InstanceListPage = () => {
  const [noInstances, setNoInstances] = React.useState(false)
  const [noProvisionableInstances, setNoProvisionableInstances] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState('')
  const [fetchInstancesFailed, setFetchInstancesFailed] = React.useState(false)
  const [textInputNameValue, setTextInputNameValue] = React.useState('')
  const [showResults, setShowResults] = React.useState(false)
  const [inventories, setInventories] = React.useState([])
  const [selectedDBProvider, setSelectedDBProvider] = React.useState('')
  const [dbProviderName, setDBProviderName] = React.useState()
  const [dbProviderLogoUrl, setDBProviderLogoUrl] = React.useState('')
  const [selectedInventory, setSelectedInventory] = React.useState({})
  const [dbaasConnectionList, setDbaasConnectionList] = React.useState([])
  const [serviceBindingList, setServiceBindingList] = React.useState([])
  const [connectionAndServiceBindingList, setConnectionAndServiceBindingList] = React.useState([])
  const [dBaaSOperatorNameWithVersion, setDBaaSOperatorNameWithVersion] = React.useState()
  const [installNamespace, setInstallNamespace] = React.useState('')

  const currentNS = window.location.pathname.split('/')[3]

  const dbProviderTitle = (
    <div className="co-catalog-item-details">
      <span className="co-catalog-item-icon">
        <img className="catalog-item-header-pf-icon" src={dbProviderLogoUrl} alt="logo" aria-hidden />
      </span>
      <div>
        Add {dbProviderName} Instance to Topology{' '}
        <Label className="ocs-preview-badge extra-left-margin">Service Preview</Label>
        <p className="pf-c-form__helper-text">The selected database instance will be added to the topology view.</p>
      </div>
    </div>
  )

  const [dbaasProviders, isProviderFetched, errorMsg] = useK8sWatchResource({
    kind: DBAAS_PROVIDER_KIND,
    isList: false,
  })

  const filteredInstances = React.useMemo(
    () =>
      selectedInventory?.instances?.filter((instance) =>
        instance?.serviceName?.toLowerCase().includes(textInputNameValue.toLowerCase())
      ),
    [selectedInventory.instances, textInputNameValue]
  )

  const mapDBaaSConnectionsAndServiceBindings = () => {
    const newDbaasConnectionList = dbaasConnectionList
    const newServiceBindingList = serviceBindingList
    const newConnectionAndServiceBindingList = []

    if (newDbaasConnectionList.length > 0) {
      newDbaasConnectionList.forEach((dbaasConnection) => {
        if (
          selectedInventory?.instances?.find(
            (instance) => instance.serviceID === dbaasConnection.spec?.databaseServiceID
          )
        ) {
          const connectionObj = {
            serviceID: dbaasConnection?.spec?.databaseServiceID,
            serviceName: dbaasConnection?.metadata?.name,
            connectionStatus: _.isEmpty(dbaasConnection?.status) ? '-' : dbaasConnection?.status?.conditions[0]?.reason,
            errMsg: 'N/A',
            applications: [],
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
    const serviceBindings = await fetchObjectsClusterOrNS(
      'binding.operators.coreos.com',
      'v1alpha1',
      'servicebindings',
      installNamespace
    )
    setServiceBindingList(serviceBindings)
  }

  async function fetchDBaaSConnections() {
    const connections = await fetchObjectsClusterOrNS(
      DBAAS_API_GROUP,
      DBAAS_API_VERSION,
      'dbaasconnections',
      installNamespace
    )
    setDbaasConnectionList(connections)
  }

  const checkInventoryStatus = (inventory) => {
    if (inventory?.status?.conditions[0]?.type === 'SpecSynced') {
      if (inventory?.status?.conditions[0]?.status === 'False') {
        setFetchInstancesFailed(true)
        setStatusMsg(inventory?.status?.conditions[0]?.message)
      } else {
        setFetchInstancesFailed(false)
        setStatusMsg('')
      }
    } else {
      setFetchInstancesFailed(true)
      setStatusMsg('Could not connect with database provider')
    }
    setShowResults(true)
  }

  const handleInventorySelection = (value) => {
    let inventory = _.find(inventories, (inv) => inv.name === value)
    setSelectedInventory(inventory)

    // clear filter value when switch inventory
    setTextInputNameValue('')
    setShowResults(false)
    checkInventoryStatus(inventory)
  }

  const parseSelectedDBProvider = () => {
    const dbProviderType = _.last(window.location.pathname.split('/'))
    let providerInfo = {}
    if (!_.isEmpty(dbaasProviders)) {
      providerInfo = _.find(dbaasProviders?.items, (provider) => provider?.metadata?.name === dbProviderType)
      setDBProviderLogoUrl(
        `data:${providerInfo.spec?.provider?.icon?.mediatype};base64,${providerInfo.spec?.provider?.icon?.base64data}`
      )
    }

    // Cannot parse provider name from CRD
    if (dbProviderType === crunchyProviderType) {
      setDBProviderName(crunchyShortName)
    }
    if (dbProviderType === mongoProviderType) {
      setDBProviderName(mongoShortName)
    }
    if (dbProviderType === cockroachdbProviderType) {
      setDBProviderName(cockroachShortName)
    }
    if (dbProviderType === rdsProviderType) {
      setDBProviderName(rdsShortName)
    }
    setSelectedDBProvider(dbProviderType)
  }

  async function filteredInventoriesByValidConnectionNS(installNS = '') {
    const inventoryData = await fetchInventoriesAndMapByNSAndRules(installNS).catch((error) => {
      setFetchInstancesFailed(true)
      setStatusMsg(error)
    })

    let provisionItems = await filterInventoriesByConnNSandProvision(inventoryData, currentNS)
    if (provisionItems.length > 0) {
      setNoProvisionableInstances(false)
    } else setNoProvisionableInstances(true)
    return await filterInventoriesByConnNS(inventoryData, currentNS)
  }

  async function fetchInstances() {
    let newInventories = []
    let inventoryItems = await filteredInventoriesByValidConnectionNS(installNamespace)

    if (inventoryItems.length > 0) {
      const filteredInventories = _.filter(
        inventoryItems,
        (inventory) => inventory.spec?.providerRef?.name === selectedDBProvider
      )
      if (!_.isEmpty(filteredInventories)) {
        filteredInventories.forEach((inventory, index) => {
          const obj = { id: 0, name: '', namespace: '', instances: [], status: {} }
          obj.id = index
          obj.name = inventory.metadata.name
          obj.namespace = inventory.metadata.namespace
          obj.status = inventory.status

          if (
            inventory.status?.conditions[0]?.status !== 'False' &&
            inventory.status?.conditions[0]?.type === 'SpecSynced'
          ) {
            inventory.status?.databaseServices?.map(
              (instance) => (instance.provider = inventory.spec?.providerRef?.name)
            )
            obj.instances = inventory.status?.databaseServices
          }

          newInventories.push(obj)
        })
      }
    }
    setInventories(newInventories)
    setShowResults(true)
  }

  const fetchCSV = async () => {
    const dbaasCSV = await fetchDbaasCSV(currentNS, DBaaSOperatorName)
    setDBaaSOperatorNameWithVersion(dbaasCSV.metadata?.name)
    setInstallNamespace(dbaasCSV?.metadata?.annotations['olm.operatorNamespace'])
  }

  React.useEffect(() => {
    fetchCSV()
  }, [])

  React.useEffect(() => {
    parseSelectedDBProvider()
  }, [isProviderFetched])

  React.useEffect(() => {
    fetchDBaaSConnections()
    fetchServiceBindings()
  }, [installNamespace])

  React.useEffect(() => {
    disableNSSelection()
    if (!_.isEmpty(selectedDBProvider)) {
      fetchInstances()
    }
  }, [currentNS, selectedDBProvider, installNamespace])

  React.useEffect(() => {
    // Set the first inventory as the selected inventory by default
    if (inventories.length > 0) {
      setSelectedInventory(inventories[0])
      checkInventoryStatus(inventories[0])
      setNoInstances(false)
    } else {
      setNoInstances(true)
      setStatusMsg('There is no Provider Account.')
    }
  }, [inventories])

  React.useEffect(() => {
    mapDBaaSConnectionsAndServiceBindings()
  }, [dbaasConnectionList, serviceBindingList, selectedInventory])

  return (
    <div className="instance-table-container">
      <FormBody flexLayout>
        <FormHeader title={dbProviderTitle} helpText="" marginBottom="lg" />
        {!showResults ? (
          <EmptyState>
            <EmptyStateIcon variant="container" component={Spinner} />
            <Title size="lg" headingLevel="h3">
              Fetching Provider Accounts...
            </Title>
          </EmptyState>
        ) : (
          <>
            {noInstances ? (
              <>
                <EmptyState>
                  <ExclamationTriangleIcon className="warning-icon" size="xl" />
                  <Title headingLevel="h2" size="md" className="emptyState-title">
                    No Database Instances
                  </Title>
                  <EmptyStateBody>
                    You currently have no database Provider Accounts imported. Work with your administrator to &nbsp;
                    <Button
                      variant="link"
                      component="a"
                      href={`/k8s/ns/${currentNS}/clusterserviceversions/${dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/~new`}
                      rel="noopener noreferrer"
                      icon={<ExternalLinkAltIcon />}
                      iconPosition="right"
                      isInline
                    >
                      Import a Provider Account
                    </Button>
                    &nbsp; from the supported cloud-hosted database providers. If you receive an error message when
                    trying to import a provider account, then you do not have the required privileges to access this
                    page.
                  </EmptyStateBody>
                  <EmptyStateSecondaryActions>
                    <Button component="a" href={`/add/ns/${currentNS}`} variant="link">
                      Close
                    </Button>
                  </EmptyStateSecondaryActions>
                </EmptyState>
              </>
            ) : (
              <>
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
                {fetchInstancesFailed ? (
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
                  <>
                    <Split>
                      <SplitItem isFilled>
                        <FormGroup label="Available Database Instances" fieldId="instance-id-filter">
                          <InstanceListFilter
                            textInputNameValue={textInputNameValue}
                            setTextInputNameValue={setTextInputNameValue}
                          />
                        </FormGroup>
                      </SplitItem>
                      <SplitItem>
                        <Button
                          isDisabled={noProvisionableInstances}
                          component="a"
                          href={`/k8s/ns/${currentNS}/rhoda-create-database-instance/db/${selectedDBProvider}/pa/${selectedInventory?.name}`}
                          variant="link"
                          className="extra-left-margin"
                          icon={<PlusCircleIcon />}
                        >
                          Create New Database Instance
                        </Button>
                      </SplitItem>
                    </Split>
                    <FormSection fullWidth flexLayout className="no-top-margin">
                      <InstanceTable
                        connectionAndServiceBindingList={connectionAndServiceBindingList}
                        isLoading={!showResults}
                        data={selectedInventory}
                        isSelectable={selectedInventory?.instances?.length > 0 && filteredInstances.length > 0}
                        filteredInstances={filteredInstances}
                      />
                    </FormSection>
                  </>
                )}
              </>
            )}
          </>
        )}
      </FormBody>
    </div>
  )
}

export default InstanceListPage
