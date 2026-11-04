import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ManageScreen from './screens/ManageScreen.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { DisplaySettingsProvider } from './settings/DisplaySettingsContext.jsx'
// Self-hosted fonts, bundled by Vite. No request leaves the device for them.
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
// The full build includes the SOFT axis used for the rounder title letters.
import '@fontsource-variable/fraunces/full.css'
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
