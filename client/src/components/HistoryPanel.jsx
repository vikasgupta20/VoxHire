import { GlassPanel } from "./GlassPanel";

export const HistoryPanel = ({ history }) => {
    return (
        <GlassPanel title="Conversation History" className="h-full min-h-[320px]">
            <div className="max-h-[360px] space-y-4 overflow-auto pr-2">
                {history.length === 0 ? (
                    <p className="text-sm text-slate-800 dark:text-slate-300/85">No interview history yet. Start interview mode and answer a question to populate this panel.</p>
                ) : (
                    history.map((item) => (
                        <article
                            key={item.id}
                            className="rounded-2xl border border-white/45 bg-white/84 p-3 text-sm text-slate-900 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
                        >
                            <p className="font-semibold text-indigo-900 dark:text-cyan-300">Q: {item.question}</p>
                            <p className="mt-2 text-slate-900 dark:text-slate-200">A: {item.answer}</p>
                            <p className="mt-2 text-blue-700 dark:text-emerald-300">Feedback: {item.feedback}</p>
                        </article>
                    ))
                )}
            </div>
        </GlassPanel>
    );
};
