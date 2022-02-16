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
} from '@patternfly/react-table'
import _ from 'lodash'
import React from 'react'
import { getCSRFToken } from '../utils'
import './_dbaas-import-view.css'

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
      currentNS: window.location.pathname.split('/')[3],
      columns: this.props.isSelectable
        ? [
            { title: 'ID', transforms: [wrappable, cellWidth(20)] },
            { title: 'Instance', transforms: [wrappable, cellWidth(20)] },
            { title: 'Project', transforms: [wrappable, cellWidth(20)] },
            { title: 'Bound', transforms: [wrappable, cellWidth(10)] },
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
    }
  }

  componentDidMount() {
    this.getRows(this.props.data.instances)
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
              //id
              dbInstance.instanceID,
              //instance
              `${dbInstance.name}-${dbInstance.instanceID.slice(-10)}`,
              //project Name
              <React.Fragment>
                <List isPlain>
                  {connectionRows.map((con) => (
                    <ListItem>{con[0]}</ListItem>
                  ))}
                </List>
              </React.Fragment>,
              //bound
              <React.Fragment>
                <List isPlain>
                  {connectionRows.map((con) => (
                    <ListItem>{con[1]}</ListItem>
                  ))}
                </List>
              </React.Fragment>,
              //app names
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
    const { columns, rows, error, showError } = this.state
    const { isSelectable, isLoading, connectionAndServiceBindingList } = this.props

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
