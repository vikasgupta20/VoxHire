import { motion } from "framer-motion";
import clsx from "clsx";

export const GlassPanel = ({ title, children, className }) => {
    return (
        <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={clsx(
                "rounded-[24px] border border-white/55 bg-white/90 p-5 shadow-[0_24px_65px_-28px_rgba(79,70,229,0.35)] backdrop-blur-[20px]",
                "dark:border-white/10 dark:bg-white/5 dark:shadow-[0_20px_60px_-24px_rgba(0,0,0,0.75)]",
                className,
            )}
        >
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-400">
                {title}
            </h3>
            {children}
        </motion.section>
    );
};
