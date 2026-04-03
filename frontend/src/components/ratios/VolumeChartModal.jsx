import VolumeComparisonChart from "./VolumeComparisonChart.jsx";

const VolumeChartModal = ({ isOpen, chart, onClose, onExport }) => {
    if (!isOpen || !chart) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
                {/* Stripe */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#072956] via-[#005EA8] to-[#ADD8E6]" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#005EA8]">Graphe détaillé</p>
                        <h3 className="text-2xl font-bold text-slate-900">{chart.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        {onExport && (
                            <button
                                onClick={onExport}
                                className="rounded-full border border-[#005EA8] px-4 py-2 font-semibold text-[#005EA8] transition hover:bg-[#005EA8]/5"
                            >
                                Exporter PNG
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-full bg-slate-900 px-5 py-2 font-semibold text-white transition hover:bg-slate-700"
                        >
                            Fermer
                        </button>
                    </div>
                </div>

                {/* Chart */}
                <div className="px-4 pb-6 h-[420px]">
                    <VolumeComparisonChart data={chart.points} timeframe={chart.type} height={380} />
                </div>
            </div>
        </div>
    );
};

export default VolumeChartModal;
