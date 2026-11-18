// Page actions for index.html. Shared wallet and contract logic loads first.
// Behavior for index.html. common.js loads first.
on("voterLoginButton", "click", () => connectWallet("voter"));

initialize();
