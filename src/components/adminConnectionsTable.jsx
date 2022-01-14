import React from 'react'
import _ from 'lodash'
import { Table, TableHeader, TableBody, wrappable, cellWidth } from '@patternfly/react-table'
import {
  Title,
  EmptyState,
  EmptyStateIcon,
  Spinner,
  Bullseye,
  EmptyStateVariant,
  List,
  ListItem,
} from '@patternfly/react-core'

const TableEmptyState = () => {
  return (
    <Bullseye>
      <EmptyState variant={EmptyStateVariant.small}>
        <Title headingLevel="h2" size="lg">
          No database instance connection found
        </Title>
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
        { title: 'ID', transforms: [wrappable, cellWidth(30)] },
        { title: 'Instance', transforms: [wrappable, cellWidth(30)] },
        { title: 'Status', transforms: [wrappable, cellWidth(30)] },
        { title: 'Namespace', transforms: [wrappable, cellWidth(30)] },
        { title: 'Application', transforms: [wrappable, cellWidth(30)] },
        { title: 'Database', transforms: [wrappable, cellWidth(30)] },
        { title: 'Provider Acct', transforms: [wrappable, cellWidth(30)] },
      ],
      rows: [],
    }
    this.getRows = this.getRows.bind(this)
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.connections &&
      this.props.connections.length > 0 &&
      !_.isEqual(prevProps.connections, this.props.connections)
    ) {
      this.getRows(this.props.connections)
    }
  }

  componentDidMount() {
    this.getRows(this.props.connections)
  }

  getRows(data) {
    let rowList = []
    if (data && data.length > 0) {
      _.forEach(data, (rowData) => {
        rowList.push({
          cells: [
            rowData.instanceID,
            rowData.instanceName,
            rowData.connectionStatus,
            rowData.namespace,
            rowData.applications?.length > 0
              ? {
                  title: (
                    <React.Fragment>
                      <List isPlain>
                        {rowData.applications.map((app) => (
                          <ListItem>{app.name}</ListItem>
                        ))}
                      </List>
                    </React.Fragment>
                  ),
                  props: { column: 'Branches' },
                }
              : '-',
            rowData.database,
            rowData.providerAcct,
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
    const { columns, rows } = this.state
    const { isLoading } = this.props

    if (isLoading) {
      return (
        <EmptyState>
          <EmptyStateIcon variant="container" component={Spinner} />
          <Title size="lg" headingLevel="h3">
            Fetching Database instance Connection Status...
          </Title>
        </EmptyState>
      )
    }

    return (
      <React.Fragment>
        <Table
          id="instance-connection-status-table"
          aria-label="Instance Connection Status Table"
          cells={columns}
          rows={rows}
        >
          <TableHeader />
          <TableBody />
        </Table>
      </React.Fragment>
    )
  }
}

export default AdminConnectionsTable
