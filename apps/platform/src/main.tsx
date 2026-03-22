import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AntdProvider } from './app/providers/AntdProvider.tsx';
import { LocaleProvider } from './app/providers/LocaleProvider.tsx';
import './index.css';
import 'antd/dist/reset.css';
import 'antd/dist/antd.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <AntdProvider>
        <App />
      </AntdProvider>
    </LocaleProvider>
  </StrictMode>
);
