# Elliot Companion — phone-ready local AI

This package is designed for Android and keeps AI generation on the phone.

What is local:
- No OpenAI or Claude API.
- No server-side AI.
- Your prompts are processed by the model in the Android browser.
- Conversation history is stored locally in the browser.

First launch:
- Internet is needed once to download the app and the model.
- After that, the model is cached on the phone.
- The app shell is also cached.

Easy setup:
1. Upload these files to a simple HTTPS static website.
2. Open it in Chrome on the HONOR phone.
3. Tap INITIALIZE ELLIOT.
4. Wait for the model to finish downloading.
5. Use Chrome's menu and choose Add to Home screen / Install app.

No API key is needed.

The model is SmolLM2-360M-Instruct. It is intentionally small enough for phone use, so its responses are less capable than a large cloud model.
