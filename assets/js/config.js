window.OURSPACE_CONFIG = {
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbxrm8lbJFGe62K_3xOTUQYvr2D7AKXLCrR8LkR6s14Bwd3k_qkaff9QDRs6KeGhHPaoSg/exec",
  ONYX_FULL_BACKEND_URL: "https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec",
  ONYX_ALERTS_BACKEND_URL: "https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec",
  SESSION_KEY: "ourspace.session.v2",
  PROFILE_ROUTES: {
    jasper: "squishy-cottage.html",
    william: "dino-nerdzone.html"
  },
  PROFILE_LABELS: {
    jasper: "Squishy Cottage",
    william: "Dino Nerdzone"
  }
};

window.OURSPACE_BACKEND_URL = window.OURSPACE_CONFIG.BACKEND_URL;
window.OURSPACE_ONYX_FULL_BACKEND_URL = window.OURSPACE_CONFIG.ONYX_FULL_BACKEND_URL;
window.OURSPACE_ONYX_ALERTS_BACKEND_URL = window.OURSPACE_CONFIG.ONYX_ALERTS_BACKEND_URL;
window.ONYX_BACKEND_CONFIG = Object.assign({
  mainBackendUrl: window.OURSPACE_BACKEND_URL,
  onyxFullBackendUrl: window.OURSPACE_ONYX_FULL_BACKEND_URL,
  directAppsScript: true,
  staticBase: "onyx/"
}, window.ONYX_BACKEND_CONFIG || {});
