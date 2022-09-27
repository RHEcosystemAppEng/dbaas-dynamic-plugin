import {
  ActionGroup,
  Alert,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  List,
  ListItem,
  Spinner,
  Title,
  Flex,
  FlexItem,
  Popover,
  Modal,
} from '@patternfly/react-core'
import {
  cellWidth,
  RowSelectVariant,
  Table,
  TableBody,
  TableHeader,
  wrappable,
  OuterScrollContainer,
  InnerScrollContainer,
  sortable,
  SortByDirection,
} from '@patternfly/react-table'
import { ExclamationTriangleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons'
import _ from 'lodash'
import React from 'react'
import { getCSRFToken, fetchDbaasCSV } from '../utils'
import { DBaaSInventoryCRName, DBaaSOperatorName, topologyInstructionPageUrl } from '../const'
import './_dbaas-import-view.css'

const IssuePopover = ({ action }) => (
  <Flex>
    <FlexItem spacer={{ default: 'spacerSm' }}>
      <ExclamationTriangleIcon color="#f0ab00" />
    </FlexItem>
    <FlexItem>
      <Popover
        aria-label="Issue popover"
        headerContent={<div>Issue</div>}
        bodyContent={<div>Click on the link below for more information about this issue.</div>}
        footerContent={
          <Button onClick={action} variant="link" isInline>
            Learn more
          </Button>
        }
      >
        <Button variant="link" isInline>
          Issue
        </Button>
      </Popover>
    </FlexItem>
  </Flex>
)

const TableEmptyState = () => (
  <Bullseye>
    <EmptyState variant={EmptyStateVariant.small}>
      <Title headingLevel="h2" size="lg">
        No database instances found
      </Title>
    </EmptyState>
  </Bullseye>
)
class InstanceTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      sortBy: {},
      dbaaSOperatorNameWithVersion: '',
      inventoryHasIssue: false,
      currentNS: window.location.pathname.split('/')[3],
      columns: this.props.isSelectable
        ? [
            {
              title: 'Instance Name',
              transforms: [sortable, wrappable, cellWidth(15)],
            },
            {
              title: 'Database ID',
              transforms: [sortable, wrappable, cellWidth(15)],
            },
            { title: 'Alert', transforms: [wrappable, cellWidth(15)] },
            { title: 'Project', transforms: [wrappable, cellWidth(15)] },
            { title: 'Bound', transforms: [wrappable, cellWidth(15)] },
            { title: 'Application', transforms: [wrappable, cellWidth(15)] },
          ]
        : [
            { title: 'ID', transforms: [wrappable, cellWidth(45)] },
            { title: 'Instance', transforms: [wrappable, cellWidth(45)] },
          ],
      rows: [],
      selectedInstance: {},
      showError: false,
      error: {},
      isTopologyInstructionModalOpen: false,
    }

    this.handleTopologyInstructionModalToggle = this.handleTopologyInstructionModalToggle.bind(this)
    this.onSort = this.onSort.bind(this)
    this.goToInventoryInfoPage = this.goToInventoryInfoPage.bind(this)
    this.fetchCSV = this.fetchCSV.bind(this)
    this.getInventoryStatus = this.getInventoryStatus.bind(this)
    this.onSelect = this.onSelect.bind(this)
    this.getRows = this.getRows.bind(this)
    this.submitInstances = this.submitInstances.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.toTopologyView = this.toTopologyView.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
  }

  componentDidMount() {
    this.getRows(this.props.data.instances)
    this.getInventoryStatus(this.props.data)
  }

  componentDidUpdate(prevProps) {
    if (
      (this.props.data.instances &&
        this.props.data.instances.length > 0 &&
        !_.isEqual(prevProps.data, this.props.data)) ||
      !_.isEqual(prevProps.filteredInstances, this.props.filteredInstances) ||
      !_.isEqual(prevProps.connectionAndServiceBindingList, this.props.connectionAndServiceBindingList)
    ) {
      if (this.props.filteredInstances) {
        this.getRows(this.props.filteredInstances)
      } else {
        this.getRows(this.props.data.instances)
      }
      this.getInventoryStatus(this.props.data)
    }
  }

  handleTopologyInstructionModalToggle() {
    this.setState(({ isTopologyInstructionModalOpen }) => ({
      isTopologyInstructionModalOpen: !isTopologyInstructionModalOpen,
    }))
  }

  handleCancel() {
    window.history.back()
  }

  onSelect(event, isSelected, rowId) {
    const { filteredInstances } = this.props
    const rows = this.state.rows.map((oneRow, index) => {
      oneRow.selected = rowId === index
      return oneRow
    })
    this.setState({
      selectedInstance: filteredInstances[rowId],
      rows,
      showError: false,
      error: {},
    })
  }

  getRows(data) {
    const rowList = []

    if (data && data.length > 0) {
      _.forEach(data, (dbInstance) => {
        const connectionRows = []

        if (this.props.isSelectable) {
          if (!_.isEmpty(this.props.connectionAndServiceBindingList)) {
            for (const connection of this.props.connectionAndServiceBindingList) {
              if (
                connection.instanceID === dbInstance.instanceID &&
                this.props.data.name === connection.providerAcct &&
                this.props.data.namespace === connection.providerNamespace
              ) {
                for (let i = 0; i < connection.applications.length; i++) {
                  if (i === 0) {
                    connectionRows.push([connection.namespace, 'Yes', connection.applications[i].name])
                  } else {
                    connectionRows.push(['--', 'Yes', connection.applications[i].name])
                  }
                }
                if (connection.applications.length === 0) {
                  connectionRows.push([connection.namespace, 'No', '--'])
                }
              }
            }
          }

          rowList.push({
            cells: [
              // Instance name
              dbInstance.name,
              // Instance ID
              dbInstance.instanceID,
              // Provider account issue
              this.state.inventoryHasIssue ? (
                <>
                  <IssuePopover action={this.goToInventoryInfoPage} />
                </>
              ) : (
                ''
              ),
              // Namespace
              <>
                {_.isEmpty(connectionRows) ? (
                  '--'
                ) : (
                  <List isPlain>
                    {connectionRows.map((con) => (
                      <ListItem>{con[0]}</ListItem>
                    ))}
                  </List>
                )}
              </>,
              // Bound
              <>
                {_.isEmpty(connectionRows) ? (
                  '--'
                ) : (
                  <List isPlain>
                    {connectionRows.map((con) => (
                      <ListItem>{con[1]}</ListItem>
                    ))}
                  </List>
                )}
              </>,
              // App names
              <>
                {_.isEmpty(connectionRows) ? (
                  '--'
                ) : (
                  <List isPlain>
                    {connectionRows.map((con) => (
                      <ListItem>{con[2]}</ListItem>
                    ))}
                  </List>
                )}
              </>,
            ],
          })
        } else {
          rowList.push({
            cells: [
              // id
              dbInstance.instanceID,
              // instance
              `${dbInstance.name}-${dbInstance.instanceID.slice(-10)}`,
            ],
          })
        }
      })
    } else {
      rowList.push({
        heightAuto: true,
        cells: [
          {
            props: { colSpan: 8 },
            title: <TableEmptyState />,
          },
        ],
      })
    }

    this.setState({ rows: rowList })
  }

  fetchCSV = async () => {
    const dbaasCSV = await fetchDbaasCSV(this.state.currentNS, DBaaSOperatorName)
    this.setState({ dbaaSOperatorNameWithVersion: dbaasCSV.metadata?.name })
  }

  getInventoryStatus = (inventory) => {
    const inventoryReadyCondition = inventory?.status?.conditions?.find(
      (condition) => condition.type?.toLowerCase() === 'inventoryready'
    )

    if (!_.isEmpty(inventoryReadyCondition) && inventoryReadyCondition?.status === 'False') {
      this.fetchCSV()
      this.setState({ inventoryHasIssue: true })
    }
  }

  goToInventoryInfoPage = () => {
    const { currentNS, dbaaSOperatorNameWithVersion } = this.state
    const { data } = this.props

    window.location.pathname = `/k8s/ns/${currentNS}/clusterserviceversions/${dbaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/${data?.name}`
  }

  onSort = (_event, index, direction) => {
    let filterKey = ''
    let sortedInstances = []
    const filterColumns = ['name', 'instanceID']
    filterKey = filterColumns[index - 1]
    const { filteredInstances } = this.props

    if (!_.isEmpty(filteredInstances)) {
      sortedInstances = filteredInstances.sort((a, b) => {
        const keyA = a[filterKey].toLowerCase()
        const keyB = b[filterKey].toLowerCase()
        if (keyA < keyB) {
          return -1
        }
        if (keyA > keyB) {
          return 1
        }
        return 0
      })
    }

    this.getRows(direction === SortByDirection.asc ? sortedInstances : sortedInstances.reverse())
    this.setState({ sortBy: { index, direction } })
  }

  handleSubmit = async (event) => {
    event.preventDefault()
    this.submitInstances()
  }

  toTopologyView() {
    const { currentNS } = this.state
    window.location.pathname = `/topology/ns/${currentNS}?view=graph`
  }

  submitInstances() {
    const newBody = {
      apiVersion: 'dbaas.redhat.com/v1alpha1',
      kind: 'DBaaSConnection',
      metadata: {
        // k8s only accept lowercase metadata.name and add last 10 chars of the instanceID to avoid same name
        name: `${this.state.selectedInstance.name.toLowerCase()}-${this.state.selectedInstance.instanceID.slice(-10)}`,
        namespace: this.state.currentNS,
      },
      spec: {
        inventoryRef: {
          name: this.props.data.name,
          namespace: this.props.data.namespace,
        },
        instanceID: this.state.selectedInstance.instanceID,
      },
    }

    const requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify(newBody),
    }
    fetch(
      `/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/${this.state.currentNS}/dbaasconnections`,
      requestOpts
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'Failure') {
          this.setState({ showError: true, error: data })
        } else {
          this.handleTopologyInstructionModalToggle()
        }
      })
      .catch((err) => {
        this.setState({
          alert: {
            isActive: true,
            msg: err.message,
            type: 'error',
          },
        })
      })
  }

  render() {
    const { columns, rows, error, showError, sortBy, isTopologyInstructionModalOpen } = this.state
    const { isSelectable, isLoading, filteredInstances } = this.props

    if (isLoading) {
      return (
        <EmptyState>
          <EmptyStateIcon variant="container" component={Spinner} />
          <Title size="lg" headingLevel="h3">
            Fetching instances...
          </Title>
        </EmptyState>
      )
    }

    return (
      <>
        <Modal
          width={'50%'}
          title="Topology View Binding Instructions"
          isOpen={isTopologyInstructionModalOpen}
          onClose={this.handleTopologyInstructionModalToggle}
          actions={[
            <Button key="confirm" variant="primary" onClick={this.toTopologyView}>
              Continue
            </Button>,
          ]}
        >
          <Alert
            variant="info"
            isInline
            title="A database instance resource will be added to your project"
            className="co-info co-break-word"
          >
            <p>
              Create a binding connector by dragging the arrow from your application to your database instance in the
              topology view.
            </p>
            <Button
              variant="link"
              component="a"
              href={topologyInstructionPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLinkAltIcon />}
              iconPosition="right"
              isInline
            >
              Learn more
            </Button>
          </Alert>
        </Modal>
        <div className="sticky-table-container extra-bottom-margin">
          <OuterScrollContainer>
            <InnerScrollContainer>
              <Table
                id="instance-table"
                onSelect={isSelectable ? this.onSelect : null}
                selectVariant={isSelectable ? RowSelectVariant.radio : null}
                aria-label="Instance Table"
                cells={columns}
                rows={rows}
                isStickyHeader
                className="sticky-header-table"
                sortBy={!_.isEmpty(filteredInstances) ? sortBy : null}
                onSort={!_.isEmpty(filteredInstances) ? this.onSort : null}
              >
                <TableHeader className="sticky-header-th" />
                <TableBody />
              </Table>
            </InnerScrollContainer>
          </OuterScrollContainer>
        </div>
        {isSelectable ? (
          <div>
            {showError ? (
              <Alert
                variant="danger"
                isInline
                title={error.reason}
                className="co-alert co-break-word bottom-sticky-alert"
              >
                {error.details?.causes ? (
                  <ul>
                    {_.map(error.details?.causes, (err, index) => (
                      <li key={index}>{`${err.field}: ${err.message}`}</li>
                    ))}
                  </ul>
                ) : (
                  <div>{error.message}</div>
                )}
              </Alert>
            ) : null}
            <ActionGroup className="bottom-sticky-section">
              <Button
                id="instance-select-button"
                variant="primary"
                onClick={this.submitInstances}
                isDisabled={_.isEmpty(this.state.selectedInstance)}
              >
                Add to Topology
              </Button>
              <Button variant="secondary" onClick={this.handleCancel}>
                Cancel
              </Button>
            </ActionGroup>
          </div>
        ) : null}
      </>
    )
  }
}

export default InstanceTable
