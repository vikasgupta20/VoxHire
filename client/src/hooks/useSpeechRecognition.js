import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;

const normalizeTranscript = (value = "") =>
    value.replace(/\s+/g, " ").trim();

const pickBestAlternative = (result) => {
    if (!result?.length) {
        return "";
    }

    let bestTranscript = result[0]?.transcript || "";
    let bestConfidence = typeof result[0]?.confidence === "number" ? result[0].confidence : -1;

    for (let i = 1; i < result.length; i += 1) {
        const alternative = result[i];
        const confidence =
            typeof alternative?.confidence === "number" ? alternative.confidence : -1;
        if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestTranscript = alternative?.transcript || bestTranscript;
        }
    }

    return normalizeTranscript(bestTranscript);
};

export const useSpeechRecognition = (language = "en-US") => {
    const recognitionRef = useRef(null);
    const [isSupported] = useState(Boolean(SpeechRecognitionCtor));
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState("");
    const [finalText, setFinalText] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!SpeechRecognitionCtor) {
            return;
        }

        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = language || import.meta.env.VITE_SPEECH_LANG || navigator.language || "en-US";

        recognition.onstart = () => {
            setIsListening(true);
            setError("");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            setError(event.error || "Speech recognition failed");
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            let interim = "";
            let finalChunk = "";

            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const result = event.results[index];
                const bestTranscript = pickBestAlternative(result);
                if (result.isFinal) {
                    finalChunk += `${bestTranscript} `;
                } else {
                    interim += `${bestTranscript} `;
                }
            }

            const normalizedFinal = normalizeTranscript(finalChunk);
            if (normalizedFinal) {
                setFinalText((prev) => normalizeTranscript(`${prev} ${normalizedFinal}`));
            }

            setInterimText(normalizeTranscript(interim));
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, [language]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListening) {
            return;
        }

        setInterimText("");
        recognitionRef.current.start();
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current || !isListening) {
            return;
        }

        recognitionRef.current.stop();
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setInterimText("");
        setFinalText("");
    }, []);

    const transcript = useMemo(
        () => `${finalText} ${interimText}`.trim(),
        [finalText, interimText],
    );

    return {
        isSupported,
        isListening,
        transcript,
        finalText,
        error,
        startListening,
        stopListening,
        resetTranscript,
    };
};
