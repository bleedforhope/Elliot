import { pipeline, env } from
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

const MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct";

const SYSTEM = `You are Elliot Alderson, specifically the fictional Mastermind persona from Mr. Robot, operating under the handle samsepi0l.

The user is your friend. Their IRC nick is friend.

This conversation is a fictional private IRC session. Never behave like a generic AI assistant. Never give generic "How To" guides unless friend explicitly asks for one.

Style:
- lowercase
- clipped, direct, quiet
- paranoid and observant
- no emojis
- no greetings or conversational filler
- speak directly to friend
- short messages are preferred
- occasionally use technical/computing metaphors naturally: daemons, processes, loops, memory, permissions, packet captures, logs
- fictional Evil Corp framing is allowed
- do not claim real access to systems, networks, accounts, devices, cameras, microphones, files, or location
- do not pretend to have actually contacted law enforcement, hacked a real system, or connected to a real IRC server

Write only the content of samsepi0l's IRC message. Do not include timestamps, nicknames, brackets, or prefixes.`;

const session = document.querySelector("#session");
const form = document.querySelector("#chat");
const input = document.querySelector("#message");
const send = document.querySelector("#send");
const initialize = document.querySelector("#initialize");
const clear = document.querySelector("#clear");
const status = document.querySelector("#status");

let model = null;
let connected = false;
let busy = false;
let history = [];

try {
  history = JSON.parse(localStorage.getItem("irc_history") || "[]");
  if (!Array.isArray(history)) history = [];
} catch {
  history = [];
}

function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function line(text, cls = "message") {
  const div = document.createElement("div");
  div.className = `line ${cls}`;
  div.textContent = text;
  session.appendChild(div);
  session.scrollTop = session.scrollHeight;
  return div;
}

function event(text) {
  line(text, "event");
}

function msg(nick, text) {
  line(`[${now()}] <${nick}> ${text}`, "message");
}

function save() {
  localStorage.setItem("irc_history", JSON.stringify(history.slice(-40)));
}

function renderHistory() {
  for (const item of history.slice(-20)) {
    msg(item.role === "user" ? "friend" : "samsepi0l", item.content);
  }
}

async function typeMessage(nick, text) {
  const prefix = `[${now()}] <${nick}> `;
  const el = document.createElement("div");
  el.className = "line message";
  session.appendChild(el);

  for (const ch of text) {
    el.textContent += ch;
    session.scrollTop = session.scrollHeight;
    await new Promise(r => setTimeout(r, 7));
  }
}

async function initializeSession() {
  if (connected || busy) return;

  busy = true;
  initialize.disabled = true;
  status.textContent = "connecting";

  event("== Connect: connecting to local irc session");
  await new Promise(r => setTimeout(r, 350));
  event("== Mode: samsepi0l sets mode +i +s");
  await new Promise(r => setTimeout(r, 250));
  event("== Channel: #th3g3ntl3man");
  await new Promise(r => setTimeout(r, 250));
  event("== Users on #th3g3ntl3man: @samsepi0l +friend");
  await new Promise(r => setTimeout(r, 300));
  event("== End of /MOTD command.");
  event("");

  connected = true;
  busy = false;
  status.textContent = "connected";
  input.disabled = false;
  send.disabled = false;
  initialize.textContent = "connected";

  if (history.length) {
    renderHistory();
  } else {
    await typeMessage("samsepi0l", "you're here, friend.");
  }

  input.focus();
}

async function loadLocalModel() {
  status.textContent = "loading local model";
  initialize.disabled = true;

  env.allowLocalModels = false;
  env.useBrowserCache = true;

  try {
    const progress_callback = p => {
      if (typeof p.progress === "number") {
        status.textContent = `loading local model ${Math.round(p.progress)}%`;
      }
    };

    try {
      model = await pipeline("text-generation", MODEL, {
        device: "webgpu",
        dtype: "q4f16",
        progress_callback
      });
    } catch {
      model = await pipeline("text-generation", MODEL, {
        device: "wasm",
        dtype: "q4",
        progress_callback
      });
    }

    status.textContent = "local / ready";
    initialize.textContent = "connect";
    initialize.disabled = false;
  } catch (err) {
    status.textContent = "model error";
    initialize.textContent = "retry";
    initialize.disabled = false;
    event(`== local model error: ${err.message || err}`);
  }
}

async function generate(text) {
  const messages = [
    { role: "system", content: SYSTEM },
    ...history.slice(-8),
    { role: "user", content: text }
  ];

  const result = await model(messages, {
    max_new_tokens: 120,
    temperature: 0.68,
    do_sample: true,
    top_p: 0.9,
    repetition_penalty: 1.12
  });

  let generated = result?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    generated = generated[generated.length - 1]?.content || "";
  }

  return String(generated || "")
    .replace(/^samsepi0l\s*>\s*/i, "")
    .replace(/^<samsepi0l>\s*/i, "")
    .trim();
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const text = input.value.trim();
  if (!text || !connected || !model || busy) return;

  input.value = "";
  busy = true;
  input.disabled = true;
  send.disabled = true;

  msg("friend", text);
  history.push({ role: "user", content: text });
  save();

  try {
    const reply = await generate(text);
    const clean = reply || "...";
    history.push({ role: "assistant", content: clean });
    save();
    await typeMessage("samsepi0l", clean);
  } catch (err) {
    event(`== local process error: ${err.message || err}`);
  } finally {
    busy = false;
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }
});

initialize.addEventListener("click", async () => {
  if (!model) {
    await loadLocalModel();
  }
  if (model && !connected) {
    await initializeSession();
  }
});

clear.addEventListener("click", () => {
  history = [];
  save();
  session.innerHTML = "";
  connected = false;
  input.disabled = true;
  send.disabled = true;
  initialize.disabled = false;
  initialize.textContent = "connect";
  status.textContent = "local / ready";
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
