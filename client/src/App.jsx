import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ClipboardList,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { DemoControls } from "./components/DemoControls";
import { GlassPanel } from "./components/GlassPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { StatusBadge } from "./components/StatusBadge";
import { VoiceOrb } from "./components/VoiceOrb";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useVoicePlayer } from "./hooks/useVoicePlayer";
import {
  fetchFeedback,
  fetchInterviewQuestion,
  generateResume,
  improveAnswer,
} from "./services/apiClient";
import { scoreConfidence } from "./utils/confidence";
import { parseVoiceCommand } from "./utils/voiceCommands";

const INTERVIEWER_MODES = ["Strict HR", "Friendly HR", "Technical interviewer"];

const VOICE_MAP = {
  "Strict HR": import.meta.env.VITE_MURF_HR_STRICT_VOICE || "en-US-marcus",
  "Friendly HR": import.meta.env.VITE_MURF_HR_FRIENDLY_VOICE || "en-US-natalie",
  "Technical interviewer":
    import.meta.env.VITE_MURF_HR_TECHNICAL_VOICE || "en-US-terrence",
  assistant: import.meta.env.VITE_MURF_ASSISTANT_VOICE || "en-US-aria",
};

const demoResumeInput =
  "My name is Sam Rivera. I am a front-end engineer with three years of experience in React and TypeScript. I built a dashboard that improved reporting speed by thirty percent and a chatbot onboarding flow that reduced support tickets.";

