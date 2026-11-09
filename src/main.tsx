import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { TeluguIMEProvider } from './context/TeluguIMEContext';

// Register service worker with automatic updates for offline readiness
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, auto-updating...');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <TeluguIMEProvider>
    <App />
  </TeluguIMEProvider>
);
