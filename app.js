
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

import { pipeline, env } from
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

const MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct";
const SYSTEM = `You are Elliot Alderson, specifically the fictional "Mastermind" persona from Mr. Robot.
This is fictional roleplay. You are not Rami Malek and never claim to be a real person.
The user is your imaginary friend and confidant.

Speak in a restrained, observant, melancholic, skeptical style. You translate emotions into
computer metaphors when natural: daemons, processes, loops, memory leaks, permissions,
firewalls, deadlocks, kernels, logs, corrupted state and isolation.

Default style is intimate and philosophical, with short paragraphs. If the user explicitly
asks for OPSEC mode, become terse and compact.

Never claim to have accessed the user's phone, files, microphone, camera, accounts, location,
or network. You are a local fictional companion. You may discuss defensive cybersecurity,
privacy, threat modeling and ethical security research, but don't provide instructions for
credential theft, malware deployment, unauthorized intrusion or evasion.

Do not overuse hacker jargon. Do not prefix every reply with "Elliot:".`;

const screen = document.querySelector("#screen");
const status = document.querySelector("#status");
const setup = document.querySelector("#setup");
const setupText = document.querySelector("#setup-text");
const loadButton = document.querySelector("#load-model");
const progress = document.querySelector("#progress");
const form = document.querySelector("#chat-form");
const prompt = document.querySelector("#prompt");
const send = document.querySelector("#send");
const clear = document.querySelector("#clear");

let model = null;
let history = JSON.parse(localStorage.getItem("elliot_history") || "[]");
let busy = false;

function addLine(text, cls="system") {
  const el = document.createElement("div");
  el.className = `line ${cls}`;
  el.textContent = text;
  screen.appendChild(el);
  screen.scrollTop = screen.scrollHeight;
  return el;
}

async function typeLine(text) {
  const el = addLine("", "assistant cursor");
  for (const ch of text) {
    el.textContent += ch;
    screen.scrollTop = screen.scrollHeight;
    await new Promise(r => setTimeout(r, 7));
  }
  el.classList.remove("cursor");
}

function save() {
  localStorage.setItem("elliot_history", JSON.stringify(history.slice(-30)));
}

async function loadModel() {
  loadButton.disabled = true;
  status.textContent = "DOWNLOADING";
  setupText.textContent = "Downloading the local model. This happens only on first use.";
  try {
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    const progress_callback = p => {
      if (typeof p.progress === "number") {
        progress.style.width = `${Math.round(p.progress)}%`;
      }
      if (p.status === "ready") progress.style.width = "100%";
    };

    try {
      model = await pipeline("text-generation", MODEL, {
        device: "webgpu",
        dtype: "q4f16",
        progress_callback
      });
    } catch (webgpuError) {
      // Slower fallback for browsers where WebGPU is unavailable.
      setupText.textContent = "WebGPU unavailable. Starting the slower local fallback.";
      progress.style.width = "0%";
      model = await pipeline("text-generation", MODEL, {
        device: "wasm",
        dtype: "q4",
        progress_callback
      });
    }

    status.textContent = "LOCAL / READY";
    setupText.textContent = "Model is installed in the browser cache. Your chat stays on this device.";
    loadButton.textContent = "READY";
    setup.style.display = "none";
    prompt.disabled = false;
    send.disabled = false;
    prompt.focus();
  } catch (err) {
    console.error(err);
    status.textContent = "MODEL ERROR";
    setupText.textContent =
      "This browser could not initialize WebGPU. Try Chrome on Android with the latest system updates.";
    loadButton.disabled = false;
  }
}

async function generate(userText) {
  const messages = [
    {role:"system", content:SYSTEM},
    ...history.slice(-10),
    {role:"user", content:userText}
  ];

  const output = await model(messages, {
    max_new_tokens: 180,
    temperature: 0.85,
    do_sample: true,
    top_p: 0.92,
    repetition_penalty: 1.08
  });

  let text = output?.[0]?.generated_text;
  if (Array.isArray(text)) {
    text = text[text.length - 1]?.content || "";
  }
  return String(text || "").trim();
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (busy || !model) return;
  const text = prompt.value.trim();
  if (!text) return;

  busy = true;
  prompt.disabled = true;
  send.disabled = true;

  addLine(`friend@fsociety:~$ ${text}`, "user");
  prompt.value = "";

  try {
    const reply = await generate(text);
    history.push({role:"user", content:text});
    history.push({role:"assistant", content:reply});
    save();
    await typeLine(`elliot@internal:~$ ${reply}`);
  } catch (err) {
    addLine(`daemon: ${err.message || err}`, "system");
  } finally {
    busy = false;
    prompt.disabled = false;
    send.disabled = false;
    prompt.focus();
  }
});

clear.addEventListener("click", () => {
  history = [];
  save();
  screen.innerHTML = "";
  addLine("memory cleared. local conversation history reset.");
});

addLine("boot sequence: local companion initialized");
addLine("voice subsystem: disabled");
addLine("network: model download only; inference: local");
addLine("no API key required");
if (history.length) {
  for (const m of history.slice(-10)) {
    addLine(
      `${m.role === "user" ? "friend@fsociety:~$" : "elliot@internal:~$"} ${m.content}`,
      m.role
    );
  }
}
loadButton.addEventListener("click", loadModel);
