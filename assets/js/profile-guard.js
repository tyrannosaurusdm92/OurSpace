(() => {
  const requiredProfile = document.body.dataset.requiredProfile;
  const owner = document.getElementById("profile-owner");
  const signoutButton = document.getElementById("signout-button");

  function goHome() {
    window.location.replace("index.html");
  }

  async function checkSession() {
    const session = OurSpaceBackend.getStoredSession();
    if (!session || !session.sessionToken || !session.user) {
      goHome();
      return;
    }
    if (session.user.profileKey !== requiredProfile) {
      OurSpaceBackend.clearSession();
      goHome();
      return;
    }
    try {
      const data = await OurSpaceBackend.call("me", { sessionToken: session.sessionToken });
      if (!data.user || data.user.profileKey !== requiredProfile) {
        OurSpaceBackend.clearSession();
        goHome();
        return;
      }
      owner.textContent = `Signed in as ${data.user.displayName} (${data.user.username}).`;
    } catch (err) {
      OurSpaceBackend.clearSession();
      goHome();
    }
  }

  signoutButton.addEventListener("click", async () => {
    const session = OurSpaceBackend.getStoredSession();
    signoutButton.disabled = true;
    try {
      if (session && session.sessionToken) {
        await OurSpaceBackend.call("signout", { sessionToken: session.sessionToken });
      }
    } catch (err) {
      // Clear local session even if backend signout fails.
    }
    OurSpaceBackend.clearSession();
    goHome();
  });

  checkSession();
})();
