import React from "react";
import { MONGODB_PROVIDER_NAME, CRUNCHY_PROVIDER_NAME } from "../const";

class VendorForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedDBProvider: MONGODB_PROVIDER_NAME
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.onDBProviderChange = this.onDBProviderChange.bind(this);
    }

    onDBProviderChange = (e) => {
        let dbProviderName = e.target.value;
        this.setState({ selectedDBProvider: dbProviderName });
    };

    handleSubmit = async (event) => {
        event.preventDefault();
        //TODO: Store the selected DB provider information somewhere.
        this.props.setSelectedDBProvider(this.state.selectedDBProvider);
        this.props.setActiveTab(1);
    };

    render() {
        return (
            <form
                id="vendor-select-form"
                onSubmit={this.handleSubmit}
            >
                <div className="radio-div">
                    <label className="radio-label">
                        <input
                            type="radio"
                            id="atlas"
                            value={MONGODB_PROVIDER_NAME}
                            name="vendor"
                            className="select-radio-input"
                            defaultChecked={true}
                            onChange={this.onDBProviderChange}
                        />
              MongoDB Atlas
            </label>
                    <br />
                    <label className="radio-label">
                        <input
                            type="radio"
                            value={CRUNCHY_PROVIDER_NAME}
                            name="vendor"
                            className="select-radio-input"
                            onChange={this.onDBProviderChange}
                        />
              Crunchy Bridge PostgreSQL
            </label>
                    <br />
                    <br />
                    <button id="vendor-select-button" className="select-button">
                        Select
            </button>
                </div>
            </form>
        );
    }
}

export default VendorForm;