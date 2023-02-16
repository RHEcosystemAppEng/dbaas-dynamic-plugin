import * as React from 'react'
import * as _ from 'lodash'
import './_dbaas-import-view.css'
import {
  Title,
  TextInput,
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
  HelperTextItem,
  HelperText,
  FormSection,
} from '@patternfly/react-core'
import { InfoCircleIcon, CheckCircleIcon, ExternalLinkAltIcon, HelpIcon } from '@patternfly/react-icons'
import FormHeader from './form/formHeader'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import { mongoProviderType, crunchyProviderType, rdsProviderType, DBaaSOperatorName, DBAAS_API_VERSION } from '../const'
import {
  getCSRFToken,
  fetchInventoriesAndMapByNSAndRules,
  disableNSSelection,
  enableNSSelection,
  filterInventoriesByConnNSandProvision,
  fetchDbaasCSV,
} from '../utils'

const LoadingView = ({ loadingMsg }) => (
  <>
    <EmptyState>
      <EmptyStateIcon variant="container" component={Spinner} />
      <Title size="lg" headingLevel="h3">
        {loadingMsg}
      </Title>
    </EmptyState>
  </>
)

const FailedView = ({ handleTryAgain, handleCancel, statusMsg }) => (
  <>
    <EmptyState>
      <EmptyStateIcon variant="container" component={InfoCircleIcon} className="error-icon" />
      <Title headingLevel="h2" size="md">
        Database instance creation failed
      </Title>
      <EmptyStateBody>The instance was not created. Try again.</EmptyStateBody>
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
  </>
)

const SuccessView = ({ goToInstancesPage }) => (
  <>
    <EmptyState>
      <EmptyStateIcon variant="container" component={CheckCircleIcon} className="success-icon" />
      <Title headingLevel="h2" size="md">
        Database instance creation started
      </Title>
      <EmptyStateBody>The database instance is being created, please click the button below to view it.</EmptyStateBody>
      <Button variant="primary" onClick={goToInstancesPage}>
        View Database Instances
      </Button>
    </EmptyState>
  </>
)

