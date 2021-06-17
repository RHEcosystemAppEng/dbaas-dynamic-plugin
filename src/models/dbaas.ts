// import { K8sKind } from '@openshift-console/dynamic-plugin-sdk';
import { API_GROUP, API_VERSION } from '../const';

export const DBaaSServiceModel: any = {
  apiGroup: API_GROUP,
  apiVersion: API_VERSION,
  kind: 'DBaaSService',
  id: 'dbaasservice',
  plural: 'dbaasservices',
  label: 'DBaaS Service',
  labelPlural: 'DBaaS Services',
  abbr: 'DBAASS',
  namespaced: true,
  crd: true,
};
