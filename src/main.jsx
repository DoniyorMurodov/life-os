import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AppProvider } from './context/AppContext';
import { FocusProvider } from './context/FocusContext';
import { SyncProvider } from './context/SyncContext';
import './hooks/useInstallPrompt';
import { requestPersistentStorage } from './utils/storage';
import App from './App';
import './index.css';

requestPersistentStorage();

// Supports deploying under a sub-path (e.g. GitHub Pages: /life-os/).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <ToastProvider>
          <SyncProvider>
            <AppProvider>
              <FocusProvider>
                <App />
              </FocusProvider>
            </AppProvider>
          </SyncProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
