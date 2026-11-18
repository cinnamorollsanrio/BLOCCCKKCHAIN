// Page actions for vote.html. Shared wallet and contract logic loads first.
// Behavior for vote.html. common.js loads first.
// Show the action that helps the voter resolve the current eligibility or election state.
function voteGate(title, text, label, href) {
  el("gateTitle").textContent = title;
  el("gateText").textContent = text;
  el("gateText").hidden = !text;
  el("gateLink").textContent = label;
  el("gateLink").href = href;
}

renderPage = function () {
  const allowed = ready && account && !admin && authorized && !voted && election.phase === "open";
  el("ballotForm").hidden = !allowed;
  el("voteSuccess").hidden = !ready || !voted || admin;
  el("voteGate").hidden = !!allowed || (ready && voted && !admin);
  el("voterEligibility").textContent = voted ? "Vote recorded" : authorized ? "Eligible" : registered ? "Awaiting approval" : "Log in to vote";
  el("voteSubtitle").textContent = election.position ? "Choose one candidate for " + election.position + "." : "Select one candidate.";
  if (!ready) voteGate("The election is being prepared", "", "View candidates", "candidates.html");
  else if (!account) voteGate("Log in before voting", "Use the wallet you registered with.", "Log in", "index.html");
  else if (admin) voteGate("You are logged in as admin", "Use a separate voter wallet to vote.", "Manage election", "admin.html");
  else if (election.phase === "closed") voteGate("Voting has closed", "No more votes can be submitted.", "View results", "results.html");
  else if (!registered) voteGate("Register your wallet first", "", "Sign up", "signup.html");
  else if (!authorized) voteGate("Waiting for admin approval", "Your wallet must be approved before voting.", "View candidates", "candidates.html");
  else if (election.phase === "setup") voteGate("You are ready to vote", "Come back when voting opens.", "View candidates", "candidates.html");
  if (allowed) drawCandidates("ballotChoices", "ballot");
};

pageControls = function () {
  const candidate = election.candidates.find(item => Number(item.id) === selected);
  el("selectionText").textContent = candidate ? "Selected: " + candidate.name : "No candidate selected";
  el("reviewVoteButton").disabled = busy || !ready || !account || admin || !authorized || voted || election.phase !== "open" || !candidate;
  for (const radio of document.querySelectorAll('input[name="candidate"]')) {
    radio.disabled = busy;
    radio.checked = Number(radio.value) === selected;
  }
};

// Review the selected candidate before requesting the irreversible vote transaction.
function reviewVote(event) {
  event.preventDefault();
  if (el("reviewVoteButton").disabled) return;
  const candidate = election.candidates.find(item => Number(item.id) === selected);
  review("Confirm your vote", candidate.name + " · " + candidate.position + ". Your confirmed vote cannot be changed.", "vote", [selected], "Your vote is recorded.");
}

on("ballotForm", "submit", reviewVote);

initialize();
