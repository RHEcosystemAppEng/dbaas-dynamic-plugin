import * as React from 'react';
import {
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
} from '@patternfly/react-core';
import { KEYBOARD_SHORTCUTS } from '../const';

type InstanceListFilterProps = {
  textInputIDValue: string;
  setTextInputIDValue: (textInputIDValue: string) => void;
};

const InstanceListFilter: React.FC<InstanceListFilterProps> = ({
  textInputIDValue,
  setTextInputIDValue,
}: InstanceListFilterProps) => {

  return (
    <Toolbar data-test-id="toolbar-filter-instances">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <div className="has-feedback">
              <TextInput
                value={textInputIDValue}
                type="text"
                onChange={(value) => setTextInputIDValue(value)}
                aria-label='Search by ID'
                placeholder='Search by ID...'
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
  );
};

export default InstanceListFilter;
