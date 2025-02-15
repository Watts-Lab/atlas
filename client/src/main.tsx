import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import React from 'react'
import { ReactFlowProvider } from 'reactflow'
import WorkflowProvider from './context/Workflow/WorkflowProvider.tsx'
import { SocketProvider } from './context/Socket/SocketProvider.tsx'
import { Toaster } from 'sonner'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <ReactFlowProvider>
        <WorkflowProvider>
          <SocketProvider>
            <App />
            <Toaster richColors />
          </SocketProvider>
        </WorkflowProvider>
      </ReactFlowProvider>
    </Router>
  </React.StrictMode>,
)
