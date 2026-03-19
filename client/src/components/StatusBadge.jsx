export const StatusBadge = ({ phase }) => {
    const labels = {
        idle: "Idle",
        listening: "Listening...",
        thinking: "Thinking...",
        speaking: "Speaking...",
        error: "Error",
    };

    const colors = {
        idle: "bg-white/85 text-sky-900 dark:bg-slate-700/80 dark:text-slate-200",
        listening: "bg-cyan-200/85 text-cyan-900 dark:bg-cyan-400/20 dark:text-cyan-200",
        thinking: "bg-sky-200/85 text-sky-900 dark:bg-amber-400/20 dark:text-amber-200",
        speaking: "bg-blue-200/85 text-blue-900 dark:bg-emerald-400/20 dark:text-emerald-200",
        error: "bg-amber-200/90 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
    };

    return (
        <span className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${colors[phase]}`}>
            {labels[phase]}
        </span>
    );
};
