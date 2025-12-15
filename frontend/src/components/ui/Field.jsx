export default function Field({ label, hint, children, className = '' }) {
  const id = typeof label === 'string' ? label.toLowerCase().replace(/\s+/g,'-') : undefined
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="block text-[13px] font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        {children}
      </div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  )}

