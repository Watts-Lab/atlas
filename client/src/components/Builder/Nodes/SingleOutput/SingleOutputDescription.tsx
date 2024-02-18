import React from "react";

const SingleOutputDescription: React.FC = () => {
  return (
    <div>
      <form className="space-y-4">
        <div className="form-control">
          <label className="label" htmlFor="measurement">
            <span className="label-text">How is this feature measured?</span>
          </label>
          <select
            id="measurement"
            className="select select-bordered"
            defaultValue={"Choose an option"}
          >
            <option disabled>Choose an option</option>
            <option>GPT-4</option>
            <option>Amazon MTurk</option>
            <option>Gemini-2</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label" htmlFor="dataAppearance">
            <span className="label-text">What does the data look like?</span>
          </label>
          <textarea
            id="dataAppearance"
            className="textarea textarea-bordered"
            placeholder="Shows some values"
          ></textarea>
        </div>

        <div className="form-control">
          <label className="label" htmlFor="featureQuality">
            <span className="label-text">How good is the feature?</span>
          </label>
          <select
            id="featureQuality"
            className="select select-bordered"
            defaultValue={"Choose an option"}
          >
            <option disabled>Choose an option</option>
            <option>Quality Metric 1</option>
            <option>Quality Metric 2</option>
            <option>Quality Metric 3</option>
          </select>
        </div>

        <div className="form-control">
          <label className="cursor-pointer label">
            <span className="label-text mr-2">Is there ground truth?</span>
            <input type="checkbox" className="toggle" />
          </label>
        </div>

        {/* Dynamic form sections can be added based on the feature type selected */}

        <div className="form-control mt-6">
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default SingleOutputDescription;
