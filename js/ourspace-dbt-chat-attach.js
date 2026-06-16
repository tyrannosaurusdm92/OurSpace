(function (global, document) {
  'use strict';

  const DEFAULTS = {
    allowedPages: ['dino-nerdzone.html', 'squishy-cottage.html'],
    titleText: 'Chat Bot with DBT Skills',
    hostClass: 'os-dbt-chat-plugin-host',
    replaceExistingPlaceholder: false,
    mainBackendUrl: 'https://script.google.com/macros/library/d/1Ld-KR6PrFPTBs1qsdAsZ55kBUa9QRYIkLgidknvgJ-2PLtujf9D-Mt6A/1',
    onyxAlertsBackendUrl: 'https://script.google.com/macros/library/d/1OtngPSoPXDpeYa8FDD9bb7rU_0mvFvD_23niUCrfy09t5Mbk0cy0kV5l/1'
  };

  const qs = (root, selector) => root.querySelector(selector);
  const qsa = (root, selector) => Array.from(root.querySelectorAll(selector));
  const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';

  function currentPluginBase() {
    const script = document.currentScript || qsa(document, 'script[src*="ourspace-dbt-chat-attach.js"]').slice(-1)[0];
    if (!script || !script.src) return './';
    return new URL('..', script.src).href.replace(/\/$/, '') + '/';
  }

  function isAllowedPage(config) {
    const file = (global.location.pathname.split('/').pop() || '').toLowerCase();
    if (config.forceAttach) return true;
    return (config.allowedPages || DEFAULTS.allowedPages).map(p => String(p).toLowerCase()).includes(file);
  }

  function loadCssOnce(href) {
    const absolute = new URL(href, document.baseURI).href;
    const already = qsa(document, 'link[rel="stylesheet"]').some(link => link.href === absolute || link.href.endsWith(href));
    if (already) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Could not load ' + href));
      document.head.appendChild(link);
    });
  }

  function loadScriptOnce(src, test) {
    if (typeof test === 'function' && test()) return Promise.resolve();
    const absolute = new URL(src, document.baseURI).href;
    const existing = qsa(document, 'script[src]').find(script => script.src === absolute || script.src.endsWith(src));
    if (existing) {
      return new Promise(resolve => {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => resolve(), { once: true });
        setTimeout(resolve, 2500);
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
  }

  function candidateContainersFromTitle(titleText) {
    const title = normalize(titleText);
    const titleSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[data-page-title]', '[data-title]', '.page-title', '.module-title', '.card-title', '.section-title',
      '[aria-label]', '[data-page]', '[data-section]'
    ].join(',');
    const nodes = qsa(document, titleSelectors).filter(node => {
      const own = normalize(node.getAttribute('aria-label') || node.getAttribute('data-page') || node.getAttribute('data-section') || node.textContent);
      return own.includes(title) || own.includes('dbt skills') || own.includes('dbt chat');
    });

    const containers = [];
    for (const node of nodes) {
      const inChrome = node.closest('nav, header, footer, menu');
      let current = node;
      while (current && current !== document.body) {
        if (current.matches('section, article, main, .page, .site-page, .module, .card, .panel, .view, [data-page], [data-section], [role="tabpanel"]')) {
          containers.push({ node: current, fromChrome: Boolean(inChrome), score: scoreContainer(current, node, inChrome) });
          break;
        }
        current = current.parentElement;
      }
    }
    return containers;
  }

  function scoreContainer(container, titleNode, inChrome) {
    let score = 0;
    if (container.matches('section, article, main')) score += 20;
    if (container.matches('.page, .site-page, .view, [data-page], [role="tabpanel"]')) score += 18;
    if (container.matches('.module, .card, .panel')) score += 12;
    if (container.id && /dbt|chat|bot|skill/i.test(container.id)) score += 25;
    if (container.className && /dbt|chat|bot|skill/i.test(String(container.className))) score += 20;
    if (normalize(container.textContent).includes('chat bot with dbt skills')) score += 25;
    if (titleNode.matches('h1, h2, h3, h4, h5, h6')) score += 10;
    if (inChrome) score -= 50;
    if (container.matches('nav, header, footer, menu')) score -= 100;
    return score;
  }

  function findTargetContainer(config) {
    const directSelectors = [
      '#chat-bot-with-dbt-skills', '#chatbot-dbt-skills', '#dbt-chatbot', '#dbt-chat-bot', '#chatbot-dbt',
      '[data-page="chat-bot-with-dbt-skills"]', '[data-page="dbt-chatbot"]', '[data-section="chat-bot-with-dbt-skills"]',
      '.chat-bot-with-dbt-skills', '.dbt-chatbot', '.dbt-chat-bot'
    ];
    for (const selector of directSelectors) {
      const direct = qs(document, selector);
      if (direct) return direct;
    }

    const candidates = candidateContainersFromTitle(config.titleText || DEFAULTS.titleText)
      .sort((a, b) => b.score - a.score);
    if (candidates.length) return candidates[0].node;

    const bodyText = normalize(document.body.textContent);
    if (bodyText.includes(normalize(config.titleText || DEFAULTS.titleText))) return document.body;
    return null;
  }

  function pageProfile() {
    const file = (global.location.pathname.split('/').pop() || '').toLowerCase();
    if (file.includes('squishy')) {
      return {
        key: 'squishy-cottage',
        label: 'Squishy',
        appName: 'Squishy Cottage - Chat Bot with DBT Skills',
        users: [
          { id: 'squishy', label: 'Squishy', avatar: '🌙' },
          { id: 'dino', label: 'Dino', avatar: '🦖' },
          { id: 'onyx', label: 'Onyx Alerts', avatar: '🐈‍⬛', system: true }
        ]
      };
    }
    return {
      key: 'dino-nerdzone',
      label: 'Dino',
      appName: 'Dino Nerdzone - Chat Bot with DBT Skills',
      users: [
        { id: 'dino', label: 'Dino', avatar: '🦖' },
        { id: 'squishy', label: 'Squishy', avatar: '🌙' },
        { id: 'onyx', label: 'Onyx Alerts', avatar: '🐈‍⬛', system: true }
      ]
    };
  }

  function makeHost(container, config, profile) {
    let host = qs(container, '.' + config.hostClass) || qs(container, '#ourspace-dbt-chat-messenger-root');
    if (!host) {
      host = document.createElement('div');
      host.className = config.hostClass;
      host.id = 'ourspace-dbt-chat-messenger-root-' + profile.key;
      host.setAttribute('data-ourspace-plugin', 'dbt-chat-messenger');
      host.setAttribute('data-target-page', profile.key);
      host.setAttribute('aria-label', 'OurSpace Messenger for Chat Bot with DBT Skills');
      container.appendChild(host);
    }
    return host;
  }

  function markOldPlaceholders(container) {
    qsa(container, '[data-placeholder], .placeholder, .coming-soon, .filler, .stub').forEach(node => {
      const text = normalize(node.textContent);
      if (text.includes('chat') || text.includes('dbt') || text.includes('bot')) {
        node.setAttribute('hidden', 'hidden');
      }
    });
  }

  async function attach() {
    const config = Object.assign({}, DEFAULTS, global.OurSpaceDBTChatPluginConfig || {});
    if (!isAllowedPage(config)) return;

    const base = config.pluginBaseUrl || currentPluginBase();
    const target = findTargetContainer(config);
    if (!target) {
      console.warn('[OurSpace DBT Chat] Target page/section was not found. Expected title:', config.titleText);
      return;
    }

    const profile = pageProfile();
    if (config.replaceExistingPlaceholder) markOldPlaceholders(target);
    const host = makeHost(target, config, profile);
    if (host.dataset.initialized === 'true') return;

    await loadCssOnce(base + 'css/ourspace-messenger.css');
    await loadScriptOnce(base + 'vendor/jeeliz/jeelizFaceFilter.js', () => Boolean(global.JEEFACEFILTERAPI));
    await loadScriptOnce(base + 'js/ourspace-backend-bridge.js', () => Boolean(global.OurSpaceBackendBridge));
    await loadScriptOnce(base + 'js/ourspace-messenger.js', () => Boolean(global.OurSpaceMessenger));

    const initConfig = Object.assign({
      mount: host,
      appName: profile.appName,
      defaultChannel: 'dbt-skills',
      storageKey: 'ourspaceMessengerPlugin.' + profile.key + '.dbt.v1',
      faceModelPath: base + 'json/docs/vendor/jeeliz/NN_VERYLIGHT_1.json',
      mainBackendUrl: config.mainBackendUrl,
      onyxAlertsBackendUrl: config.onyxAlertsBackendUrl,
      users: profile.users
    }, config.messenger || {});

    host.dataset.initialized = 'true';
    global.OurSpaceMessenger.init(initConfig);
    target.setAttribute('data-ourspace-dbt-chat-attached', 'true');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => attach().catch(error => console.error('[OurSpace DBT Chat]', error)), { once: true });
  } else {
    attach().catch(error => console.error('[OurSpace DBT Chat]', error));
  }
})(window, document);
