import React from 'react'

export function Separator({ vertical = false, className = '' }) {
  const base = vertical ? 'w-px h-full' : 'h-px w-full'
  return <div className={[base, 'bg-slate-200', className].join(' ')} />
}

