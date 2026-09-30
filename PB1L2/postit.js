// ---- Postit: simple version, same features ----

let user = null;
let key = null;
let count = 0;

const intake = document.getElementById("intake");
const intakeForm = document.getElementById("intake-form");
const composer = document.getElementById("composer");
const composerName = document.getElementById("composer-username");
const caption = document.getElementById("caption");
const charCount = document.getElementById("char-count");
const postBtn = document.getElementById("post-btn");
const threadWrap = document.getElementById("thread-wrap");
const thread = document.getElementById("thread");
const emptyState = document.getElementById("empty-state");

// Turn the password into an exact 24-byte (192-bit) key
function makeKey(password) {
  let text = password || "";
  while (text.length < 24) text += "PostitAES192KeyPad!";
  return CryptoJS.enc.Utf8.parse(text.slice(0, 24));
}

function encrypt(text) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const out = CryptoJS.AES.encrypt(text, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return { iv: CryptoJS.enc.Base64.stringify(iv), cipher: out.toString() };
}

function decrypt(cipher, iv) {
  const out = CryptoJS.AES.decrypt(cipher, key, {
    iv: CryptoJS.enc.Base64.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return out.toString(CryptoJS.enc.Utf8);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Step 1: intake form
intakeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(intakeForm);

  user = {
    fullName: data.get("fullName").trim(),
    dob: data.get("dob"),
    yearLevel: data.get("yearLevel"),
    gender: data.get("gender"),
    username: data.get("username").trim(),
  };
  key = makeKey(data.get("password"));

  intake.classList.add("hidden");
  composer.classList.remove("hidden");
  threadWrap.classList.remove("hidden");
  composerName.textContent = user.username;
  caption.focus();
});

// Step 2: composer
caption.addEventListener("input", () => {
  charCount.textContent = `${280 - caption.value.length} left`;
  postBtn.disabled = caption.value.trim().length === 0;
});

caption.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !postBtn.disabled) postBtn.click();
});

postBtn.addEventListener("click", () => {
  const text = caption.value.trim();
  if (!text) return;
  addPost(text);
  caption.value = "";
  charCount.textContent = "280 left";
  postBtn.disabled = true;
  caption.focus();
});

// Step 3: create + render a post
function addPost(text) {
  count++;
  const date = new Date();
  const payload = JSON.stringify({ username: user.username, post: text, date: date.toISOString() });
  const { iv, cipher } = encrypt(payload);

  const card = document.createElement("article");
  card.className = "post";
  card.innerHTML = `
    <p class="post__meta">by <strong>${escapeHtml(user.username)}</strong> &nbsp;·&nbsp; ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>

    <p class="post__section-label post__section-label--original">Original post</p>
    <p class="post__original">${escapeHtml(text)}</p>

    <hr class="post__divider" />

    <p class="post__section-label post__section-label--encrypted">Encrypted (AES-192)</p>
    <div class="post__cipher-box"><p class="post__cipher">${escapeHtml(cipher)}</p></div>

    <div class="post__verify-row">
      <button type="button" class="btn btn--ghost">Verify decryption</button>
      <span class="post__verify-result"></span>
    </div>
  `;

  card.querySelector("button").addEventListener("click", () => {
    const result = card.querySelector(".post__verify-result");
    try {
      const parsed = JSON.parse(decrypt(cipher, iv));
      result.textContent = parsed.post === text
        ? "Decrypted successfully — matches the original."
        : "Decrypted, but content does not match.";
    } catch {
      result.textContent = "Could not decrypt with this session's key.";
    }
  });

  thread.prepend(card);
  emptyState.classList.add("hidden");
}