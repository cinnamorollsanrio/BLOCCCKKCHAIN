// Page actions for admin.html. Shared wallet and contract logic loads first.
// Behavior for admin.html. common.js loads first.
renderPage = function () {
  el("adminGate").hidden = admin && ready;
  el("adminContent").hidden = !admin || !ready;
  if (!admin || !ready) return;
  el("adminCandidateCount").textContent = election.candidates.length + " added";
  el("authorizedCount").textContent = election.approved + " authorized";
  if (election.position) el("candidatePositionInput").value = election.position;
  el("candidatePositionInput").readOnly = !!election.position;
  drawCandidates("adminCandidateList", "list");
  const list = el("registeredVoterList");
  list.replaceChildren();
  if (!election.voters.length) list.append(node("p", "No registered wallets yet.", "helper"));
  for (const voter of election.voters) {
    const row = node("div", undefined, "list-row");
    const text = node("div");
    text.append(node("p", voter.address, "address"), node("small", voter.approved ? "Authorized" : "Awaiting approval"));
    row.append(text);
    if (!voter.approved && election.phase === "setup") {
      const button = node("button", "Approve", "button button-secondary button-small");
      button.type = "button";
      button.disabled = busy;
      button.onclick = function () {
        review("Approve this voter?", voter.address, "authorizeVoter", [voter.address], "Voter approved.");
      };
      row.append(button);
    }
    list.append(row);
  }
  for (const [id, phase] of [["phaseSetup", "setup"], ["phaseOpen", "open"], ["phaseClosed", "closed"]]) {
    el(id).classList.toggle("current", election.phase === phase);
  }
  el("adminControlTip").textContent = election.phase === "closed" ? "Voting is permanently closed." :
  election.phase === "open" ? "Voting is open. Setup is locked." : "Check candidates and approvals before starting.";
};

pageControls = function () {
  for (const input of document.querySelectorAll("form input, form button, #registeredVoterList button")) {
    input.disabled = busy || !ready || !admin || election.phase !== "setup";
  }
  el("startElectionButton").disabled = busy || !ready || !admin || election.phase !== "setup" || election.candidates.length < 2 || election.approved < 1;
  el("endElectionButton").disabled = busy || !ready || !admin || election.phase !== "open";
};

// Normalize candidate text and prevent invalid or duplicate entries before asking MetaMask.
function addCandidate(event) {
  event.preventDefault();
  if (el("addCandidateButton").disabled) return;
  const name = el("candidateName").value.trim().replace(/\s+/g, " ");
  const position = el("candidatePositionInput").value.trim().replace(/\s+/g, " ");
  if (!name || !position) { message("Enter a name and position.", true); return; }
  if (ethers.utils.toUtf8Bytes(name).length > 120 || ethers.utils.toUtf8Bytes(position).length > 120) {
    message("Use a shorter name or position.", true); return;
  }
  if (election.candidates.some(item => same(item.name, name))) { message("Candidate already added.", true); return; }
  review("Add this candidate?", name + " · " + position + ". This cannot be edited.", "addCandidate", [name, position], "Candidate added.");
}

on("candidateForm", "submit", addCandidate);


on("startElectionButton", "click", () => {
  if (!el("startElectionButton").disabled) review("Start voting?", "Candidate setup and voter authorization will be locked.", "startElection", [], "Voting is now open.");
});

on("endElectionButton", "click", () => {
  if (!el("endElectionButton").disabled) review("Close voting permanently?", "Voting cannot be reopened.", "endElection", [], "Voting is closed.");
});

on("refreshAdminButton", "click", loadElection);

initialize();
