import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ClipboardList,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  ShieldCheck,
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
  clearAuthSession,
  fetchFeedback,
  fetchInterviewQuestion,
  getAuthSession,
  generateResume,
  improveAnswer,
  signInLocal,
  signUpLocal,
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

const LANGUAGE_OPTIONS = [
  { code: "en-US", label: "English (US)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
];

const LANGUAGE_STORAGE_KEY = "voxhire_selected_language";

function App() {
  const [spokenInput, setSpokenInput] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [mode, setMode] = useState(INTERVIEWER_MODES[1]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [aiConfidenceScore, setAiConfidenceScore] = useState(null);
  const [improvedText, setImprovedText] = useState("");
  const [history, setHistory] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [activeSection, setActiveSection] = useState("resume");
  const [retryHandler, setRetryHandler] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  const [authUser, setAuthUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem(LANGUAGE_STORAGE_KEY) || import.meta.env.VITE_SPEECH_LANG || "en-US",
  );

  const {
    isSupported,
    isListening,
    transcript,
    finalText,
    error: micError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(selectedLanguage);
  const { isSpeaking, speak } = useVoicePlayer();
  const answerInputRef = useRef(null);
  const processedFinalRef = useRef("");
  const usernameInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const session = getAuthSession();
    if (!session) {
      setAuthStatus("unauthenticated");
      return;
    }

    setAuthUser(session);
    setAuthStatus("authenticated");
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    if (authStatus !== "unauthenticated") {
      return;
    }

    const timeoutId = setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [authStatus]);

  useEffect(() => {
    if (!finalText.trim()) {
      return;
    }

    if (activeSection === "interview") {
      setAnswerText(finalText);
      return;
    }

    setSpokenInput(finalText);
  }, [activeSection, finalText]);

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
        const payload = await generateResume({
          spokenInput: input,
          language: selectedLanguage,
        });
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
          askedQuestions: askedQuestions.slice(-8),
          language: selectedLanguage,
        });

        const nextQuestion = (payload.question || "").trim();
        setCurrentQuestion(nextQuestion);
        if (nextQuestion) {
          setAskedQuestions((prev) => {
            if (prev.includes(nextQuestion)) {
              return prev;
            }
            return [...prev, nextQuestion];
          });
        }
        setFeedbackText("");
        setAiConfidenceScore(null);
        setImprovedText("");
        setActiveSection("interview");
        await speak({ text: nextQuestion, voiceId: VOICE_MAP[mode] });
      },
      () => handleNextQuestion(lastAnswer),
    );
  };

  const handleStartInterview = async () => {
    setActiveSection("interview");
    setCurrentQuestion("");
    setAnswerText("");
    setFeedbackText("");
    setImprovedText("");
    setAiConfidenceScore(null);
    setAskedQuestions([]);
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
          language: selectedLanguage,
        });

        setFeedbackText(payload.feedback);
        setAiConfidenceScore(
          typeof payload.confidenceScore === "number" ? payload.confidenceScore : null,
        );
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
        const payload = await improveAnswer({
          answer,
          mode,
          language: selectedLanguage,
        });
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
  const aiConfidence = useMemo(() => {
    if (typeof aiConfidenceScore === "number") {
      const clamped = Math.max(1, Math.min(10, aiConfidenceScore));
      return {
        display: `${clamped}/10`,
        score: clamped * 10,
      };
    }

    if (!feedbackText) {
      return null;
    }

    const outOfTenMatch = feedbackText.match(/confidence:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
    if (outOfTenMatch) {
      const value = Number.parseFloat(outOfTenMatch[1]);
      const clamped = Math.max(0, Math.min(10, value));
      return {
        display: `${clamped.toFixed(clamped % 1 === 0 ? 0 : 1)}/10`,
        score: Math.round(clamped * 10),
      };
    }

    const percentMatch = feedbackText.match(/confidence:\s*(\d{1,3})\s*%/i);
    if (percentMatch) {
      const value = Number.parseInt(percentMatch[1], 10);
      const clamped = Math.max(0, Math.min(100, value));
      return {
        display: `${clamped}%`,
        score: clamped,
      };
    }

    return null;
  }, [aiConfidenceScore, feedbackText]);

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
    processedFinalRef.current = "";
    if (activeSection === "interview") {
      setAnswerText("");
    } else {
      setSpokenInput("");
    }
    startListening();
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setAuthError("Username and password are required.");
      return;
    }

    setIsAuthenticating(true);

    try {
      const payload = authMode === "signup"
        ? signUpLocal({
          username: credentials.username.trim(),
          password: credentials.password,
        })
        : signInLocal({
          username: credentials.username.trim(),
          password: credentials.password,
        });

      setAuthUser(payload.user);
      setAuthStatus("authenticated");
      if (authMode === "signup") {
        setAuthNotice("Account created and signed in.");
      }
      setCredentials({ username: "", password: "" });
      setShowPassword(false);
    } catch (error) {
      setAuthError(error.message || "Authentication failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
    setAuthStatus("unauthenticated");
  };

  if (authStatus === "checking") {
    return (
      <main className="relative grid min-h-screen place-items-center px-4 py-8 text-slate-900 dark:text-slate-100">
        <div className="rounded-2xl border border-white/45 bg-white/82 px-6 py-5 text-sm backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/45">
          Verifying your session...
        </div>
      </main>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8 text-slate-900 dark:text-slate-100">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="bg-blob blob-3" />
        <div className="w-full max-w-md rounded-[28px] border border-white/45 bg-white/80 p-6 shadow-[0_24px_65px_-28px_rgba(147,51,234,0.4)] backdrop-blur-[20px] dark:border-white/15 dark:bg-slate-900/45">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="text-cyan-400" size={20} />
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {authMode === "signup" ? "VoxHire Sign Up" : "VoxHire Sign In"}
            </h1>
          </div>
          <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">
            {authMode === "signup"
              ? "Create a local account to access resume coaching and interview practice."
              : "Sign in to access resume coaching and interview practice."}
          </p>

          <form className="space-y-3" onSubmit={handleAuthSubmit}>
            <input
              ref={usernameInputRef}
              type="text"
              value={credentials.username}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, username: event.target.value }))
              }
              placeholder="Username"
              className="w-full rounded-xl border border-white/45 bg-white/82 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition placeholder:text-slate-600 focus:ring dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 dark:ring-cyan-300 dark:placeholder:text-slate-400"
            />
            <div className="relative">
              <input
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Password"
                className="w-full rounded-xl border border-white/45 bg-white/82 px-3 py-2 pr-10 text-sm text-slate-900 outline-none ring-sky-300 transition placeholder:text-slate-600 focus:ring dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 dark:ring-cyan-300 dark:placeholder:text-slate-400"
                type={showPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-700 transition hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {authNotice && (
              <div className="rounded-xl border border-sky-300/55 bg-white/85 p-2 text-xs text-sky-900 backdrop-blur-lg dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100">
                {authNotice}
              </div>
            )}

            {authError && (
              <div className="rounded-xl border border-amber-300/55 bg-white/85 p-2 text-xs text-amber-900 backdrop-blur-lg dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:shadow-[0_12px_26px_-10px_rgba(14,165,233,0.8)] disabled:opacity-40"
            >
              {isAuthenticating
                ? authMode === "signup"
                  ? "Creating account..."
                  : "Signing in..."
                : authMode === "signup"
                  ? "Sign Up"
                  : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode((prev) => (prev === "signup" ? "signin" : "signup"));
                setAuthError("");
                setAuthNotice("");
                setShowPassword(false);
              }}
              className="w-full text-center text-xs font-semibold text-sky-800 underline decoration-transparent underline-offset-2 transition hover:decoration-current dark:text-sky-200"
            >
              {authMode === "signup"
                ? "Already have an account? Sign In"
                : "Need an account? Sign Up"}
            </button>
          </form>
        </div>
      </main>
    );
  }

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
            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
              className="rounded-xl border border-white/50 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none transition hover:bg-white dark:bg-white/85 dark:text-slate-900"
              title="Speech and response language"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code} className="bg-white text-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
            <StatusBadge phase={phase} />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/84 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:scale-[1.02] hover:bg-white/95 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              title={authUser?.username ? `Signed in as ${authUser.username}` : "Sign out"}
            >
              <LogOut size={14} />
              Logout
            </button>
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
                <div className="mb-2 rounded-2xl border border-white/45 bg-white/82 p-3 text-xs text-slate-800 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
                  <p className="uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">AI Evaluator Confidence</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {aiConfidence ? aiConfidence.display : "Not available yet"}
                  </p>
                </div>

                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">
                  <span>Live Confidence (Heuristic)</span>
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
