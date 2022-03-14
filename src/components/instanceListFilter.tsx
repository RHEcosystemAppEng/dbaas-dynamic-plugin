import * as React from 'react'
import { TextInput, Toolbar, ToolbarContent, ToolbarItem, ToolbarGroup } from '@patternfly/react-core'
import { KEYBOARD_SHORTCUTS } from '../const'
import './_dbaas-import-view.css'

type InstanceListFilterProps = {
  textInputNameValue: string
  setTextInputNameValue: (textInputNameValue: string) => void
}

const InstanceListFilter: React.FC<InstanceListFilterProps> = ({
  textInputNameValue,
  setTextInputNameValue,
}: InstanceListFilterProps) => {
  return (
    <Toolbar data-test-id="toolbar-filter-instances">
      <ToolbarContent className="no-left-and-right-padding">
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <div className="has-feedback">
              <TextInput
                value={textInputNameValue}
                type="text"
                onChange={(value) => setTextInputNameValue(value)}
                aria-label="Search by name"
                placeholder="Search by name..."
                className="co-text-filter"
              />
              <span className="form-control-feedback form-control-feedback--keyboard-hint">
                <kbd>{KEYBOARD_SHORTCUTS.focusFilterInput}</kbd>
              </span>
            </div>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  )
}

export default InstanceListFilter
