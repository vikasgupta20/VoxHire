import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";

export const VoiceOrb = ({ isListening, isSpeaking, disabled, onToggle }) => {
    const bars = Array.from({ length: 9 }, (_, idx) => idx);

    return (
        <div className="relative mx-auto flex w-full max-w-xs flex-col items-center gap-4">
            <div
                className={`voice-wave absolute -top-5 h-16 w-full max-w-[220px] items-end justify-center gap-1 ${isListening || isSpeaking ? "opacity-100" : "opacity-0"
                    }`}
            >
                {bars.map((bar) => (
                    <span
                        key={bar}
                        className="voice-bar h-3 w-1.5 rounded-full bg-cyan-300/85"
                        style={{ animationDelay: `${bar * 0.08}s` }}
                    />
                ))}
            </div>

            <motion.button
                whileTap={{ scale: 0.95 }}
                animate={isListening ? { boxShadow: "0 0 0 16px rgba(14,165,233,0.25), 0 0 40px rgba(59,130,246,0.45)" } : {}}
                transition={{ duration: 0.35, repeat: isListening ? Infinity : 0 }}
                disabled={disabled}
                onClick={onToggle}
                className="relative mt-8 grid h-28 w-28 place-items-center rounded-full border border-cyan-200/70 bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500 text-white shadow-2xl shadow-cyan-500/35 transition-transform duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
            >
                {isListening ? <Square size={30} strokeWidth={2.5} /> : <Mic size={34} strokeWidth={2.5} />}
            </motion.button>

            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Tap to Talk"}
            </p>
        </div>
    );
};
