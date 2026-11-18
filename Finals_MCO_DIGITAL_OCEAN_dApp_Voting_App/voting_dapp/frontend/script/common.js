// Recheck the selected account and chain before restoring a session or requesting a signature.
async function walletMatches(wallet) {
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  const chain = await window.ethereum.request({ method: "eth_chainId" });
  return accounts.length > 0 && same(wallet, accounts[0]) && Number(chain) === chainId;
}
// The address identifies the deployed voting contract on the configured network.
const contractAddress = "0x328D9Bd2678ac5ca3160923f5eD3bB6AF6e18029";
const chainId = 11155111;
const networkName = "Sepolia";
const rpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";


const page = document.body.dataset.page;
const sessionKey = "voting-wallet:" + contractAddress;
let readProvider, readContract;
let account = "", admin = false, registered = false, authorized = false, voted = false;
let configured = false, ready = false, busy = false, selected = 0, loadVersion = 0;
let election = { phase: "setup", candidates: [], voters: [], position: "", total: 0, approved: 0 };

// The matching page script supplies its rendering and button controls.

let renderPage = function () {};

let pageControls = function () {};

function el(id) { return document.getElementById(id); }

function same(a, b) { return a.toLowerCase() === b.toLowerCase(); }

function on(id, event, action) {
  if (el(id)) el(id).addEventListener(event, action);
}

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}

function message(text, error = false) {
  el("message").hidden = false;
  el("message").dataset.kind = error ? "error" : "info";
  el("message").setAttribute("role", error ? "alert" : "status");
  el("messageText").textContent = text;
}

// Invalidate in-flight reads and clear the wallet session when the account or network changes.
function resetSession() {
  loadVersion++;
  sessionStorage.removeItem(sessionKey);
  account = "";
  admin = registered = authorized = voted = false;
  selected = 0;
  election.voters = [];
  if (el("confirmDialog") && el("confirmDialog").open) el("confirmDialog").close();
  render();
}

// Restore only the saved wallet that MetaMask still exposes on the configured chain.
async function restoreSession() {
  const saved = sessionStorage.getItem(sessionKey);
  if (!saved || !window.ethereum) return;
  if (await walletMatches(saved)) account = saved;
  else sessionStorage.removeItem(sessionKey);
}

// Request MetaMask access, verify the wallet role, then open the appropriate voter or admin page.
async function connectWallet(role) {
  if (busy || !configured) return;
  busy = true;
  controls();
  try {
    if (!window.ethereum) { message("Install MetaMask to continue.", true); return; }
    const addresses = await window.ethereum.request({ method: "eth_requestAccounts" });
    const network = await window.ethereum.request({ method: "eth_chainId" });
    if (Number(network) !== chainId) { message("Select " + networkName + " in MetaMask.", true); return; }
    const owner = await readContract.owner();
    const ownerWallet = same(addresses[0], owner);
    if ((role === "admin") !== ownerWallet) {
      message(ownerWallet ? "Use the electoral admin login." : "Select the admin wallet to continue.", true);
      return;
    }
    account = addresses[0];
    sessionStorage.setItem(sessionKey, account);
    await loadElection();
    if (!ready) return;
    if (role === "signup") message(registered ? "Wallet already registered." : "Wallet connected.");
    else window.location.href = role === "admin" ? "admin.html" : registered ? "vote.html" : "signup.html";
  } catch { message("Could not connect. Check MetaMask and try again.", true); }
  finally { busy = false; render(); }
}

// Read one block so candidates, totals, and wallet eligibility describe the same chain state.
async function loadElection() {
  if (!configured || !readContract) return;
  // A newer request or wallet change makes this response obsolete.
  const version = ++loadVersion;
  const wallet = account;
  try {
    const at = { blockTag: await readProvider.getBlockNumber() };
    const values = await Promise.all([
      readContract.owner(at), readContract.getElectionStatus(at), readContract.electionClosed(at),
      readContract.getCandidateCount(at), readContract.getTotalVotes(at),
      readContract.authorizedVoterCount(at), readContract.electionPosition(at)
    ]);
    const candidates = [], voters = [];
    for (let id = 1; id <= Number(values[3]); id++) candidates.push(await readContract.getCandidate(id, at));
    const isAdmin = !!wallet && same(wallet, values[0]);
    let flags = [false, false, false];
    if (wallet) flags = await Promise.all([
      readContract.registeredVoters(wallet, at), readContract.authorizedVoters(wallet, at), readContract.hasVoted(wallet, at)
    ]);
    if (page === "admin" && isAdmin) {
      for (const address of await readContract.getRegisteredVoters(at)) {
        voters.push({ address: address, approved: await readContract.authorizedVoters(address, at) });
      }
    }
    if (version !== loadVersion || wallet !== account) return;
    election = { phase: values[2] ? "closed" : values[1] ? "open" : "setup", candidates: candidates,
      voters: voters, total: Number(values[4]), approved: Number(values[5]), position: values[6] };
    admin = isAdmin;
    [registered, authorized, voted] = flags;
    ready = true;
    render();
  } catch {
    if (version !== loadVersion || wallet !== account) return;
    ready = false;
    render();
    message("Could not load the election. Refresh the page to try again.", true);
  }
}

