import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ManageScreen from './screens/ManageScreen.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { DisplaySettingsProvider } from './settings/DisplaySettingsContext.jsx'
import './index.css'

const isManageRoute = window.location.pathname === '/manage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DisplaySettingsProvider>
      <LanguageProvider>
        {isManageRoute ? <ManageScreen /> : <App />}
      </LanguageProvider>
    </DisplaySettingsProvider>
  </StrictMode>,
)
