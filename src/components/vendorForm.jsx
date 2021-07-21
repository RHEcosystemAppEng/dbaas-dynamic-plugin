import React from "react";
import { MONGODB_PROVIDER_NAME, CRUNCHY_PROVIDER_NAME } from "../const";

class VendorForm extends React.Component {
    constructor(props) {
        super(props);
        this.onDBProviderChange = this.onDBProviderChange.bind(this);
    }

    onDBProviderChange = (e) => {
        let dbProviderName = e.target.value;
        this.props.setSelectedDBProvider(dbProviderName);
    };

    render() {
        return (
            <form id="vendor-select-form">
                <div className="radio-div">
                    <label className="radio-label">
                        <input
                            type="radio"
                            id="atlas"
                            value={MONGODB_PROVIDER_NAME}
                            name="vendor"
                            className="select-radio-input"
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
                </div>
            </form>
        );
    }
}

export default VendorForm;