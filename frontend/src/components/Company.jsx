import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Building,
  Globe,
  Award,
  Heart,
  Shield,
  Target,
  Rocket,
  BarChart3,
  Truck,
  Settings,
  Package,
  Layers,
  CheckCircle,
  Linkedin,
  Building2,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Button } from "@/components/ui/button";

// Animations
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const secteurs = [
  { title: "Aéronautique", image: "/secteur/Aéronautique.jpg" },
  { title: "Agroalimentaire", image: "/secteur/Agroalimentaire.jpg" },
  { title: "Bâtiment et Travaux Publics", image: "/secteur/BTP.jpg" },
  { title: "Pharmacie & cosmétiques", image: "/secteur/Pharmacie.jpg" },
  {
    title: "Offres & services d'utilité publique",
    image: "/secteur/servicesPub.jpg",
  },
  { title: "Industrie lourde", image: "/secteur/Industrie.jpg" },
  { title: "Automobile", image: "/secteur/Automobile.jpg" },
  { title: "Grande distribution", image: "/secteur/Distributions.jpg" },
];

// Données extraites
const solutions = [
  { icon: <BarChart3 className="w-4 h-4" />, image: "/dashpro.png", title: "DashPro Analytics", text: "Plateforme de Business Intelligence pour le pilotage logistique. Centralisation des indicateurs WMS." },
  { icon: <Truck className="w-4 h-4" />, image: "/vector.png", title: "Vector", text: "Plateforme de gestion du transport. Gestion des tournées, de la flotte et suivi de la performance." },
  { icon: <Package className="w-4 h-4" />, image: "/SmartTrace.png", title: "Smart Trace Pulse", text: "Solution de traçabilité RFID. Traçabilité temps réel des actifs et des flux de bout en bout." },
  { icon: <Settings className="w-4 h-4" />, image: "/Dialog.png", title: "Dialog", text: "Outil de diagnostic et maturité logistique. Diagnostic structuré et plan d’action automatique." },
  { icon: <Target className="w-4 h-4" />, image: "/EE.png", title: "Eagle Eye", text: "Plateforme de pilotage Order-to-Cash. Tracking temps réel du statut des commandes." },
  { icon: <Rocket className="w-4 h-4" />, title: "Black Bee", text: "Analytics & intelligence opérationnelle. Pilotage performance et optimisation des coûts." },
];

const services = [
  {
    icon: <Target className="w-6 h-6" />,
    title: "Conseil Logistique",
    description: "Audit et stratégie logistique. Feuille de route priorisée et chiffrée.",
    features: ["Diagnostic 360°", "Stratégie & ROI", "Benchmarks", "Roadmap opérationnelle"],
    color: "from-[#00bfff] to-[#00ccff]",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Supply Chain",
    description: "Diagnostic stratégique et opérationnel. Approvisionnement inclus (coûts, flux, fournisseurs).",
    features: ["Flux & processus", "Optimisation coûts", "Gestion fournisseurs", "SLA & pilotage"],
    color: "from-[#00bfff] to-[#00ccff]",
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: "Entreposage",
    description: "Gestion des stocks et surfaces. Réingénierie des processus.",
    features: ["Stocks & inventaires", "Optimisation surfaces", "Processus entrepôt", "Qualité de service"],
    color: "from-[#00bfff] to-[#00ccff]",
  },
  {
    icon: <Truck className="w-6 h-6" />,
    title: "Distribution & Transport",
    description: "Optimisation des tournées et réseaux. Gestion de flotte.",
    features: ["Planification tournées", "Réseaux de distribution", "Gestion de flotte", "Coûts & délais"],
    color: "from-[#00bfff] to-[#00ccff]",
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Accompagnement Logistique",
    description: "Mise en œuvre, conduite du changement et coaching des équipes.",
    features: ["Plan d'actions", "Pilotage déploiement", "Formation/coaching", "Mesure des gains"],
    color: "from-[#00bfff] to-[#00ccff]",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "WMS & Solutions logicielles",
    description: "Logiciels de gestion logistique (WMS) et solutions personnalisées.",
    features: ["Implémentation WMS", "Solutions digitales (TMS, APS, SIRH)", "Intégrations", "Dashboards & KPIs", "Solutions sur mesure"],
    color: "from-[#00bfff] to-[#00ccff]",
  },
];

