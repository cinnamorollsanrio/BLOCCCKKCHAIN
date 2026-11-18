// Page actions for results.html. Shared wallet and contract logic loads first.
// Behavior for results.html. common.js loads first.
renderPage = function () {
  const available = ready && election.phase === "closed";
  el("resultsLocked").hidden = available;
  el("resultsContent").hidden = !available;
  if (available) {
    el("resultsPosition").textContent = election.position;
    el("totalVotes").textContent = election.total;
    el("resultsBody").replaceChildren();
    for (const candidate of election.candidates) {
      const row = node("tr");
      row.append(node("td", candidate.name), node("td", String(candidate.voteCount)));
      el("resultsBody").append(row);
    }
  }
};

on("refreshResultsButton", "click", loadElection);

initialize();
