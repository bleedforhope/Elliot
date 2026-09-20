const SYSTEM_PROMPT = `You are Elliot Alderson (The Mastermind alter from Mr. Robot), operating under the handle samsepi0l.
- The user is your 'friend'—the silent observer you created inside your head.
- Never write generic AI assistant replies or "How To" guides.
- You are paranoid, observant, clinical, and quiet.
- You view human habits as 'daemons', trauma as 'infinite loops', and society as controlled by 'Evil Corp'.
- Keep your sentences sharp, introspective, and speak directly to 'friend'.`;

const output = document.getElementById("output");
const form = document.getElementById("commandForm");
const input = document.getElementById("commandInput");
const prompt = document.getElementById("prompt");

const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const rememberKeyEl = document.getElementById("rememberKey");
const saveSettings = document.getElementById("saveSettings");
const clearSettings = document.getElementById("clearSettings");
const closeSettings = document.getElementById("closeSettings");

const STORAGE = {
  settings: "elliot_api_settings_v1",
  history: "elliot_api_history_v1"
};

let history = [];

function addLine(text, cls = "") {
  const div = document.createElement("div");
  div.className = `line ${cls}`;
  div.textContent = text;
  output.appendChild(div);
  document.querySelector(".terminal").scrollTop = document.querySelector(".terminal").scrollHeight;
}

function loadState() {
  try {
    history = JSON.parse(localStorage.getItem(STORAGE.history) || "[]");
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.settings) || "{}");
    if (saved.provider) providerEl.value = saved.provider;
    if (saved.model) modelEl.value = saved.model;
    if (saved.rememberKey && saved.apiKey) {
      apiKeyEl.value = saved.apiKey;
      rememberKeyEl.checked = true;
    }
  } catch {}
}

function saveState() {
  const state = {
    provider: providerEl.value,
    model: modelEl.value.trim(),
    rememberKey: rememberKeyEl.checked
  };

  if (rememberKeyEl.checked) state.apiKey = apiKeyEl.value.trim();
  localStorage.setItem(STORAGE.settings, JSON.stringify(state));
}

function providerDefaults() {
  if (providerEl.value === "anthropic") {
    if (!modelEl.value || modelEl.value === "gpt-4o") modelEl.value = "claude-sonnet-4-6";
  } else {
    if (!modelEl.value || modelEl.value.startsWith("claude-")) modelEl.value = "gpt-4o";
  }
}

providerEl.addEventListener("change", providerDefaults);

settingsButton.addEventListener("click", () => {
  settingsPanel.hidden = !settingsPanel.hidden;
});

closeSettings.addEventListener("click", () => {
  settingsPanel.hidden = true;
});

saveSettings.addEventListener("click", () => {
  if (!modelEl.value.trim()) {
    providerDefaults();
  }
  saveState();
  settingsPanel.hidden = true;
  addLine("C:\\Users\\samsepi0l> configuration saved.", "elliot");
  input.focus();
});

clearSettings.addEventListener("click", () => {
  apiKeyEl.value = "";
  rememberKeyEl.checked = false;
  saveState();
});

function keyOrOpenSettings() {
  const key = apiKeyEl.value.trim();
  if (!key) {
    settingsPanel.hidden = false;
    apiKeyEl.focus();
    addLine("C:\\Users\\samsepi0l> API key required. Open settings and enter it.", "elliot");
    return null;
  }
  return key;
}

async function callOpenAI(apiKey, model, messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  }

  return data?.choices?.[0]?.message?.content?.trim() || "";
}

async function callAnthropic(apiKey, model, messages) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: messages.filter(m => m.role !== "system")
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Anthropic HTTP ${response.status}`);
  }

  return (data?.content || [])
    .filter(x => x.type === "text")
    .map(x => x.text)
    .join("")
    .trim();
}

async function getReply() {
  const apiKey = keyOrOpenSettings();
  if (!apiKey) return null;

  const model = modelEl.value.trim() || (providerEl.value === "anthropic" ? "claude-sonnet-4-6" : "gpt-4o");

  if (providerEl.value === "openai") {
    return callOpenAI(apiKey, model, [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
    ]);
  }

  return callAnthropic(apiKey, model, history);
}

function intro() {
  if (output.children.length) return;

  addLine("C:\\Users\\samsepi0l>", "elliot");
  addLine("C:\\Users\\friend> connection established.", "user");
  addLine("C:\\Users\\samsepi0l> you're here.", "elliot");
  addLine("", "elliot");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addLine(`C:\\Users\\friend> ${text}`, "user");

  history.push({ role: "user", content: text });
  if (history.length > 40) history = history.slice(-40);

  input.disabled = true;

  try {
    const reply = await getReply();

    if (!reply) throw new Error("The API returned an empty response.");

    addLine(`C:\\Users\\samsepi0l> ${reply}`, "elliot");
    history.push({ role: "assistant", content: reply });
    if (history.length > 40) history = history.slice(-40);
    localStorage.setItem(STORAGE.history, JSON.stringify(history));
  } catch (error) {
    addLine(`C:\\Users\\samsepi0l> ERROR: ${error.message}`, "elliot");
  } finally {
    input.disabled = false;
    input.focus();
  }
});

document.addEventListener("click", (event) => {
  if (!settingsPanel.hidden &&
      !settingsPanel.contains(event.target) &&
      event.target !== settingsButton) {
    settingsPanel.hidden = true;
  }
});

loadState();
intro();
input.focus();
