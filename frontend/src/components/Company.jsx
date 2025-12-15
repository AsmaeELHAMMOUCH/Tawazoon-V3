import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white py-12">
      {/* Section Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0077b6] to-[#48cae4] text-[0.75rem] text-white shadow-[0_4px_15px_rgba(0,120,210,0.5)]"
          >
            <Building2 className="h-3.5 w-3.5 text-white" />
            <span>Notre Entreprise</span>
          </motion.div>
          <img
            src="/almav.png"
            alt="Logo Almav"
            className="w-40 md:w-48 h-auto drop-shadow-[0_0_20px_rgba(0,191,255,0.7)]"
          />
        </motion.div>
      </section>

 {/* Section Présentation */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2 space-y-4">
            <h2 className="text-xl font-bold text-white">Qui sommes-nous ?</h2>
            <p className="text-sm text-slate-300">
              Almav est un cabinet de conseil en Supply Chain Management fondé en 2011 et basé à Casablanca.
              Nous accompagnons nos clients dans l'optimisation de leurs opérations logistiques, depuis la stratégie jusqu'à la mise en œuvre opérationnelle.
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              {[
                { icon: <Building className="w-4 h-4 text-[#00bfff]" />, text: "Siège social : Casablanca, Maroc" },
                { icon: <Globe className="w-4 h-4 text-[#00bfff]" />, text: "Présence : Maroc, Sénégal, Tunisie, Côte d'Ivoire, France, Canada" },
                { icon: <Users className="w-4 h-4 text-[#00bfff]" />, text: "Équipe d'experts avec 20+ ans d'expérience" },
                { icon: <Award className="w-4 h-4 text-[#00bfff]" />, text: "Meilleur cabinet Supply Chain en Afrique — 2024" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:w-1/2 rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-white/10">
            <img
              src="/img/map.jpg"
              alt="Présence Almav"
              className="w-full h-52 md:h-64 object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section Solutions */}
      {/* Section Solutions */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center mb-6"
        >
          <h2 className="text-xl font-bold text-white mb-2">
            Nos <span className="text-[#00bfff]">Solutions</span>
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm">
            Des approches sur mesure pour améliorer la performance globale de votre chaîne logistique.
          </p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { icon: <Target className="w-4 h-4" />, title: "Diagnostic & Stratégie", text: "Évaluation complète et définition d'une feuille de route logistique." },
            { icon: <BarChart3 className="w-4 h-4" />, title: "Optimisation Opérationnelle", text: "Amélioration des coûts, délais et qualité de service." },
            { icon: <Rocket className="w-4 h-4" />, title: "Transformation Digitale", text: "Mise en place de solutions digitales et outils WMS/ERP." },
            { icon: <Shield className="w-4 h-4" />, title: "Performance Durable", text: "Conception de modèles logistiques agiles et écoresponsables." },
          ].map((item, i) => (
            <motion.div key={i} variants={staggerItem}>
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-[0_5px_20px_rgba(0,191,255,0.3)] transition-all duration-300 h-full p-4">
                <CardContent className="flex flex-col items-center text-center">
                  <div className="bg-gradient-to-br from-[#00bfff] to-[#00ccff] text-white rounded-lg p-2.5 mb-3">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-300">{item.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Section Services */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              Nos <span className="text-[#00bfff]">Services</span>
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto">
              De la conception stratégique à l'exécution, Almav vous accompagne
              à chaque étape de votre transformation logistique.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                icon: <Target className="w-6 h-6" />,
                title: "Conseil Logistique",
                description:
                  "Audit et stratégie logistique. Feuille de route priorisée et chiffrée.",
                features: [
                  "Diagnostic 360°",
                  "Stratégie & ROI",
                  "Benchmarks",
                  "Roadmap opérationnelle",
                ],
                color: "from-[#00bfff] to-[#00ccff]",
              },
              {
                icon: <Settings className="w-6 h-6" />,
                title: "Supply Chain",
                description:
                  "Diagnostic stratégique et opérationnel. Approvisionnement inclus (coûts, flux, fournisseurs).",
                features: [
                  "Flux & processus",
                  "Optimisation coûts",
                  "Gestion fournisseurs",
                  "SLA & pilotage",
                ],
                color: "from-[#00bfff] to-[#00ccff]",
              },
              {
                icon: <Package className="w-6 h-6" />,
                title: "Entreposage",
                description:
                  "Gestion des stocks et surfaces. Réingénierie des processus.",
                features: [
                  "Stocks & inventaires",
                  "Optimisation surfaces",
                  "Processus entrepôt",
                  "Qualité de service",
                ],
                color: "from-[#00bfff] to-[#00ccff]",
              },
              {
                icon: <Truck className="w-6 h-6" />,
                title: "Distribution & Transport",
                description:
                  "Optimisation des tournées et réseaux. Gestion de flotte.",
                features: [
                  "Planification tournées",
                  "Réseaux de distribution",
                  "Gestion de flotte",
                  "Coûts & délais",
                ],
                color: "from-[#00bfff] to-[#00ccff]",
              },
              {
                icon: <Layers className="w-6 h-6" />,
                title: "Accompagnement Logistique",
                description:
                  "Mise en œuvre, conduite du changement et coaching des équipes.",
                features: [
                  "Plan d'actions",
                  "Pilotage déploiement",
                  "Formation/coaching",
                  "Mesure des gains",
                ],
                color: "from-[#00bfff] to-[#00ccff]",
              },
              {
                icon: <Rocket className="w-6 h-6" />,
                title: "WMS & Solutions logicielles",
                description:
                  "Logiciels de gestion logistique (WMS) et solutions personnalisées.",
                features: [
                  "Implémentation WMS",
                  "Solutions digitales (TMS, APS, SIRH)",
                  "Intégrations",
                  "Dashboards & KPIs",
                  "Solutions sur mesure",
                ],
                color: "from-[#00bfff] to-[#00ccff]",
              },
            ].map((service, index) => (
              <motion.div key={index} variants={staggerItem}>
                <Card className="group bg-white/5 border-white/10 backdrop-blur-md hover:bg-white/10 hover:shadow-[0_10px_40px_rgba(0,191,255,0.3)] transition-all duration-300 hover:-translate-y-2 overflow-hidden h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center mb-4">
                      <div
                        className={`bg-gradient-to-r ${service.color} text-white rounded-xl p-3 mr-4 w-fit group-hover:scale-110 transition-transform duration-300`}
                      >
                        {service.icon}
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {service.title}
                      </h3>
                    </div>
                    <p className="text-slate-300 mb-5 leading-relaxed text-sm flex-grow">
                      {service.description}
                    </p>
                    <div className="space-y-2 mb-4">
                      {service.features.map((feature, featureIndex) => (
                        <div
                          key={featureIndex}
                          className="flex items-center text-sm text-slate-300"
                        >
                          <CheckCircle className="w-4 h-4 text-[#00bfff] mr-2 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section Valeur Ajoutée */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              Notre <span className="text-[#00bfff]">Valeur Ajoutée</span>
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto mb-8">
              Ce qui fait la différence d'Almav : une expertise reconnue, une
              approche pragmatique et des résultats mesurables.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: <Users className="w-5 h-5" />,
                title: "Expertise",
                desc: "Une équipe de consultants chevronnés et passionnés.",
              },
              {
                icon: <Rocket className="w-5 h-5" />,
                title: "Innovation",
                desc: "Des solutions digitales pour une logistique moderne.",
              },
              {
                icon: <Heart className="w-5 h-5" />,
                title: "Accompagnement",
                desc: "Proximité, écoute et engagement au service de nos clients.",
              },
              {
                icon: <Shield className="w-5 h-5" />,
                title: "Performance Durable",
                desc: "Des solutions rentables et respectueuses de l'environnement.",
              },
            ].map((v, i) => (
              <motion.div key={i} variants={staggerItem} className="h-full">
                <Card className="bg-white/5 border-white/10 backdrop-blur-md hover:bg-white/10 hover:shadow-[0_10px_40px_rgba(0,191,255,0.3)] transition-all duration-300 h-full">
                  <CardContent className="p-6 flex flex-col items-center h-full">
                    <div className="bg-gradient-to-br from-[#00bfff] to-[#00ccff] text-white rounded-xl p-3 mb-4 w-fit">
                      {v.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {v.title}
                    </h3>
                    <p className="text-sm text-slate-300 flex-grow">{v.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section Secteurs d'activité */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              Nos <span className="text-[#00bfff]">Secteurs d'Activité</span>
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto mb-12">
              Almav intervient dans divers secteurs pour apporter une expertise
              logistique adaptée à chaque besoin.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {secteurs.map((secteur, i) => (
              <motion.div key={i} variants={staggerItem}>
                <div className="relative group overflow-hidden rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] aspect-[4/3] border border-white/10">
                  <OptimizedImage
                    src={secteur.image}
                    alt={secteur.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-90 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-6 px-4">
                    <span className="text-white font-semibold text-base w-full text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {secteur.title}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section Localisation */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <Card className="group bg-white/5 border-white/10 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_60px_rgba(0,191,255,0.3)] transition-all duration-500 overflow-hidden">
              <CardContent className="p-6 flex flex-col md:flex-row items-center md:items-stretch gap-8">
                {/* Left Side — Logo */}
                <div className="md:w-1/2 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0">
                  <img
                    src="/img/almavGRP.jpg"
                    alt="ALMAV Logistics Logo"
                    className="w-[80%] h-auto mx-auto rounded-xl mb-4 transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_25px_rgba(0,191,255,0.7)]"
                  />
                  <h2 className="text-xl font-bold text-white">
                    ALMAV Logistics
                  </h2>
                </div>
                {/* Right Side — Map + Links */}
                <div className="md:w-1/2 flex flex-col">
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <MapPin className="w-5 h-5 text-[#00bfff]" />
                    <h3 className="text-xl font-bold text-white">
                      Notre Localisation
                    </h3>
                  </div>
                  <div className="relative h-72 w-full rounded-xl overflow-hidden mb-6 shadow-[0_15px_40px_rgba(0,0,0,0.5)] border border-white/10">
                    <MapContainer
                      center={[33.496197272800785, -7.68622077592134]}
                      zoom={13}
                      scrollWheelZoom={true}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <Marker
                        position={[33.496197272800785, -7.68622077592134]}
                      >
                        <Popup>
                          <div className="text-sm text-gray-800">
                            <strong>Almav Logistics</strong>
                            <br />
                            Lot Zeina lot n°1 2 et 3
                            <br />
                            Bouskoura, Casablanca
                            <br />
                            <span className="text-xs text-gray-600">
                              33.496197, -7.686221
                            </span>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button
                      variant="outline"
                      className="border-2 border-[#00bfff] text-[#00bfff] hover:bg-[#00bfff] hover:text-white hover:scale-105 transition-all duration-300 font-semibold shadow-[0_5px_15px_rgba(0,191,255,0.3)] hover:shadow-[0_5px_20px_rgba(0,191,255,0.5)]"
                      onClick={() =>
                        window.open(
                          "https://maps.app.goo.gl/bArhKTV7sRZcFpkm8",
                          "_blank"
                        )
                      }
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Voir sur Google Maps
                    </Button>
                    <Button
                      variant="outline"
                      className="border-2 border-[#00bfff] text-[#00bfff] hover:bg-[#00bfff] hover:text-white hover:scale-105 transition-all duration-300 font-semibold shadow-[0_5px_15px_rgba(0,191,255,0.3)] hover:shadow-[0_5px_20px_rgba(0,191,255,0.5)]"
                      onClick={() =>
                        window.open(
                          "https://www.linkedin.com/company/almav-logistics/",
                          "_blank"
                        )
                      }
                    >
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn ALMAV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
