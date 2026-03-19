import { Sparkles } from "lucide-react";

export const DemoControls = ({ onDemoResume, onDemoInterview, disabled }) => {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/45 bg-white/80 p-3 shadow-[0_18px_48px_-26px_rgba(147,51,234,0.45)] backdrop-blur-[20px] dark:border-white/10 dark:bg-slate-900/35">
            <div className="mr-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                <Sparkles size={16} />
                Demo Mode
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={onDemoResume}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:scale-[1.03] hover:shadow-[0_10px_24px_-8px_rgba(14,165,233,0.75)] disabled:opacity-45 dark:bg-cyan-400/20 dark:text-cyan-200 dark:hover:bg-cyan-400/30"
            >
                Generate Resume
            </button>
            <button
                type="button"
                disabled={disabled}
                onClick={onDemoInterview}
                className="rounded-full border border-white/60 bg-white/92 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:scale-[1.02] hover:bg-white disabled:opacity-45 dark:bg-emerald-400/20 dark:text-emerald-200 dark:hover:bg-emerald-400/30"
            >
                Start Interview
            </button>
        </div>
    );
};
