/// <reference types="vite/client" />

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import appCss from './index.css?inline';

// Keep the complete Tailwind/app stylesheet inside the JS bundle.
// This avoids a broken admin UI if a Vercel deployment serves the SPA HTML
// before a hashed CSS asset is available.
const STYLE_ID = 'zhaya-app-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = appCss;
  document.head.appendChild(style);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
