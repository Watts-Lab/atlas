import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import React from 'react'
import { SocketProvider } from './context/Socket/SocketProvider.tsx'
import { Toaster } from 'sonner'
import { ReactFlowProvider } from '@xyflow/react'
import { WorkflowProvider } from './context/Workflow/WorkflowProvider.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
