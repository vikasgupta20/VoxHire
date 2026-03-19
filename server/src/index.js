import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import {
    buildFeedbackPrompt,
    buildImproveAnswerPrompt,
    buildInterviewQuestionPrompt,
    buildResumePrompt,
} from "./prompts.js";
import { generateWithGemini } from "./services/geminiService.js";
import { synthesizeVoice } from "./services/murfService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_, res) => {
    res.json({ ok: true, service: "VoxHire API" });
});

app.post("/api/resume", async (req, res) => {
    const { spokenInput = "" } = req.body;

    if (!spokenInput.trim()) {
        return res.status(400).json({ error: "spokenInput is required" });
    }

    const prompt = buildResumePrompt(spokenInput);
    const resume = await generateWithGemini({ prompt, purpose: "resume" });

    return res.json({ resume });
});

app.post("/api/interview/question", async (req, res) => {
    const { mode = "Friendly HR", history = "", lastAnswer = "" } = req.body;

    const prompt = buildInterviewQuestionPrompt({ mode, history, lastAnswer });
    const question = await generateWithGemini({ prompt, purpose: "question" });

    return res.json({ question });
});

app.post("/api/interview/feedback", async (req, res) => {
    const { answer = "", role = "Software Engineer" } = req.body;

    if (!answer.trim()) {
        return res.status(400).json({ error: "answer is required" });
    }

    const prompt = buildFeedbackPrompt({ answer, role });
    const feedback = await generateWithGemini({ prompt, purpose: "feedback" });

    return res.json({ feedback });
});

app.post("/api/interview/improve", async (req, res) => {
    const { answer = "", mode = "Friendly HR" } = req.body;

    if (!answer.trim()) {
        return res.status(400).json({ error: "answer is required" });
    }

    const prompt = buildImproveAnswerPrompt({ answer, mode });
    const improvedAnswer = await generateWithGemini({
        prompt,
        purpose: "improve",
    });

    return res.json({ improvedAnswer });
});

app.post("/api/tts", async (req, res) => {
    const { text = "", voiceId = "en-US-natalie" } = req.body;

    if (!text.trim()) {
        return res.status(400).json({ error: "text is required" });
    }

    const tts = await synthesizeVoice({ text, voiceId });
    return res.json(tts);
});

app.use((err, _, res, __) => {
    console.error("Unexpected API error:", err);
    res.status(500).json({ error: "Unexpected server error" });
});

app.listen(port, () => {
    console.log(`VoxHire API running on http://localhost:${port}`);
});
