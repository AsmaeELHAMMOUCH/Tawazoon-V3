import { useEffect, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import tawazoonLogo from "@/assets/LOGO_Tawazoon_RH.png";
import logoAlmav from "@/assets/AlmavLogo.png";

/* ---------------------- STAT BUBBLE ---------------------- */
function Stat({ number, label }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        {number}
      </div>
      <div className="text-[#48cae4] text-sm">{label}</div>
    </div>
  );
}

/* ---------------------- CARROUSEL ECRANS ---------------------- */
function ScreensCarousel() {
  const slides = [
    { src: "/national.png", caption: "Vue Globale Nationale" },
    { src: "/national1.png", caption: "Simulation par région" },
    { src: "/centre.png", caption: "Pilotage Opérationnel RH" },
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const current = slides[index];

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
      {/* halo doux autour du carrousel */}
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[#00bfff]/10 blur-[100px] opacity-60" />

      {/* boîte principale du carrousel */}
      <div className="relative w-full aspect-[16/9] rounded-2xl bg-white/5 border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.src}
            src={current.src}
            alt={current.caption}
            className="absolute inset-0 w-full h-full object-cover object-center"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </AnimatePresence>

        {/* dégradé foncé bottom pour lisibilité de la légende */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00000088] via-transparent to-transparent" />

        {/* légende + bullets */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between py-3 px-4 text-white text-sm font-medium">
          <span className="truncate">{current.caption}</span>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-all ${i === index ? "bg-white" : "bg-white/40"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- PAGE LOGIN ---------------------- */
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("remember_email");
    if (saved) setUsername(saved);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login({ username, password });

      let token = data?.access_token || data?.token;
      if (!token && (data?.success === true || data?.message))
        token = "session-ok";
      if (!token) throw new Error("Token manquant dans la réponse");

      if (remember) {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("remember_email", username);
      } else {
        sessionStorage.setItem("auth_token", token);
        localStorage.removeItem("remember_email");
      }
      onLogin?.();
      navigate("/app/actuel/menu", { replace: true });
    } catch (err) {
      setError(err?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="h-[125vh] w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white overflow-hidden"
      style={{ zoom: "80%" }}
    >
      {/* Background effects - same as other sections */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
      >
        <div className="absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute -right-40 top-60 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* Main container - full height and width */}
      <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
        {/* Form section */}
        <div className="relative flex flex-col justify-center items-center w-full lg:w-1/2 h-full p-6 md:p-8 bg-black/30 backdrop-blur-sm overflow-hidden">          {/* Image de fond */}
          <img
            src="/img/back.jpg"
            alt="Background"
            className="absolute inset-0 w-full h-full  opacity-60"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          {/* Contenu du formulaire */}
          <div className="relative z-10 w-full max-w-md h-full flex flex-col justify-center">
            {/* Logo section */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="w-32 h-32 bg-white/10 rounded-lg flex items-center justify-center shadow-md mb-6 border border-white/20">
                <img
                  src={tawazoonLogo}
                  alt="Logo TAWAZOON RH"
                  className="w-24 h-24 object-contain rounded"
                />
              </div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-[#0077b6] to-[#48cae4] bg-clip-text text-transparent text-center">
                TAWAZOON RH
              </h1>
              <p className="text-[#48cae4] text-center text-sm mt-1">
                Simulation & Dimensionnement
              </p>
            </div>

            {/* Login form */}
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email field */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-white font-medium text-sm"
                  >
                    Adresse email
                  </label>
                  <input
                    id="email"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="nom@entreprise.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-[#00bfff]"
                  />
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-white font-medium text-sm"
                  >
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 pr-12 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-[#00bfff]"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPass
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      className="absolute right-2 top-2.5 text-white/70 p-2 rounded-md hover:bg-white/10"
                      onClick={() => setShowPass((s) => !s)}
                    >
                      {showPass ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me and forgot password */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 text-white/90">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded"
                    />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    className="font-medium text-[#48cae4] hover:text-white"
                    onClick={() =>
                      alert("Veuillez contacter votre administrateur.")
                    }
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-medium text-base shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-[#0077b6] to-[#48cae4] hover:shadow-[0_12px_30px_rgba(0,120,210,0.4)]"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    </span>
                  ) : (
                    "Se connecter"
                  )}
                </button>

                {error && (
                  <div
                    role="alert"
                    className="text-red-400 text-sm text-center"
                  >
                    {error}
                  </div>
                )}

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-black/20 text-white/70">
                      Ou continuer avec
                    </span>
                  </div>
                </div>

                {/* Google login */}
                <button
                  type="button"
                  className="w-full h-12 border border-white/20 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-semibold text-white"
                  onClick={() => {
                    // OAuth
                  }}
                >
                  <img
                    src="https://www.svgrepo.com/show/355037/google.svg"
                    alt=""
                    className="w-5 h-5"
                  />
                  Google
                </button>

                <p className="text-center text-sm text-white/80 mt-4">
                  Vous n'avez pas de compte?{" "}
                  <button
                    type="button"
                    className="font-medium text-[#48cae4] hover:text-white"
                    onClick={() =>
                      alert("Veuillez contacter l'administrateur.")
                    }
                  >
                    Contactez l'administrateur
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Hero section - now on the right side for desktop */}
        <div
          className="hidden lg:block lg:w-1/2 relative overflow-hidden p-8"
          style={{
            background:
              "linear-gradient(145deg, rgba(60,110,160,0.75) 0%, rgba(80,140,190,0.65) 40%, rgba(100,170,220,0.6) 100%)",
            backdropFilter: "blur(45px)",
            WebkitBackdropFilter: "blur(45px)",
            boxShadow:
              "inset 0 0 80px rgba(120,200,255,0.15), inset 0 0 120px rgba(180,230,255,0.1)",
          }}
        >
          {/* Content wrapper - centered and responsive */}
          <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 bg-white/10 rounded-lg flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/20">
                <img
                  src={tawazoonLogo}
                  alt="Tawazoon RH"
                  className="w-20 h-20 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0077b6] to-[#48cae4] bg-clip-text text-transparent leading-tight">
                  TAWAZOON RH
                </h1>
                <p className="text-[#48cae4] text-sm">
                  Simulation & Dimensionnement
                </p>
              </div>
            </div>

            {/* Main content - centered */}
            <div className="flex flex-col items-center justify-center flex-grow gap-6 text-center max-w-4xl mx-auto">
              <div className="space-y-8 text-center">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-[#5EA9DD] to-[#9EE7FF] bg-clip-text text-transparent leading-[1.1] tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                  Optimisez vos ressources humaines<br className="hidden md:block" /> avec précision
                </h2>

                <p className="text-[#BEE9FF] text-lg md:text-xl leading-relaxed max-w-3xl mx-auto font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]">
                  Simulez, analysez et dimensionnez vos effectifs<br className="hidden md:block" />
                  pour une gestion RH efficace et stratégique.
                </p>
              </div>

              {/* Carrousel - responsive width */}
              <ScreensCarousel />

              {/* Demo preview - added to match the screenshot */}
              <div className="w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 max-h-[35vh] flex items-start">
                <img
                  src="/demo-preview.png"
                  alt="Aperçu de l'application"
                  className="w-full h-auto object-cover object-top"
                />
              </div>
            </div>

            {/* Stats and footer */}
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-12">
                <Stat number="98%" label="Précision" />
                <div className="w-px h-12 bg-white/30" />
                <Stat number="24/7" label="Support" />
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={logoAlmav}
                  alt="ALMAV Logo"
                  className="w-8 h-8 object-contain opacity-90"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.4)", borderRadius: "50%" }}
                />
                <p className="text-[#48cae4] text-sm">
                  Powered by <span className="font-semibold">ALMAV GROUP</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
