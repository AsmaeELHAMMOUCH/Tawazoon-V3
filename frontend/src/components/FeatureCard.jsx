// components/FeatureCard.jsx
import { motion } from "framer-motion";

export default function FeatureCard({ Icon, title, desc, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: .4, delay }}
      whileHover={{ y: -4 }}
      className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#0a5aa8]/40 
                 shadow-sm hover:shadow-[0_12px_26px_rgba(2,32,71,0.08)] transition"
    >
      <div className="bg-[#0a5aa8]/10 w-12 h-12 rounded-xl grid place-items-center mb-4">
        <Icon className="w-6 h-6 text-[#0a5aa8]" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-slate-600 text-sm">{desc}</p>
      <div className="absolute inset-x-6 bottom-3 h-px bg-gradient-to-r from-transparent via-[#0a5aa8]/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
    </motion.div>
  );
}
