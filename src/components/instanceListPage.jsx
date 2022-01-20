import * as React from 'react'
import * as _ from 'lodash'
import {
  FormSection,
  Title,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateSecondaryActions,
  Spinner,
  Label,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Button,
  Alert,
  ExpandableSection,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import './_dbaas-import-view.css'
import FormHeader from './form/formHeader'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import InstanceTable from './instanceTable'
import InstanceListFilter from './instanceListFilter'
import { crunchyProviderType, mongoProviderType, crunchyProviderName, mongoProviderName } from '../const'
import { getCSRFToken } from '../utils'

export async function fetchInventoryNamespaces() {
  let inventoryNamespaces = []
  let listAllowed = await isListAllowed('dbaastenants', '')

  if (listAllowed) {
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    await fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/dbaastenants?limit=250', requestOpts)
      .then(status)
      .then(json)
      .then((tenantList) =>
        tenantList.items.forEach((tenant) => inventoryNamespaces.push(tenant.spec.inventoryNamespace))
      )
  } else {
    let newBody = {
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectRulesReview',
      spec: {
        namespace: '*',
      },
    }
    var requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify(newBody),
    }
    await fetch('/api/kubernetes/apis/authorization.k8s.io/v1/selfsubjectrulesreviews', requestOpts)
      .then(status)
      .then(json)
      .then((responseJson) => parseRulesReview(responseJson, 'dbaastenants'))
      .then(fetchInventoryNSfromTenants)
      .then((inventoryNS) => (inventoryNamespaces = inventoryNS))
  }
  let uniqInventoryNamespaces = [...new Set(inventoryNamespaces)]
  return uniqInventoryNamespaces
}

export async function isListAllowed(group, kindPlural, namespace) {
  let listAllowed = false

  let rulesBody = {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: {
      resourceAttributes: {
        group: group,
        resource: kindPlural,
        verb: 'list',
        namespace: namespace,
      },
    },
  }
  var requestOpts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CSRFToken': getCSRFToken(),
    },
    body: JSON.stringify(rulesBody),
  }
  listAllowed = await fetch('/api/kubernetes/apis/authorization.k8s.io/v1/selfsubjectaccessreviews', requestOpts)
    .then(status)
    .then(json)
    .then((data) => {
      return data.status.allowed
    })

  return listAllowed
}

function parseRulesReview(responseJson, kindPlural) {
  let kindNames = []
  if (responseJson.status.resourceRules?.length > 0) {
    let resourceRule = { verbs: [], apiGroups: [], resources: [], resourceNames: [] }
    let availableRules = _.filter(responseJson.status.resourceRules, (rule) => {
      resourceRule = rule
      if (resourceRule.verbs && resourceRule.resources && resourceRule.resourceNames) {
        if (resourceRule.resourceNames.length > 0) {
          return resourceRule.resources.includes(kindPlural) && resourceRule.verbs.includes('get')
        }
      }
    })
    availableRules.forEach((rule) => {
      rule.resourceNames.forEach((kindName) => {
        if (!kindNames.includes(kindName)) {
          kindNames.push(kindName)
        }
      })
    })
  }
  return kindNames
}

async function fetchInventoryNSfromTenants(tenantNames = []) {
  let inventoryNamespaces = []
  let promises = []
  tenantNames.forEach((tenantName) => {
    promises.push(
      fetchTenant(tenantName).then((data) => {
        return data.spec.inventoryNamespace
      })
    )
  })
  await Promise.all(promises).then((namespaces) => (inventoryNamespaces = namespaces))
  let uniqInventoryNamespaces = [...new Set(inventoryNamespaces)]
  return uniqInventoryNamespaces
}

async function fetchTenant(tenantName) {
  var requestOpts = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  }
  return fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/dbaastenants/' + tenantName, requestOpts)
    .then(status)
    .then(json)
}

function status(response) {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response)
  } else {
    return Promise.reject(new Error(response.statusText))
  }
}

export function json(response) {
  return response.json()
}

export const disableNSSelection = () => {
  const namespaceMenuToggleEle = document.getElementsByClassName('co-namespace-dropdown__menu-toggle')[0]
  if (namespaceMenuToggleEle) {
    namespaceMenuToggleEle.setAttribute('disabled', 'true')
  }
}

