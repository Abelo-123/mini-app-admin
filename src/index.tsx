import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import { AdminApp } from './AdminApp';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
