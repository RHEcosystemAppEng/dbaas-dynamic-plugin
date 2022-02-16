import { Bullseye, EmptyState, EmptyStateVariant, List, ListItem, Popover, Title } from '@patternfly/react-core'
import { ExclamationTriangleIcon } from '@patternfly/react-icons'
import { cellWidth, Table, TableBody, TableHeader, wrappable } from '@patternfly/react-table'
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
            href={`/k8s/ns/${currentNS}/clusterserviceversions/${dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/~new`}
          >
            Create Provider Account
          </Button>
        </ActionGroup>
      </EmptyState>
    </Bullseye>
  )
}

const AdminConnectionsTable = (props) => {
  const currentNS = window.location.pathname.split('/')[3]
  const columns = [
    { title: 'Instance Name', transforms: [wrappable, cellWidth(30)] },
    { title: 'DB Provider', transforms: [wrappable, cellWidth(30)] },
    { title: 'Provider Account', transforms: [wrappable, cellWidth(30)] },
    { title: 'Alert', transforms: [wrappable, cellWidth(20)] },
    { title: 'Project', transforms: [wrappable, cellWidth(30)] },
    { title: 'Bound', transforms: [wrappable, cellWidth(10)] },
    { title: 'User', transforms: [wrappable, cellWidth(30)] },
    { title: 'Application', transforms: [wrappable, cellWidth(30)] },
  ]
  const [rows, setRows] = useState([])
  const [inventories, setConnections] = useState(props.inventories)
  const [connections, setInventories] = useState(props.connections)
  const [dBaaSOperatorNameWithVersion, setDBaaSOperatorNameWithVersion] = useState(props.dBaaSOperatorNameWithVersion)

  const getRows = () => {
    let rowList = []
    if (inventories && inventories.length > 0) {
      _.forEach(inventories, (inventory) => {
        var connectionRows = []
        let dbProvider
        let providerAcct
        if (inventory.providername === crunchyProviderType) {
          dbProvider = crunchyProviderName
        } else if (inventory.providername === mongoProviderType) {
          dbProvider = mongoProviderName
        } else if (inventory.providername === cockroachdbProviderType) {
          dbProvider = cockroachdbProviderName
        }
        if (inventory.instances?.length > 0) {
          for (let dbInstance of inventory.instances) {
            for (let connection of connections) {
              providerAcct = connection.instanceName
              if (connection.instanceID == dbInstance.instanceID) {
                for (let i = 0; i < connection.applications.length; i++) {
                  if (i === 0) {
                    connectionRows.push([
                      connection.namespace,
                      'Yes',
                      connection.users[i],
                      connection.applications[i].name,
                    ])
                  } else {
                    connectionRows.push(['\u00a0', 'Yes', connection.users[i], connection.applications[i].name])
                  }
                }
                if (connection.applications.length === 0) {
                  connectionRows.push([connection.namespace, 'No', '\u00a0', '\u00a0'])
                }
              }
            }

            rowList.push({
              cells: [
                dbInstance.name,
                dbProvider,
                inventory.name,
                inventory.alert.length > 0 ? (
                  <div>
                    <Popover
                      aria-label="Basic popover"
                      headerContent={<div>Issue</div>}
                      bodyContent={<div>Click on the link below for more information about this issue.</div>}
                      footerContent={
                        <a
                          href={`/k8s/ns/${currentNS}/clusterserviceversions/${dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/${inventory.name}`}
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
                    {connectionRows.map((con) => (
                      <ListItem>{con[0]}</ListItem>
                    ))}
                  </List>
                </React.Fragment>,
                <React.Fragment>
                  <List isPlain>
                    {connectionRows.map((con) => (
                      <ListItem>{con[1]}</ListItem>
                    ))}
                  </List>
                </React.Fragment>,
                <React.Fragment>
                  <List isPlain>
                    {connectionRows.map((con) => (
                      <ListItem>{con[2]}</ListItem>
                    ))}
                  </List>
                </React.Fragment>,
                <React.Fragment>
                  <List isPlain>
                    {connectionRows.map((con) => (
                      <ListItem>{con[3]}</ListItem>
                    ))}
                  </List>
                </React.Fragment>,
              ],
            })
          }
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

    setRows(rowList)
  }

  React.useEffect(() => {
    getRows()
  }, [])

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

export default AdminConnectionsTable
