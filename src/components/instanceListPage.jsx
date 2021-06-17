import * as React from 'react';
import NamespacedPage, {
  NamespacedPageVariants,
} from '@console/dev-console/src/components/NamespacedPage';
import { useActiveNamespace, FormHeader, FlexForm, FormBody } from '@console/shared';
import FormSection from '@console/dev-console/src/components/import/section/FormSection';
import InstanceTable from './instanceTable';

const InstanceListPage = () => {
  const [currentNamespace] = useActiveNamespace();
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
      currentNamespace +
      '/dbaasservices/atlas-dbaas-service',
      requestOpts,
    )
      .then((response) => response.json())
      .then((data) => parsePayload(data));
  };

  React.useEffect(() => {
    fetchInstances();
  }, [currentNamespace]);


  return (
    <NamespacedPage
      variant={NamespacedPageVariants.light}
      disabled
      hideApplications
    >
      <FlexForm>
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
    </NamespacedPage>
  );
};

export default InstanceListPage;
