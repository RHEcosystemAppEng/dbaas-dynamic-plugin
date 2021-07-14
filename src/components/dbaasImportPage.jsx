import React from "react";
import * as _ from 'lodash';
import "./_dbaas-import-view.css";
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import VendorForm from './vendorForm';
import CredentialsForm from './credentialsForm';
import InstancesForm from './instancesForm';

class DBaasImportPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTabKey: 0,
            isDBaaSServiceUp: false,
            selectedDBProvider: ''
        };
        this.handleTabClick = this.handleTabClick.bind(this);
        this.setActiveTab = this.setActiveTab.bind(this);
        this.setDBaaSServiceStatus = this.setDBaaSServiceStatus.bind(this);
        this.setSelectedDBProvider = this.setSelectedDBProvider.bind(this);
    }

    handleTabClick(event, tabIndex) {
        this.setState({
            activeTabKey: tabIndex
        });
    };

    setActiveTab(tabIndex) {
        this.setState({
            activeTabKey: tabIndex
        });
    }

    setSelectedDBProvider(dbProvider) {
        if (dbProvider) {
            this.setState({selectedDBProvider: dbProvider})
        } else {
            console.log("No DB Provider Selected");
        }
    }

    setDBaaSServiceStatus() {
        this.setState({
            isDBaaSServiceUp: true
        });
    }

    render() {
        const { activeTabKey, isDBaaSServiceUp, selectedDBProvider } = this.state;

        return (
            <div>
                <div className="section-header-div">
                    <div className="section-padding-top">&nbsp;</div>
                    <div className="section-padding-left">&nbsp;</div>
                    <div className="section-breadcrumb">
                        <span className="breadcrumb-link">DBaaS Connect DataBase Account</span>
                        <span className="breadcrumb-chevron"> > </span>
                        Database Provider Details
                    </div>
                    <div className="section-title extra-bottom-margin">DBaaS Connect DataBase Account</div>
                </div>
                <Tabs activeKey={activeTabKey} onSelect={this.handleTabClick} className="extra-bottom-margin">
                    <Tab eventKey={0} title={<TabTitleText>Database Provider</TabTitleText>}>
                        <section
                            className="pf-c-tab-content pf-m-padding"
                            id="tab1-panel"
                            role="tabpanel"
                            tabIndex="0"
                        >
                            <div className="pf-c-tab-content__body">
                                <div className="section-title">
                                    Select Database Provider
                                </div>
                                <VendorForm setActiveTab={this.setActiveTab} setSelectedDBProvider={this.setSelectedDBProvider} />
                            </div>
                        </section>
                    </Tab>
                    <Tab eventKey={1} title={<TabTitleText>Credentials</TabTitleText>}>
                        <section
                            className="pf-c-tab-content pf-m-padding"
                            id="tab1-panel"
                            role="tabpanel"
                            tabIndex="1"
                        >
                            <div className="pf-c-tab-content__body">
                                <div className="section-title">
                                    Account Credentials
                                </div>
                                <CredentialsForm setActiveTab={this.setActiveTab} setDBaaSServiceStatus={this.setDBaaSServiceStatus} selectedDBProvider={selectedDBProvider} />
                            </div>
                        </section>
                    </Tab>
                    <Tab eventKey={2} title={<TabTitleText>Instances</TabTitleText>}>
                        <section
                            className="pf-c-tab-content pf-m-padding"
                            id="tab1-panel"
                            role="tabpanel"
                            tabIndex="2"
                        >
                            <div className="pf-c-tab-content__body">
                                <div className="section-title">
                                    Database Instances
                                </div>
                                <InstancesForm dbaaSServiceStatus={isDBaaSServiceUp} selectedDBProvider={selectedDBProvider} />
                            </div>
                        </section>
                    </Tab>
                </Tabs>
            </div>
        );
    }
};

export default DBaasImportPage;

