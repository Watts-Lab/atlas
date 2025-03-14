# API Reference

This document provides an overview of the RESTful API endpoints and their associated controllers in the Atlas application. All endpoints are served by a Sanic application, and certain endpoints require a valid JSON Web Token (JWT) to access. Where applicable, the code examples assume you have already obtained a valid JWT.

Below is a breakdown of the major routes in the system, along with detailed information on request parameters, response formats, and example usages.

---

## Table of Contents

1. [Getting Started](#getting-started)  
2. [Endpoints](#endpoints)  
   - [Projects](#projects)  
     - [/api/projects (GET, POST, PUT)](#apiprojects-get-post-put)  
     - [/api/projects/features (GET, POST)](#apiprojectsfeatures-get-post)  
     - [/api/projects/results (GET)](#apiprojectsresults-get)  
   - [User Projects](#user-projects)  
     - [/api/user/projects (GET)](#apiuserprojects-get)  
   - [User Papers](#user-papers)  
     - [/api/user/papers (GET)](#apiuserpapers-get)  
   - [Features](#features)  
     - [/api/features (GET, POST)](#apifeatures-get-post)  
   - [Login & Validate](#login--validate)  
     - [/api/login (POST)](#apilogin-post)  
     - [/api/validate (POST)](#apivalidate-post)  
   - [Add Papers](#add-papers)  
     - [/api/add_paper (POST, GET)](#apiadd_paper-post-get)  
   - [Run Paper](#run-paper)  
     - [/api/run_paper (POST, GET)](#apirun_paper-post-get)  
3. [Controllers](#controllers)  
   - [Assistant (controllers/assistant.py)](#assistant-controllersassistantpy)  
   - [Login (controllers/login.py)](#login-controllersloginpy)  
   - [Project (controllers/projectpy)](#project-controllersprojectpy)  

---

## Getting Started

1. **Install Dependencies**  
   - Ensure you have Python 3.9+ installed.  
   - Install required packages (for example, via pip):  
     ```bash
     pip install -r requirements.txt
     ```

2. **Set Environment Variables**  
   - Create a .env file (or set environment variables in your system) for the following (example values shown):
     ```
     CELERY_BROKER_URL=redis://localhost:6379/0
     CELERY_RESULT_BACKEND=redis://localhost:6379/0
     JWT_SECRET=mysecret
     ```
   - These variables are used for Celery tasks, Redis messaging, and JWT authentication.

3. **Run the Server**  
   - By default, the application listens on port 80 if no arguments are provided:
     ```bash
     python api.py --port 80 --dev False
     ```
   - For development mode, set `--dev True` to enable hot reloading in Sanic.

---

## Endpoints

### Projects

#### /api/projects (GET, POST, PUT)

• A protected route requiring a valid JWT.  
• Used to create, retrieve, or update a project.

1. **POST**  
   - Description: Create a new project tied to the authenticated user.  
   - Request Parameters (in request body as JSON):  
     - (Currently hardcoded example)  
       - project_name: string (Example: "New Project")  
       - project_description: string (Example: "Project Description")  
   - Example Usage (cURL):
     ```bash
     curl -X POST \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{}' \
       http://localhost/api/projects
     ```
   - Example Response (JSON):
     ```json
     {
       "message": "Project created.",
       "project_id": "<project-id-string>"
     }
     ```

2. **GET**  
   - Description: Retrieve a project by its ID and return associated papers/results.  
   - Query Parameters:
     - project_id (string) – ID of the project to retrieve (required).
   - Example Usage (cURL):
     ```bash
     curl -X GET \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       "http://localhost/api/projects?project_id=<project-id>"
     ```
   - Example Response (JSON):
     ```json
     {
       "project": {
         "id": "<project-id>",
         "title": "New Project",
         "description": "New Project",
         "slug": "...",
         "created_at": "timestamp",
         "updated_at": "timestamp",
         "papers": ["<paper-id-1>", "<paper-id-2>"]
       },
       "results": [
         {
           "task_id": "...",
           "status": "success",
           "file_name": "some_filename.pdf",
           "experiments": []
         }
       ]
     }
     ```

3. **PUT**  
   - Description: Updates the name (title) of an existing project.  
   - Query Parameters:
     - project_id (string) – ID of the project to update (required).  
   - JSON Body Parameters:
     - project_name (string) – The new title of the project (required).  
   - Example Usage (cURL):
     ```bash
     curl -X PUT \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"project_name": "Updated Project Title"}' \
       "http://localhost/api/projects?project_id=<project-id>"
     ```
   - Example Response (JSON):
     ```json
     {
       "message": "Project updated.",
       "project": {
         "id": "<project-id>",
         "title": "Updated Project Title",
         "description": "...",
         "slug": "...",
         "created_at": "timestamp",
         "updated_at": "timestamp"
       }
     }
     ```

---

#### /api/projects/features (GET, POST)

• A protected route requiring a valid JWT (commented out in example code, but typically required).  
• Manages adding or retrieving features linked to a project.

1. **GET**  
   - Description: Retrieve all features currently associated with a given project.  
   - Query Parameters:
     - project_id (string) – ID of the project (required).  
   - Example Usage (cURL):
     ```bash
     curl -X GET \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       "http://localhost/api/projects/features?project_id=<project-id>"
     ```
   - Example Response (JSON):
     ```json
     {
       "message": "Feature added.",
       "features": [
         {
           "id": "<feature-id>",
           "feature_name": "Example Feature",
           "feature_description": "Description of this feature",
           "feature_identifier": "some_identifier"
         }
       ]
     }
     ```

2. **POST**  
   - Description: Add one or more existing features to a project.  
   - JSON Body Parameters:
     - project_id (string) – ID of the project (required).  
     - feature_ids (array of strings) – IDs of the features to add (required).  
   - Example Usage (cURL):
     ```bash
     curl -X POST \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{
         "project_id": "<project-id>",
         "feature_ids": ["<feature-id-1>", "<feature-id-2>"]
       }' \
       http://localhost/api/projects/features
     ```
   - Example Response (JSON):
     ```json
     {
       "message": "Feature added."
     }
     ```

---

#### /api/projects/results (GET)

• A protected route requiring a valid JWT.  
• Retrieves results associated with a project.

1. **GET**  
   - Description: Return the stored results (JSON responses) for a given project.  
   - Query Parameters:
     - project_id (string) – ID of the project (required).  
   - Example Usage (cURL):
     ```bash
     curl -X GET \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       "http://localhost/api/projects/results?project_id=<project-id>"
     ```
   - Example Response (JSON):
     ```json
     {
       "message": "results found.",
       "results": [
         {
           "any_result_key": "...",
           "another_key": "..."
         }
       ]
     }
     ```

---

### User Projects

#### /api/user/projects (GET)

• A protected route requiring a valid JWT.  
• Retrieves all projects associated with the authenticated user.

1. **GET**  
   - Description: Get a list of the current user’s projects.  
   - Example Usage (cURL):
     ```bash
     curl -X GET \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       http://localhost/api/user/projects
     ```
   - Example Response (JSON):
     ```json
     {
       "project": [
         {
           "id": "<project-id>",
           "title": "Project Title",
           "description": "...",
           "updated_at": "timestamp",
           "papers": ["<paper-id-1>", "<paper-id-2>"]
         }
       ]
     }
     ```

---

### User Papers

#### /api/user/papers (GET)

• A protected route requiring a valid JWT.  
• Retrieves a paginated list of papers the user has uploaded.

1. **GET**  
   - Description: Returns a list of papers belonging to the authenticated user.  
   - Query Parameters:
     - page (int) – Page number for pagination (default=1).  
     - page_size (int) – Number of items per page (default=10).  
   - Example Usage (cURL):
     ```bash
     curl -X GET \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       "http://localhost/api/user/papers?page=1&page_size=5"
     ```
   - Example Response (JSON):
     ```json
     {
       "papers": [
         {
           "id": "<paper-id>",
           "title": "Example Paper",
           "content": "...",
           "...": "other fields"
         }
       ],
       "total_papers": 5,
       "page": 1,
       "page_size": 5
     }
     ```

---

### Features

#### /api/features (GET, POST)

• A protected route requiring a valid JWT (currently set to a test user in the code).  
• Used to list or create features in the system.

1. **GET**  
   - Description: Retrieve the list of public or user-specific features.  
   - Example Usage (cURL):
     ```bash
     curl -X GET \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       http://localhost/api/features
     ```
   - Example Response (JSON):
     ```json
     {
       "response": "success",
       "features": [
         {
           "id": "<feature-id>",
           "feature_name": "Example Feature",
           "feature_description": "Some description",
           "feature_identifier": "some_identifier"
         }
       ]
     }
     ```

2. **POST**  
   - Description: Create a new feature (public or user-specific).  
   - JSON Body Parameters:
     - feature_name (string) – Name of the feature (required).  
     - feature_identifier (string) – Unique identifier for the feature (required).  
     - feature_description (string) – Long description of the feature (optional).  
     - gpt_interface (any JSON) – Additional GPT interface data (optional).  
   - Example Usage (cURL):
     ```bash
     curl -X POST \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{
         "feature_name": "My Feature",
         "feature_identifier": "my_feature_id",
         "feature_description": "Detailed description here",
         "gpt_interface": {}
       }' \
       http://localhost/api/features
     ```
   - Example Response (JSON):
     ```json
     {
       "response": "success",
       "feature": {
         "id": "<feature-id>",
         "feature_name": "My Feature",
         "feature_description": "Detailed description here",
         "feature_identifier": "my_feature_id"
       }
     }
     ```

---

### Login & Validate

#### /api/login (POST)

• Unprotected route.  
• Issues a magic link for email-based login.

1. **POST**  
   - Description: Initiates the login flow by generating a magic link sent to the user’s email.  
   - JSON Body Parameters:
     - email (string) – The user's email (required).  
   - Example Usage (cURL):
     ```bash
     curl -X POST \
       -H "Content-Type: application/json" \
       -d '{"email": "user@example.com"}' \
       http://localhost/api/login
     ```
   - Example Response (JSON):
     ```json
     {
       "message": "Magic link generated. Check your email."
     }
     ```
   - Note: If the user does not exist, a new user is created and a magic link is still sent.

---

#### /api/validate (POST)

• Unprotected route.  
• Validates the magic link and issues a JWT token in the response header.

1. **POST**  
   - Description: Validates the magic link sent to the user’s email. If valid, returns a JWT in the HTTP “Authorization” header.  
   - JSON Body Parameters:
     - email (string) – The user's email (required).  
     - magic_link (string) – The secret token from the magic link (required).  
   - Example Usage (cURL):
     ```bash
     curl -X POST \
       -H "Content-Type: application/json" \
       -d '{
         "email": "user@example.com",
         "magic_link": "base64-encoded-token"
       }' \
       http://localhost/api/validate
     ```
   - Example Response (JSON):
     ```json
     {
       "message": "Magic link validated."
     }
     ```
   - The response headers include the JWT token:
     ```
     Authorization: <JWT_TOKEN>
     ```

---

### Add Papers

#### /api/add_paper (POST, GET)

• A protected route requiring a valid JWT.  
• Used for uploading papers and triggering asynchronous tasks for processing the paper using Celery.

1. **POST**  
   - Description: Uploads one or more files to the server and triggers a Celery task to process those files.  
   - Form Data Parameters:
     - file (File) – The paper file(s) to upload.  
     - sid (string) – A socket/session ID for real-time callbacks (optional).  
     - project_id (string) – The project to which these papers belong (optional).  
   - Headers:
     - "Authorization": "Bearer <JWT_TOKEN>"  
   - Example Usage (cURL):
     ```bash
     curl -X POST \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       -F "file=@/path/to/my_paper.pdf" \
       -F "sid=socket123" \
       -F "project_id=<project-id>" \
       http://localhost/api/add_paper
     ```
   - Example Response (JSON):
     ```json
     {
       "my_paper.pdf": "<celery-task-id>"
     }
     ```

2. **GET**  
   - Description: Retrieves the result of a Celery task for processing the paper.  
   - Query Parameters:
     - task_id (string) – The Celery task ID (required).  
   - Example Usage (cURL):
     ```bash
     curl -X GET \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       "http://localhost/api/add_paper?task_id=<celery-task-id>"
     ```
   - Response can vary based on whether the task completed successfully or not.

---

### Run Paper

#### /api/run_paper (POST, GET)

• A protected route requiring a valid JWT.  
• Allows uploading a single file along with specific features to run an asynchronous task.

1. **POST**  
   - Description: Upload a paper file along with a list of requested feature identifiers to process.  
   - Form Data Parameters:
     - file (File) – The paper file to upload (required).  
     - features (stringified JSON) – A list of feature IDs or relevant data (optional).  
     - sid (string) – A socket/session ID for real-time callbacks (optional).  
   - Headers:
     - "Authorization": "Bearer <JWT_TOKEN>"  
   - Example Usage (cURL):
     ```bash
     curl -X POST \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       -F "file=@/path/to/another_paper.pdf" \
       -F "sid=socket123" \
       -F "features=[\"feature-id-1\",\"feature-id-2\"]" \
       http://localhost/api/run_paper
     ```
   - Example Response (JSON):
     ```json
     {
       "status": "<celery-task-id>"
     }
     ```

2. **GET**  
   - Description: (Same route) Could be used similarly to check the status of the Celery task if implemented.  
   - Not fully demonstrated in current code, but parallels /api/add_paper usage.

---

## Controllers

### Assistant (controllers/assistant.py)

Helper functions related to GPT-based paper processing.

• Function: run_assistant_api  
  - Description: Invokes a GPT-based assistant to process an uploaded file.  
  - Parameters:  
    - sid (str): Socket/session ID.  
    - file_path (str): Local file path.  
    - sio (socketio.RedisManager): Socket.IO Redis manager for real-time messaging.  
    - task_id (str): Celery task ID.  
    - project_id (str): The project ID.  
  - Returns: A JSON-like dictionary with “message”, “file_name”, and “output” fields.  

Example:
```python
from controllers.assistant import run_assistant_api
import socketio

mgr = socketio.RedisManager("redis://localhost:6379/0")
response = run_assistant_api(
    sid="socket123",
    file_path="papers/socket123-my_paper.pdf",
    sio=mgr,
    task_id="celery-task-id",
    project_id="<project-id>"
)
print(response)
```

---

### Login (controllers/login.py)

Manages email-based magic link logins and validation.

• Function: login_user  
  - Description: Generates a 1-hour-valid magic link for the given email, sends it via email, and either updates an existing user or creates a new one.  
  - Parameters:  
    - email (str): The user’s email.  
  - Returns: JSON response with status info.  

• Function: validate_user  
  - Description: Validates the magic link. If valid, it issues a JWT token in the HTTP header.  
  - Parameters:  
    - email (str): The user’s email.  
    - token (str): The magic link token.  
  - Returns: JSON response containing the validation status.  

Usage Example:
```python
response = await login_user(email="user@example.com")
# ...
validation = await validate_user(email="user@example.com", token="abcd1234")
```

---

### Project (controllers/project.py)

• Function: create_project  
  - Description: Creates a new project for the specified user.  
  - Parameters:  
    - project_name (str): Name of the project.  
    - project_description (str): Description of the project.  
    - user (User): The User object associated with the project.  
  - Returns: The string representation of the new project's ID.  

Usage Example:
```python
from controllers.project import create_project
from database.models.users import User

user = User.find_one(User.email == "user@example.com").run()
project_id = create_project("My New Project", "Project Description", user)
print("New project ID:", project_id)
```

---

## Notes & Caveats

• Many endpoints are marked as “protected routes,” implying usage of a JWT token. Make sure to pass the token in the “Authorization: Bearer <JWT_TOKEN>” header or in a way your front-end integrates with the server.  
• Celery tasks are used for long-running processes (e.g., parsing and analyzing PDF files). Use the provided task ID to query status or results.  

---

© 2023 - 2025  Atlas API – All rights reserved.