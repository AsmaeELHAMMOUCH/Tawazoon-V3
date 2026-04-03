import { useNavigate } from "react-router-dom";

const AppHeader = ({
    title = "Résultats de la simulation",
    subtitle = "Ratios de Productivité",
    actions,
    backTo,
    badge,
}) => {
    const navigate = useNavigate();

    return (
        <header className="relative overflow-hidden border-b border-slate-200 bg-white shadow-sm">
            {/* Gradient top stripe */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#072956] via-[#005EA8] to-[#ADD8E6]" />

            <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4 lg:px-10">
                {/* LEFT: Logo Barid + back button */}
                <div className="flex items-center gap-4">
                    {backTo && (
                        <button
                            onClick={() => navigate(backTo)}
                            className="group flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-[#005EA8] hover:shadow-md"
                            title="Retour"
                        >
                            <svg
                                className="h-4 w-4 text-slate-500 transition group-hover:text-[#005EA8]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <img
                            src="/BaridLogo.png"
                            alt="Barid Al Maghrib"
                            className="h-11 w-auto object-contain"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                        <div className="hidden flex-col leading-tight sm:flex">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#005EA8]">Barid Al Maghrib</span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400">TAWAZOON RH</span>
                        </div>
                    </div>
                </div>

                {/* CENTER: Title */}
                <div className="flex flex-1 flex-col items-center text-center">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.5em] text-slate-400">TAWAZOON RH</p>
                    <h1 className="text-base font-bold text-slate-900 sm:text-xl">{title}</h1>
                    <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-xs font-medium text-[#005EA8]">{subtitle}</p>
                        {badge && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#005EA8]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#005EA8]">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#005EA8]" />
                                {badge}
                            </span>
                        )}
                    </div>
                </div>

                {/* RIGHT: Actions + Logo Almav */}
                <div className="flex items-center gap-3">
                    {actions}
                    <img
                        src="/almavlogo.png"
                        alt="ALMAV Group"
                        className="h-11 w-auto object-contain"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
