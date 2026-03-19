import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = () => {
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
        recognition.lang = "en-US";

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
                if (result.isFinal) {
                    finalChunk += `${result[0].transcript} `;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (finalChunk.trim()) {
                setFinalText((prev) => `${prev} ${finalChunk}`.trim());
            }

            setInterimText(interim.trim());
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, []);

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
