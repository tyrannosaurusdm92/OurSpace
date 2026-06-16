(function(){
  "use strict";
  const MAIN_BACKEND = window.OURSPACE_BACKEND_URL || "https://script.google.com/macros/library/d/1Ld-KR6PrFPTBs1qsdAsZ55kBUa9QRYIkLgidknvgJ-2PLtujf9D-Mt6A/1";
  const QUEUE_KEY = "ourspace.gas.app.events.v1";
  const source = "ourspace_github_pages_pwa";

  function appMode(){
    try {
      if(window.navigator.standalone) return "ios_standalone";
      if(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return "standalone";
      if(window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
    } catch(_err) {}
    return "browser";
  }

  function readQueue(){
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
    catch(_err) { return []; }
  }

  function writeQueue(items){
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify((items || []).slice(-80))); }
    catch(_err) {}
  }

  function pageProfile(){
    const cfg = document.getElementById("profile-config");
    if(cfg) {
      try { return JSON.parse(cfg.textContent || "{}").dataProfile || "profile"; }
      catch(_err) {}
    }
    if(document.body && document.body.classList.contains("auth-page")) return "landing";
    return document.title || "unknown";
  }

  function payload(action, detail){
    return {
      action: action,
      source: source,
      app: "OurSpace",
      profile: pageProfile(),
      pageTitle: document.title,
      path: location.pathname + location.hash,
      url: location.href,
      displayMode: appMode(),
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      screen: { width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      detail: detail || {},
      createdAt: new Date().toISOString()
    };
  }

  async function post(payload){
    if(!MAIN_BACKEND) throw new Error("main backend URL missing");
    const response = await fetch(MAIN_BACKEND, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "text/plain;charset=utf-8", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch(_err) { data = { ok:false, raw:text.slice(0,160) }; }
    if(!response.ok || data.ok === false) throw new Error(data.error?.message || data.error || data.message || "backend event rejected");
    return data;
  }

  async function send(action, detail){
    const item = payload(action, detail);
    try {
      await post(item);
      await flush();
    } catch(_err) {
      const q = readQueue();
      q.push(item);
      writeQueue(q);
    }
  }

  async function flush(){
    const q = readQueue();
    if(!q.length || !navigator.onLine) return;
    const remaining = [];
    for(const item of q){
      try { await post(item); }
      catch(_err) { remaining.push(item); }
    }
    writeQueue(remaining);
  }

  function init(){
    window.OurSpaceAppEvents = { send, flush, mode: appMode, backendUrl: MAIN_BACKEND };
    send(document.body && document.body.classList.contains("auth-page") ? "landing.zone.open" : "app.launch", { referrer: document.referrer || "" });
    window.addEventListener("online", () => { send("app.online", {}); flush(); });
    window.addEventListener("offline", () => send("app.offline", {}));
    window.addEventListener("appinstalled", () => send("app.installed", {}));
    window.addEventListener("beforeinstallprompt", () => send("app.install_prompt.available", {}));
    window.addEventListener("hashchange", () => send("app.page.change", { hash: location.hash }));
    document.addEventListener("visibilitychange", () => send("app.visibility", { state: document.visibilityState }));
    setTimeout(flush, 1500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
