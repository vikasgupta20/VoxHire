const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api";

const postJson = async (path, body) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed (${response.status})`);
    }

    return response.json();
};

export const generateResume = async (spokenInput) =>
    postJson("/resume", { spokenInput });

export const fetchInterviewQuestion = async ({ mode, history, lastAnswer }) =>
    postJson("/interview/question", { mode, history, lastAnswer });

export const fetchFeedback = async ({ answer, role }) =>
    postJson("/interview/feedback", { answer, role });

export const improveAnswer = async ({ answer, mode }) =>
    postJson("/interview/improve", { answer, mode });

export const synthesizeSpeech = async ({ text, voiceId }) =>
    postJson("/tts", { text, voiceId });