// Build candidate elements with textContent so candidate names are displayed as plain text.
function drawCandidates(id, mode) {
  const box = el(id);
  // Ballot candidates are fixed after opening. Keep keyboard focus during refresh.
  if (mode === "ballot" && box.children.length) return;
  box.replaceChildren();
  if (!election.candidates.length) box.append(node("p", "No candidates added yet.", "helper"));
  for (const candidate of election.candidates) {
    const item = node(mode === "ballot" ? "label" : "article", undefined,
      mode === "cards" ? "panel candidate-card" : mode === "ballot" ? "ballot-choice" : "list-row");
    if (mode === "ballot") {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "candidate";
      radio.value = candidate.id;
      radio.required = true;
      radio.onchange = function () { selected = Number(candidate.id); controls(); };
      item.append(radio);
    }
    if (mode === "cards") {
      const initials = candidate.name.trim().split(/\s+/).slice(0, 2).map(word => word[0] || "").join("");
      const avatar = node("span", initials.toUpperCase(), "candidate-initials");
      avatar.setAttribute("aria-hidden", "true");
      item.append(avatar);
    }
    const text = node("div");
    text.append(node(mode === "cards" ? "h2" : "strong", candidate.name), node("small", candidate.position));
    item.append(text);
    if (mode === "cards" && ready && election.phase === "closed") item.append(node("p", candidate.voteCount + " votes", "helper"));
    box.append(item);
  }
}

// Update shared navigation and status before the page-specific content and controls.
function render() {
  el("electionStatus").hidden = !configured;
  el("electionStatus").textContent = !ready ? "Checking election" : election.phase === "open" ? "Voting open" : election.phase === "closed" ? "Voting closed" : "Voting not started";
  el("electionStatus").dataset.state = election.phase;
  el("logoutButton").hidden = !account;
  el("loginLink").hidden = !!account;
  el("adminNav").hidden = !admin;
  renderPage();
  controls();
}

// Disable actions while a wallet request is pending or the contract address is missing.
function controls() {
  for (const id of ["voterLoginButton", "adminLoginButton", "signupConnectButton", "refreshResultsButton", "refreshAdminButton"]) {
    if (el(id)) el(id).disabled = busy || !configured;
  }
  pageControls();
}

// Recheck the wallet, request a signature, and report success only after a successful receipt.
async function transact(method, args, success) {
  if (busy || !ready || !account) return;
  const wallet = account;
  busy = true;
  controls();
  try {
    if (!await walletMatches(wallet)) {
      resetSession();
      message("Wallet or network changed. Log in again.", true);
      return;
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const contract = readContract.connect(provider.getSigner(wallet));
    message("Confirm in MetaMask.");
    const tx = await contract[method](...args);
    message("Recording… Please wait.");
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error();
    await loadElection();
    message(wallet === account ? success : "Transaction confirmed. Log in again to continue.");
    if (wallet === account) {
      if (method === "addCandidate") el("candidateName").value = "";
      if (method === "vote") selected = 0;
    }
  } catch {
    message("Action could not be confirmed. Refresh before trying again.", true);
    await loadElection();
  } finally { busy = false; render(); }
}

// Show the action details and wait for explicit confirmation before sending a transaction.
function review(title, text, method, args, success) {
  if (busy) return;
  el("dialogTitle").textContent = title;
  el("dialogText").textContent = text;
  el("confirmDialogButton").onclick = function () {
    el("confirmDialog").close();
    transact(method, args, success);
  };
  el("confirmDialog").showModal();
  el("cancelDialogButton").focus();
}

// Load the compiled ABI and read-only contract before restoring the session and loading data.
async function initialize() {
  render();
  if (!window.ethers) { message("Could not load the wallet library. Reload the page.", true); return; }
  configured = ethers.utils.isAddress(contractAddress) && contractAddress !== ethers.constants.AddressZero;
  if (configured) {
    readProvider = new ethers.providers.JsonRpcProvider(rpcUrl, chainId);
    try {
      // Use the compiler-generated interface for both reads and signed calls.
    const response = await fetch("../abi.json");
      if (!response.ok) throw new Error();
      readContract = new ethers.Contract(contractAddress, await response.json(), readProvider);
    } catch { configured = false; render(); message("Could not load the contract interface. Reload the page.", true); return; }
    try { await restoreSession(); } catch { sessionStorage.removeItem(sessionKey); }
    await loadElection();
  }
  render();
}

on("logoutButton", "click", () => { resetSession(); window.location.href = "index.html"; });

on("cancelDialogButton", "click", () => el("confirmDialog").close());

if (window.ethereum && window.ethereum.on) {
  for (const event of ["accountsChanged", "chainChanged", "disconnect"]) {
    window.ethereum.on(event, () => { resetSession(); message("Wallet connection changed. Log in again."); });
  }
}

setInterval(() => { if (!busy && !document.hidden) loadElection(); }, 15000);
