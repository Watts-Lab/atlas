from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import argparse

app = Flask(__name__)
CORS(app)


# /api/home
@app.route("/api/home", methods=["GET"])
def return_home():
    response_data = {"message": "Hello, World!"}
    response = make_response(jsonify(response_data))
    response.status_code = 200
    return response


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
