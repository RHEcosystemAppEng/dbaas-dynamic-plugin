import * as React from 'react';
import { FormSection } from '@patternfly/react-core';
import FormHeader from './form/formHeader';
import FlexForm from './form/flexForm';
import FormBody from './form/formBody';
import { currentNS } from '../const';
import InstanceTable from './instanceTable';

const InstanceListPage = () => {
  const [showResults, setShowResults] = React.useState(false);
  const [instances, setInstances] = React.useState();

  const parsePayload = (responseJson) => {
    let instances = [];

    if (responseJson.status) {
      responseJson?.status?.projects?.forEach(function (value) {
        value?.clusters?.forEach(function (value) {
          instances.push(value);
        });
      });
      setInstances(instances);
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
      '/api/kubernetes/apis/dbaas.redhat.com/v1/namespaces/' +
      currentNS +
      '/dbaasservices/atlas-dbaas-service',
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
        <FormSection fullWidth flexLayout extraMargin>
          <InstanceTable isLoading={!showResults} data={instances} isSelectable={true} />
        </FormSection>
      </FormBody>
    </FlexForm>
  );
};

export default InstanceListPage;
