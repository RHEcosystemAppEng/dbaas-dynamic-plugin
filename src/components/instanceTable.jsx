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
import { ExclamationTriangleIcon } from '@patternfly/react-icons'
import _ from 'lodash'
import React from 'react'
import { getCSRFToken, fetchDbaasCSV } from '../utils'
import { DBaaSInventoryCRName, DBaaSOperatorName } from '../const'
import './_dbaas-import-view.css'

const IssuePopover = ({ action }) => {
  return (
    <Flex>
      <FlexItem spacer={{ default: 'spacerSm' }}>
        <ExclamationTriangleIcon color="#f0ab00"></ExclamationTriangleIcon>
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
}

const TableEmptyState = () => {
  return (
    <Bullseye>
      <EmptyState variant={EmptyStateVariant.small}>
        <Title headingLevel="h2" size="lg">
          No database instances found
        </Title>
      </EmptyState>
    </Bullseye>
  )
}
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
              transforms: [sortable, wrappable, cellWidth(20)],
            },
            {
              title: 'Database ID',
              transforms: [sortable, wrappable, cellWidth(20)],
            },
            { title: 'Alert', transforms: [wrappable, cellWidth(5)] },
            { title: 'Project', transforms: [wrappable, cellWidth(20)] },
            { title: 'Bound', transforms: [wrappable, cellWidth(5)] },
            { title: 'Application', transforms: [wrappable, cellWidth(20)] },
          ]
        : [
            { title: 'ID', transforms: [wrappable, cellWidth(45)] },
            { title: 'Instance', transforms: [wrappable, cellWidth(45)] },
          ],
      rows: [],
      selectedInstance: {},
      showError: false,
      error: {},
    }

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

  componentDidUpdate(prevProps) {
    if (
      (this.props.data.instances &&
        this.props.data.instances.length > 0 &&
        !_.isEqual(prevProps.data, this.props.data)) ||
      !_.isEqual(prevProps.filteredInstances, this.props.filteredInstances)
    ) {
      if (this.props.filteredInstances) {
        this.getRows(this.props.filteredInstances)
      } else {
        this.getRows(this.props.data.instances)
      }
      this.getInventoryStatus(this.props.data)
    }
  }

  componentDidMount() {
    this.getRows(this.props.data.instances)
    this.getInventoryStatus(this.props.data)
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

  fetchCSV = async () => {
    const dbaasCSV = await fetchDbaasCSV(this.state.currentNS, DBaaSOperatorName)
    this.setState({ dbaaSOperatorNameWithVersion: dbaasCSV.metadata?.name })
  }

  goToInventoryInfoPage = () => {
    const { currentNS, dbaaSOperatorNameWithVersion } = this.state
    const { data } = this.props

    window.location.pathname = `/k8s/ns/${currentNS}/clusterserviceversions/${dbaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/${data?.name}`
  }

  getInventoryStatus = (inventory) => {
    let inventoryReadyCondition = inventory?.status?.conditions?.find((condition) => {
      return condition.type?.toLowerCase() === 'inventoryready'
    })

    if (!_.isEmpty(inventoryReadyCondition) && inventoryReadyCondition?.status === 'False') {
      this.fetchCSV()
      this.setState({ inventoryHasIssue: true })
    }
  }

  toTopologyView() {
    const { currentNS } = this.state
    window.location.pathname = `/topology/ns/${currentNS}?view=graph`
  }

  getRows(data) {
    let rowList = []

    if (data && data.length > 0) {
      _.forEach(data, (dbInstance) => {
        var connectionRows = []

        if (this.props.isSelectable && this.props.connectionAndServiceBindingList != undefined) {
          for (let connection of this.props.connectionAndServiceBindingList) {
            if (connection.instanceID == dbInstance.instanceID) {
              for (let i = 0; i < connection.applications.length; i++) {
                if (i === 0) {
                  connectionRows.push([connection.namespace, 'Yes', connection.applications[i].name])
                } else {
                  connectionRows.push(['\u00a0', 'Yes', connection.applications[i].name])
                }
              }
              if (connection.applications.length === 0) {
                connectionRows.push([connection.namespace, 'No', '\u00a0'])
              }
            }
          }

          rowList.push({
            cells: [
              //Instance name
              dbInstance.name,
              //Instance ID
              dbInstance.instanceID,
              //Provider account issue
              this.state.inventoryHasIssue ? (
                <React.Fragment>
                  <IssuePopover action={this.goToInventoryInfoPage} />
                </React.Fragment>
              ) : null,
              //Namespace
              <React.Fragment>
                <List isPlain>
                  {connectionRows.map((con) => (
                    <ListItem>{con[0]}</ListItem>
                  ))}
                </List>
              </React.Fragment>,
              //Bound
              <React.Fragment>
                <List isPlain>
                  {connectionRows.map((con) => (
                    <ListItem>{con[1]}</ListItem>
                  ))}
                </List>
              </React.Fragment>,
              //App names
              <React.Fragment>
                <List isPlain>
                  {connectionRows.map((con) => (
                    <ListItem>{con[2]}</ListItem>
                  ))}
                </List>
              </React.Fragment>,
            ],
          })
        } else {
          rowList.push({
            cells: [
              //id
              dbInstance.instanceID,
              //instance
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

  onSelect(event, isSelected, rowId) {
    let rows = this.state.rows.map((oneRow, index) => {
      oneRow.selected = rowId === index
      return oneRow
    })
    this.setState({
      selectedInstance: this.props.data.instances[rowId],
      rows: rows,
    })
  }

  submitInstances() {
    let newBody = {
      apiVersion: 'dbaas.redhat.com/v1alpha1',
      kind: 'DBaaSConnection',
      metadata: {
        //k8s only accept lowercase metadata.name and add last 10 chars of the instanceID to avoid same name
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

    let requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify(newBody),
    }
    fetch(
      '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + this.state.currentNS + '/dbaasconnections',
      requestOpts
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'Failure') {
          this.setState({ showError: true, error: data })
        } else {
          this.toTopologyView()
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

  handleCancel() {
    window.history.back()
  }

  handleSubmit = async (event) => {
    event.preventDefault()
    this.submitInstances()
  }

  render() {
    const { columns, rows, error, showError, sortBy } = this.state
    const { isSelectable, isLoading, connectionAndServiceBindingList, filteredInstances } = this.props

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
      <React.Fragment>
        <div className="sticky-table-container">
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
              <Alert variant="danger" isInline title={error.reason} className="co-alert co-break-word">
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
            <ActionGroup>
              <Button
                id="instance-select-button"
                variant="primary"
                onClick={this.handleSubmit}
                isDisabled={_.isEmpty(this.state.selectedInstance)}
              >
                Connect
              </Button>
              <Button variant="secondary" onClick={this.handleCancel}>
                Cancel
              </Button>
            </ActionGroup>
          </div>
        ) : null}
      </React.Fragment>
    )
  }
}

export default InstanceTable