export const handleTryAgain = () => {
  location.reload()
}

const handleCancel = () => {
  window.history.back()
}

export const isDbaasConnectionUsed = (serviceBinding, dbaasConnection) => {
  let usedDBaaSConnect = serviceBinding.spec?.services?.find((service) => {
    return (
      serviceBinding.metadata?.namespace === dbaasConnection.metadata?.namespace &&
      service.kind === 'DBaaSConnection' &&
      service.name === dbaasConnection.metadata?.name
    )
  })
  if (usedDBaaSConnect) {
    return true
  } else {
    return false
  }
}

export async function fetchObjectsClusterOrNS(group, version, kindPlural) {
  let objectArray = []
  let listAllowed = await isListAllowed(group, kindPlural, '')
  if (listAllowed) {
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    await fetch('/api/kubernetes/apis/' + group + '/' + version + '/' + kindPlural + '?limit=250', requestOpts)
      .then(status)
      .then(json)
      .then((list) => {
        objectArray = list.items
      })
  } else {
    let namespaces = await fetchProjects()
    await fetchObjectsByNamespace(group, version, kindPlural, namespaces).then((objects) => {
      objectArray = objects
    })
  }
  return objectArray
}

export async function fetchObjectsByNamespace(group, version, kindPlural, namespaces = []) {
  let promises = []
  let items = []

  namespaces.forEach((namespace) => {
    if (namespace) {
      promises.push(objectsFromRulesReview(group, version, kindPlural, namespace))
    }
  })
  await Promise.all(promises).then((objectByNS) => {
    objectByNS.forEach((objectArrays) => objectArrays.forEach((value) => items.push(...value)))
  })

  return items
}

export async function objectsFromRulesReview(group, version, kindPlural, namespace) {
  let items = []
  let promises = []
  let listAllowed = await isListAllowed(group, kindPlural, namespace)

  if (listAllowed) {
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    promises.push(
      fetch(
        '/api/kubernetes/apis/' + group + '/' + version + '/namespaces/' + namespace + '/' + kindPlural + '?limit=250',
        requestOpts
      )
        .then(status)
        .then(json)
        .then((data) => {
          return data.items
        })
    )
  } else {
    let accessBody = {
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectRulesReview',
      spec: {
        namespace: namespace,
      },
    }
    var requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify(accessBody),
    }
    promises.push(
      fetch('/api/kubernetes/apis/authorization.k8s.io/v1/selfsubjectrulesreviews', requestOpts)
        .then(status)
        .then(json)
        .then((responseJson) => parseRulesReview(responseJson, kindPlural))
        .then((objectNames) => fetchObjects(objectNames, namespace, group, version, kindPlural))
        .then((objects) => {
          return objects
        })
    )
  }
  await Promise.all(promises).then((objects) => (items = objects))
  return items
}

export async function fetchObjects(objectNames, namespace, group, version, kindPlural) {
  let promises = []
  let items = []
  if (typeof objectNames === 'object') {
    objectNames.forEach((objectName) => {
      if (objectName && namespace) {
        promises.push(fetchObject(objectName, namespace, group, version, kindPlural))
      }
    })
  }
  await Promise.all(promises).then((objects) => {
    items.push(...objects)
  })
  return items
}

export async function fetchObject(objectName, namespace, group, version, kindPlural) {
  var inventory
  var requestOpts = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  }
  return fetch(
    '/api/kubernetes/apis/' + group + '/' + version + '/namespaces/' + namespace + '/' + kindPlural + '/' + objectName,
    requestOpts
  )
    .then(status)
    .then(json)
    .then((data) => {
      return data
    })
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
      Connect {dbProviderName} <Label className="ocs-preview-badge extra-left-margin">Alpha</Label>
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
    setSelectedDBProvider(dbProviderType)
  }

  async function fetchProjects() {
    let projectNames = []
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    await fetch('/api/kubernetes/apis/project.openshift.io/v1/projects?limit=250', requestOpts)
      .then(status)
      .then(json)
      .then((projectList) => projectList.items.forEach((project) => projectNames.push(project.metadata.name)))

    return projectNames
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
  }, [dbaasConnectionList, serviceBindingList])

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
                  <InstanceListFilter textInputIDValue={textInputIDValue} setTextInputIDValue={setTextInputIDValue} />
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
