// components/ParticlesBg.jsx
import Particles from "react-particles";
import { loadSlim } from "@tsparticles/slim";
import { useCallback } from "react";

export default function ParticlesBg() {
  const init = useCallback(async (engine) => { await loadSlim(engine); }, []);
  return (
    <Particles
      id="tawazoon-bg"
      init={init}
      className="absolute inset-0 -z-10"
      options={{
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        particles: {
          number: { value: 24, density: { enable: true, area: 800 } },
          color: { value: "#bcd3f3" },
          links: { enable: true, color: "#cfe0f7", opacity: 0.35, distance: 140, width: 1 },
          move: { enable: true, speed: 0.6 },
          opacity: { value: 0.25 },
          size: { value: { min: 1, max: 3 } },
        },
        detectRetina: true,
      }}
    />
  );
}
