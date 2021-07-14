import * as React from 'react';
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

const InstanceListPage = () => {
  const [showResults, setShowResults] = React.useState(false);
  const [inventories, setInventories] = React.useState();
  const [activeTabKey, setActiveTabKey] = React.useState(0);

  const handleTabClick = (event, tabIndex) => {
    event.preventDefault();
    setActiveTabKey(tabIndex);
  };

  const parsePayload = (responseJson) => {
    let inventories = [];

    if (responseJson.items) {
      responseJson.items?.forEach((inventory, index) => {
        let obj = { id: 0, name: "", instances: [] };
        obj.id = index;
        obj.name = inventory.metadata.name;
        inventory.status?.instances?.map((instance) => {
          return instance.provider = inventory.spec?.provider?.name;
        })
        obj.instances = inventory.status?.instances;
        inventories.push(obj);
      });
      setInventories(inventories);
      setShowResults(true);
    }
  };

  const fetchInstances = () => {
    let currentNS = window.location.pathname.split('/')[3];
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
    fetchInstances();
  }, [currentNS]);

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
