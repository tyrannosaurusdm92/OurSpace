(() => {
  const cfg = window.OURSPACE_CONFIG || {};

  function getStoredSession() {
    try {
      return JSON.parse(localStorage.getItem(cfg.SESSION_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function storeSession(data) {
    const session = {
      sessionToken: data.sessionToken,
      expiresAt: data.expiresAt,
      user: data.user
    };
    localStorage.setItem(cfg.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    localStorage.removeItem(cfg.SESSION_KEY);
  }

  async function callBackend(action, payload = {}) {
    if (!cfg.BACKEND_URL || cfg.BACKEND_URL.includes("PASTE")) {
      throw new Error("Backend URL is missing in assets/js/config.js");
    }

    const body = JSON.stringify({ action, ...payload });
    const response = await fetch(cfg.BACKEND_URL, {
      method: "POST",
      body,
      redirect: "follow"
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error("Backend returned non-JSON text. Check Apps Script deployment access and URL.");
    }

    if (!data.ok) throw new Error(data.error || data.message || "OurSpace backend request failed.");
    return data;
  }

  function profileRoute(profileKey) {
    return (cfg.PROFILE_ROUTES || {})[profileKey] || "index.html";
  }

  async function savePasswordCredential(form) {
    try {
      if ("credentials" in navigator && window.PasswordCredential && form) {
        const credential = new PasswordCredential(form);
        await navigator.credentials.store(credential);
      }
    } catch (err) {
      // Browser password manager support varies; normal autocomplete remains active.
    }
  }

  window.OurSpaceBackend = {
    call: callBackend,
    getStoredSession,
    storeSession,
    clearSession,
    profileRoute,
    savePasswordCredential
  };
})();
