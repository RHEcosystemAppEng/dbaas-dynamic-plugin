import React from 'react'
import * as _ from 'lodash'
import InstanceTable from './instanceTable'
import {
  Title,
  EmptyState,
  EmptyStateIcon,
  Spinner,
  EmptyStateBody,
  EmptyStateSecondaryActions,
  Button,
  Alert,
} from '@patternfly/react-core'
import { InfoCircleIcon, CheckCircleIcon } from '@patternfly/react-icons'
import { DBaaSInventoryCRName, DBaaSOperatorName } from '../const'
class InstancesForm extends React.Component {
  constructor(props) {
    super(props)
    this.fetchInventoryTimerID = 0
    this.state = {
      currentNS: window.location.pathname.split('/')[3],
      showResults: false,
      inventory: { instances: [] },
      hasInstanceUpdated: false,
      activeTabKey: 0,
      noInstances: false,
      fetchInstancesFailed: false,
      statusMsg: '',
    }
    this.editInventoryInfo = this.editInventoryInfo.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.goToInventoryListPage = this.goToInventoryListPage.bind(this)
  }

  componentDidMount() {
    if (this.props.dbaaSServiceStatus && this.state.inventory.instances.length == 0 && !this.state.hasInstanceUpdated) {
      this.fetchInventoryTimerID = setInterval(() => {
        this.fetchInventory()
      }, 3000)
    }
  }

  componentWillUnmount() {
    clearInterval(this.fetchInventoryTimerID)
  }

  fetchInventory = () => {
    let requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    const { currentCreatedInventoryInfo } = this.props

    fetch(
      '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' +
        this.state.currentNS +
        '/dbaasinventories/' +
        currentCreatedInventoryInfo?.metadata?.name,
      requestOpts
    )
      .then((response) => response.json())
      .then((data) => this.parsePayload(data))
  }

  parsePayload = (responseJson) => {
    if (responseJson?.status?.conditions[0]?.type === 'SpecSynced') {
      if (responseJson?.status?.conditions[0]?.status === 'False') {
        this.setState({
          fetchInstancesFailed: true,
          statusMsg: responseJson?.status?.conditions[0]?.message,
          showResults: true,
        })
      }
      if (responseJson?.status?.conditions[0]?.status === 'True') {
        if (_.isEmpty(responseJson?.status?.instances)) {
          this.setState({
            noInstances: true,
            statusMsg: 'No database instance in this Provider Account',
            showResults: true,
          })
        } else {
          responseJson?.status?.instances.map((instance) => {
            instance.provider = responseJson?.spec?.providerRef?.name
          })
          this.setState({
            inventory: { instances: responseJson?.status?.instances },
            hasInstanceUpdated: true,
            showResults: true,
          })
        }
      }
    } else {
      setTimeout(() => {
        this.setState({
          fetchInstancesFailed: true,
          statusMsg: 'Could not connect with database provider',
          showResults: true,
        })
      }, 30000)
    }
  }

  editInventoryInfo = () => {
    const { currentNS } = this.state
    const { currentCreatedInventoryInfo } = this.props

    window.location.pathname = `/k8s/ns/${currentNS}/clusterserviceversions/${DBaaSOperatorName}/${DBaaSInventoryCRName}/${currentCreatedInventoryInfo?.metadata?.name}`
  }

  handleCancel = () => {
    window.history.back()
  }

  goToInventoryListPage = () => {
    const { currentNS } = this.state

    window.location.pathname = `/k8s/ns/${currentNS}/operators.coreos.com~v1alpha1~ClusterServiceVersion/${DBaaSOperatorName}/${DBaaSInventoryCRName}`
  }

  render() {
    const { showResults, inventory, activeTabKey, fetchInstancesFailed, noInstances, statusMsg } = this.state

    if (!showResults) {
      return (
        <EmptyState>
          <EmptyStateIcon variant="container" component={Spinner} />
          <Title size="lg" headingLevel="h3">
            Creating Provider Account...
          </Title>
        </EmptyState>
      )
    }

    if ((showResults && fetchInstancesFailed) || noInstances) {
      return (
        <EmptyState>
          <EmptyStateIcon variant="container" component={InfoCircleIcon} className="warning-icon" />
          <Title headingLevel="h2" size="md">
            Database instances retrieval failed
          </Title>
          <EmptyStateBody>
            The Provider Account resource has been created but the database instances could not be fetched. Edit this
            resource to try again.
          </EmptyStateBody>
          <Alert variant="danger" isInline title="An error occured" className="co-alert co-break-word extra-top-margin">
            <div>{statusMsg}</div>
          </Alert>
          <Button variant="primary" onClick={this.editInventoryInfo}>
            Edit Provider Account
          </Button>
          <EmptyStateSecondaryActions>
            <Button variant="link" onClick={this.handleCancel}>
              Close
            </Button>
          </EmptyStateSecondaryActions>
        </EmptyState>
      )
    }

    return (
      <React.Fragment>
        <EmptyState>
          <EmptyStateIcon variant="container" component={CheckCircleIcon} className="success-icon" />
          <Title headingLevel="h2" size="md">
            Database instances fetched successfully
          </Title>
          <EmptyStateBody>
            The Provider Account resource has been created and the database instances shown below have been exposed for
            developer import.
          </EmptyStateBody>
          <Button variant="primary" onClick={this.goToInventoryListPage}>
            View Provider Accounts
          </Button>
        </EmptyState>
        <div style={{ display: 'flex' }}>
          <InstanceTable isLoading={!showResults} data={inventory} isSelectable={false} />
        </div>
      </React.Fragment>
    )
  }
}

export default InstancesForm
