// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import FeedbackProvider from './components/ui/FeedbackProvider.jsx'
import './styles.css'
import './styles.extra.css'
import './styles.calendar.css'
import './styles.final.css'
import './styles.responsive.css' // ✅ NUEVO: overrides para 1366x768
import './styles.layout.css' // layout con sidebar
import './styles/ui.css' // sistema de diseño (debe ir último)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </BrowserRouter>
  </React.StrictMode>
)


