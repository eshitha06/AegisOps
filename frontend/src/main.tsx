import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { TelemetryModeProvider } from './context/TelemetryModeContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><TelemetryModeProvider><App /></TelemetryModeProvider></React.StrictMode>,
)
