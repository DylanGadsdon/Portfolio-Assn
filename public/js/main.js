// public/js/main.js — runs in the browser.
// Asks our own server "are you alive?" and shows the answer on the page.

async function checkServer() {
  const statusEl = document.querySelector('#status');
  try {
    const res = await fetch('/api/health');   // send a request to the server
    const data = await res.json();             // turn the reply into a JS object
    statusEl.textContent = `Server OK — ${data.time}`;
  } catch (err) {
    statusEl.textContent = 'Server not reachable';
    console.error(err);
  }
}

checkServer();
