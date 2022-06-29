export const FLAG_DBAAS = 'FLAG_DBAAS'

export const API_GROUP = 'dbaas.redhat.com'
export const API_VERSION = 'v1'

export const DBaaSInventoryCRName = API_GROUP + '~v1alpha1~DBaaSInventory'
export const DBaaSPolicyCRName = API_GROUP + '~v1alpha1~DBaaSPolicy'
export const CSVapiVersionKind = 'operators.coreos.com~v1alpha1~ClusterServiceVersion'

export const DBaaSOperatorName = 'dbaas-operator'

// Currently placeholders
export const dbaasServicesIcon = `data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!-- Generator: Adobe Illustrator 26.0.3, SVG Export Plug-In . SVG Version: 6.00 Build 0) --%3E%3Csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 24 24' style='enable-background:new 0 0 24 24;' xml:space='preserve'%3E%3Cstyle type='text/css'%3E .st0%7Bfill-rule:evenodd;clip-rule:evenodd;fill:%23151515;%7D .st1%7Bfill:%23151515;%7D%0A%3C/style%3E%3Cg id='Symbols'%3E%3Cg id='connected-database-icon'%3E%3Cg id='Group-18' transform='translate(3.000000, 3.000000)'%3E%3Cpath id='Combined-Shape' class='st0' d='M7,2c0.3,0,0.5,0,0.8,0C7.3,2.9,7,3.9,7,5c0,1.1,0.3,2.1,0.8,3C7.5,8,7.3,8,7,8 C3.1,8,0,7,0,5.7l0,0V4.3C0,3,3.1,2,7,2z'/%3E%3Cpath id='Combined-Shape_00000165936325999212692660000016217393689778511527_' class='st0' d='M0,7.5C1.5,8.5,4.3,9,7,9 c0.5,0,1,0,1.5,0c1.1,1.2,2.7,2,4.5,2c0.3,0,0.7,0,1-0.1c-0.3,1.2-3.3,2.1-7,2.1c-3.9,0-7-1-7-2.3l0,0V7.5z'/%3E%3Cpath id='Path' class='st0' d='M7,18c3.9,0,7-1,7-2.3v-3.2c-1.5,1-4.3,1.5-7,1.5s-5.5-0.5-7-1.5v3.2C0,17,3.1,18,7,18z'/%3E%3Cpath id='Combined-Shape_00000073722324745890008420000004136813300067415463_' class='st1' d='M13,0c2.8,0,5,2.2,5,5s-2.2,5-5,5 S8,7.8,8,5S10.2,0,13,0z M13.8,2h-1.5C12.1,2,12,2.1,12,2.2l0,0V4h-1.8C10.1,4,10,4.1,10,4.3l0,0v1.5C10,5.9,10.1,6,10.2,6l0,0 H12v1.8C12,7.9,12.1,8,12.3,8l0,0h1.5C13.9,8,14,7.9,14,7.8l0,0V6h1.7C15.9,6,16,5.9,16,5.7l0,0V4.3C16,4.1,15.9,4,15.8,4l0,0H14 V2.2C14,2.1,13.9,2,13.8,2L13.8,2z'/%3E%3C/g%3E%3C/g%3E%3C/g%3E%3C/svg%3E`
export const crunchyProviderType = 'crunchy-bridge-registration'
export const mongoProviderType = 'mongodb-atlas-registration'
export const crunchyProviderName = 'Crunchy Bridge Managed PostgreSQL'
export const mongoProviderName = 'MongoDB Atlas Cloud Database Service'
export const cockroachdbProviderType = 'cockroachdb-cloud-registration'
export const cockroachdbProviderName = 'CockroachDB Cloud'
export const rdsProviderType = 'rds-registration'
export const rdsProviderName = 'Amazon Relational Database Service'
export const topologyInstructionPageUrl =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_database_access/1/html/quick_start_guide/connecting-an-application-to-a-database-instance-using-the-topology-view_rhoda-qsg'
export const mongoFetchCredentialsUrl =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_database_access/1/html/quick_start_guide/find-your-mongodb-atlas-account-credentials_rhoda-qsg'
export const crunchyFetchCredentialsUrl =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_database_access/1/html/quick_start_guide/find-your-crunchy-data-bridge-account-credentials_rhoda-qsg'
export const cockroachFetchCredentialsUrl =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_database_access/1/html/quick_start_guide/find-your-cockroachdb-account-credentials_rhoda-qsg'
export const rdsFetchCredentialsUrl =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_database_access/1/html/quick_start_guide/find-your-amazon-rds-account-credentials_rhoda-qsg'
export const rdsEngineTypeDocUrl =
  'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html'
export const mongoUrl = 'https://www.mongodb.com/atlas/database'
export const crunchyUrl = 'https://www.crunchydata.com/products/crunchy-bridge/'
export const cockroachUrl = 'https://www.cockroachlabs.com/get-started-cockroachdb/'
export const rdsUrl = 'https://docs.aws.amazon.com/rds/index.html'
export const mongoShortName = 'MongoDB Atlas'
export const crunchyShortName = 'Crunchy Bridge'
export const cockroachShortName = 'CockroachDB Cloud'
export const rdsShortName = 'Amazon RDS'

// Common shortcuts than span pages.
export const KEYBOARD_SHORTCUTS = Object.freeze({
  focusFilterInput: '/',
  blurFilterInput: 'Escape',
  focusNamespaceDropdown: 'n',
})
