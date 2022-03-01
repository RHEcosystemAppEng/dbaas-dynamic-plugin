import * as _ from 'lodash'

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

export async function fetchInventoriesAndMapByNSAndRules() {
  let namespaces = await fetchInvAndConnNamespacesFromTenants()
  let nsMap = namespaces.nsMap
  let inventoryList = await fetchObjectsByNamespace(
    'dbaas.redhat.com',
    'v1alpha1',
    'dbaasinventories',
    namespaces.uniqInventoryNamespaces
  )
  return { inventoryList, nsMap }
}

export async function fetchInventoriesByNSAndRules() {
  let namespaces = await fetchInvAndConnNamespacesFromTenants()
  let inventoryList = await fetchObjectsByNamespace(
    'dbaas.redhat.com',
    'v1alpha1',
    'dbaasinventories',
    namespaces.uniqInventoryNamespaces
  )
  return inventoryList
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

export async function fetchInvAndConnNamespacesFromTenants() {
  let inventoryNamespaces = []
  let nsMap = {}
  let listAllowed = await isListAllowed('dbaastenants', '', '')
  var requestOpts

  if (listAllowed) {
    requestOpts = {
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
        tenantList.items.forEach((tenant) => {
          if (nsMap[tenant.spec?.inventoryNamespace]) {
            nsMap[tenant.spec?.inventoryNamespace].push(...tenant.spec?.connectionNamespaces)
          } else {
            nsMap[tenant.spec?.inventoryNamespace] = tenant.spec?.connectionNamespaces
          }
          inventoryNamespaces.push(tenant.spec?.inventoryNamespace)
        })
      )
  } else {
    let newBody = {
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectRulesReview',
      spec: {
        namespace: '*',
      },
    }
    requestOpts = {
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
      .then((namespaces) => ((inventoryNamespaces = namespaces.uniqInventoryNamespaces), (nsMap = namespaces.nsMap)))
  }
  let uniqInventoryNamespaces = [...new Set(inventoryNamespaces)]

  return { uniqInventoryNamespaces, nsMap }
}

export async function fetchInventoryNSfromTenants(tenants = []) {
  let inventoryNamespaces = []
  let nsMap = {}
  let promises = []
  tenants.forEach((tenant) => {
    promises.push(fetchTenant(tenant))
  })
  await Promise.all(promises).then((tenantList) =>
    tenantList.forEach((tenant) => {
      if (nsMap[tenant.spec?.inventoryNamespace]) {
        nsMap[tenant.spec?.inventoryNamespace].push(...tenant.spec?.connectionNamespaces)
      } else {
        nsMap[tenant.spec?.inventoryNamespace] = tenant.spec?.connectionNamespaces
      }
      inventoryNamespaces.push(tenant.spec?.inventoryNamespace)
    })
  )
  let uniqInventoryNamespaces = [...new Set(inventoryNamespaces)]
  return { uniqInventoryNamespaces, nsMap }
}

export async function fetchTenant(tenantName) {
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

export function filterInventoriesByConnNS(inventoryData = { inventoryList: [], nsMap: {} }, currentNS = '') {
  let inventoryItems = []
  let validNamespaces = []

  inventoryData.inventoryList.forEach((inventory) => {
    let push = false
    if (inventory.metadata?.namespace == currentNS) {
      push = true
    }
    validNamespaces = inventory.spec?.connectionNamespaces
    if (validNamespaces == null || validNamespaces.length == null) {
      validNamespaces = inventoryData.nsMap[inventory.metadata?.namespace]
    }
    if (validNamespaces?.includes(currentNS) || validNamespaces?.includes('*')) {
      push = true
    }
    if (push) {
      inventoryItems.push(inventory)
    }
  })
  return inventoryItems
}

export async function fetchDbaasCSV(currentNS, DBaaSOperatorName) {
  let dbaasCSV = []
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
