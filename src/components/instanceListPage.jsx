import * as React from 'react';
import * as _ from 'lodash';
import {
  FormSection,
  Tabs,
  Tab,
  TabTitleText,
  Title,
  EmptyState,
  EmptyStateIcon,
  Spinner
} from '@patternfly/react-core';
import FormHeader from './form/formHeader';
import FlexForm from './form/flexForm';
import FormBody from './form/formBody';
import InstanceTable from './instanceTable';
import { MONGODB_PROVIDER_RESOURCE_NAME, CRUNCHY_PROVIDER_RESOURCE_NAME, MONGODB_PROVIDER_TYPE, CRUNCHY_PROVIDER_TYPE } from '../const';

const InstanceListPage = () => {
  const [showResults, setShowResults] = React.useState(false);
  const [inventories, setInventories] = React.useState();
  const [activeTabKey, setActiveTabKey] = React.useState(0);
  const [selectedDBProvider, setSelectedDBProvider] = React.useState('');
  const currentNS = window.location.pathname.split('/')[3];
 


  const parseSelectedDBProvider = () => {
    let dbProviderType = _.last(window.location.pathname.split('/'));
    if (dbProviderType === MONGODB_PROVIDER_TYPE) {
      setSelectedDBProvider(MONGODB_PROVIDER_RESOURCE_NAME);
    }
    if (dbProviderType === CRUNCHY_PROVIDER_TYPE) {
      setSelectedDBProvider(CRUNCHY_PROVIDER_RESOURCE_NAME);
    }
  };

  const handleTabClick = (event, tabIndex) => {
    event.preventDefault();
    setActiveTabKey(tabIndex);
  };

  const parsePayload = (responseJson) => {
    let inventories = [];

    if (responseJson.items) {
      let filteredInventories = _.filter(responseJson.items, inventory => {
        return inventory.spec?.providerRef?.name === selectedDBProvider && inventory.status?.conditions[0]?.status !== "False" && inventory.status?.conditions[0]?.type === "SpecSynced"
      })
      filteredInventories.forEach((inventory, index) => {
        let obj = { id: 0, name: "", instances: [] };
        obj.id = index;
        obj.name = inventory.metadata.name;
        inventory.status?.instances?.map((instance) => {
          return instance.provider = inventory.spec?.providerRef?.name;
        })
        obj.instances = inventory.status?.instances;
        inventories.push(obj);
      });
      setInventories(inventories);
      setShowResults(true);
    }
  };

  const fetchInstances = () => {
    var requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    fetch(
      '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' +
      currentNS +
      '/dbaasinventories?limit=250',
      requestOpts,
    )
      .then((response) => response.json())
      .then((data) => parsePayload(data));
  };

  React.useEffect(() => {
    parseSelectedDBProvider();
    fetchInstances();
  }, [currentNS, selectedDBProvider]);

  return (
    <FlexForm className='instance-table-container'>
      <FormBody flexLayout>
        <FormHeader
          title='Select Database Instance'
          helpText='The database instance selected below will appear on the topology view.'
          marginBottom="lg"
        />
        {!showResults ?
          <EmptyState>
            <EmptyStateIcon variant="container" component={Spinner} />
            <Title size="lg" headingLevel="h3">
              Fetching inventories...
            </Title>
          </EmptyState>
          :
          <Tabs activeKey={activeTabKey} onSelect={handleTabClick} isBox>
            {inventories.map((inventory) => {
              return (
                <Tab eventKey={inventory?.id} title={<TabTitleText>{inventory?.name}</TabTitleText>}>
                  <FormSection fullWidth flexLayout extraMargin>
                    <InstanceTable isLoading={!showResults} data={inventory} isSelectable={true} />
                  </FormSection>
                </Tab>
              )
            })}
          </Tabs>}

      </FormBody>
    </FlexForm>
  );
};

export default InstanceListPage;
