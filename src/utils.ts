import * as _ from 'lodash'
import { stringify } from 'k8s-selector'
import { API_GROUP } from './const'

export const cookiePrefix = 'csrf-token='

export const getCSRFToken = () => {
  if (document && document.cookie) {
    return document.cookie
      .split(';')
      .map((c) => _.trim(c))
      .filter((c) => c.startsWith(cookiePrefix))
      .map((c) => c.slice(cookiePrefix.length))
      .pop()
  } else {
    return undefined
  }
}

export async function fetchObjectsClusterOrNS(group = '', version = '', kindPlural = '', installNS = '') {
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
    let namespaces = await fetchProjects(installNS)
    await fetchObjectsByNamespaces(group, version, kindPlural, namespaces).then((objects) => {
      objectArray = objects
    })
  }
  return objectArray
}

export async function isListAllowed(group = '', kindPlural = '', namespace = '') {
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

export function status(response) {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response)
  } else {
    return Promise.reject(new Error(response.statusText))
  }
}

export function json(response) {
  return response.json()
}

async function fetchProjects(installNS = '') {
  let projectNames = []
  if (!_.isEmpty(installNS)) {
    projectNames.push(installNS)
  }
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
    .then((projectList) => projectList.items.forEach((project) => projectNames.push(project.metadata?.name)))

  projectNames = [...new Set(projectNames)]

  return projectNames
}

async function fetchProjectsWithSelector(
  installNS = '',
  inventory = {
    metadata: { namespace: '' },
    spec: {
      connectionNamespaces: [''],
      connectionNsSelector: {
        matchExpressions: [{ key: '', operator: {}, values: [''] }],
        matchLabels: {},
      },
    },
  },
  inventoryData = { inventoryList: [], nsMap: {} }
) {
  let projectNames = []
  if (!_.isEmpty(installNS)) {
    projectNames.push(installNS)
  }

  var labelSelector = ''
  if (!_.isNil(inventory.spec?.connectionNsSelector)) {
    labelSelector = stringify(inventory.spec.connectionNsSelector)
  } else if (!_.isNil(inventoryData.nsMap[inventory.metadata?.namespace]?.connectionNsSelector)) {
    labelSelector = stringify(inventoryData.nsMap[inventory.metadata.namespace].connectionNsSelector)
  }

  if (!_.isEmpty(labelSelector)) {
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    await fetch(
      '/api/kubernetes/apis/project.openshift.io/v1/projects?limit=250&labelSelector=' + labelSelector,
      requestOpts
    )
      .then(status)
      .then(json)
      .then((projectList) => projectList.items.forEach((project) => projectNames.push(project.metadata?.name)))

    projectNames = [...new Set(projectNames)]
  }

  return projectNames
}

