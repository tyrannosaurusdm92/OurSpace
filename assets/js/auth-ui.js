(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const status = $("#status");

  function setStatus(message, type = "") {
    status.textContent = message || "";
    status.className = "status" + (type ? " " + type : "");
  }

  function setLoading(form, loading) {
    form.querySelectorAll("button, input, select").forEach((el) => {
      el.disabled = !!loading;
    });
  }

  function formValue(form, selector) {
    const el = form.querySelector(selector);
    return el ? el.value.trim() : "";
  }

  function openTab(name) {
    $$("[data-auth-tab]").forEach((tab) => {
      const active = tab.dataset.authTab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    $$(".auth-panel").forEach((panel) => {
      const active = panel.id === `${name}-panel`;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    setStatus("");
  }

  async function redirectAfterAuth(data, form) {
    OurSpaceBackend.storeSession(data);
    await OurSpaceBackend.savePasswordCredential(form);
    const route = OurSpaceBackend.profileRoute(data.user.profileKey);
    window.location.assign(route);
  }

  $$("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => openTab(tab.dataset.authTab));
  });

  $$("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", show ? "true" : "false");
      input.focus();
    });
  });

  const existing = OurSpaceBackend.getStoredSession();
  if (existing && existing.user && existing.sessionToken) {
    // Do not force redirect while the user might be creating/resetting another profile.
    setStatus(`Already signed in as ${existing.user.displayName || existing.user.profileKey}.`);
  }

  $("#signin-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    setStatus("Signing in…");
    try {
      const data = await OurSpaceBackend.call("signin", {
        identifier: formValue(form, "#signin-identifier"),
        password: form.querySelector("#signin-password").value,
        profileKey: formValue(form, "#signin-profile")
      });
      setStatus("Signed in. Opening profile…", "success");
      await redirectAfterAuth(data, form);
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      setLoading(form, false);
    }
  });

  $("#signup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.querySelector("#signup-password").value;
    const confirm = form.querySelector("#signup-confirm").value;
    if (password !== confirm) {
      setStatus("The password and confirmation do not match.", "error");
      return;
    }
    setLoading(form, true);
    setStatus("Creating profile sign-in…");
    try {
      const data = await OurSpaceBackend.call("signup", {
        profileKey: formValue(form, "#signup-profile"),
        displayName: formValue(form, "#signup-display"),
        email: formValue(form, "#signup-email"),
        username: formValue(form, "#signup-username"),
        password
      });
      setStatus("Profile created. Opening profile…", "success");
      await redirectAfterAuth(data, form);
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      setLoading(form, false);
    }
  });

  $("#reset-request-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    setStatus("Sending reset code…");
    try {
      await OurSpaceBackend.call("requestPasswordReset", {
        identifier: formValue(form, "#reset-identifier")
      });
      setStatus("If that account exists, a reset code was emailed.", "success");
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      setLoading(form, false);
    }
  });

  $("#reset-complete-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    setStatus("Resetting password…");
    try {
      await OurSpaceBackend.call("resetPassword", {
        identifier: formValue(document.querySelector("#reset-request-form"), "#reset-identifier"),
        code: formValue(form, "#reset-code"),
        newPassword: form.querySelector("#reset-new-password").value
      });
      setStatus("Password reset. You can sign in now.", "success");
      openTab("signin");
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      setLoading(form, false);
    }
  });
})();