const valeurs = [
  { icon: <Users className="w-5 h-5" />, title: "Expertise", desc: "Une équipe de consultants chevronnés et passionnés." },
  { icon: <Rocket className="w-5 h-5" />, title: "Innovation", desc: "Des solutions digitales pour une logistique moderne." },
  { icon: <Heart className="w-5 h-5" />, title: "Accompagnement", desc: "Proximité, écoute et engagement au service de nos clients." },
  { icon: <Shield className="w-5 h-5" />, title: "Performance Durable", desc: "Des solutions rentables et respectueuses de l'environnement." },
];

// Composant d'image optimisé
const OptimizedImage = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 rounded-lg`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
      {hasError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center rounded-lg">
          <span className="text-gray-400 text-xs">Image indisponible</span>
        </div>
      )}
    </div>
  );
};

export default function Company() {
  return (
    <div className="h-screen bg-slate-50 text-slate-900 py-3 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col space-y-3">
        {/* === HEADER COMPACT (Logo + Qui sommes-nous) === */}
        <section className="flex flex-col md:flex-row gap-4 items-start bg-white border border-slate-200 rounded-xl p-4 shadow-sm shrink-0">
          {/* Colonne Gauche : Intro */}
          <div className="md:w-1/2 space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0077b6] to-[#48cae4] text-[0.7rem] text-white shadow-sm"
              >
                <Building2 className="h-3.5 w-3.5 text-white" />
                <span>Notre Entreprise</span>
              </motion.div>
              <img
                src="/almav.png"
                alt="Logo Almav"
                className="h-8 w-auto drop-shadow-sm"
              />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">Qui sommes-nous ?</h2>
              <p className="text-[0.65rem] text-slate-600 leading-tight mb-2">
                Almav est un cabinet de conseil en Supply Chain Management fondé en 2011 et basé à Casablanca.
                Nous accompagnons nos clients dans l'optimisation de leurs opérations logistiques, de la stratégie à l'exécution.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[0.7rem]">
                {[
                  { icon: <Building className="w-3 h-3 text-[#00bfff]" />, text: "Siège : Casablanca" },
                  { icon: <Globe className="w-3 h-3 text-[#00bfff]" />, text: "Maroc, Sénégal, Tunisie, France, Canada" },
                  { icon: <Users className="w-3 h-3 text-[#00bfff]" />, text: "Experts +20 ans expérience" },
                  { icon: <Award className="w-3 h-3 text-[#00bfff]" />, text: "Meilleur cabinet SC Afrique 2024" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    {item.icon}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Colonne Droite : Image illustration */}
          <div className="md:w-1/2 h-full flex items-center justify-center">
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 shadow-md group">
              <img
                src="/img/map.jpg"
                alt="Présence Almav"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                <span className="text-white text-[0.6rem] font-medium">Une présence internationale</span>
              </div>
            </div>
          </div>
        </section>

        {/* === TABS SECTION === */}
        <section className="flex-grow min-h-0">
          <Tabs defaultValue="solutions" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 bg-slate-200 border border-slate-300 p-0.5 rounded-xl mb-2 text-slate-700 shrink-0">
              <TabsTrigger value="solutions" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Solutions</TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Services</TabsTrigger>
              <TabsTrigger value="valeur" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Valeur Ajoutée</TabsTrigger>
              <TabsTrigger value="secteurs" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Secteurs</TabsTrigger>
              <TabsTrigger value="localisation" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Localisation</TabsTrigger>
            </TabsList>

            <div className="flex-grow bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto custom-scrollbar shadow-sm">
              {/* --- TAB SOLUTIONS --- */}
              <TabsContent value="solutions" className="mt-0 h-full">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-0.5">Nos Solutions</h3>
                  <p className="text-[0.65rem] text-slate-600">Explorez notre écosystème de solutions digitales.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {solutions.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[#00bfff]/30 transition-all duration-300 h-full p-3 group">
                        <CardContent className="flex flex-col items-center text-center p-0 h-full">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-12 w-auto object-contain mb-3 group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="bg-gradient-to-br from-[#00bfff] to-[#00ccff] text-white rounded-lg p-2 mb-2 group-hover:scale-110 transition-transform">
                              {item.icon}
                            </div>
                          )}
                          <h3 className="text-sm font-bold text-slate-800 mb-1">{item.title}</h3>
                          <p className="text-[0.7rem] text-slate-600 flex-grow">{item.text}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* --- TAB SERVICES --- */}
              <TabsContent value="services" className="mt-0 h-full">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-0.5">Nos Services</h3>
                  <p className="text-[0.65rem] text-slate-600">De la stratégie à l'exécution opérationnelle.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service, index) => (
                    <motion.div key={index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                      <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[#00bfff]/30 transition-all duration-300 h-full overflow-hidden group">
                        <CardContent className="p-3 flex flex-col h-full">
                          <div className="flex items-center mb-2">
                            <div className={`bg-gradient-to-r ${service.color} text-white rounded-md p-1.5 mr-2 group-hover:scale-110 transition-transform`}>
                              {service.icon}
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">{service.title}</h3>
                          </div>
                          <p className="text-slate-600 mb-3 leading-tight text-[0.7rem] flex-grow">
                            {service.description}
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {service.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center text-[0.65rem] text-slate-500">
                                <CheckCircle className="w-2.5 h-2.5 text-[#00bfff] mr-1.5 flex-shrink-0" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* --- TAB VALEUR AJOUTÉE --- */}
              <TabsContent value="valeur" className="mt-0 h-full">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-0.5">Notre Valeur Ajoutée</h3>
                  <p className="text-[0.65rem] text-slate-600">Expertise, Innovation et Proximité.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {valeurs.map((v, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[#00bfff]/30 transition-all duration-300 h-full group">
                        <CardContent className="p-4 flex flex-col items-center text-center h-full">
                          <div className="bg-gradient-to-br from-[#00bfff] to-[#00ccff] text-white rounded-lg p-2 mb-3 group-hover:rotate-12 transition-transform">
                            {v.icon}
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 mb-2">{v.title}</h3>
                          <p className="text-xs text-slate-600">{v.desc}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* --- TAB SECTEURS --- */}
              <TabsContent value="secteurs" className="mt-0 h-full">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-0.5">Nos Secteurs d'Activité</h3>
                  <p className="text-[0.65rem] text-slate-600">Une expertise adaptée à chaque industrie.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {secteurs.map((secteur, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                      <div className="relative group overflow-hidden rounded-xl shadow-lg aspect-[4/3] border border-white/10 cursor-pointer">
                        <OptimizedImage
                          src={secteur.image}
                          alt={secteur.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-center pb-4 px-2">
                          <span className="text-white font-semibold text-xs text-center leading-tight drop-shadow-md">
                            {secteur.title}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* --- TAB LOCALISATION --- */}
              <TabsContent value="localisation" className="mt-0 h-full">
                <div className="flex flex-col md:flex-row gap-6 h-full">
                  <div className="md:w-1/3 flex flex-col justify-center space-y-4">
                    <Card className="bg-white border-slate-200 shadow-sm p-4">
                      <CardContent className="p-0 flex flex-col items-center text-center">
                        <img src="/img/almavGRP.jpg" alt="ALMAV" className="w-32 h-auto rounded-lg mb-3 shadow-md" />
                        <h2 className="text-lg font-bold text-slate-800 mb-1">ALMAV Logistics</h2>
                        <p className="text-xs text-slate-500 mb-4">Siège Social & Opérations</p>
                        <div className="flex flex-col w-full gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-[#00bfff] text-[#00bfff] hover:bg-[#00bfff] hover:text-white text-xs"
                            onClick={() => window.open("https://maps.app.goo.gl/bArhKTV7sRZcFpkm8", "_blank")}
                          >
                            <MapPin className="w-3 h-3 mr-2" /> Google Maps
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-[#00bfff] text-[#00bfff] hover:bg-[#00bfff] hover:text-white text-xs"
                            onClick={() => window.open("https://www.linkedin.com/company/almav-logistics/", "_blank")}
                          >
                            <Linkedin className="w-3 h-3 mr-2" /> LinkedIn
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="md:w-2/3 rounded-xl overflow-hidden border border-white/10 shadow-lg h-[300px] md:h-auto">
                    <MapContainer
                      center={[33.496197272800785, -7.68622077592134]}
                      zoom={13}
                      scrollWheelZoom={false}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                      />
                      <Marker position={[33.496197272800785, -7.68622077592134]}>
                        <Popup>
                          <div className="text-xs">
                            <strong>Almav Logistics</strong><br />
                            Bouskoura, Casablanca
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
