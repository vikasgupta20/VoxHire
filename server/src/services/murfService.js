const getMurfConfig = () => {
    const murfApiUrl =
        process.env.MURF_API_URL || "https://global.api.murf.ai/v1/speech/generate";
    const murfApiKey = process.env.MURF_API_KEY?.replace(/^"|"$/g, "").trim();
    const modelVersion = process.env.MURF_MODEL_VERSION || "GEN2";
    return { murfApiUrl, murfApiKey, modelVersion };
};

const fallbackAudioResponse = {
    audioUrl: null,
    audioBase64: null,
    provider: "fallback",
};

export const synthesizeVoice = async ({ text, voiceId }) => {
    const { murfApiUrl, murfApiKey, modelVersion } = getMurfConfig();

    if (!murfApiKey) {
        console.error("Murf config missing: MURF_API_KEY is empty.");
        return fallbackAudioResponse;
    }

    try {
        const res = await fetch(murfApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": murfApiKey,
                Authorization: `Bearer ${murfApiKey}`,
            },
            body: JSON.stringify({
                text,
                voiceId,
                format: "MP3",
                modelVersion,
                locale: "en-US",
                sampleRate: 44100,
            }),
        });

        if (!res.ok) {
            const details = await res.text();
            throw new Error(`Murf API returned ${res.status}: ${details}`);
        }

        const payload = await res.json();

        return {
            audioUrl: payload.audioUrl || payload.url || payload.audioFile || null,
            audioBase64: payload.audioBase64 || payload.audio || payload.encodedAudio || null,
            provider: "murf",
        };
    } catch (error) {
        console.error("Murf TTS failed:", error.message);
        return fallbackAudioResponse;
    }
};
