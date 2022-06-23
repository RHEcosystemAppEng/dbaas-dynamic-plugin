import * as _ from 'lodash'
import React from 'react'
import { DBaaSOperatorName } from '../const'
import { fetchDbaasCSV } from '../utils'
import InstancesForm from './instancesForm'
import ProviderAccountForm from './providerAccountForm'
import './_dbaas-import-view.css'

class DBaasImportPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentNS: window.location.pathname.split('/')[3],
      isDBaaSServiceUp: false,
      currentCreatedInventoryInfo: {},
      providerInfo: {},
      dbaasCSV: {},
    }
    this.fetchProviderInfo = this.fetchProviderInfo.bind(this)
    this.goBack = this.goBack.bind(this)
    this.setDBaaSServiceStatus = this.setDBaaSServiceStatus.bind(this)
    this.setCurrentCreatedInventoryInfo = this.setCurrentCreatedInventoryInfo.bind(this)
  }

  async componentDidMount() {
    let dbaasCSV = await fetchDbaasCSV(this.state.currentNS, DBaaSOperatorName)
    this.setState({ dbaasCSV: dbaasCSV })
    this.fetchProviderInfo()
  }

  fetchProviderInfo = () => {
    let requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/dbaasproviders', requestOpts)
      .then((response) => response.json())
      .then((data) => {
        this.setState({ providerInfo: data })
      })
      .catch((err) => {
        console.error(err)
      })
  }

  goBack() {
    window.history.back()
  }

  setCurrentCreatedInventoryInfo(inventoryInfo) {
    if (!_.isEmpty(inventoryInfo)) {
      this.setState({ currentCreatedInventoryInfo: inventoryInfo })
    } else {
      console.error('Failed to created inventory')
    }
  }

  setDBaaSServiceStatus(isUp) {
    this.setState({
      isDBaaSServiceUp: isUp,
    })
  }

  render() {
    const { activeTabKey, isDBaaSServiceUp, currentCreatedInventoryInfo, providerInfo, dbaasCSV } = this.state
    let installNamespace = ''
    installNamespace = dbaasCSV?.metadata?.annotations['olm.operatorNamespace']
    let dbaasOperatorNameWithVersion = ''
    dbaasOperatorNameWithVersion = dbaasCSV?.metadata?.name

    return (
      <div>
        <div className="section-header-div extra-bottom-margin large-top-margin">
          <div className="section-padding-left">&nbsp;</div>
          <div className="section-title">Import Database Provider Account</div>
          <div className="section-subtitle">
            Configuring a provider account resource allows you to import cloud-hosted database instances.
          </div>
        </div>
        {!isDBaaSServiceUp ? (
          <ProviderAccountForm
            dbProviderInfo={providerInfo}
            setDBaaSServiceStatus={this.setDBaaSServiceStatus}
            setCurrentCreatedInventoryInfo={this.setCurrentCreatedInventoryInfo}
            installNamespace={installNamespace}
            dbaasOperatorNameWithVersion={dbaasOperatorNameWithVersion}
          />
        ) : (
          <InstancesForm
            dbaaSServiceStatus={isDBaaSServiceUp}
            currentCreatedInventoryInfo={currentCreatedInventoryInfo}
            csv={dbaasCSV}
          />
        )}
      </div>
    )
  }
}

export default DBaasImportPage
