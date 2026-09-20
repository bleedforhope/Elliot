# Elliot — API CMD version

This version replaces the local browser model with direct API calls from the browser.

UI:
- Windows CMD style
- #0c0c0c background
- #cccccc text
- Consolas
- No CRT scanlines
- No neon glow
- No fsociety banner
- No fake boot sequence
- User prompt: C:\Users\friend>
- Elliot prompt: C:\Users\samsepi0l>

Providers:
- OpenAI: gpt-4o
- Anthropic: claude-sonnet-4-6

Important:
This is a static browser application. The API key is entered at runtime and is sent directly from the browser to the selected provider. It is not embedded in the repository. Do not commit an API key to GitHub.

If "Remember key on this device" is enabled, the key is stored in this browser's localStorage. Leave it disabled if you do not want browser storage of the key.

The conversation history is stored in this browser's localStorage.
