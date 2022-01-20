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
import { InfoCircleIcon } from '@patternfly/react-icons'
import CaretDownIcon from '@patternfly/react-icons/dist/esm/icons/caret-down-icon'
import * as _ from 'lodash'
import React, { useState } from 'react'
import { crunchyProviderName, crunchyProviderType, mongoProviderName, mongoProviderType } from '../const'
import { getCSRFToken } from '../utils'
import AdminConnectionsTable from './adminConnectionsTable'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import FormHeader from './form/formHeader'
import './_dbaas-import-view.css'

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

async function isListAllowed(group, kindPlural, namespace) {
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

function json(response) {
  return response.json()
}

const AdminDashboard = () => {
  const [noInstances, setNoInstances] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [fetchInstancesFailed, setFetchInstancesFailed] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [inventories, setInventories] = useState([])
  const [dbaasConnectionList, setDbaasConnectionList] = useState([])
  const [serviceBindingList, setServiceBindingList] = useState([])
  const [connectionAndServiceBindingList, setConnectionAndServiceBindingList] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const currentNS = window.location.pathname.split('/')[3]

  const dropdownItems = [
    <DropdownItem
      key="link"
      href="/k8s/ns/openshift-dbaas-operator/clusterserviceversions/dbaas-operator.v0.1.3/dbaas.redhat.com~v1alpha1~DBaaSInventory/~new"
    >
      Create Provider
    </DropdownItem>,
    <DropdownItem key="disabled link">Create Database Instance</DropdownItem>,
  ]

  const dbProviderTitle = (
    <div>
      Database Access <Label className="ocs-preview-badge extra-left-margin">Alpha</Label>
    </div>
  )

  const disableNSSelection = () => {
    const namespaceMenuToggleEle = document.getElementsByClassName('co-namespace-dropdown__menu-toggle')[0]
    if (namespaceMenuToggleEle) {
      namespaceMenuToggleEle.setAttribute('disabled', 'true')
    }
  }

  const handleTryAgain = () => {
    location.reload()
  }

  // const handleCancel = () => {
  //   window.history.back()
  // }

  const isDbaasConnectionUsed = (serviceBinding, dbaasConnection) => {
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

  const setDatabaseName = (inventoryRefName) => {
    console.log('setDatabaseName')
    console.log('ID: ' + inventoryRefName)
    console.log('Inventory size: ' + inventories.length)
    let databaseName

    if (inventories.length > 0) {
      inventories.forEach((inventory) => {
        if (inventory.name === inventoryRefName) {
          if (inventory.providername === crunchyProviderType) {
            databaseName = crunchyProviderName
          }
          if (inventory.spec?.providerRef?.name === mongoProviderType) {
            databaseName = mongoProviderName
          }
        }
      })
    }
    return databaseName
  }

  const mapDBaaSConnectionsAndServiceBindings = async () => {
    console.log('mapDBaaSConnectionsAndServiceBindings')
    console.log('dbaasConnectionList: ' + dbaasConnectionList.length)
    console.log('serviceBindingList: ' + serviceBindingList.length)

    let newDbaasConnectionList = dbaasConnectionList
    let newServiceBindingList = serviceBindingList
    let newConnectionAndServiceBindingList = []
    if (newDbaasConnectionList.length > 0) {
      newDbaasConnectionList.forEach((dbaasConnection) => {
        let connectionObj = {
          instanceID: dbaasConnection?.spec?.instanceID,
          instanceName: dbaasConnection?.metadata?.name,
          connectionStatus: _.isEmpty(dbaasConnection?.status) ? '-' : dbaasConnection?.status?.conditions[0]?.reason,
          errMsg: 'N/A',
          applications: [],
          namespace: _.isEmpty(dbaasConnection?.metadata?.namespace) ? '-' : dbaasConnection?.metadata?.namespace,
          database: setDatabaseName(dbaasConnection.spec?.inventoryRef.name),
          providerAcct: dbaasConnection?.spec?.inventoryRef?.name,
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
      })
    }
    setConnectionAndServiceBindingList(newConnectionAndServiceBindingList)
  }

  const fetchServiceBindings = async () => {
    let serviceBindings = await fetchObjectsClusterOrNS('binding.operators.coreos.com', 'v1alpha1', 'servicebindings')
    console.log('fetchServiceBindings')
    console.log(serviceBindings)
    setServiceBindingList(serviceBindings)
  }

  const fetchDBaaSConnections = async () => {
    let connections = await fetchObjectsClusterOrNS('dbaas.redhat.com', 'v1alpha1', 'dbaasconnections')
    console.log('fetchDBaaSConnections')
    console.log(connections)
    setDbaasConnectionList(connections)
  }

  const fetchObjectsClusterOrNS = async (group, version, kindPlural) => {
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

  const fetchInstances = async () => {
    console.log('fetchInstances')
    let inventories = []
    let inventoryItems = await fetchInventoriesByNSAndRules()
    console.log('inventoryItems: ' + inventoryItems.length)

    if (inventoryItems.length > 0) {
      inventoryItems.forEach((inventory, index) => {
        console.log(inventory)
        let obj = { id: 0, name: '', namespace: '', instances: [], status: {}, providername: '' }
        obj.id = index
        obj.name = inventory.metadata.name
        obj.namespace = inventory.metadata.namespace
        obj.status = inventory.status
        obj.providername = inventory.spec?.providerRef?.name

        if (
          inventory.status?.conditions[0]?.status !== 'False' &&
          inventory.status?.conditions[0]?.type === 'SpecSynced'
        ) {
          inventory.status?.instances?.map((instance) => {
            return (instance.provider = inventory.spec?.providerRef?.name)
          })
          obj.instances = inventory.status?.instances
        }
        console.log('Inventory:')
        console.log(inventory)
        console.log('Inventory Obj:')
        console.log(obj)

        inventories.push(obj)
      })
      setInventories(inventories)
      setShowResults(true)
    } else {
      setNoInstances(true)
      setStatusMsg('There is no Provider Account.')
    }
  }

  const fetchInventoriesByNSAndRules = async () => {
    console.log('fetchInventoriesByNSAndRules')
    let inventoryNamespaces = await fetchInventoryNamespaces()
    console.log('Got inventoryNameSpaces: ' + inventoryNamespaces)
    let inventoryItems = await fetchObjectsByNamespace(
      'dbaas.redhat.com',
      'v1alpha1',
      'dbaasinventories',
      inventoryNamespaces
    ).catch(function (error) {
      setFetchInstancesFailed(true)
      setStatusMsg(error)
    })
    console.log('GOT INVENTORY BACK: ' + inventoryItems.length)
    return inventoryItems
  }

  const fetchObjectsByNamespace = async (group, version, kindPlural, namespaces = []) => {
    console.log('fetchObjectsByNamespace')
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

  const objectsFromRulesReview = async (group, version, kindPlural, namespace) => {
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
          '/api/kubernetes/apis/' +
            group +
            '/' +
            version +
            '/namespaces/' +
            namespace +
            '/' +
            kindPlural +
            '?limit=250',
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

  const fetchObjects = async (objectNames, namespace, group, version, kindPlural) => {
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

  const fetchObject = async (objectName, namespace, group, version, kindPlural) => {
    var inventory
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    return fetch(
      '/api/kubernetes/apis/' +
        group +
        '/' +
        version +
        '/namespaces/' +
        namespace +
        '/' +
        kindPlural +
        '/' +
        objectName,
      requestOpts
    )
      .then(status)
      .then(json)
      .then((data) => {
        return data
      })
  }

  const onToggle = (isOpen) => {
    setIsOpen(isOpen)
  }
  const onSelect = (event) => {
    console.log('onSelect')
    console.log(event.target)
    console.log(isOpen)
    setIsOpen(!isOpen)
    onFocus()
  }
  const onFocus = () => {
    const element = document.getElementById('toggle-id-4')
    console.log('onFocus')
    console.log(element)
    element.focus()
  }

  React.useEffect(() => {
    disableNSSelection()
    fetchInstances()
    fetchDBaaSConnections()
    fetchServiceBindings()
  }, [])

  React.useEffect(() => {
    mapDBaaSConnectionsAndServiceBindings()
  }, [dbaasConnectionList, serviceBindingList, inventories])

  return (
    <FlexForm className="instance-table-container">
      <FormBody flexLayout>
        <Split>
          <SplitItem isFilled>
            <FormHeader
              title={dbProviderTitle}
              helpText="Create database provider account and view your database instances"
              marginBottom="lg"
            />
          </SplitItem>
          <SplitItem>
            <Dropdown
              onSelect={onSelect}
              position={DropdownPosition.right}
              toggle={
                <DropdownToggle
                  onToggle={onToggle}
                  toggleIndicator={CaretDownIcon}
                  isPrimary
                  id="toggle-id-4"
                  // style={{ minwidth: '20%' }}
                >
                  Create
                </DropdownToggle>
              }
              isOpen={isOpen}
              dropdownItems={dropdownItems}
            />
          </SplitItem>
        </Split>
        <Divider />

        {!showResults ? (
          <EmptyState>
            <EmptyStateIcon variant="container" component={Spinner} />
            <Title size="lg" headingLevel="h3">
              Fetching Provider Accounts and database instances...
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
                <FormSection fullWidth flexLayout className="no-top-margin">
                  <AdminConnectionsTable connections={connectionAndServiceBindingList} />
                </FormSection>
              </React.Fragment>
            )}
          </React.Fragment>
        )}
      </FormBody>
    </FlexForm>
  )
}

export default AdminDashboard
