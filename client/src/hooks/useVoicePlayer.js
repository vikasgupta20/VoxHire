import { useCallback, useMemo, useRef, useState } from "react";

import { synthesizeSpeech } from "../services/apiClient";

export const useVoicePlayer = () => {
    const audioRef = useRef(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    const fallbackSpeak = useCallback((text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, []);

    const speak = useCallback(
        async ({ text, voiceId }) => {
            if (!text?.trim()) {
                return;
            }

            stopAudio();

            try {
                const response = await synthesizeSpeech({ text, voiceId });
                const source = response.audioUrl
                    ? response.audioUrl
                    : response.audioBase64
                        ? `data:audio/mpeg;base64,${response.audioBase64}`
                        : null;

                if (!source) {
                    fallbackSpeak(text);
                    return;
                }

                const audio = new Audio(source);
                audioRef.current = audio;
                audio.onplaying = () => setIsSpeaking(true);
                audio.onended = () => setIsSpeaking(false);
                audio.onerror = () => {
                    setIsSpeaking(false);
                    fallbackSpeak(text);
                };
                await audio.play();
            } catch (error) {
                console.error("Voice playback failed", error);
                fallbackSpeak(text);
            }
        },
        [fallbackSpeak, stopAudio],
    );

    return useMemo(
        () => ({
            isSpeaking,
            speak,
            stopAudio,
        }),
        [isSpeaking, speak, stopAudio],
    );
};
