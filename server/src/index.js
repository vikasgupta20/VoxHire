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

const evaluateConfidenceScore = (answer = "") => {
    const words = answer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const hasStructure = /\b(situation|task|action|result|first|then|finally|because|therefore)\b/i.test(answer);
    const hasMetric = /\d+\s*(%|percent|x|times|users|clients|days|weeks|months|hours|mins|minutes)/i.test(answer);
    const hasOwnership = /\b(i|my|led|built|implemented|designed|optimized|improved|delivered|owned)\b/i.test(answer);
    const hasOutcome = /\b(result|impact|improved|increased|reduced|saved|delivered|launched|achieved)\b/i.test(answer);
    const fillerMatches = answer.match(/\b(um|uh|like|you know|basically|sort of|kind of)\b/gi) || [];

    let score100 = 35;
    score100 += Math.min(30, Math.round(wordCount * 0.45));
    if (hasStructure) score100 += 15;
    if (hasMetric) score100 += 10;
    if (hasOwnership) score100 += 5;
    if (hasOutcome) score100 += 8;

    if (wordCount < 20) score100 -= 18;
    else if (wordCount < 35) score100 -= 8;
    score100 -= Math.min(12, fillerMatches.length * 2);

    score100 = Math.max(10, Math.min(100, score100));
    return Math.max(1, Math.min(10, Math.round(score100 / 10)));
};

app.get("/api/health", (_, res) => {
    res.json({ ok: true, service: "VoxHire API" });
});

app.post("/api/resume", async (req, res) => {
    const { spokenInput = "", language = "en-US" } = req.body;

    if (!spokenInput.trim()) {
        return res.status(400).json({ error: "spokenInput is required" });
    }

    const prompt = buildResumePrompt({ spokenInput, language });
    const resume = await generateWithGemini({ prompt, purpose: "resume" });

    return res.json({ resume });
});

app.post("/api/interview/question", async (req, res) => {
    const {
        mode = "Friendly HR",
        history = "",
        lastAnswer = "",
        askedQuestions = [],
        language = "en-US",
    } = req.body;

    const prompt = buildInterviewQuestionPrompt({
        mode,
        history,
        lastAnswer,
        askedQuestions,
        language,
    });
    const question = await generateWithGemini({ prompt, purpose: "question" });

    return res.json({ question });
});

app.post("/api/interview/feedback", async (req, res) => {
    const { answer = "", role = "Software Engineer", language = "en-US" } = req.body;

    if (!answer.trim()) {
        return res.status(400).json({ error: "answer is required" });
    }

    const prompt = buildFeedbackPrompt({ answer, role, language });
    const feedback = await generateWithGemini({ prompt, purpose: "feedback" });
    const confidenceScore = evaluateConfidenceScore(answer);

    return res.json({ feedback, confidenceScore });
});

app.post("/api/interview/improve", async (req, res) => {
    const { answer = "", mode = "Friendly HR", language = "en-US" } = req.body;

    if (!answer.trim()) {
        return res.status(400).json({ error: "answer is required" });
    }

    const prompt = buildImproveAnswerPrompt({ answer, mode, language });
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
