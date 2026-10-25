import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AvailabilityProvider } from './context/AvailabilityContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AvailabilityProvider>
      <App />
    </AvailabilityProvider>
  </StrictMode>,
);
