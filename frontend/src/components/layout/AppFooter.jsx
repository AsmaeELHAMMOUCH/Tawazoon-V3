const AppFooter = () => {
    const now = new Date();
    const dateLabel = now.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return (
        <footer className="mt-auto border-t border-[#072956]/30 bg-gradient-to-r from-[#072956] via-[#005EA8] to-[#072956] text-white">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] font-semibold uppercase tracking-widest sm:px-10">
                <div className="flex items-center gap-4 text-slate-200">
                    <span>© 2025 – ALMAV GROUP</span>
                    <span className="opacity-30">|</span>
                    <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Tous droits réservés
                    </span>
                </div>
                <div className="flex items-center gap-4 text-slate-300">
                    <span>{dateLabel}</span>
                    <span className="opacity-30">|</span>
                    <span className="flex items-center gap-1.5 rounded bg-white/10 px-2 py-0.5">
                        <span className="h-1 w-1 rounded-full bg-[#ADD8E6]" />
                        TAWAZOON RH — V 1.0
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;
