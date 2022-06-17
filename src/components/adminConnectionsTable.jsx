import { EmptyState, EmptyStateVariant, List, ListItem, Popover, Title, EmptyStateBody } from '@patternfly/react-core'
import { ExclamationTriangleIcon } from '@patternfly/react-icons'
import {
  cellWidth,
  Table,
  TableBody,
  TableHeader,
  wrappable,
  OuterScrollContainer,
  InnerScrollContainer,
  sortable,
  SortByDirection,
} from '@patternfly/react-table'
import _ from 'lodash'
import React from 'react'
import { DBaaSInventoryCRName } from '../const'
import './_dbaas-import-view.css'

class AdminConnectionsTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentNS: window.location.pathname.split('/')[3],
      columns: [
        { title: 'Instance Name', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'DB Provider', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'Provider Account', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'Alert', transforms: [wrappable, cellWidth(10)] },
        { title: 'Project', transforms: [wrappable, cellWidth(10)] },
        { title: 'Bound', transforms: [wrappable, cellWidth(10)] },
        { title: 'User', transforms: [wrappable, cellWidth(15)] },
        { title: 'Application', transforms: [wrappable, cellWidth(15)] },
      ],
      rows: [],
      dBaaSOperatorNameWithVersion: this.props.dBaaSOperatorNameWithVersion,
      noInstances: this.props.noInstances,
      sortBy: {},
    }
    this.getRows = this.getRows.bind(this)
    this.onSort = this.onSort.bind(this)
  }

  componentDidMount() {
    this.getRows(this.props.inventoryInstances)
  }

  componentDidUpdate(prevProps) {
    if (
      (this.props.inventoryInstances &&
        this.props.inventoryInstances.length > 0 &&
        !_.isEqual(prevProps.inventoryInstances, this.props.inventoryInstances)) ||
      !_.isEqual(prevProps.filteredInstances, this.props.filteredInstances)
    ) {
      if (this.props.filteredInstances) {
        this.getRows(this.props.filteredInstances)
      } else {
        this.getRows(this.props.inventoryInstances)
      }
    }
  }

  onSort = (_event, index, direction) => {
    let filterKey = ''
    let sortedInstances = []
    const filterColumns = ['instanceName', 'dbProvider', 'providerAcct']
    filterKey = filterColumns[index]
    const { inventoryInstances } = this.props

    if (!_.isEmpty(inventoryInstances)) {
      sortedInstances = inventoryInstances.sort((a, b) => {
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

  getRows(data) {
    let rowList = []
    const genericAlert = 'Click on the link below for more information about this issue.'
    if (data && data.length > 0) {
      data.forEach((inventoryInstance) => {
        rowList.push({
          cells: [
            inventoryInstance.instanceName,
            inventoryInstance.dbProvider,
            inventoryInstance.providerAcct,
            inventoryInstance.alert.length > 0 ? (
              <div>
                <Popover
                  aria-label="Basic popover"
                  headerContent={inventoryInstance.alert !== 'alert' ? <div>Connection issue</div> : <div>Issue</div>}
                  bodyContent={
                    inventoryInstance.alert !== 'alert' ? (
                      <div>
                        {inventoryInstance.alert} {genericAlert}
                      </div>
                    ) : (
                      <div>{genericAlert}</div>
                    )
                  }
                  footerContent={
                    <a
                      href={`/k8s/ns/${this.state.currentNS}/clusterserviceversions/${this.state.dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/${inventoryInstance.providerAcct}`}
                    >
                      Learn more
                    </a>
                  }
                >
                  <div>
                    <ExclamationTriangleIcon color="#f0ab00"></ExclamationTriangleIcon>
                    <span className="issue-text"> Issue</span>
                  </div>
                </Popover>
              </div>
            ) : (
              ''
            ),
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[0]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[1]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[2]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[3]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
          ],
        })
      })
    } else {
      // Empty State for the table
      rowList.push({
        heightAuto: true,
        cells: [
          {
            props: { colSpan: 8 },
            title: (
              <EmptyState variant={EmptyStateVariant.small}>
                <Title headingLevel="h2" size="lg">
                  {this.state.noInstances ? 'No database provider account imported' : 'No database instances'}
                </Title>
                <EmptyStateBody>
                  {this.state.noInstances
                    ? 'Import a database provider account to view available database instances.'
                    : ''}
                </EmptyStateBody>
              </EmptyState>
            ),
          },
        ],
      })
    }
    this.setState({ rows: rowList })
  }

  render() {
    const { columns, rows, sortBy } = this.state
    const { inventoryInstances } = this.props

    return (
      <React.Fragment>
        <div className="sticky-table-container">
          <OuterScrollContainer>
            <InnerScrollContainer>
              <Table
                sortBy={!_.isEmpty(inventoryInstances) ? sortBy : null}
                onSort={!_.isEmpty(inventoryInstances) ? this.onSort : null}
                id="instance-connection-status-table"
                aria-label="Instance Connection Status Table"
                cells={columns}
                rows={rows}
              >
                <TableHeader className="sticky-header-th" />
                <TableBody />
              </Table>
            </InnerScrollContainer>
          </OuterScrollContainer>
        </div>
      </React.Fragment>
    )
  }
}
export default AdminConnectionsTable