function App() {
  const [spokenInput, setSpokenInput] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [mode, setMode] = useState(INTERVIEWER_MODES[1]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [history, setHistory] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [activeSection, setActiveSection] = useState("resume");
  const [retryHandler, setRetryHandler] = useState(null);

  const {
    isSupported,
    isListening,
    transcript,
    finalText,
    error: micError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();
  const { isSpeaking, speak } = useVoicePlayer();
  const answerInputRef = useRef(null);
  const processedFinalRef = useRef("");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (!transcript.trim()) {
      return;
    }

    if (activeSection === "interview") {
      setAnswerText(transcript);
      return;
    }

    setSpokenInput(transcript);
  }, [activeSection, transcript]);

  const safeRun = async (job, retryFn) => {
    setErrorText("");
    setIsThinking(true);
    setRetryHandler(() => retryFn);

    try {
      await job();
    } catch (error) {
      setErrorText(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleGenerateResume = async (input = spokenInput) => {
    await safeRun(
      async () => {
        const payload = await generateResume(input);
        setResumeText(payload.resume);
        setActiveSection("resume");
        await speak({ text: "Your resume draft is ready.", voiceId: VOICE_MAP.assistant });
      },
      () => handleGenerateResume(input),
    );
  };

  const buildHistoryText = () =>
    history
      .slice(-5)
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join("\n");

  const handleNextQuestion = async (lastAnswer = answerText) => {
    await safeRun(
      async () => {
        const payload = await fetchInterviewQuestion({
          mode,
          history: buildHistoryText(),
          lastAnswer,
        });

        setCurrentQuestion(payload.question);
        setFeedbackText("");
        setImprovedText("");
        setActiveSection("interview");
        await speak({ text: payload.question, voiceId: VOICE_MAP[mode] });
      },
      () => handleNextQuestion(lastAnswer),
    );
  };

  const handleStartInterview = async () => {
    setActiveSection("interview");
    await handleNextQuestion("");
  };

  const handleSubmitAnswer = async (answer = answerText) => {
    if (!answer.trim()) {
      setErrorText("Please answer the question before requesting feedback.");
      return;
    }

    await safeRun(
      async () => {
        const payload = await fetchFeedback({
          answer,
          role: "Software Engineer",
        });

        setFeedbackText(payload.feedback);
        setHistory((prev) => [
          {
            id: Date.now(),
            question: currentQuestion || "Interview Question",
            answer,
            feedback: payload.feedback,
          },
          ...prev,
        ]);
        await speak({ text: payload.feedback, voiceId: VOICE_MAP.assistant });
      },
      () => handleSubmitAnswer(answer),
    );
  };

  const handleImproveAnswer = async (answer = answerText) => {
    if (!answer.trim()) {
      setErrorText("Capture an answer first, then improve it.");
      return;
    }

    await safeRun(
      async () => {
        const payload = await improveAnswer({ answer, mode });
        setImprovedText(payload.improvedAnswer);
        await speak({
          text: payload.improvedAnswer,
          voiceId: VOICE_MAP.assistant,
        });
      },
      () => handleImproveAnswer(answer),
    );
  };

  useEffect(() => {
    if (!finalText) {
      return;
    }

    const previous = processedFinalRef.current;
    const chunk = finalText.startsWith(previous)
      ? finalText.slice(previous.length).trim()
      : finalText;

    processedFinalRef.current = finalText;

    if (!chunk) {
      return;
    }

    const command = parseVoiceCommand(chunk);

    if (command === "startInterview") {
      handleStartInterview();
    }

    if (command === "nextQuestion") {
      handleNextQuestion(answerText);
    }

    if (command === "improveAnswer") {
      handleImproveAnswer(answerText);
    }
  }, [answerText, finalText]);

  const confidence = useMemo(() => scoreConfidence(answerText), [answerText]);

  const phase = useMemo(() => {
    if (errorText || micError) return "error";
    if (isListening) return "listening";
    if (isThinking) return "thinking";
    if (isSpeaking) return "speaking";
    return "idle";
  }, [errorText, isListening, isSpeaking, isThinking, micError]);

  const isBusy = isThinking || isSpeaking;

  const onMicToggle = () => {
    if (!isSupported || isBusy) {
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    resetTranscript();
    if (activeSection === "interview") {
      setAnswerText("");
    } else {
      setSpokenInput("");
    }
    startListening();
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 sm:px-6 lg:px-10 dark:text-slate-100">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-56 w-[75%] -translate-x-1/2 rounded-full bg-white/28 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.2),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.2),transparent_30%)]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/45 bg-white/80 px-6 py-5 shadow-[0_24px_65px_-28px_rgba(147,51,234,0.4)] backdrop-blur-[20px] dark:border-white/15 dark:bg-slate-900/45">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-700 dark:text-cyan-300/90">VoxHire</p>
            <h1 className="font-display text-3xl font-bold leading-tight text-transparent sm:text-4xl dark:text-white bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text">
              AI Voice Interview & Resume Coach
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge phase={phase} />
          </div>
        </header>

        <DemoControls
          disabled={isBusy}
          onDemoResume={() => {
            setSpokenInput(demoResumeInput);
            handleGenerateResume(demoResumeInput);
          }}
          onDemoInterview={handleStartInterview}
        />

        {!isSupported && (
          <div className="rounded-2xl border border-amber-300/55 bg-white/85 p-3 text-sm text-amber-900 backdrop-blur-lg dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100">
            Web Speech API is not supported in this browser. Please open VoxHire in the latest Chrome or Edge.
          </div>
        )}

        {(errorText || micError) && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/55 bg-white/85 p-3 text-sm text-amber-900 backdrop-blur-lg dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p>{errorText || micError}</p>
            {retryHandler && (
              <button
                type="button"
                onClick={() => retryHandler?.()}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1.5 font-semibold text-white transition hover:scale-[1.03] hover:shadow-[0_10px_24px_-8px_rgba(14,165,233,0.75)] dark:bg-amber-500/20 dark:hover:bg-amber-500/30"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <GlassPanel title="Voice Command Center">
              <div className="grid items-center gap-4 lg:grid-cols-[220px_1fr]">
                <VoiceOrb
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  disabled={!isSupported || isBusy}
                  onToggle={onMicToggle}
                />
                <div className="space-y-3">
                  <p className="text-sm text-slate-900 dark:text-slate-300">
                    Smart voice commands: <span className="font-semibold text-indigo-900 dark:text-cyan-200">Start interview</span>,{" "}
                    <span className="font-semibold text-indigo-900 dark:text-cyan-200">Next question</span>,{" "}
                    <span className="font-semibold text-indigo-900 dark:text-cyan-200">Improve this answer</span>
                  </p>
                  <div className="rounded-2xl border border-white/45 bg-white/82 p-3 text-sm text-slate-800 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200">
                    <p className="mb-1 text-xs uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">Live transcript</p>
                    <p>{transcript || "Your recognized speech appears here in real time."}</p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel title="Resume Builder">
              <textarea
                value={spokenInput}
                onChange={(event) => setSpokenInput(event.target.value)}
                rows={4}
                placeholder="Speak your background, skills, and projects."
                className="w-full rounded-2xl border border-white/45 bg-white/82 p-3 text-sm text-slate-900 outline-none ring-sky-300 transition placeholder:text-slate-600 focus:ring dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 dark:ring-cyan-300 dark:placeholder:text-slate-400"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isBusy || !spokenInput.trim()}
                  onClick={() => handleGenerateResume()}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.03] hover:shadow-[0_12px_26px_-10px_rgba(14,165,233,0.8)] disabled:opacity-40 dark:bg-cyan-400/25 dark:text-cyan-100 dark:hover:bg-cyan-400/35"
                >
                  <ClipboardList size={16} />
                  Generate Resume
                </button>
              </div>
              <motion.pre
                key={resumeText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/45 bg-white/82 p-3 text-sm text-slate-900 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100"
              >
                {resumeText || "Your polished AI-generated resume will appear here."}
              </motion.pre>
            </GlassPanel>

            <GlassPanel title="Interview Mode">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {INTERVIEWER_MODES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setMode(item)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${mode === item
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_10px_26px_-10px_rgba(14,165,233,0.8)] dark:bg-emerald-400/25 dark:text-emerald-100"
                      : "bg-white/78 text-slate-900 hover:bg-white/90 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                      }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-white/45 bg-white/82 p-3 text-sm text-slate-900 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100">
                <p className="mb-1 text-xs uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">Current question</p>
                <p>{currentQuestion || "Press Start Interview to get your first question."}</p>
              </div>

              <textarea
                ref={answerInputRef}
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                rows={4}
                placeholder="Answer verbally with mic, or type here."
                className="mt-3 w-full rounded-2xl border border-white/45 bg-white/82 p-3 text-sm text-slate-900 outline-none ring-sky-300 transition placeholder:text-slate-600 focus:ring dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 dark:ring-emerald-300 dark:placeholder:text-slate-400"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleStartInterview}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.03] hover:shadow-[0_12px_26px_-10px_rgba(14,165,233,0.8)] disabled:opacity-40 dark:bg-emerald-400/25 dark:text-emerald-100 dark:hover:bg-emerald-400/35"
                >
                  <Bot size={16} />
                  Start Interview
                </button>
                <button
                  type="button"
                  disabled={isBusy || !currentQuestion}
                  onClick={() => handleSubmitAnswer()}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.03] hover:shadow-[0_12px_26px_-10px_rgba(14,165,233,0.8)] disabled:opacity-40 dark:bg-sky-400/25 dark:text-sky-100 dark:hover:bg-sky-400/35"
                >
                  <UserRound size={16} />
                  Analyze Answer
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleNextQuestion()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/84 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:scale-[1.02] hover:bg-white/95 disabled:opacity-40 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
                >
                  <ArrowRight size={16} />
                  Next Question
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleImproveAnswer()}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.03] hover:shadow-[0_12px_26px_-10px_rgba(14,165,233,0.8)] disabled:opacity-40 dark:bg-sky-400/20 dark:text-sky-100 dark:hover:bg-sky-400/30"
                >
                  Improve My Answer
                </button>
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-5">
            <GlassPanel title="Feedback Panel">
              {isThinking ? (
                <div className="typing inline-flex items-center gap-2 text-sm text-slate-800 dark:text-amber-200">
                  <RefreshCw size={14} className="animate-spin" />
                  AI is evaluating
                  <span className="thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/45 bg-white/82 p-3 text-sm text-slate-900 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100">
                    <p className="mb-1 text-xs uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">Feedback</p>
                    <p>{feedbackText || "Feedback appears here after answer analysis."}</p>
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/45 bg-white/82 p-3 text-sm text-slate-900 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100">
                    <p className="mb-1 text-xs uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">Improved answer</p>
                    <p>{improvedText || "Use Improve My Answer to generate a stronger response."}</p>
                  </div>
                </>
              )}

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">
                  <span>Live Confidence</span>
                  <span>{confidence.label}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-sky-100/95 dark:bg-slate-800/70">
                  <motion.div
                    animate={{ width: `${confidence.score}%` }}
                    transition={{ type: "spring", stiffness: 160, damping: 18 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-300"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-400">{confidence.score}% confidence score</p>
              </div>
            </GlassPanel>

            <HistoryPanel history={history} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
