// Page actions for candidates.html. Shared wallet and contract logic loads first.
// Behavior for candidates.html. common.js loads first.
renderPage = function () {
  el("candidatePosition").textContent = election.position;
  drawCandidates("candidateList", "cards");
};

initialize();
