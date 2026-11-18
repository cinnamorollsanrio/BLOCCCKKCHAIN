// Page actions for admin-login.html. Shared wallet and contract logic loads first.
// Behavior for admin-login.html. common.js loads first.
on("adminLoginButton", "click", () => connectWallet("admin"));

initialize();
