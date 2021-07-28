import React from "react";
import * as _ from 'lodash';
import "./_dbaas-import-view.css";
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import VendorForm from './vendorForm';
import ProviderAccountForm from './providerAccountForm';
import InstancesForm from './instancesForm';
import { MONGODB_PROVIDER_NAME } from "../const";

class DBaasImportPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isDBaaSServiceUp: false,
            currentCreatedInventoryInfo: {},
        };
        this.goBack = this.goBack.bind(this);
        this.setDBaaSServiceStatus = this.setDBaaSServiceStatus.bind(this);
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

    setDBaaSServiceStatus(isUp) {
        this.setState({
            isDBaaSServiceUp: isUp
        });
    }

    render() {
        const { activeTabKey, isDBaaSServiceUp, currentCreatedInventoryInfo } = this.state;

        return (
            <div>
                <div className="section-header-div extra-bottom-margin">
                    <div className="section-padding-top">&nbsp;</div>
                    <div className="section-padding-left">&nbsp;</div>
                    <div className="section-padding-right">&nbsp;</div>
                    <div className="section-breadcrumb">
                        <span className="breadcrumb-link" onClick={this.goBack}>Database-as-a-Service</span>
                        <span className="breadcrumb-chevron"> > </span>
                        Create Provider Account
                    </div>
                    <div className="section-title">Create Provider Account</div>
                    <div className="section-subtitle">Creating a Provider Account resource allows provider cloud instances to be imported</div>
                </div>
                {!isDBaaSServiceUp ?
                    <ProviderAccountForm setDBaaSServiceStatus={this.setDBaaSServiceStatus} setCurrentCreatedInventoryInfo={this.setCurrentCreatedInventoryInfo} />
                    :
                    <InstancesForm dbaaSServiceStatus={isDBaaSServiceUp} currentCreatedInventoryInfo={currentCreatedInventoryInfo} />
                }
            </div>
        );
    }
};

export default DBaasImportPage;

