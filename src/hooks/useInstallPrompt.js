import { useEffect, useState } from 'react';

/*
 * Chrome/Edge/Android fire `beforeinstallprompt` once, often before React mounts.
 * We capture it at module load (this file is imported from main.jsx) and expose it via a hook.
 */
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function useInstallPrompt() {
  const [, force] = useState(0);

  useEffect(() => {
    const update = () => force((n) => n + 1);
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return outcome === 'accepted';
  };

  return { canInstall: !!deferredPrompt, installed: isStandalone(), install };
}
