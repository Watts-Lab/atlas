from flask import Flask, request, jsonify, make_response
from flask_restful import Resource, Api

import json
import argparse

import os


app = Flask(__name__)
api = Api(app)


class HelloWorld(Resource):
    def get(self):
        response_data = {'message': 'Hello, World!'}
        response = make_response(jsonify(response_data))
        response.status_code = 200
        return response

api.add_resource(HelloWorld, "/status")


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
