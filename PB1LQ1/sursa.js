/* sursa.js */

let crypt;

/**
 * Initializes the RSA Keypair based on the requested size.
 * Uses a small timeout to allow the browser to render the "Generating..." text
 * because high-bit RSA generation blocks the main thread.
 */
function initCrypto(keySize) {
    const statusEl = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');
    
    statusEl.innerText = `Generating ${keySize}-bit RSA Keys Hehe.`;
    submitBtn.disabled = true;

    setTimeout(() => {
        // Initialize JSEncrypt with specific key size
        crypt = new JSEncrypt({ default_key_size: keySize });
        crypt.getKey(); // Generate the keys
        
        statusEl.innerText = `${keySize}-Ready.`;
        statusEl.style.color = "#27ae60"; // Change to green
        submitBtn.disabled = false;
    }, 100);
}

/**
 * Handles the form submission, encrypts data field-by-field, 
 * and immediately decrypts it for demonstration.
 */
function processForm(event) {
    event.preventDefault(); // Prevent page reload

    // 1. Gather Original Data
    const formData = {
        fullName: document.getElementById('fullName').value,
        dob: document.getElementById('dob').value,
        yearLevel: document.getElementById('yearLevel').value,
        gender: document.getElementById('gender').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    };

    // Display original data
    document.getElementById('originalOutput').innerText = JSON.stringify(formData, null, 2);

    // 2. Encrypt Data
    // We encrypt each field individually to avoid RSA payload size limits
    const encryptedData = {};
    for (const key in formData) {
        // crypt.encrypt returns base64 encoded ciphertext
        encryptedData[key] = crypt.encrypt(formData[key]);
    }

    // Display encrypted data
    document.getElementById('encryptedOutput').innerText = JSON.stringify(encryptedData, null, 2);

    // 3. Decrypt Data
    const decryptedData = {};
    for (const key in encryptedData) {
        // crypt.decrypt processes the base64 ciphertext back to plaintext
        decryptedData[key] = crypt.decrypt(encryptedData[key]);
    }

    // Display decrypted data
    document.getElementById('decryptedOutput').innerText = JSON.stringify(decryptedData, null, 2);
}