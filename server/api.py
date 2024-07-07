""" This module contains the Flask RESTful API endpoint for the workflow editor. """

import os
import argparse
from dotenv import load_dotenv


from flask import Flask, request
from flask_jwt_extended import JWTManager
from flask_restful import Api
from flask_socketio import SocketIO
from flask_cors import CORS


from controllers.assisstant import RunAssistant
from controllers.features import GetFeatures
from controllers.login import Login

load_dotenv()

app = Flask(__name__, static_folder="../build", static_url_path="/")
api = Api(app)

CORS(app, resources={r"/*": {"origins": "*"}})

app.config["SECRET_KEY"] = os.getenv("SOCKET_SECRET")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET")
app.config["JWT_TOKEN_LOCATION"] = ["headers"]

socketio = SocketIO(app, cors_allowed_origins="*")

jwt = JWTManager(app)


api.add_resource(GetFeatures, "/api/features")
api.add_resource(
    RunAssistant,
    "/api/run_assistant",
    resource_class_kwargs={"socketio": socketio},
)
api.add_resource(Login, "/api/login")


@socketio.on("connect", namespace="/home")
def handle_connect():
    """event listener when client connects"""
    print("client connected", request.sid)


@socketio.on("disconnect", namespace="/home")
def handle_disconnect():
    """event listener when client disconnects"""
    print("client disconnected", request.sid)


@socketio.on("status")
def handle_message(data):
    """event listener when client types a message"""
    print("data from the front end: ", str(data), request.sid)


@app.route("/")
def index():
    """Serves the index.html file."""
    return app.send_static_file("index.html")


@app.errorhandler(404)
def not_found(e):
    """reroute to index.html for all other routes"""
    return app.send_static_file("index.html")


if __name__ == "__main__":
    # getting list of command line arguments
    parser = argparse.ArgumentParser(description="Flask RESTful api end point.")
    parser.add_argument("-p", "--port", help="Port for the server.", type=int)
    parser.add_argument("-d", "--debug", help="Debug mode on or off.", type=bool)
    args = parser.parse_args()
    # setting default values
    port = args.port if args.port else 80
    debug = args.debug if args.debug else False
    # app.run(host="0.0.0.0", port=port, debug=debug)
    socketio.run(app, host="0.0.0.0", port=port, debug=debug)
