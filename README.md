# VoxHire - AI Voice Interview & Resume Coach

VoxHire is a full-stack, voice-first web app for hackathon demos.

## Features

- Voice-first input using Web Speech API (live transcript)
- Resume generation from spoken background
- AI interview mode with personality switching:
  - Strict HR
  - Friendly HR
  - Technical interviewer
- Answer feedback with confidence + clarity tips
- `Improve My Answer` rewrite and voice playback
- Murf TTS integration with browser speech fallback
- Smart voice commands:
  - `Start interview`
  - `Next question`
  - `Improve this answer`
- Demo quick actions for instant walkthrough
- Conversation history panel
- Dark-mode focused premium UI

## Tech Stack

- Frontend: React + Vite + Tailwind CSS + Framer Motion
- Backend: Node.js + Express
- AI: Gemini API
- TTS: Murf API

## Project Structure

- `client/` - React UI, voice handling, animations
- `server/` - Express API, Gemini prompts, Murf TTS bridge

## Setup

1. Install dependencies:

```bash
cd client && npm install
cd ../server && npm install
```

2. Configure env files:

- Copy `client/.env.example` to `client/.env`
- Copy `server/.env.example` to `server/.env`
- Add your API keys in `server/.env`

3. Start backend:

```bash
cd server
npm run dev
```

4. Start frontend:

```bash
cd client
npm run dev
```

The frontend runs on `http://localhost:5173` and backend on `http://localhost:8787`.

## Notes

- For best speech recognition quality, use Chrome or Edge.
- If Murf credentials are absent or unavailable, the app falls back to browser speech synthesis.

## Deploy (Vercel + Render)

Use this path for a working production setup:

- Frontend (`client`) on Vercel
- Backend (`server`) on Render

### 1. Push to GitHub

- Make sure `server/.env` and `client/.env` are not committed (root `.gitignore` is configured for this).
- Push the repo to GitHub.

### 2. Deploy Backend on Render

You can deploy with the included `render.yaml` blueprint.

- In Render, create `New +` -> `Blueprint`.
- Connect your GitHub repo.
- Render will detect `render.yaml` and create `voxhire-api`.

Set/verify these backend environment variables in Render:

- `PORT=8787`
- `GEMINI_API_KEY=<your_gemini_key>`
- `GEMINI_MODEL=gemini-2.5-flash`
- `MURF_API_KEY=<your_murf_key>`
- `MURF_API_URL=https://api.murf.ai/v1/speech/generate`
- `MURF_MODEL_VERSION=GEN2`

After deploy, copy your backend URL, for example:

- `https://voxhire-api.onrender.com`

### 3. Deploy Frontend on Vercel

- In Vercel, import the same GitHub repo.
- Set `Root Directory` to `client`.
- Build command: `npm run build`.
- Output directory: `dist`.

Add this frontend env var in Vercel:

- `VITE_API_BASE_URL=https://<your-render-backend-domain>/api`

Example:

- `VITE_API_BASE_URL=https://voxhire-api.onrender.com/api`

`client/vercel.json` is already included for SPA route rewrites.

### 4. Redeploy and test

- Open your Vercel URL.
- Test mic input, resume generation, interview question generation, and TTS playback.

## Security

- Never commit real API keys to GitHub.
- Rotate any keys that were shared in chat or screenshots.
