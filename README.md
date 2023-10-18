# Research Atlas
The product of all our research cartography. 

## Table of Contents

- [Getting Started](#getting-started)
  - [Server](#server)
  - [Client](#client)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)


## Project Structure

The project structure is divided into a Flask backend pet up in the `server` folder and a React.js frontend (using Vite and Typescript) set up in the `client` folder. 

```
/
├── client/
│   ├── public/
│   └── src/
├── server/
│   ├── helpers/
│   └── api.py
└── README.md
```

## Getting Started

### Server

1. **Set Up Virtual Environment and Install Dependencies**

   Navigate to the "server" directory, set up a virtual environment and install the Python dependencies:

   ```bash
   cd server
   python -m venv env
   source env/bin/activate
   pip install -r requirements.txt
   ```

2. **Run the Server**

   Start the Flask server:

   ```bash
   python3 api.py -p 8000
   ```
   
   The server will be running at http://localhost:8000.

### Client

1. **Install Dependencies**

   Navigate to the "client" directory and install the Node.js dependencies:

   ```bash
   cd ../client
   npm install
   ```

2. **Run the Development Server**

   Start the Vite development server for the React.js frontend:

   ```bash
   npm run dev
   ```

   This development server will be running at http://localhost:5173.

<!-- ## Usage -->



## Contributing

Contributions are what make the open source community such an amazing place to be, learn, and grow. Any contributions you make to this project are **greatly appreciated**. 

<!-- ## License

Distributed under the (License). See `LICENSE` for more information. -->