import {
  Bullseye,
  EmptyState,
  EmptyStateVariant,
  List,
  ListItem,
  Popover,
  Title,
  ActionGroup,
  Button,
} from '@patternfly/react-core'
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
import React, { useState } from 'react'
import {
  cockroachdbProviderName,
  cockroachdbProviderType,
  crunchyProviderName,
  crunchyProviderType,
  mongoProviderName,
  mongoProviderType,
  DBaaSInventoryCRName,
  DBaaSOperatorName,
} from '../const.ts'
import { fetchDbaasCSV } from '../utils'

const TableEmptyState = () => {
  return (
    <Bullseye>
      <EmptyState variant={EmptyStateVariant.small}>
        <Title headingLevel="h2" size="lg">
          No database instances
        </Title>
        <ActionGroup>
          <Button
            id="instance-select-button"
            variant="primary"
            //  href={`/k8s/ns/${currentNS}/clusterserviceversions/${dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/~new`}
          >
            Create Provider Account
          </Button>
        </ActionGroup>
      </EmptyState>
    </Bullseye>
  )
}

class AdminConnectionsTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentNS: window.location.pathname.split('/')[3],
      columns: [
        { title: 'Instance Name', transforms: [wrappable, cellWidth(30), sortable] },
        { title: 'DB Provider', transforms: [wrappable, cellWidth(30), sortable] },
        { title: 'Provider Account', transforms: [wrappable, cellWidth(30), sortable] },
        { title: 'Alert', transforms: [wrappable, cellWidth(20)] },
        { title: 'Project', transforms: [wrappable, cellWidth(30)] },
        { title: 'Bound', transforms: [wrappable, cellWidth(10)] },
        { title: 'User', transforms: [wrappable, cellWidth(30)] },
        { title: 'Application', transforms: [wrappable, cellWidth(30)] },
      ],
      rows: [],
      dBaaSOperatorNameWithVersion: this.props.dBaaSOperatorNameWithVersion,
      sortBy: {},
    }
    this.getRows = this.getRows.bind(this)
    this.onSort = this.onSort.bind(this)
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

  componentDidMount() {
    this.getRows(this.props.inventoryInstances)
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
                  headerContent={<div>Issue</div>}
                  bodyContent={<div>Click on the link below for more information about this issue.</div>}
                  footerContent={
                    <a
                      href={`/k8s/ns/${this.currentNS}/clusterserviceversions/${this.dBaaSOperatorNameWithVersion}/${this.DBaaSInventoryCRName}/${inventoryInstance.name}`}
                    >
                      Learn more
                    </a>
                  }
                >
                  <div>
                    <ExclamationTriangleIcon color="#f0ab00"></ExclamationTriangleIcon>
                    <span style={{ color: '#2b9af3', paddingLeft: '3px' }}> Issue</span>
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
