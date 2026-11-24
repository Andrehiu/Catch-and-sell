import { isNewBuild } from './build';

declare const __BUILD_ID__: string;

function showUpdateBar(reg: ServiceWorkerRegistration): void {
  if (document.getElementById('update-bar')) return;
  const bar = document.createElement('button');
  bar.id = 'update-bar';
  bar.type = 'button';
  bar.textContent = 'New version — tap to update';
  bar.addEventListener('click', () => {
    bar.textContent = 'Updating…';
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    reg.waiting?.postMessage('SKIP_WAITING');
  });
  document.body.appendChild(bar);
}

async function checkVersion(reg: ServiceWorkerRegistration): Promise<void> {
  try {
    const res = await fetch('version.json', { cache: 'no-store' });
    const data = await res.json();
    if (isNewBuild(__BUILD_ID__, data?.build)) await reg.update();
  } catch {
    /* offline: ignore */
  }
}

/** Registers the service worker. Production builds only; `?sw=0` opts out. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  if (new URLSearchParams(location.search).get('sw') === '0') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const watch = () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(reg);
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg);
      reg.addEventListener('updatefound', watch);
      void checkVersion(reg);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void checkVersion(reg);
      });
    });
  });
}
