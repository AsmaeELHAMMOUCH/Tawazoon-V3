import { useState } from "react";
import CentresUniquesNavbar from "@/components/CentresUniquesNavbar";
import CNDPSimulation from "./centres_uniq/CNDPSimulation";
import BandoengSimulation from "./centres_uniq/BandoengSimulation";
import VueCCP from "./centres_uniq/VueCCP";
import VueCNA from "./centres_uniq/VueCNA";
import VueCCI from "./centres_uniq/VueCCI";

export default function SimulationCentresUniques() {
    const [activeTab, setActiveTab] = useState("cndp");

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-30 bg-transparent w-full">
                <div className="px-0">
                    <CentresUniquesNavbar activeTab={activeTab} onTabChange={setActiveTab} />
                </div>
            </div>

            <div className="w-full px-2 pt-2 pb-4 space-y-2 -mt-1">
                {activeTab === "cndp" && <CNDPSimulation />}
                {activeTab === "bandoeng" && <BandoengSimulation />}
                {activeTab === "cci" && <VueCCI />}
                {activeTab === "ccp" && <VueCCP />}
                {activeTab === "cna" && <VueCNA />}
            </div>
        </main>
    );
}
