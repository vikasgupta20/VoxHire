import { GoogleGenAI } from "@google/genai";

const getConfig = () => {
    const apiKey = process.env.GEMINI_API_KEY?.replace(/^"|"$/g, "").trim();
    const configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    return { apiKey, configuredModel };
};

const fallbackText = (purpose) => {
    const defaults = {
        resume: "Name: Alex Morgan\n\nProfessional Summary:\nResults-driven software engineer focused on full-stack web apps and AI-assisted products.\n\nSkills:\n- JavaScript/TypeScript\n- React, Node.js, Express\n- API integration\n\nProjects:\n- Voice Interview Coach: Built a voice-first interview simulator with instant feedback.\n- Resume Optimizer: Generated role-based resumes from spoken user input.",
        question: "Tell me about a recent project where you solved a difficult problem under a deadline.",
        feedback: "Confidence: 7/10 - Good effort but needs stronger ownership language.\nClarity: Solid structure, but examples are too generic.\nTips: 1) Add measurable impact. 2) End with key lesson learned.",
        improve: "In my last project, I led the integration of a voice interface into our interview practice platform under a tight deadline. I prioritized core user flows, split work into milestones, and collaborated closely with design and backend teams. As a result, we launched on time, improved user engagement, and reduced onboarding friction. This experience strengthened my ability to communicate clearly, manage priorities, and deliver measurable outcomes under pressure.",
    };

    return defaults[purpose] || "I could not generate a response right now.";
};

export const generateWithGemini = async ({ prompt, purpose }) => {
    const { apiKey, configuredModel } = getConfig();
    if (!apiKey) {
        console.error("Gemini config missing: GEMINI_API_KEY is empty.");
        return fallbackText(purpose);
    }

    const client = new GoogleGenAI({ apiKey });
    const modelCandidates = [
        configuredModel,
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ];

    let lastError = null;

    try {
        for (const model of modelCandidates) {
            try {
                const response = await client.models.generateContent({
                    model,
                    contents: prompt,
                });

                const text = response?.text?.trim();
                if (text) {
                    return text;
                }
            } catch (error) {
                lastError = error;
                console.error(`Gemini model ${model} failed:`, error.message);
            }
        }

        if (lastError) {
            throw lastError;
        }

        return fallbackText(purpose);
    } catch (error) {
        console.error("Gemini request failed:", error.message);
        return fallbackText(purpose);
    }
};
