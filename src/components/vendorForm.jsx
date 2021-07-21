import React from "react";
import { MONGODB_PROVIDER_NAME, CRUNCHY_PROVIDER_NAME } from "../const";
import { Form, FormGroup, TextInput, FormSelect, FormSelectOption, FormSelectOptionGroup } from '@patternfly/react-core';

class VendorForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inventoryName: '',
            selectedDBProvider: '',
            dbProviderOptions: [
                { value: '', label: 'Select provider' },
                { value: MONGODB_PROVIDER_NAME, label: 'MongoDB Atlas' },
                { value: CRUNCHY_PROVIDER_NAME, label: 'Crunchy Bridge' },
            ]
        };
        this.onInventoryNameChange = this.onInventoryNameChange.bind(this);
        this.onDBProviderChange = this.onDBProviderChange.bind(this);
    }

    onInventoryNameChange = value => {
        let convertedInventoryName = value.replace(/\s+/g, '-').toLowerCase();
        this.setState({ inventoryName: convertedInventoryName });
        this.props.setInventoryName(convertedInventoryName);
    }

    onDBProviderChange = (value, event) => {
        this.setState({selectedDBProvider: value})
        this.props.setSelectedDBProvider(value);
    };

    render() {
        const { inventoryName, selectedDBProvider, dbProviderOptions } = this.state;

        return (
            <Form isWidthLimited>
                <FormGroup label="Name" fieldId="inventory-name">
                    <TextInput
                        type="text"
                        id="inventory-name"
                        name="inventory-name"
                        value={inventoryName}
                        onChange={this.onInventoryNameChange}
                    />
                </FormGroup>
                <FormGroup label="Database provider" fieldId="db-provider">
                    <FormSelect value={selectedDBProvider} onChange={this.onDBProviderChange} aria-label="Database Provider">
                        {dbProviderOptions.map((option, index) => (
                            <FormSelectOption key={index} value={option.value} label={option.label} />
                        ))}
                    </FormSelect>
                </FormGroup>
            </Form>
        );
    }
}

export default VendorForm;