from flask import Flask, request, jsonify, make_response
from flask_restful import Resource, Api
from flask_cors import CORS

import json
import argparse

import os


app = Flask(__name__)
api = Api(app)

CORS(app)


class HelloWorld(Resource):
    def get(self):
        response_data = {"message": "Hello, World!"}
        response = make_response(jsonify(response_data))
        response.status_code = 200
        return response

    def post(self):
        data = request.get_json()
        nodes = data.get("nodes")
        edges = data.get("edges")

        print("nodes:")
        for n in nodes:
            print(n)

        print("edges:")
        for e in edges:
            print(e)

        return jsonify({"message": "Nodes and edges received successfully"})


api.add_resource(HelloWorld, "/api/workflow")



# Create a new prompt
class Prompt(Resource):
    def post(self):
        prompt_data = request.json
        prompt_id = prompt_data["prompt_id"]

        document = {
            "prompt_id": prompt_id,
            "current_version": 1,
            "versions": [{"version": 1, "data": prompt_data["data"]}],
        }

        collection.insert_one(document)

        return jsonify({"message": "Prompt created", "prompt_id": prompt_id}), 201
# @app.route("/prompt", methods=["POST"])
# def create_prompt():
#     prompt_data = request.json
#     prompt_id = prompt_data["prompt_id"]

#     document = {
#         "prompt_id": prompt_id,
#         "current_version": 1,
#         "versions": [{"version": 1, "data": prompt_data["data"]}],
#     }

#     collection.insert_one(document)

#     return jsonify({"message": "Prompt created", "prompt_id": prompt_id}), 201


if __name__ == "__main__":
    # getting list of command line arguments
    parser = argparse.ArgumentParser(description="Flask RESTful api end point.")
    parser.add_argument("-p", "--port", help="Port for the server.", type=int)
    parser.add_argument("-d", "--debug", help="Debug mode on or off.", type=bool)
    args = parser.parse_args()

    # setting default values
    port = args.port if args.port else 8000
    debug = args.debug if args.debug else True

    app.run(host="0.0.0.0", port=port, debug=debug)
