import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/app';

// Shared design tokens FIRST (colors/spacing/fonts), then this app's own
// layout styles — same load order convention as Angular's project.json
// "styles" array. Never redefine a --tp-* variable in styles.css.
import '@ticketportal-mono/design-tokens/tokens.css';
import '@ticketportal-mono/design-tokens/components.css';
import './styles.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
