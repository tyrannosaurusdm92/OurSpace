(function(){
  'use strict';
  const APP_BASE = document.querySelector('base')?.href || location.href;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  let deferredPrompt = null;
  function registerServiceWorker(){
    if(!('serviceWorker' in navigator)) return;
    const doRegister = () => navigator.serviceWorker.register(new URL('service-worker.js', APP_BASE), { scope: './' })
      .catch(error => console.warn('OurSpace service worker registration failed:', error));
    if(document.readyState === 'complete') doRegister();
    else window.addEventListener('load', doRegister, { once:true });
  }
  function createInstallBar(){
    if(isStandalone || localStorage.getItem('ourspace:pwa:installDismissed') === 'true') return;
    const bar = document.createElement('div');
    bar.className = 'os-pwa-install is-hidden';
    bar.innerHTML = '<span>Install OurSpace to your home screen for app-style access.</span><button type="button" data-pwa-install>Install</button><button type="button" class="os-pwa-close" data-pwa-close>×</button>';
    document.body.appendChild(bar);
    const installButton = bar.querySelector('[data-pwa-install]');
    const closeButton = bar.querySelector('[data-pwa-close]');
    function showManualHint(){
      const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      bar.querySelector('span').textContent = isiOS ? 'In Safari: Share → Add to Home Screen.' : 'Open browser menu → Add to Home screen / Install app.';
      bar.classList.remove('is-hidden');
    }
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      bar.classList.remove('is-hidden');
    });
    installButton.addEventListener('click', async () => {
      if(deferredPrompt){
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(()=>null);
        deferredPrompt = null;
        bar.classList.add('is-hidden');
      } else {
        showManualHint();
      }
    });
    closeButton.addEventListener('click', () => {
      localStorage.setItem('ourspace:pwa:installDismissed','true');
      bar.classList.add('is-hidden');
    });
    setTimeout(() => { if(!deferredPrompt) showManualHint(); }, 2200);
  }
  function createOfflineBadge(){
    const badge = document.createElement('div');
    badge.className = 'os-offline-badge';
    badge.textContent = 'Offline mode: saved app shell is available.';
    badge.hidden = navigator.onLine;
    document.body.appendChild(badge);
    window.addEventListener('online', () => badge.hidden = true);
    window.addEventListener('offline', () => badge.hidden = false);
  }
  function init(){
    registerServiceWorker();
    createInstallBar();
    createOfflineBadge();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
