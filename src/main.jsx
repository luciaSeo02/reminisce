import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ManageScreen from './screens/ManageScreen.jsx'
import './index.css'

const isManageRoute = window.location.pathname === '/manage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isManageRoute ? <ManageScreen /> : <App />}
  </StrictMode>,
)
