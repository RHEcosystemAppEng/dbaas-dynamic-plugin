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
  Alert
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import './_dbaas-import-view.css'
import { useTranslation } from 'react-i18next'
import FormHeader from './form/formHeader'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import InstanceTable from './instanceTable'
import InstanceListFilter from './instanceListFilter'
import { crunchyProviderType, mongoProviderType, crunchyProviderName, mongoProviderName } from '../const'

const InstanceListPage = () => {
  const { t } = useTranslation()
  const [noInstances, setNoInstances] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState('')
  const [fetchInstancesFailed, setFetchInstancesFailed] = React.useState(false)
  const [textInputIDValue, setTextInputIDValue] = React.useState('')
  const [showResults, setShowResults] = React.useState(false)
  const [inventories, setInventories] = React.useState()
  const [selectedDBProvider, setSelectedDBProvider] = React.useState('')
  const [dbProviderName, setDBProviderName] = React.useState()
  const [selectedInventory, setSelectedInventory] = React.useState({})
  const currentNS = window.location.pathname.split('/')[3]

  const dbProviderTitle = (
    <div>
      Connect {dbProviderName} <Label className="ocs-preview-badge extra-left-margin">{t('Alpha')}</Label>
    </div>
  )
  const filteredInstances = React.useMemo(
    () => selectedInventory?.instances?.filter((instance) => instance.instanceID.includes(textInputIDValue)),
    [selectedInventory.instances, textInputIDValue]
  )

  const handleTryAgain = () => {
    location.reload()
  }

  const handleCancel = () => {
    window.history.back()
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

  const parsePayload = (responseJson) => {
    let inventories = []

    if (responseJson.items?.length > 0) {
      let filteredInventories = _.filter(responseJson.items, (inventory) => {
        return inventory.spec?.providerRef?.name === selectedDBProvider
      })
      filteredInventories.forEach((inventory, index) => {
        let obj = { id: 0, name: '', instances: [], status: {} }
        obj.id = index
        obj.name = inventory.metadata.name
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

  const fetchInstances = () => {
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    fetch(
      '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + currentNS + '/dbaasinventories?limit=250',
      requestOpts
    )
      .then((response) => response.json())
      .then((data) => parsePayload(data))
  }

  React.useEffect(() => {
    parseSelectedDBProvider()
    fetchInstances()
  }, [currentNS, selectedDBProvider])

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
            ) : (
              <React.Fragment>
                <FormGroup label="Provider Account" fieldId="provider-account" className="provider-account-selection">
                  <FormSelect
                    value={selectedInventory.name}
                    onChange={handleInventorySelection}
                    aria-label="Provider Account"
                  >
                    {inventories.map((inventory) => (
                      <FormSelectOption key={inventory.id} value={inventory.name} label={inventory.name} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Database Instance" fieldId="instance-id-filter">
                  <InstanceListFilter textInputIDValue={textInputIDValue} setTextInputIDValue={setTextInputIDValue} />
                </FormGroup>
                <FormSection fullWidth flexLayout className="no-top-margin">
                  <InstanceTable
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