const ProviderClusterProvisionPage = () => {
  const [plan, setPlan] = React.useState([])
  const [planOptions, setPlanOptions] = React.useState([])
  const [isPlanFieldValid, setIsPlanFieldValid] = React.useState('')
  const [cloudProvider, setCloudProvider] = React.useState([])
  const [cpOptions, setCpOptions] = React.useState([])
  const [databaseType, setDatabaseType] = React.useState([])
  const [isCloudProviderFieldValid, setIsCloudProviderFieldValid] = React.useState('')
  const [selectedProvisioningData, setSelectedProvisioningData] = React.useState({})
  const [isSpendLimitFieldValid, setIsSpendLimitFieldValid] = React.useState('')
  const [isRegionFieldValid, setIsRegionFieldValid] = React.useState('')
  const [isNodesFieldValid, setIsNodesFieldValid] = React.useState('')
  const [isMachineTypeFieldValid, setIsMachineTypeFieldValid] = React.useState('')
  const [isStorageFieldValid, setIsStorageFieldValid] = React.useState('')
  const [isDatabaseTypeFieldValid, setIsDatabaseTypeFieldValid] = React.useState('')
  const [isTeamProjectFieldValid, setIsTeamProjectFieldValid] = React.useState('')

  const [filteredFieldsMap, setFilteredFieldsMap] = React.useState(new Map())
  const [providerChosenOptionsMap, setProviderChosenOptionsMap] = React.useState(new Map())

  const [loadingMsg, setLoadingMsg] = React.useState('Fetching Database Providers and Provider Accounts...')
  const [providerList, setProviderList] = React.useState([{ value: '', label: 'Select database provider' }])
  const [selectedDBProvider, setSelectedDBProvider] = React.useState({})
  const [inventories, setInventories] = React.useState([])
  const [filteredInventories, setFilteredInventories] = React.useState([{ name: 'Select provider account' }])
  const [selectedInventory, setSelectedInventory] = React.useState({})
  const [clusterName, setClusterName] = React.useState('')

  const [statusMsg, setStatusMsg] = React.useState('')
  const [inventoryHasIssue, setInventoryHasIssue] = React.useState(false)
  const [showResults, setShowResults] = React.useState(false)
  const [clusterProvisionFailed, setClusterProvisionFailed] = React.useState(false)
  const [clusterProvisionSuccess, setClusterProvisionSuccess] = React.useState(false)
  const [provisionRequestFired, setProvisionRequestFired] = React.useState(false)
  const [isDBProviderFieldValid, setIsDBProviderFieldValid] = React.useState('')
  const [isInventoryFieldValid, setIsInventoryFieldValid] = React.useState('')
  const [isNameFieldValid, setIsNameFieldValid] = React.useState('')
  const [isFormValid, setIsFormValid] = React.useState(false)
  const [installNamespace, setInstallNamespace] = React.useState('')
  const currentNS = window.location.pathname.split('/')[3]
  const devSelectedDBProviderName = window.location.pathname.split('/db/')[1]?.split('/pa/')[0]
  const devSelectedProviderAccountName = window.location.pathname.split('/pa/')[1]
  const checkDBClusterStatusIntervalID = React.useRef()
  const checkDBClusterStatusTimeoutID = React.useRef()
  const validationFields = [
    ['plan', 'PlanFieldValid'],
    ['cloudProvider', 'CloudProviderFieldValid'],
    ['name', 'NameFieldValid'],
    ['regions', 'RegionFieldValid'],
    ['nodes', 'NodesFieldValid'],
    ['spendLimit', 'SpendLimitFieldValid'],
    ['databaseType', 'DatabaseTypeFieldValid'],
    ['machineType', 'MachineTypeFieldValid'],
    ['storageGib', 'StorageFieldValid'],
    ['teamProject', 'TeamProjectFieldValid'],
  ]
  const validationFieldMap = new Map(validationFields)

  const checkInventoryStatus = (inventory) => {
    if (inventory?.status?.conditions[0]?.type === 'SpecSynced') {
      if (inventory?.status?.conditions[0]?.status === 'False') {
        setInventoryHasIssue(true)
        setStatusMsg(inventory?.status?.conditions[0]?.message)
      } else {
        setInventoryHasIssue(false)
        setStatusMsg('')
      }
    } else {
      setInventoryHasIssue(true)
      setStatusMsg('Could not connect with database provider')
    }
  }

  const detectSelectedDBProviderAndProviderAccount = () => {
    if (!_.isEmpty(devSelectedDBProviderName) && !_.isEmpty(providerList)) {
      const provider = _.find(providerList, (dbProvider) => dbProvider.value === devSelectedDBProviderName)
      setSelectedDBProvider(provider)
      filterInventoriesByProvider(provider)
      setIsDBProviderFieldValid(ValidatedOptions.default)
      setSelectedProvisioningData(provider.providerProvisioningData)
      setDefaultProviderData(provider.providerProvisioningData)
      setProviderFields()
      setIsFormValid(false)
    }

    if (!_.isEmpty(devSelectedProviderAccountName) && !_.isEmpty(inventories)) {
      const inventory = inventories.forEach((inv) => {
        if (inv.name === devSelectedProviderAccountName) {
          checkInventoryStatus(inv)
          setSelectedInventory(inv)
          setIsInventoryFieldValid(ValidatedOptions.default)
        }
      })
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
      const requestOpts = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }

      fetch(
        `/api/kubernetes/apis/dbaas.redhat.com/${DBAAS_API_VERSION}/namespaces/${currentNS}/dbaasinstances/${clusterName}`,
        requestOpts
      )
        .then((response) => response.json())
        .then((responseJson) => {
          const provisionReadyCondition = responseJson?.status?.conditions?.find(
            (condition) => condition.type?.toLowerCase() === 'provisionready'
          )

          if (responseJson?.status?.phase?.toLowerCase() === 'creating') {
            setClusterProvisionSuccess(true)
            clearInterval(checkDBClusterStatusIntervalID.current)
            clearTimeout(checkDBClusterStatusTimeoutID.current)
            setShowResults(true)
          } else if (responseJson?.status?.phase?.toLowerCase() === 'failed') {
            if (provisionReadyCondition?.status.toLowerCase() === 'false') {
              setClusterProvisionFailed(true)
              setStatusMsg(provisionReadyCondition?.message)
              clearInterval(checkDBClusterStatusIntervalID.current)
              clearTimeout(checkDBClusterStatusTimeoutID.current)
              setShowResults(true)
            }
          } else if (responseJson?.status?.phase?.toLowerCase() === 'ready') {
            setClusterProvisionSuccess(true)
            clearInterval(checkDBClusterStatusIntervalID.current)
            clearTimeout(checkDBClusterStatusTimeoutID.current)
            setShowResults(true)
          } else {
            if (!_.isEmpty(provisionReadyCondition?.message)) {
              setStatusMsg(provisionReadyCondition?.message)
            } else {
              setStatusMsg('Could not connect with database provider')
            }
            if (!checkDBClusterStatusTimeoutID.current) {
              checkDBClusterStatusTimeoutID.current = setTimeout(() => {
                setClusterProvisionFailed(true)
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

    let provisioningParameters = {}

    if (providerChosenOptionsMap.size > 0) {
      for (const [mapKey, mapValue] of providerChosenOptionsMap) {
        if (mapValue.value === undefined) {
          provisioningParameters[mapKey] = mapValue
        } else {
          provisioningParameters[mapKey] = mapValue.value
        }
      }
    }

    const requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify({
        apiVersion: `dbaas.redhat.com/${DBAAS_API_VERSION}`,
        kind: 'DBaaSInstance',
        metadata: {
          name: clusterName,
          namespace: currentNS,
        },
        spec: {
          name: clusterName,
          inventoryRef: {
            name: selectedInventory.name,
            namespace: selectedInventory.namespace,
          },
          provisioningParameters,
        },
      }),
    }

    setShowResults(false)
    setLoadingMsg('Creating Database Instance...')

    fetch(
      `/api/kubernetes/apis/dbaas.redhat.com/${DBAAS_API_VERSION}/namespaces/${currentNS}/dbaasinstances`,
      requestOpts
    )
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

  const fetchCSV = async () => {
    const dbaasCSV = await fetchDbaasCSV(currentNS, DBaaSOperatorName)
    setInstallNamespace(dbaasCSV?.metadata?.annotations['olm.operatorNamespace'])
  }

  const filterInventoriesByProvider = (provider) => {
    if (!_.isEmpty(provider)) {
      const filteredInventoryList = _.filter(inventories, (inventory) => inventory.providerRef?.name === provider.value)
      setFilteredInventories(filteredInventoryList)

      // Set the first inventory as the selected inventory by default
      if (filteredInventoryList.length > 0) {
        checkInventoryStatus(filteredInventoryList[0])
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
      const inventories = []

      inventoryItems.forEach((inventory, index) => {
        const obj = { id: 0, name: '', namespace: '', instances: [], status: {}, providerRef: {} }
        obj.id = index
        obj.name = inventory.metadata?.name
        obj.namespace = inventory.metadata?.namespace
        obj.status = inventory.status
        obj.providerRef = inventory.spec?.providerRef

        if (
          inventory.status?.conditions[0]?.status !== 'False' &&
          inventory.status?.conditions[0]?.type === 'SpecSynced'
        ) {
          inventory.status?.databaseServices?.map((instance) => (instance.provider = inventory.spec?.providerRef?.name))
          obj.instances = inventory.status?.databaseServices
        }

        inventories.push(obj)
      })
      setInventories(inventories)
      setShowResults(true)
    }
  }

  async function fetchInventoriesByNSAndRules() {
    const inventoryItems = await filteredInventoriesByValidConnectionNS(installNamespace)
    parseInventories(inventoryItems)
  }

  async function filteredInventoriesByValidConnectionNS(installNS = '') {
    const inventoryData = await fetchInventoriesAndMapByNSAndRules(installNS).catch((error) => {
      console.log(error)
    })
    return await filterInventoriesByConnNSandProvision(inventoryData, currentNS)
  }

  const validateForm = () => {
    let isValid =
      isDBProviderFieldValid === ValidatedOptions.default && isInventoryFieldValid === ValidatedOptions.default

    if (providerChosenOptionsMap.size > 0) {
      for (const [key] of providerChosenOptionsMap) {
        if (key === 'teamProject' && selectedDBProvider.value === crunchyProviderType) {
          continue
        }
        isValid = isValid && eval(`is${validationFieldMap.get(key)}`) === ValidatedOptions.default
      }
    }
    setIsFormValid(isValid)
  }

  const handleProjectNameChange = (value) => {
    if (_.isEmpty(value)) {
      setIsTeamProjectFieldValid(ValidatedOptions.error)
    } else {
      setIsTeamProjectFieldValid(ValidatedOptions.default)
    }
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('teamProject', value)))
  }

  const handleServiceNameChange = (value) => {
    if (_.isEmpty(value)) {
      setIsNameFieldValid(ValidatedOptions.error)
    } else {
      setIsNameFieldValid(ValidatedOptions.default)
    }
    setClusterName(value)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('name', value)))
  }

  const handleInventorySelection = (value) => {
    if (_.isEmpty(value)) {
      setIsInventoryFieldValid(ValidatedOptions.error)
    } else {
      setIsInventoryFieldValid(ValidatedOptions.default)
    }
    const inventory = _.find(inventories, (inv) => inv.name === value)
    checkInventoryStatus(inventory)
    setSelectedInventory(inventory)
  }

  const filterSelected = (unfilteredList) => {
    let matchedItem

    filterLoop: for (const item of unfilteredList) {
      if (item.dependencies !== undefined) {
        for (const dependsItem of item.dependencies) {
          if (dependsItem.value !== providerChosenOptionsMap.get(dependsItem.field).value) {
            continue filterLoop
          }
        }
      }
      matchedItem = item
    }
    return matchedItem
  }

  const setDefaultProviderData = (providerProvisioningData) => {
    providerChosenOptionsMap.clear()
    // setting plan options and initial value
    if (providerProvisioningData.plan?.conditionalData[0].defaultValue === undefined) {
      setIsPlanFieldValid(ValidatedOptions.error)
    } else {
      const defatulPlan = _.find(
        providerProvisioningData.plan?.conditionalData[0].options,
        (item) => item.value === providerProvisioningData.plan?.conditionalData[0].defaultValue
      )
      setPlan(defatulPlan)
      setPlanOptions(providerProvisioningData.plan.conditionalData[0].options)
      setIsPlanFieldValid(ValidatedOptions.default)
      setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('plan', defatulPlan)))
    }
    // setting cloud provider options and initial value
    const cpDefault = filterSelected(providerProvisioningData.cloudProvider.conditionalData)

    if (cpDefault.defaultValue === undefined) {
      setIsCloudProviderFieldValid(ValidatedOptions.error)
    } else {
      const cloudProviderDefault = _.find(cpDefault.options, (item) => item.value === cpDefault.defaultValue)
      setCloudProvider(cloudProviderDefault)
      setCpOptions(cpDefault.options)
      setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('cloudProvider', cloudProviderDefault)))
      setIsCloudProviderFieldValid(ValidatedOptions.default)
    }
  }

  const handleDBProviderSelection = (value) => {
    if (_.isEmpty(value)) {
      setIsDBProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsDBProviderFieldValid(ValidatedOptions.default)
    }
    if (!_.isEmpty(providerList)) {
      const provider = _.find(providerList, (dbProvider) => dbProvider.value === value)
      setInventoryHasIssue(false)
      setSelectedDBProvider(provider)
      setIsFormValid(false)
      setSelectedProvisioningData(provider.providerProvisioningData)
      setDefaultProviderData(provider.providerProvisioningData)
      filterInventoriesByProvider(provider)
    }
  }

  const fetchProviderInfo = () => {
    const requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    fetch(`/api/kubernetes/apis/dbaas.redhat.com/${DBAAS_API_VERSION}/dbaasproviders`, requestOpts)
      .then((response) => response.json())
      .then((data) => {
        const dbProviderList = []
        data.items?.forEach((dbProvider) => {
          dbProviderList.push({
            value: dbProvider?.metadata?.name,
            label: dbProvider?.spec?.provider?.displayName,
            allowsFreeTrial: dbProvider?.spec?.allowsFreeTrial,
            externalProvisionInfo: {
              url: dbProvider?.spec?.externalProvisionURL,
              desc: dbProvider?.spec?.externalProvisionDescription,
            },
            providerProvisioningData: dbProvider?.spec?.provisioningParameters,
          })
        })
        setProviderList(providerList.concat(dbProviderList))
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handlePlanChange = (value) => {
    if (_.isEmpty(value)) {
      setIsPlanFieldValid(ValidatedOptions.error)
    } else {
      setIsPlanFieldValid(ValidatedOptions.default)
    }
    const selectedPlan = _.find(planOptions, (cpPlan) => cpPlan.displayValue === value)
    setPlan(selectedPlan)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('plan', plan)))
  }

  const handleRegionChange = (value) => {
    if (_.isEmpty(value) || value === '') {
      setIsRegionFieldValid(ValidatedOptions.error)
    } else {
      setIsRegionFieldValid(ValidatedOptions.default)
    }
    const selectedRegion = _.find(filteredFieldsMap.get('regions').options, (cpRegion) => cpRegion.value === value)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('regions', selectedRegion)))
  }

  const handleDatabaseTypeChange = (value) => {
    if (_.isEmpty(value) || value === '') {
      setIsDatabaseTypeFieldValid(ValidatedOptions.error)
    } else {
      setIsDatabaseTypeFieldValid(ValidatedOptions.default)
    }
    const selectedDatabaseType = _.find(
      filteredFieldsMap.get('databaseType').options,
      (cpDatabaseType) => cpDatabaseType.value === value
    )
    setDatabaseType(selectedDatabaseType)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('databaseType', selectedDatabaseType)))
  }

  const handleCPChange = (value) => {
    if (_.isEmpty(value)) {
      setIsCloudProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsCloudProviderFieldValid(ValidatedOptions.default)
    }
    const selectedCP = _.find(cpOptions, (cp) => cp.displayValue === value)
    setCloudProvider(selectedCP)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('cloudProvider', selectedCP)))
  }

  const handleSpendLimitChange = (value) => {
    if (_.isEmpty(value)) {
      setIsSpendLimitFieldValid(ValidatedOptions.error)
    } else {
      setIsSpendLimitFieldValid(ValidatedOptions.default)
    }
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('spendLimit', value)))
  }

  const handleNodesChange = (value) => {
    if (_.isEmpty(value)) {
      setIsNodesFieldValid(ValidatedOptions.error)
    } else {
      setIsNodesFieldValid(ValidatedOptions.default)
    }
    const selectedNodes = _.find(filteredFieldsMap.get('nodes').options, (cpNodes) => cpNodes.displayValue === value)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('nodes', selectedNodes)))
  }

  const handleMachineTypeChange = (value) => {
    if (_.isEmpty(value)) {
      setIsMachineTypeFieldValid(ValidatedOptions.error)
    } else {
      setIsMachineTypeFieldValid(ValidatedOptions.default)
    }
    const selectedCompute = _.find(
      filteredFieldsMap.get('machineType').options,
      (cpCompute) => cpCompute.value === value
    )
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('machineType', selectedCompute)))
  }

  const handleStorageChange = (value) => {
    if (_.isEmpty(value)) {
      setIsStorageFieldValid(ValidatedOptions.error)
    } else {
      setIsStorageFieldValid(ValidatedOptions.default)
    }
    let selectedStorage = value
    if (selectedProvisioningData.storageGib.conditionalData[0].options !== undefined) {
      selectedStorage = _.find(filteredFieldsMap.get('storageGib').options, (cpStorage) => cpStorage.value === value)
    }
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('storageGib', selectedStorage)))
  }

  const setDBProviderFields = () => {
    if (plan.value === 'FREETRIAL') {
      return (
        <>
          {selectedProvisioningData.teamProject !== undefined ? (
            <FormGroup
              label={selectedProvisioningData.teamProject.displayName}
              fieldId="teamProject"
              isRequired={selectedDBProvider.value === mongoProviderType}
              className="half-width-selection"
              helperTextInvalid="This is a required field"
              validated={isTeamProjectFieldValid}
            >
              <TextInput
                isRequired={selectedDBProvider.value === mongoProviderType}
                type="text"
                id="teamProject"
                name="teamProject"
                value={providerChosenOptionsMap.get('teamProject')}
                onChange={handleProjectNameChange}
                validated={isTeamProjectFieldValid}
              />
              <HelperText>
                <HelperTextItem variant="indeterminate">
                  Name of project under which database instance will be created
                </HelperTextItem>
              </HelperText>
            </FormGroup>
          ) : null}
        </>
      )
    }
    return (
      <>
        {plan.value === 'SERVERLESS' ? (
          <>
            {selectedProvisioningData.serverlessLocationLabel !== undefined && (
              <Title headingLevel="h3" style={{ fontWeight: '600' }}>
                {selectedProvisioningData.serverlessLocationLabel.displayName}
              </Title>
            )}
            <HelperText>
              <HelperTextItem variant="indeterminate" className="half-width-selection">
                {selectedProvisioningData.serverlessLocationLabel.helpText}
              </HelperTextItem>
            </HelperText>
            <FormGroup
              label={selectedProvisioningData.regions.displayName}
              fieldId="regions"
              isRequired
              helperTextInvalid="This is a required field"
              validated={isRegionFieldValid}
              className="half-width-selection"
            >
              <FormSelect
                isRequired
                value={
                  providerChosenOptionsMap.get('regions') !== undefined && providerChosenOptionsMap.get('regions').value
                }
                onChange={handleRegionChange}
                aria-label="regions"
                validated={isRegionFieldValid}
              >
                {filteredFieldsMap.get('regions') !== undefined &&
                  filteredFieldsMap
                    .get('regions')
                    .options.map((option, index) => (
                      <FormSelectOption
                        key={index}
                        value={option.value}
                        label={option.displayValue !== undefined ? option.displayValue : option.value}
                      />
                    ))}
              </FormSelect>
            </FormGroup>
            {selectedProvisioningData.spendLimitLabel !== undefined && (
              <Title headingLevel="h3" style={{ fontWeight: '600' }}>
                {selectedProvisioningData.spendLimitLabel.displayName}
              </Title>
            )}
            <HelperText>
              <HelperTextItem variant="indeterminate" className="half-width-selection">
                {selectedProvisioningData.spendLimitLabel.helpText}
              </HelperTextItem>
            </HelperText>
            <FormGroup
              label={selectedProvisioningData.spendLimit.displayName}
              fieldId="spendLimit"
              isRequired
              helperTextInvalid="This is a required field"
              validated={isSpendLimitFieldValid}
              className="half-width-selection"
            >
              <TextInput
                isRequired
                type="text"
                id="spendLimit"
                name="spendLimit"
                value={providerChosenOptionsMap.get('spendLimit')}
                onChange={handleSpendLimitChange}
                validated={isSpendLimitFieldValid}
              />
            </FormGroup>
          </>
        ) : (
          <>
            {selectedProvisioningData.databaseType !== undefined ? (
              <FormGroup
                label={selectedProvisioningData.databaseType.displayName}
                fieldId="databaseType"
                isRequired
                helperTextInvalid="This is a required field"
                validated={isDatabaseTypeFieldValid}
                className="half-width-selection"
              >
                <FormSelect
                  isRequired
                  value={
                    providerChosenOptionsMap.get('databaseType') !== undefined &&
                    providerChosenOptionsMap.get('databaseType').value
                  }
                  onChange={handleDatabaseTypeChange}
                  aria-label="databaseType"
                  validated={isRegionFieldValid}
                >
                  {filteredFieldsMap.get('databaseType') !== undefined &&
                    filteredFieldsMap
                      .get('databaseType')
                      .options.map((option, index) => (
                        <FormSelectOption
                          key={index}
                          value={option.value}
                          label={option.displayValue !== undefined ? option.displayValue : option.value}
                        />
                      ))}
                </FormSelect>
                <HelperText>
                  <HelperTextItem variant="indeterminate">
                    {selectedProvisioningData.databaseType.helpText}
                  </HelperTextItem>
                </HelperText>
              </FormGroup>
            ) : null}
            {selectedProvisioningData.dedicatedLocationLabel !== undefined && (
              <Title headingLevel="h3" style={{ fontWeight: '600' }}>
                {selectedProvisioningData.dedicatedLocationLabel.displayName}
              </Title>
            )}
            {selectedProvisioningData.dedicatedLocationLabel !== undefined ? (
              <HelperText>
                <HelperTextItem variant="indeterminate" className="half-width-selection">
                  {selectedProvisioningData.dedicatedLocationLabel.helpText}
                </HelperTextItem>
              </HelperText>
            ) : null}
            {selectedProvisioningData.regions !== undefined ? (
              <FormGroup
                label={selectedProvisioningData.regions.displayName}
                fieldId="regions"
                isRequired
                helperTextInvalid="This is a required field"
                validated={isRegionFieldValid}
                className="half-width-selection"
              >
                <FormSelect
                  isRequired
                  value={
                    providerChosenOptionsMap.get('regions') !== undefined &&
                    providerChosenOptionsMap.get('regions').value
                  }
                  onChange={handleRegionChange}
                  aria-label="regions"
                  validated={isRegionFieldValid}
                >
                  {filteredFieldsMap.get('regions') !== undefined &&
                    filteredFieldsMap
                      .get('regions')
                      .options.map((option, index) => (
                        <FormSelectOption
                          key={index}
                          value={option.value}
                          label={option.displayValue !== undefined ? option.displayValue : option.value}
                        />
                      ))}
                </FormSelect>
                <HelperText>
                  <HelperTextItem variant="indeterminate">{selectedProvisioningData.regions.helpText}</HelperTextItem>
                </HelperText>
              </FormGroup>
            ) : null}
            {selectedProvisioningData.nodes !== undefined ? (
              <FormGroup
                label={selectedProvisioningData.nodes.displayName}
                fieldId="nodes"
                isRequired
                className="half-width-selection"
                helperTextInvalid="This is a required field"
                validated={isNodesFieldValid}
              >
                <FormSelect
                  isRequired
                  value={
                    providerChosenOptionsMap.get('nodes') !== undefined && providerChosenOptionsMap.get('nodes').value
                  }
                  onChange={handleNodesChange}
                  aria-label="nodes"
                  validated={isNodesFieldValid}
                >
                  {filteredFieldsMap.get('nodes') !== undefined &&
                    filteredFieldsMap
                      .get('nodes')
                      .options.map((option, index) => (
                        <FormSelectOption
                          key={index}
                          value={option.value}
                          label={option.displayValue !== undefined ? option.displayValue : option.value}
                        />
                      ))}
                </FormSelect>
              </FormGroup>
            ) : null}
            {selectedProvisioningData.hardwareLabel !== undefined && (
              <Title headingLevel="h3" style={{ fontWeight: '600' }}>
                {selectedProvisioningData.hardwareLabel.displayName}
              </Title>
            )}
            {selectedProvisioningData.hardwareLabel !== undefined ? (
              <HelperText>
                <HelperTextItem variant="indeterminate" className="half-width-selection">
                  {selectedProvisioningData.hardwareLabel.helpText}
                </HelperTextItem>
              </HelperText>
            ) : null}
            {selectedProvisioningData.machineType !== undefined ? (
              <FormGroup
                label={selectedProvisioningData.machineType.displayName}
                fieldId="machineType"
                isRequired
                helperTextInvalid="This is a required field"
                validated={isMachineTypeFieldValid}
                className="half-width-selection"
              >
                <FormSelect
                  isRequired
                  value={
                    providerChosenOptionsMap.get('machineType') !== undefined &&
                    providerChosenOptionsMap.get('machineType').value
                  }
                  onChange={handleMachineTypeChange}
                  aria-label="machineType"
                  validated={isMachineTypeFieldValid}
                >
                  {filteredFieldsMap.get('machineType') !== undefined &&
                    filteredFieldsMap
                      .get('machineType')
                      .options.map((option, index) => (
                        <FormSelectOption
                          key={index}
                          value={option.value}
                          label={option.displayValue !== undefined ? option.displayValue : option.value}
                        />
                      ))}
                </FormSelect>
                <HelperText>
                  <HelperTextItem variant="indeterminate">
                    {selectedProvisioningData.machineType.helpText}
                  </HelperTextItem>
                </HelperText>
              </FormGroup>
            ) : null}

            {selectedProvisioningData.storageGib !== undefined ? (
              <>
                {selectedProvisioningData.storageGib.conditionalData[0].options !== undefined ? (
                  <FormGroup
                    label={selectedProvisioningData.storageGib.displayName}
                    fieldId="storageGib"
                    isRequired
                    helperTextInvalid="This is a required field"
                    validated={isStorageFieldValid}
                    className="half-width-selection"
                  >
                    <FormSelect
                      isRequired
                      value={
                        providerChosenOptionsMap.get('storageGib') !== undefined &&
                        providerChosenOptionsMap.get('storageGib').value
                      }
                      onChange={handleStorageChange}
                      aria-label="storageGib"
                      validated={isStorageFieldValid}
                    >
                      {filteredFieldsMap.get('storageGib') !== undefined &&
                        filteredFieldsMap
                          .get('storageGib')
                          .options.map((option, index) => (
                            <FormSelectOption
                              key={index}
                              value={option.value}
                              label={option.displayValue !== undefined ? option.displayValue : option.value}
                            />
                          ))}
                    </FormSelect>
                  </FormGroup>
                ) : (
                  <FormGroup
                    label={selectedProvisioningData.storageGib.displayName}
                    fieldId="storageGib"
                    isRequired
                    helperTextInvalid="This is a required field"
                    validated={isStorageFieldValid}
                    className="half-width-selection"
                  >
                    <TextInput
                      isRequired
                      type="text"
                      id="storageGib"
                      name="storageGib"
                      value={providerChosenOptionsMap.get('storageGib')}
                      onChange={handleStorageChange}
                      validated={isStorageFieldValid}
                    />
                    <HelperText>
                      <HelperTextItem variant="indeterminate">
                        {selectedProvisioningData.storageGib.helpText}
                      </HelperTextItem>
                    </HelperText>
                  </FormGroup>
                )}
              </>
            ) : null}
          </>
        )}
      </>
    )
  }

  const setDefaultsForDependentFields = (sortedFields) => {
    for (const key of sortedFields) {
      const item = selectedProvisioningData[key]
      if (item?.conditionalData !== undefined) {
        const matchedDependencies = filterSelected(item.conditionalData)
        if (matchedDependencies !== undefined) {
          if (matchedDependencies.options !== undefined) {
            const foundOption = _.find(
              matchedDependencies.options,
              (option) => option.value === matchedDependencies.defaultValue
            )
            // setting validity of the field
            if (foundOption.value) {
              eval(`setIs${validationFieldMap.get(key)}('${ValidatedOptions.default}')`)
            } else {
              eval(`setIs${validationFieldMap.get(key)}('${ValidatedOptions.error}')`)
            }
            setProviderChosenOptionsMap(
              new Map(
                providerChosenOptionsMap.set(
                  key,
                  _.find(matchedDependencies.options, (option) => option.value === matchedDependencies.defaultValue)
                )
              )
            )
          } else {
            if (matchedDependencies.defaultValue) {
              eval(`setIs${validationFieldMap.get(key)}('${ValidatedOptions.default}')`)
            } else {
              eval(`setIs${validationFieldMap.get(key)}('${ValidatedOptions.error}')`)
            }
            setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set(key, matchedDependencies.defaultValue)))
          }
          // map with filtered data of drop downs available options.
          setFilteredFieldsMap(new Map(filteredFieldsMap.set(key, matchedDependencies)))
        }
      } else {
        if (item !== undefined) {
          setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set(key, '')))
        }
      }
    }
  }

  const setDependentFields = () => {
    const sortedFields = ['machineType']
    setDefaultsForDependentFields(sortedFields)
  }

  const setProviderFields = () => {
    filteredFieldsMap.clear()
    providerChosenOptionsMap.clear()
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('plan', plan)))
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('cloudProvider', cloudProvider)))
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('name', clusterName)))

    const sortedFields = ['regions', 'spendLimit', 'nodes', 'databaseType', 'machineType', 'storageGib', 'teamProject']

    setDefaultsForDependentFields(sortedFields)
  }

  React.useEffect(() => {
    fetchCSV()
    fetchProviderInfo()
  }, [])

  React.useEffect(() => {
    disableNSSelection()

    return () => {
      clearInterval(checkDBClusterStatusIntervalID.current)
      enableNSSelection()
    }
  }, [])

  React.useEffect(() => {
    fetchInventoriesByNSAndRules()
  }, [installNamespace])

  React.useEffect(() => {
    validateForm()
  }, [
    isDBProviderFieldValid,
    isNameFieldValid,
    isInventoryFieldValid,
    isTeamProjectFieldValid,
    selectedDBProvider,
    isPlanFieldValid,
    isCloudProviderFieldValid,
    isRegionFieldValid,
    isSpendLimitFieldValid,
    isMachineTypeFieldValid,
    isStorageFieldValid,
    isNodesFieldValid,
    isFormValid,
  ])

  React.useEffect(() => {
    if (!_.isEmpty(providerList) && !_.isEmpty(inventories)) {
      detectSelectedDBProviderAndProviderAccount()
    }
  }, [providerList, inventories])

  React.useEffect(() => {
    if (!_.isEmpty(selectedDBProvider)) {
      setProviderFields()
    }
  }, [plan, cloudProvider, selectedDBProvider])

  React.useEffect(() => {
    if (!_.isEmpty(selectedDBProvider)) {
      setDependentFields()
    }
  }, [databaseType])

  return (
    <FlexForm className="instance-table-container" onSubmit={provisionDBCluster}>
      <FormBody flexLayout>
        <FormHeader
          title="Create New Database Instance"
          helpText="A trial version of a database instance for learning, and exploring."
        />
        <Divider />
        {!showResults ? <LoadingView loadingMsg={loadingMsg} /> : null}
        {provisionRequestFired && showResults && clusterProvisionFailed ? (
          <FailedView handleTryAgain={handleTryAgain} handleCancel={handleCancel} statusMsg={statusMsg} />
        ) : null}
        {provisionRequestFired && showResults && clusterProvisionSuccess ? (
          <SuccessView goToInstancesPage={goToInstancesPage} />
        ) : null}

        {showResults && !provisionRequestFired ? (
          <>
            <Alert
              variant="info"
              isInline
              title="Information to create a Production database instance"
              className="co-info co-break-word half-width-selection"
            >
              <p>
                To create a database for production use, please directly log-in to the database provider's website.
                <br />
                <br />
                Fill in the form below to create a database instance for trial use.
              </p>
              {!_.isEmpty(selectedDBProvider) ? (
                <a href={selectedDBProvider?.externalProvisionInfo?.url} target="_blank" rel="noopener noreferrer">
                  Create a production database instance
                </a>
              ) : null}
            </Alert>

            {selectedDBProvider.value === rdsProviderType ? (
              <Alert variant="warning" isInline title="Warning" className="co-info co-break-word half-width-selection">
                <p>
                  Using the{' '}
                  <a href="https://aws.amazon.com/rds/pricing/" target="_blank" rel="noreferrer">
                    Amazon Relational Database Service (RDS)
                  </a>{' '}
                  provider account does not provide a free trial database instance. Creating a new database instance
                  using Amazon’s RDS creates the instance at Amazon Web Services’ (AWS){' '}
                  <a
                    href="https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc&awsf.Free%20Tier%20Types=*all&awsf.Free%20Tier%20Categories=*all"
                    target="_blank"
                    rel="noreferrer"
                  >
                    free-tier level,
                  </a>{' '}
                  but be aware that there is still a possibility of accruing a cost for running this instance.
                </p>
              </Alert>
            ) : null}

            <FormGroup
              label="Database Provider"
              fieldId="database-provider"
              isRequired
              className="half-width-selection"
              helperTextInvalid="This is a required field"
              validated={isDBProviderFieldValid}
            >
              <FormSelect
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
            {selectedDBProvider?.allowsFreeTrial === true ? (
              <>
                <FormGroup
                  label="Provider Account"
                  fieldId="provider-account"
                  isRequired
                  className="half-width-selection"
                  helperTextInvalid="This is a required field"
                  validated={isInventoryFieldValid}
                >
                  <FormSelect
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
                {inventoryHasIssue ? (
                  <>
                    <EmptyState>
                      <EmptyStateIcon variant="container" component={InfoCircleIcon} className="warning-icon" />
                      <Title headingLevel="h2" size="md">
                        Provider account information retrieval failed
                      </Title>
                      <EmptyStateBody>
                        Provider account information could not be retrieved. Please try again.
                      </EmptyStateBody>
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
                  </>
                ) : (
                  <>
                    <FormGroup
                      label={selectedProvisioningData.name.displayName}
                      fieldId="name"
                      isRequired
                      className="half-width-selection"
                      helperTextInvalid="This is a required field"
                      validated={isNameFieldValid}
                    >
                      <TextInput
                        isRequired
                        type="text"
                        id="name"
                        name="name"
                        value={providerChosenOptionsMap.get('name')}
                        onChange={handleServiceNameChange}
                        validated={isNameFieldValid}
                      />
                      <HelperText>
                        <HelperTextItem variant="indeterminate">
                          Name of DB instance that will be created at Database Provider
                        </HelperTextItem>
                      </HelperText>
                    </FormGroup>

                    {selectedProvisioningData.planLabel !== undefined ? (
                      <FormSection
                        title={selectedProvisioningData.planLabel.displayName}
                        titleElement="h2"
                        className="half-width-selection"
                      >
                        <FormGroup
                          label={selectedProvisioningData.plan.displayName}
                          fieldId="plan"
                          isRequired
                          helperTextInvalid="This is a required field"
                          validated={isPlanFieldValid}
                        >
                          <FormSelect
                            isRequired
                            value={plan.displayValue}
                            onChange={handlePlanChange}
                            aria-label="plan"
                            validated={isPlanFieldValid}
                          >
                            {planOptions.map((option, index) => (
                              <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                            ))}
                          </FormSelect>
                        </FormGroup>

                        <FormGroup
                          label={selectedProvisioningData.cloudProvider.displayName}
                          fieldId="cloudProvider"
                          isRequired
                          helperTextInvalid="This is a required field"
                          validated={isCloudProviderFieldValid}
                        >
                          <FormSelect
                            isRequired
                            value={cloudProvider.displayValue}
                            onChange={handleCPChange}
                            aria-label="cloudProvider"
                            validated={isCloudProviderFieldValid}
                          >
                            {cpOptions.map((option, index) => (
                              <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                            ))}
                          </FormSelect>
                        </FormGroup>
                      </FormSection>
                    ) : null}
                    {setDBProviderFields()}
                    <ActionGroup>
                      <Button id="cluster-provision-button" variant="primary" type="submit" isDisabled={!isFormValid}>
                        Create
                      </Button>
                      <Button variant="secondary" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </ActionGroup>
                  </>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </FormBody>
    </FlexForm>
  )
}

export default ProviderClusterProvisionPage
