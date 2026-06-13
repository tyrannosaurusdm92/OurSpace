/* Jasper Squishy Rewards compatibility shim.
   Some exported Table Tennis World Tour builds request developer_v1.js.
   The original game logic is preserved in the HTML; this file prevents a missing-script 404 from interrupting loading. */
window.developer_v1 = window.developer_v1 || { loaded: true, source: "SquishyRewards compatibility shim" };
