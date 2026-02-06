import React, { useRef } from "react";
import { Book, Calculator, Layers, Building, Settings, FileDown, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import tawazoonLogo from "@/assets/LOGO_Tawazoon_RH.png";
import logoAlmav from "@/assets/AlmavLogo.png";

export default function Glossary() {
    const contentRef = useRef(null);

    const exportToPDF = async () => {
        if (!contentRef.current) return;

        try {
            // Utilisation d'une échelle plus basse et désactivation des options qui peuvent causer des erreurs oklch
            const canvas = await html2canvas(contentRef.current, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: "#f8fafc",
                logging: false,
                onclone: (clonedDoc) => {
                    // Petite astuce : on s'assure que le document cloné n'utilise pas de variables oklch
                    const elements = clonedDoc.getElementsByTagName("*");
                    for (let i = 0; i < elements.length; i++) {
                        elements[i].style.color = window.getComputedStyle(elements[i]).color;
                        elements[i].style.backgroundColor = window.getComputedStyle(elements[i]).backgroundColor;
                        elements[i].style.borderColor = window.getComputedStyle(elements[i]).borderColor;
                    }
                }
            });

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            try {
                if (logoAlmav) pdf.addImage(logoAlmav, "PNG", 10, 10, 25, 12);
                if (tawazoonLogo) pdf.addImage(tawazoonLogo, "PNG", pdfWidth - 45, 5, 35, 20);
            } catch (e) {
                console.warn("Logos non chargés:", e);
            }

            pdf.setFontSize(11);
            pdf.setTextColor("#64748b"); // Slate 500 en HEX
            pdf.text("Glossaire & Légende des paramètres", 10, 28);
            pdf.setDrawColor("#e2e8f0"); // Slate 200 en HEX
            pdf.line(10, 30, pdfWidth - 10, 30);

            const imgData = canvas.toDataURL("image/png");
            const marginMm = 10;
            const contentStartY = 35;
            const imgWidthMm = pdfWidth - (marginMm * 2);
            const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

            const availableHeight = pdfHeight - contentStartY - marginMm;
            let finalHeight = imgHeightMm;
            let finalWidth = imgWidthMm;

            if (imgHeightMm > availableHeight) {
                const ratio = availableHeight / imgHeightMm;
                finalHeight = availableHeight;
                finalWidth = imgWidthMm * ratio;
            }

            pdf.addImage(imgData, "PNG", (pdfWidth - finalWidth) / 2, contentStartY, finalWidth, finalHeight);
            pdf.save("Glossaire_TawazoonRH.pdf");
        } catch (error) {
            console.error("Erreur PDF:", error);
            alert("Erreur lors de la génération. Astuce: Essayez de rafraîchir la page.");
        }
    };

    const sections = [
        {
            title: "Unités & Mesures",
            color: "#2563eb", // Blue 600
            icon: <Calculator className="w-5 h-5" style={{ color: "#2563eb" }} />,
            items: [
                { term: "Moyenne (min)", definition: "Temps moyen nécessaire pour réaliser une unité de tâche." },
                { term: "Unit. (/jour)", definition: "Le nombre d'unités de mesure exprimant la charge de travail par jour." },
                { term: "ETP (Équivalent Temps Plein)", definition: "Unité de mesure représentant la charge de travail correspondant à un agent à temps plein." },
                { term: "PART (Particuliers)", definition: "Volume des flux lié au traitement des envois des clients particuliers." },
                { term: "PRO (Professionnels)", definition: "Volume des flux lié au traitement des envois des clients professionnels." },
                { term: "DIST (Distribution)", definition: "Volume des flux qui fera l'objet de la distribution par le centre objet de la simulation." }
            ]
        },
        {
            title: "Organisation",
            color: "#ea580c", // Orange 600
            icon: <Building className="w-5 h-5" style={{ color: "#ea580c" }} />,
            items: [
                { term: "Centre", definition: "Entité opérationnelle physique où sont réalisées les activités (ex : Agence, Centre de Tri, Plateforme)." },
                { term: "Région", definition: "Zone géographique administrative regroupant plusieurs centres." },
                { term: "Direction Régionale", definition: "Niveau d'organisation regroupant plusieurs centres sous une même entité de pilotage régional." },
                { term: "Nationale", definition: "Niveau d'organisation central couvrant l'ensemble du périmètre national." },
                { term: "Typologie", definition: "Catégorie de centre selon sa taille ou son activité (ex: Pandalous, Agence R1, etc.)." },
                { term: "Poste", definition: "Fonction ou rôle d'un agent au sein d'un centre (ex: Facteur, Guichetier, Chef de Centre)." },
                { term: "Intervenant", definition: "Acteur opérationnel occupant un poste spécifique (ex: agent opération, agent cabine chargement, guichetier)." }
            ]
        },
        {
            title: "Processus",
            color: "#16a34a", // Green 600
            icon: <Layers className="w-5 h-5" style={{ color: "#16a34a" }} />,
            items: [
                { term: "Catégorisation", definition: "Processus de classement des centres ou des activités selon des critères définis (taille, volume, complexité, rôle, etc.)." },
                { term: "Famille", definition: "Grande catégorie d'activités ou de processus regroupant plusieurs opérations similaires." },
                { term: "Produit", definition: "Type d'objet ou de service traité (ex : Courrier Ordinaire, Courrier Recommandé, Amana, LRH, E-Barkia)." },
                { term: "MOD (Main-d'œuvre Directe)", definition: "Ressources humaines directement affectées aux activités opérationnelles de production." },
                { term: "MOI (Main-d'œuvre Indirecte)", definition: "Ressources humaines affectées aux fonctions de support, d'encadrement ou de soutien opérationnel." },
                { term: "Cas spécial", definition: "Situation particulière nécessitant un traitement spécifique en dehors des règles standards de calcul (ex : maladie chronique, incapacité de rester debout)." }
            ]
        },
        {
            title: "Paramètres",
            color: "#4f46e5", // Indigo 600
            icon: <Settings className="w-5 h-5" style={{ color: "#4f46e5" }} />,
            items: [
                { term: "Productivité", definition: "Taux cible représentant la part effective du temps de travail réellement consacrée à la production, par rapport à une journée de travail standard de 8 heures." },
                { term: "Temps mort", definition: "Temps non productif pendant lequel aucune activité opérationnelle n'est réalisée (attente, interruption, indisponibilité)." },
                { term: "Complexité de circulation", definition: "Niveau de difficulté lié aux conditions de déplacement et de fluidité des flux (trafic, accessibilité, congestion, etc.)." },
                { term: "Complexité géographique", definition: "Niveau de difficulté lié à la configuration du territoire desservi (distance, relief, dispersion des zones, enclavement, zone villa, zone immeuble)." },
                { term: "Shift", definition: "Plage horaire de travail correspondant à une période de service (ex : matin, soir, nuit)." },
                { term: "En dehors (ED)", definition: "Volume des colis en dehors des sacs." },
                { term: "Nb CO / sac", definition: "Nombre moyen d'objets de Courrier Ordinaire contenus dans un sac." },
                { term: "Base de Calcul", definition: "Diviseur appliqué aux volumes pour normaliser les calculs (ex: 100, 60, 40 selon le type de tâche)." }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-6" style={{ backgroundColor: "#f8fafc" }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl md:text-2xl font-bold text-[#1e293b] flex items-center gap-3" style={{ color: "#1e293b" }}>
                        <Book className="w-6 h-6 text-[#2563eb]" style={{ color: "#2563eb" }} />
                        Glossaire & Légende
                    </h1>
                    <p className="text-[0.65rem] md:text-xs text-[#64748b] max-w-2xl font-medium" style={{ color: "#64748b" }}>
                        Retrouvez ici la définition de tous les termes techniques et paramètres utilisés dans l'application.
                    </p>
                </div>

                <button
                    onClick={exportToPDF}
                    className="flex items-center justify-center gap-2 bg-[#ef4444] border border-[#dc2626] px-4 py-2 rounded-lg text-[0.65rem] md:text-xs font-bold text-white hover:bg-[#dc2626] transition-all shadow-md shadow-red-100"
                    style={{ backgroundColor: "#ef4444", borderColor: "#dc2626", color: "#ffffff" }}
                >
                    <FileText className="w-4 h-4" />
                    Exporter en PDF
                </button>
            </div>

            {/* Content to Export */}
            <div ref={contentRef} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sections.map((section, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden" style={{ borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}>
                            <div className="px-5 py-2.5 border-b border-[#f1f5f9] bg-[#f8fafc] flex items-center gap-3" style={{ borderBottomColor: "#f1f5f9", backgroundColor: "#f8fafc" }}>
                                {section.icon}
                                <h2 className="text-xs md:text-sm font-bold text-[#334155]" style={{ color: "#334155" }}>{section.title}</h2>
                            </div>
                            <div className="divide-y divide-[#f1f5f9]" style={{ borderColor: "#f1f5f9" }}>
                                {section.items.map((item, i) => (
                                    <div key={i} className="px-5 py-3 group hover:bg-[#f8fafc] transition-colors" style={{ borderTopColor: "#f1f5f9" }}>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-[0.65rem] md:text-xs text-[#1e293b] flex items-center gap-2" style={{ color: "#1e293b" }}>
                                                <span className="w-1 h-1 rounded-full bg-[#cbd5e1]" style={{ backgroundColor: "#cbd5e1" }} />
                                                {item.term}
                                            </span>
                                            <p className="text-[0.65rem] md:text-xs text-[#64748b] pl-2.5 leading-relaxed" style={{ color: "#64748b" }}>
                                                {item.definition}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-3 text-[0.65rem] md:text-xs text-[#1e40af] flex items-start gap-3 mt-4" style={{ backgroundColor: "#eff6ff", borderColor: "#dbeafe", color: "#1e40af" }}>
                    <div className="shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="font-medium">
                        Cette documentation est mise à jour régulièrement pour refléter les évolutions des règles métier du simulateur.
                    </p>
                </div>
            </div>
        </div>
    );
}
