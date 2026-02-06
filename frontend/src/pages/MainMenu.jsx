import { useNavigate } from 'react-router-dom';
import { Network, Building2, Sparkles } from 'lucide-react';

export default function MainMenu() {
    const navigate = useNavigate();

    const menuCards = [
        {
            id: 'reseau-bam',
            title: 'Réseau BAM',
            description: 'Gestion et simulation du réseau BAM',
            icon: Network,
            color: 'from-blue-500 to-blue-600',
            hoverColor: 'hover:from-blue-600 hover:to-blue-700',
            path: '/app/actuel/menu'
        },
        {
            id: 'centres-uniques',
            title: 'Centres Uniques',
            description: 'Gestion des centres uniques',
            icon: Building2,
            color: 'from-cyan-500 to-cyan-600',
            hoverColor: 'hover:from-cyan-600 hover:to-cyan-700',
            path: '/app/centres-uniques'
        },
        {
            id: 'simulation-nouvelle',
            title: 'Simulation Nouvelle Création',
            description: 'Simulation Nouvelle Création',
            icon: Sparkles,
            color: 'from-sky-500 to-sky-600',
            hoverColor: 'hover:from-sky-600 hover:to-sky-700',
            path: '/app/creer-centre'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center p-6">
            <div className="max-w-6xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-3">
                        Tawazoon RH
                    </h1>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {menuCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <button
                                key={card.id}
                                onClick={() => navigate(card.path)}
                                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} ${card.hoverColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                {/* Content */}
                                <div className="relative p-8 flex flex-col items-center text-center">
                                    {/* Icon */}
                                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${card.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                        <Icon className="w-10 h-10 text-white" />
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 mb-3">
                                        {card.title}
                                    </h2>

                                    {/* Description */}
                                    <p className="text-sm text-slate-600 group-hover:text-white/90 transition-colors duration-300">
                                        {card.description}
                                    </p>

                                    {/* Arrow Icon */}
                                    <div className="mt-6 flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors duration-300">
                                        <span className="text-xs font-semibold">Accéder</span>
                                        <svg
                                            className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Decorative Elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                            </button>
                        );
                    })}
                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-slate-500">
                        Sélectionnez une option pour commencer votre simulation
                    </p>
                </div>
            </div>
        </div>
    );
}