export async function fetchObjectsByNamespaces(group = '', version = '', kindPlural = '', namespaces = []) {
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

export async function objectsFromRulesReview(group = '', version = '', kindPlural = '', namespace = '') {
  let items = []
  let promises = []
  let listAllowed = await isListAllowed(group, kindPlural, namespace)
  var requestOpts

  if (listAllowed) {
    requestOpts = {
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
    requestOpts = {
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

function parseRulesReview(responseJson, kindPlural = '') {
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

export async function fetchInventoriesAndMapByNSAndRules(installNS = '') {
  let namespaces = await fetchInvAndConnNamespacesFromPolicies(installNS)
  let nsMap = namespaces.nsMap
  let inventoryList = await fetchObjectsByNamespaces(
    API_GROUP,
    'v1alpha1',
    'dbaasinventories',
    namespaces.uniqInventoryNamespaces
  )
  return { inventoryList, nsMap }
}

export async function fetchObjects(objectNames = [], namespace = '', group = '', version = '', kindPlural = '') {
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

export async function fetchObject(objectName = '', namespace = '', group = '', version = '', kindPlural = '') {
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

export async function fetchInvAndConnNamespacesFromPolicies(installNS = '') {
  let inventoryNamespaces = []
  let nsMap = {}
  let policies = await fetchObjectsClusterOrNS(API_GROUP, 'v1alpha1', 'dbaaspolicies', installNS)

  policies.forEach((policy) => {
    let policySpec = { connectionNamespaces: [''], connectionNsSelector: {}, disableProvisions: false }
    if (policy.status?.conditions?.length > 0 && policy.status.conditions[0].status === 'True') {
      policySpec = policy.spec
      if (nsMap[policy.metadata?.namespace]) {
        nsMap[policy.metadata?.namespace].connectionNamespaces.push(...policySpec?.connectionNamespaces)
        nsMap[policy.metadata?.namespace].connectionNsSelector = policySpec?.connectionNsSelector
        nsMap[policy.metadata?.namespace].disableProvisions = policySpec?.disableProvisions
      } else {
        nsMap[policy.metadata?.namespace] = policySpec
      }
      inventoryNamespaces.push(policy.metadata?.namespace)
    }
  })

  let uniqInventoryNamespaces = [...new Set(inventoryNamespaces)]

  return { uniqInventoryNamespaces, nsMap }
}

async function returnInvIfValidNs(
  currentNS = '',
  inventory = {
    metadata: { namespace: '' },
    spec: {
      connectionNamespaces: [''],
      connectionNsSelector: { matchExpressions: [{ key: '', operator: {}, values: [''] }], matchLabels: {} },
    },
  },
  inventoryData = { inventoryList: [], nsMap: {} }
) {
  let valid = await isValidNamespace(currentNS, inventory, inventoryData)
  if (valid) {
    return inventory
  }
}

export async function filterInventoriesByConnNS(inventoryData = { inventoryList: [], nsMap: {} }, currentNS = '') {
  let promises = []
  let inventoryItems = []

  inventoryData.inventoryList.forEach((inventory) => {
    promises.push(returnInvIfValidNs(currentNS, inventory, inventoryData))
  })
  await Promise.all(promises).then((inventories) => {
    inventories.forEach((inventory) => {
      if (!_.isNil(inventory)) {
        inventoryItems.push(inventory)
      }
    })
  })
  return inventoryItems
}

export async function filterInventoriesByConnNSandProvision(
  inventoryData = { inventoryList: [], nsMap: {} },
  currentNS = ''
) {
  let promises = []
  let inventoryItems = []
  inventoryData.inventoryList.forEach((inventory) => {
    let disableProvision = false
    if (!_.isNil(inventory.spec?.disableProvisions)) {
      disableProvision = inventory.spec.disableProvisions
    } else if (!_.isNil(inventoryData.nsMap[inventory.metadata?.namespace]?.disableProvisions)) {
      disableProvision = inventoryData.nsMap[inventory.metadata.namespace].disableProvisions
    }

    if (!disableProvision) {
      promises.push(returnInvIfValidNs(currentNS, inventory, inventoryData))
    }
  })
  await Promise.all(promises).then((inventories) => {
    inventories.forEach((inventory) => {
      if (!_.isNil(inventory)) {
        inventoryItems.push(inventory)
      }
    })
  })
  return inventoryItems
}

async function isValidNamespace(
  currentNS = '',
  inventory = {
    metadata: { namespace: '' },
    spec: {
      connectionNamespaces: [''],
      connectionNsSelector: {
        matchExpressions: [{ key: '', operator: {}, values: [''] }],
        matchLabels: {},
      },
    },
  },
  inventoryData = { inventoryList: [], nsMap: {} }
) {
  if (inventory.metadata?.namespace === currentNS) {
    return true
  }

  let validNamespaces = []
  if (!_.isNil(inventory.spec?.connectionNamespaces)) {
    validNamespaces.push(...inventory.spec.connectionNamespaces)
  } else if (!_.isNil(inventoryData.nsMap[inventory.metadata?.namespace]?.connectionNamespaces)) {
    validNamespaces.push(...inventoryData.nsMap[inventory.metadata.namespace].connectionNamespaces)
  }

  if (validNamespaces?.includes('*') || validNamespaces?.includes(currentNS)) {
    return true
  }

  let nsBySelectors = await fetchProjectsWithSelector('', inventory, inventoryData)
  validNamespaces.push(...nsBySelectors)

  return validNamespaces?.includes(currentNS)
}

export async function fetchDbaasCSV(currentNS = '', DBaaSOperatorName = '') {
  let dbaasCSV = {}
  let requestOpts = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  }
  await fetch(
    '/api/kubernetes/apis/operators.coreos.com/v1alpha1/namespaces/' + currentNS + '/clusterserviceversions?limit=250',
    requestOpts
  )
    .then(status)
    .then((response) => response.json())
    .then((data) => {
      if (data.items?.length > 0) {
        dbaasCSV = data.items.find((csv) => {
          return csv?.metadata?.name.includes(DBaaSOperatorName)
        })
      }
    })
  return dbaasCSV
}

export const disableNSSelection = () => {
  const namespaceMenuToggleEle = document.getElementsByClassName('co-namespace-dropdown__menu-toggle')[0]
  if (namespaceMenuToggleEle) {
    namespaceMenuToggleEle.setAttribute('disabled', 'true')
  }
}

export const enableNSSelection = () => {
  const namespaceMenuToggleEle = document.getElementsByClassName('co-namespace-dropdown__menu-toggle')[0]
  if (namespaceMenuToggleEle) {
    namespaceMenuToggleEle.removeAttribute('disabled')
  }
}
