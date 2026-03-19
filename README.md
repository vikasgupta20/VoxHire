# VoxHire

Voice-first AI web app for resume building and interview coaching.

VoxHire is designed as a practical assistant for candidates who want to prepare faster using spoken interaction instead of form-heavy workflows.

## What it does

- Converts spoken profile input into a structured resume
- Runs conversational interview practice (one question at a time)
- Analyzes answers with short feedback (confidence + clarity)
- Rewrites weak answers via `Improve My Answer`
- Plays AI responses with Murf TTS (browser speech fallback included)
- Supports voice commands: `Start interview`, `Next question`, `Improve this answer`

## Core modules

- Resume Builder
	- Takes spoken background and generates a structured, professional resume draft
- Interview Mode
	- Simulates a live interviewer and asks one question at a time
- Feedback Panel
	- Scores answer quality and gives concise, actionable tips
- Improve My Answer
	- Rephrases answers with stronger confidence, structure, and professionalism
- Conversation History
	- Stores Q&A + feedback for quick review during practice

## Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion
- Backend: Node.js, Express
- Speech-to-Text: Web Speech API
- LLM: Gemini API
- Text-to-Speech: Murf API

## Architecture

- Frontend handles:
	- Voice capture and transcript state
	- Interactive UI and animations
	- Session state for interview and history
- Backend handles:
	- Prompt construction for each AI task
	- Gemini request orchestration
	- Murf TTS generation and response normalization
	- Graceful fallbacks when providers fail

## AI workflows

- Resume generation flow:
	- Speech transcript -> resume prompt -> Gemini -> formatted resume text
- Interview flow:
	- Previous context + mode -> Gemini interviewer prompt -> next question
- Feedback flow:
	- Candidate answer -> feedback prompt -> concise coaching output
- Improve flow:
	- Raw answer -> rewrite prompt -> refined answer + TTS playback

## Voice features

- Live speech-to-text using browser Web Speech API
- Animated microphone state indicators:
	- Listening
	- Thinking
	- Speaking
- Smart command parsing:
	- `Start interview`
	- `Next question`
	- `Improve this answer`
- TTS output with provider fallback support

## UI/UX highlights

- Dark-first premium interface
- Glass-style cards and layered gradient atmosphere
- Responsive layout for desktop and mobile
- Framer Motion transitions for smoother interactions
- Real-time confidence bar for answer quality cues

## Project folders

- `client/` frontend app
- `server/` backend API

## Notes

- Best speech recognition experience is on Chrome/Edge.
- If external APIs are unavailable, backend fallbacks keep the app usable for demos.


