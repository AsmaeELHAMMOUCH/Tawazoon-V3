import { Building2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CentresUniques() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-50 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full text-center">
                {/* Icon */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-6 mx-auto shadow-lg">
                    <Building2 className="w-12 h-12 text-white" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-slate-900 mb-4">
                    Centres Uniques
                </h1>

                {/* Description */}
                <p className="text-lg text-slate-600 mb-8">
                    Cette fonctionnalité est en cours de développement.
                </p>

                {/* Back Button */}
                <button
                    onClick={() => navigate('/app')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors shadow-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Retour au menu principal
                </button>
            </div>
        </div>
    );
}
