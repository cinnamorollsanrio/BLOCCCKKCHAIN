// Page actions for signup.html. Shared wallet and contract logic loads first.
// Behavior for signup.html. common.js loads first.
renderPage = function () {
  el("signupConnectButton").textContent = account ? "Wallet connected" : "Connect MetaMask";
  el("registerButton").textContent = registered ? "Registration recorded" : "Submit registration →";
};

pageControls = function () {
  el("signupConnectButton").disabled = busy || !configured || !!account;
  el("registerButton").disabled = busy || !ready || !account || admin || registered || election.phase !== "setup";
};

on("signupConnectButton", "click", () => connectWallet("signup"));

on("registerButton", "click", () => {
  if (!el("registerButton").disabled) transact("registerVoter", [], "Registration recorded. Waiting for admin approval.");
});

initialize();
