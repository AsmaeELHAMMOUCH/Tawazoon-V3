import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function CurrentGlobal() {
  const [regions, setRegions] = useState([])
  const [centres, setCentres] = useState([])
  const [postes, setPostes] = useState([])

  const [region, setRegion] = useState('')
  const [centreId, setCentreId] = useState('')
  const [posteId, setPosteId] = useState('')

  const [sacs, setSacs] = useState(50)
  const [dossiersMois, setDossiersMois] = useState(6500)
  const [productivite, setProductivite] = useState(100)

  const dossiersJour = dossiersMois ? (Number(dossiersMois) / 22) : 0
  const heuresNet = productivite ? (8 * Number(productivite) / 100) : 0

  useEffect(() => {
    (async () => {
      try { const data = await api.regions(); setRegions(data) } catch { }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        if (!region) { setCentres([]); return }
        const data = await api.centres(region)
        setCentres(data)
      } catch { }
    })()
  }, [region])

  useEffect(() => {
    (async () => {
      try {
        if (!centreId) { setPostes([]); return }
        const data = await api.postes(centreId)
        setPostes(data)
      } catch { }
    })()
  }, [centreId])

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Effectif Global (Processus actuel)</h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Paramètres de Simulation</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Field label="Région">
              <select className="input" value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">Toutes</option>
                {regions.map((r, i) => (<option key={i} value={r}>{r}</option>))}
              </select>
            </Field>
            <Field label="Centre">
              <select className="input" value={centreId} onChange={e => setCentreId(e.target.value)}>
                <option value="">Tous</option>
                {centres.map(c => (<option key={c.id} value={c.id}>{c.nom}</option>))}
              </select>
            </Field>
            <Field label="Poste">
              <select className="input" value={posteId} onChange={e => setPosteId(e.target.value)}>
                <option value="">Tous</option>
                {postes.map(p => (<option key={p.code} value={p.code}>{p.libelle}</option>))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Field label="Sacs/Jour"><input className="input" type="number" value={sacs} onChange={e => setSacs(Number(e.target.value) || 0)} /></Field>
            <Field label="Dossiers/Mois"><input className="input" type="number" value={dossiersMois} onChange={e => setDossiersMois(Number(e.target.value) || 0)} /></Field>
            <Field label="Productivité (%)"><input className="input" type="number" value={productivite} onChange={e => setProductivite(Number(e.target.value) || 0)} /></Field>
            <Field label="Dossiers/Jour"><input className="input" readOnly value={dossiersJour.toFixed(2)} /></Field>
            <Field label="Heures Net/Jour"><input className="input" readOnly value={heuresNet.toFixed(2)} /></Field>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => alert('À brancher: /process/global/results')}>Lancer Simulation</button>
            <button className="btn-outline">Afficher Graphe</button>
            <button className="btn-outline">Masquer No. Lignes</button>
          </div>
        </div>

        <div className="text-slate-500">Page en préparation: listes reliées DB OK. Je peux brancher le calcul global dès que l’endpoint est prêt.</div>
      </div>
    </>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-2">{label}</span>
      {children}
      <style>{`
        .input{width:100%;height:2rem;padding:0 .6rem;border:1px solid #cbd5e1;border-radius:.375rem}
        .input:focus{outline:none;box-shadow:0 0 0 2px #005EA833;border-color:transparent}
        .btn-primary{background:#005EA8;color:#fff;padding:.5rem 1rem;border-radius:.5rem}
        .btn-primary:hover{background:#004a87}
        .btn-outline{border:1px solid #0074CC;color:#0074CC;padding:.5rem 1rem;border-radius:.5rem}
        .btn-outline:hover{background:#0074CC;color:#fff}
      `}</style>
    </label>
  )
}


