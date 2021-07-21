import React from "react";
import * as _ from 'lodash';
import "./_dbaas-import-view.css";
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import VendorForm from './vendorForm';
import CredentialsForm from './credentialsForm';
import InstancesForm from './instancesForm';
import { MONGODB_PROVIDER_NAME } from "../const";

class DBaasImportPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isDBaaSServiceUp: false,
            selectedDBProvider: '',
            currentCreatedInventoryInfo: {},
        };
        this.goBack = this.goBack.bind(this);
        this.setDBaaSServiceStatus = this.setDBaaSServiceStatus.bind(this);
        this.setSelectedDBProvider = this.setSelectedDBProvider.bind(this);
        this.setCurrentCreatedInventoryInfo = this.setCurrentCreatedInventoryInfo.bind(this);
    }

    goBack() {
        window.history.back();
    };

    setCurrentCreatedInventoryInfo(inventoryInfo) {
        if (!_.isEmpty(inventoryInfo)) {
            this.setState({ currentCreatedInventoryInfo: inventoryInfo });
        } else {
            console.error("Failed to created inventory");
        }
    }

    setSelectedDBProvider(dbProvider) {
        if (dbProvider) {
            this.setState({ selectedDBProvider: dbProvider })
        } else {
            console.error("No DB Provider Selected");
        }
    }

    setDBaaSServiceStatus() {
        this.setState({
            isDBaaSServiceUp: true
        });
    }

    render() {
        const { activeTabKey, isDBaaSServiceUp, selectedDBProvider, currentCreatedInventoryInfo } = this.state;

        return (
            <div>
                <div className="section-header-div extra-bottom-margin">
                    <div className="section-padding-top">&nbsp;</div>
                    <div className="section-padding-left">&nbsp;</div>
                    <div className="section-breadcrumb">
                        <span className="breadcrumb-link" onClick={this.goBack}>Database-as-a-Service</span>
                        <span className="breadcrumb-chevron"> > </span>
                        Create Provider Account
                    </div>
                    <div className="section-title">Create Provider Account</div>
                    <div className="section-subtitle">Creating a Provider Account resource allows provider cloud instances to be imported</div>
                </div>
                {!isDBaaSServiceUp ?
                    <section className="pf-c-tab-content pf-m-padding">
                        <div className="pf-c-tab-content__body">
                            <label className="text-field-label">Database Provider</label>
                            <VendorForm showCredentialForm={this.showCredentialForm} setSelectedDBProvider={this.setSelectedDBProvider} />
                        </div>
                        <div className="pf-c-tab-content__body">
                            <CredentialsForm setDBaaSServiceStatus={this.setDBaaSServiceStatus} selectedDBProvider={selectedDBProvider} setCurrentCreatedInventoryInfo={this.setCurrentCreatedInventoryInfo} />
                        </div>
                    </section>
                    :
                    <section className="pf-c-tab-content pf-m-padding">
                        <div className="pf-c-tab-content__body">
                            <InstancesForm dbaaSServiceStatus={isDBaaSServiceUp} selectedDBProvider={selectedDBProvider} currentCreatedInventoryInfo={currentCreatedInventoryInfo} />
                        </div>
                    </section>
                }
            </div>
        );
    }
};

export default DBaasImportPage;

