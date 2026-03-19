export const parseVoiceCommand = (text) => {
    const normalized = text.trim().toLowerCase();

    if (normalized.includes("start interview")) {
        return "startInterview";
    }

    if (normalized.includes("next question")) {
        return "nextQuestion";
    }

    if (normalized.includes("improve this answer")) {
        return "improveAnswer";
    }

    return null;
};
