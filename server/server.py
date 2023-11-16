from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import argparse
import time

app = Flask(__name__)
CORS(app)


# /api/home
@app.route("/api/home", methods=["GET", "POST"])
def return_home():
    if request.method == "GET":
        response_data = {"message": "Hello, World!"}
        response = make_response(jsonify(response_data))
        response.status_code = 200
        return response

@app.route("/api/runprompt", methods=["POST"])
def run_prompt():
    request_data = request.get_json(silent=True)
    time.sleep(2)
    response_data = {
        "message": f"type, {request_data['outputType']} and prompt is {request_data['text']}!"
    }
    response = make_response(jsonify(response_data))
    response.status_code = 200
    return response

@app.route("/api/markdown", methods=["GET"])
def get_markdown_content():
    # Read the Markdown file and return its content as plain text
    with open("./files/sample_paper/A_19_2022_DoHonestyNudges.mmd", "r", encoding="utf-8") as markdown_file:
        content = markdown_file.read()
    return jsonify({"content": content})


if __name__ == "__main__":
    # getting list of command line arguments
    parser = argparse.ArgumentParser(description="Flask RESTful api end point.")
    parser.add_argument("-p", "--port", help="Port for the server.", type=int)
    parser.add_argument("-d", "--debug", help="Debug mode on or off.", type=bool)
    args = parser.parse_args()

    # setting default values
    port = args.port if args.port else 8080
    debug = args.debug if args.debug else True

    app.run(debug=True, port=8080)
