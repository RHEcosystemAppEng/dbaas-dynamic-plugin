import React from "react";

class VendorForm extends React.Component {
    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit = async (event) => {
        event.preventDefault();
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
                            value="atlas"
                            name="vendor"
                            className="select-radio-input"
                        />
              MongoDB Atlas
            </label>
                    <br />
                    <label className="radio-label">
                        <input
                            type="radio"
                            value="crunchy"
                            name="vendor"
                            className="select-radio-input"
                            defaultChecked={true}
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