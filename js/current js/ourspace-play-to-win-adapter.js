/* OurSpace Play-to-Win Private Currency Adapter v2
   Converts imported GitHub play-to-earn / wallet / NFT style calls into private OurSpace in-site currency.
   Important: mobile-game rewards are allowed only for these bundled OurSpace game IDs:
   angrybirds, baconmaydie, badicecream3, badpiggies, bubbleshooter, candycrush, capybaraclicker, ducklife5, escapingtheprison, fancypantsadventure2, flappybird, fnaf, fnaf4, fruitninja, minesweeper, noobminer, plantsvszombies, tabletennisworldtour, tinyfishing, tunnelrush, webecomewhatwebehold, zombierush
*/
(function () {
  'use strict';

  if (window.__OurSpacePlayToWinAdapterInstalled) return;
  window.__OurSpacePlayToWinAdapterInstalled = true;

  const ALLOWED_GAME_IDS = new Set(["angrybirds", "baconmaydie", "badicecream3", "badpiggies", "bubbleshooter", "candycrush", "capybaraclicker", "ducklife5", "escapingtheprison", "fancypantsadventure2", "flappybird", "fnaf", "fnaf4", "fruitninja", "minesweeper", "noobminer", "plantsvszombies", "tabletennisworldtour", "tinyfishing", "tunnelrush", "webecomewhatwebehold", "zombierush"]);
  const CONFIG = Object.assign({
    defaultAwardCopper: 100,
    maxSingleAwardCopper: 5000,
    maxSessionCopper: 50000,
    cooldownMs: 1500,
    source: 'ourspace-play-to-win-adapter',
    category: 'mobile_games',
    mode: 'private-in-site-currency-only'
  }, window.OurSpacePlayToWinConfig || window.OurSpacePlayToEarnConfig || {});

  const ACCEPTED_TYPES = new Set([
    'earndao.reward.v1', 'earndao.payout.v1', 'earndao.game.reward',
    'x-to-earn.reward', 'x2earn.reward', 'playtoearn.reward', 'play-to-earn.reward',
    'game.reward', 'reward', 'payout'
  ]);

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let sessionCopper = 0;
  const lastAwards = Object.create(null);

  function cleanInt(value) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  function clamp(value, min, max) {
    value = cleanInt(value);
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function amountObjectToCopper(value) {
    if (!value || typeof value !== 'object') return 0;
    if ('totalCopper' in value) return cleanInt(value.totalCopper);
    if ('rewardTotalCopper' in value) return cleanInt(value.rewardTotalCopper);
    if ('priceTotalCopper' in value) return cleanInt(value.priceTotalCopper);
    return cleanInt(value.copper) + cleanInt(value.silver) * 10 + cleanInt(value.gold) * 100 + cleanInt(value.platinum) * 1000;
  }

  function gameplayAmountToCopper(data) {
    if (!data || typeof data !== 'object') return cleanInt(CONFIG.defaultAwardCopper);
    const direct = amountObjectToCopper(data) || amountObjectToCopper(data.amount) || amountObjectToCopper(data.reward);
    if (direct) return clamp(direct, 1, CONFIG.maxSingleAwardCopper);
    const gameplayFields = ['points', 'score', 'xp', 'value', 'amount', 'rewardAmount', 'earnAmount', 'coins', 'coin', 'gems', 'stars'];
    for (const field of gameplayFields) {
      if (data[field] !== undefined && Number.isFinite(Number(data[field]))) return clamp(Number(data[field]), 1, CONFIG.maxSingleAwardCopper);
    }
    return cleanInt(CONFIG.defaultAwardCopper);
  }

  function safeId(value, fallback) {
    return String(value || fallback || 'activity').toLowerCase().replace(/\.html?$/i, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback || 'activity';
  }
  function safeLabel(value, fallback) { return String(value || fallback || 'Private in-site reward').replace(/[<>]/g, '').slice(0, 120); }
  function activeProfile() { return window.PortalStorage && PortalStorage.getActiveProfileId ? PortalStorage.getActiveProfileId() : 'shared'; }

  function disabledResponse() {
    return Promise.resolve({
      connected: false,
      privateCurrencyOnly: true,
      realCurrencyPayouts: false,
      message: 'OurSpace uses private in-site currency. Wallets, tokens, NFTs, cashouts, withdrawals, tips, trades, and real-money payouts are disabled.'
    });
  }

  function award(input) {
    const data = Object.assign({}, input || {});
    const category = safeId(data.category || CONFIG.category, 'mobile_games');
    const gameId = safeId(data.gameId || data.game || data.app || data.name, category === 'mobile_games' ? 'unknown-game' : 'activity');

    if (category === 'mobile_games' && !ALLOWED_GAME_IDS.has(gameId)) {
      console.warn('[OurSpace] Blocked non-OurSpace game reward:', gameId, data);
      return false;
    }

    let totalCopper = gameplayAmountToCopper(data);
    const remaining = cleanInt(CONFIG.maxSessionCopper) - sessionCopper;
    if (remaining <= 0) return false;
    totalCopper = Math.min(totalCopper, remaining);
    if (!totalCopper) return false;

    const eventId = safeId(data.eventId || data.reason || data.type || 'play_to_win_reward', 'play_to_win_reward');
    const dedupeKey = `${category}:${gameId}:${eventId}:${data.level || ''}:${data.score || data.points || ''}`;
    const now = Date.now();
    if (lastAwards[dedupeKey] && now - lastAwards[dedupeKey] < cleanInt(CONFIG.cooldownMs)) return false;
    lastAwards[dedupeKey] = now;
    sessionCopper += totalCopper;

    const payload = {
      type: 'ourspace.game.reward.v1',
      source: CONFIG.source,
      category,
      sessionId,
      profile: data.profile || activeProfile(),
      gameId,
      gameName: data.gameName || data.title || data.game || gameId,
      eventId,
      label: safeLabel(data.label || data.message || data.reason, category === 'mobile_games' ? 'Bundled OurSpace game reward' : 'OurSpace activity reward'),
      totalCopper,
      cooldownMs: CONFIG.cooldownMs,
      dedupeKey: `ptw:${sessionId}:${dedupeKey}:${sessionCopper}`,
      detail: { privateCurrencyOnly: true, realCurrencyPayout: false, convertedFromGitHubCode: true }
    };

    if (window.OurSpaceCurrency && typeof window.OurSpaceCurrency.award === 'function') {
      window.OurSpaceCurrency.award(payload);
      return true;
    }
    if (window.parent && window.parent !== window) { try { window.parent.postMessage(payload, '*'); return true; } catch (err) {} }
    return false;
  }

  function awardActivity(input) {
    return award(Object.assign({ category: 'activity', gameId: 'activity', source: 'ourspace-activity' }, input || {}));
  }

  function handleMessage(event) {
    const data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (!ACCEPTED_TYPES.has(String(data.type || '').toLowerCase())) return;
    award(Object.assign({ sourceMessageType: data.type }, data));
  }

  window.OurSpacePlayToWin = Object.assign(window.OurSpacePlayToWin || {}, {
    version: '2.0.0',
    mode: CONFIG.mode,
    allowedGameIds: Array.from(ALLOWED_GAME_IDS),
    privateCurrencyOnly: true,
    realCurrencyPayouts: false,
    cryptoWalletRequired: false,
    award,
    awardActivity,
    awardGamePlay: award,
    convertAmountToCopper: gameplayAmountToCopper,
    connectWallet: disabledResponse,
    cashOut: disabledResponse,
    withdraw: disabledResponse,
    mint: disabledResponse,
    trade: disabledResponse,
    tip: disabledResponse
  });

  window.OurSpacePlayToEarn = window.OurSpacePlayToWin;

  window.EarnDAO = Object.assign(window.EarnDAO || {}, {
    mode: CONFIG.mode,
    privateCurrencyOnly: true,
    reward: award,
    award,
    credit: award,
    payout: award,
    claim: award,
    earn: award,
    awardActivity,
    connectWallet: disabledResponse,
    cashOut: disabledResponse,
    withdraw: disabledResponse,
    mint: disabledResponse,
    trade: disabledResponse,
    tip: disabledResponse
  });

  window.addEventListener('message', handleMessage, false);
})();
