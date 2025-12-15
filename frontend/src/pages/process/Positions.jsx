// frontend/src/pages/process/PositionsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useActivity } from "../../context/ActivityContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import SimulationForm from "../../components/SimulationForm";
import {
  ClockIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const BASE_HEURES_JOUR = 8; // <-- ajouté

export default function PositionsPage() {
  const { activityName } = useActivity();
  const pageTitle = `Effectif par position — ${
    activityName?.trim() ? activityName : "Activité postale"
  }`;

  // -------------------- state --------------------
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centres, setCentres] = useState([]);
  const [postes, setPostes] = useState([]);

  const [region, setRegion] = useState("");
  const [categorie, setCategorie] = useState("");
  const [centreId, setCentreId] = useState("");
  const [poste, setPoste] = useState("");

  const [sacs, setSacs] = useState(150);
  const [colis, setColis] = useState(80);
  const [courrier, setCourrier] = useState(500);
  const [productivite, setProductivite] = useState(85);
  const [heuresNet, setHeuresNet] = useState(7.2);

  const [tasks, setTasks] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [runId, setRunId] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const nf = (v, d = 2) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(
      Number(v || 0)
    );

  // Activités (si utilisé ailleurs)
  const [activites, setActivites] = useState([]);
  const [activite, setActivite] = useState("");
  // calcule heures net dès que la productivité change
  useEffect(() => {
    const hn = Number.isFinite(productivite)
      ? Number((BASE_HEURES_JOUR * (productivite / 100)).toFixed(2))
      : 0;
    setHeuresNet(hn);
  }, [productivite]);

  useEffect(() => {
    const fetchActivites = async () => {
      try {
        const res = await fetch(`${API_BASE}/process/filters/activites`);
        if (res.ok) {
          const data = await res.json();
          setActivites(data);
          if (data.length > 0 && !activite) setActivite(data[0].nom);
        }
      } catch {}
    };
    fetchActivites();
  }, []);

  // -------------------- filters loading --------------------
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/process/filters/regions`);
        if (r.ok) setRegions(await r.json());
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!region) {
          setCategories([]);
          return;
        }
        const r = await fetch(
          `${API_BASE}/process/filters/categories?region=${encodeURIComponent(
            region
          )}`
        );
        if (r.ok) setCategories(await r.json());
      } catch {}
    })();
  }, [region]);

  useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams();
        if (region) sp.set("region", region);
        if (categorie) sp.set("categorie", categorie);
        const r = await fetch(
          `${API_BASE}/process/filters/centres?${sp.toString()}`
        );
        if (!r.ok) return;
        const data = await r.json();
        setCentres(data);
        if (!centreId && Array.isArray(data) && data.length > 0)
          setCentreId(String(data[0].id));
      } catch {}
    })();
  }, [region, categorie]);

  useEffect(() => {
    (async () => {
      try {
        if (!centreId) {
          setPostes([]);
          setPoste("");
          return;
        }
        const qs = new URLSearchParams({
          centre_id: String(centreId),
        }).toString();
        let resp = await fetch(`${API_BASE}/process/filters/postes?${qs}`);
        let data = resp.ok ? await resp.json() : [];
        if (!resp.ok || !Array.isArray(data) || data.length === 0) {
          const r2 = await fetch(
            `${API_BASE}/process/filters/postes_safe?${qs}`
          );
          data = r2.ok ? await r2.json() : [];
        }
        const arr = Array.isArray(data) ? data : [];
        setPostes(arr);
        if (!poste && arr.length > 0) setPoste(String(arr[0].code));
      } catch {
        setPostes([]);
      }
    })();
  }, [centreId]);

  // -------------------- data loading --------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        if (!poste) {
          setTasks([]);
          setRows([]);
          return;
        }

        const baseParams = {
          poste_id: String(poste),
          sacs_jour: String(sacs || 0),
          colis_jour: String(colis || 0),
          courrier_jour: String(courrier || 0),
          heures_net: String(heuresNet || 8),
        };

        // tasks
        const r1 = await fetch(
          `${API_BASE}/process/current/tasks?${new URLSearchParams({
            ...baseParams,
            include_phase: "true",
          })}`
        );
        if (!r1.ok) throw new Error(await r1.text());
        const t = await r1.json();
        if (!cancelled) setTasks(Array.isArray(t) ? t : []);

        // totals (robuste à objet ou tableau)
        const r2 = await fetch(
          `${API_BASE}/process/current/positions?${new URLSearchParams(
            baseParams
          )}`
        );
        if (!r2.ok) throw new Error(await r2.text());
        const agg = await r2.json();
        const row = Array.isArray(agg) ? agg[0] || {} : agg || {};
        if (!cancelled) {
          setRows([
            {
              etp_actuel: 0,
              etp_calcule: row.etp_calcule || 0,
              charge_heures: row.charge_heures || 0,
            },
          ]);
        }
      } catch {
        if (!cancelled)
          setError("Le chargement a échoué. Réessayez ou ajustez les filtres.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    poste,
    sacs,
    colis,
    courrier,
    heuresNet,
    productivite,
    centreId,
    region,
    categorie,
    runId,
  ]);

  // -------------------- derived --------------------
  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          etp_actuel: a.etp_actuel + Number(r.etp_actuel || 0),
          etp_calcule: a.etp_calcule + Number(r.etp_calcule || 0),
          charge_heures: a.charge_heures + Number(r.charge_heures || 0),
        }),
        { etp_actuel: 0, etp_calcule: 0, charge_heures: 0 }
      ),
    [rows]
  );

  // -------------------- UI --------------------
  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-4 lg:px-6 space-y-3">
      {/* HEADER */}
      <header className="space-y-3">
        <h1 className="text-2xl md:text-[26px] font-bold tracking-tight text-[#0a5aa8]">
          {pageTitle}
        </h1>

        {/* Stat cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={UserGroupIcon}
            title="ETP calculé"
            value={nf(totals.etp_calcule, 2)}
            loading={loading}
             accent="from-sky-400 to-blue-400"  
          />
          <StatCard
  icon={UserGroupIcon}
  title="ETP calculé"
  value={nf(totals.etp_calcule, 2)}
  loading={loading}
  accent="from-gray-500 to-gray-400"   // ✅ gris à la place du mauve
/>
          <StatCard
            icon={ArrowTrendingUpIcon}
            title="Productivité"
            value={`${nf(productivite, 0)} %`}
            subtle
            loading={loading}
            accent="from-[#3A5BA0] to-[#5F85B0]"
          />
         <StatCard
  icon={ClockIcon}
  title="Heures net/jour"
  value={nf(heuresNet, 2)}
  subtle
  loading={loading}
    accent="from-[#C1121F] to-[#E63946]"     // ✅ rouge à la place du orange
/>
        </section>
      </header>

      {/* FORM */}
      <Card>
        <div className="pt-4">
          <SimulationForm
            withCard={false}
            regions={regions}
            categories={categories}
            centres={centres}
            postes={postes}
            values={{
              region,
              categorie,
              centreId,
              poste,
              sacs,
              colis,
              courrier,
              productivite,
              heuresNet,
            }}
            onChange={(nv) => {
              if (nv.region !== undefined && nv.region !== region) {
                setRegion(nv.region);
                setCategorie("");
                setCentreId("");
                setPoste("");
              }
              if (nv.categorie !== undefined && nv.categorie !== categorie) {
                setCategorie(nv.categorie);
                setCentreId("");
                setPoste("");
              }
              if (nv.centreId !== undefined && nv.centreId !== centreId) {
                setCentreId(nv.centreId);
                setPoste("");
              }
              if (nv.poste !== undefined) setPoste(nv.poste);
              if (nv.sacs !== undefined) setSacs(nv.sacs);
              if (nv.colis !== undefined) setColis(nv.colis);
              if (nv.courrier !== undefined) setCourrier(nv.courrier);
              if (nv.productivite !== undefined)
                setProductivite(nv.productivite);
              //if (nv.heuresNet !== undefined) setHeuresNet(nv.heuresNet);
            }}
            onLaunch={() => setRunId((x) => x + 1)}
            onToggleChart={() => setShowChart((v) => !v)}
            onToggleLines={() => setShowLineNumbers((v) => !v)}
            showChart={showChart}
            showLineNumbers={showLineNumbers}
            loading={loading}
          />
        </div>

        {!!error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <ExclamationTriangleIcon className="w-5 h-5 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}
      </Card>

      {/* CHART */}
      {showChart && (
        <Card title="Heures par tâche (Top 10)" className="overflow-hidden">
          <ChartTasks
            maxLabel={22}
            data={[
              ...tasks.map((t, i) => ({
                label: t.nom || `T${i + 1}`,
                value: typeof t.heures === "number" ? t.heures : 0,
              })),
            ]
              .sort((a, b) => b.value - a.value)
              .slice(0, 10)}
          />
        </Card>
      )}

      {/* TABLES */}
      <section className="grid md:grid-cols-2 gap-6">
        <DataCard title="Référentiel des tâches (centre/poste)">
          <TasksTable
            tasks={tasks}
            loading={loading}
            showLineNumbers={showLineNumbers}
            nf={nf}
            emptyLabel="Aucune tâche à afficher."
          />
        </DataCard>

        <DataCard
          title="Résultats de simulation"
          footer={
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total heures</span>
                <b className="text-slate-900">
                  {nf(totals.charge_heures, 2)} h
                </b>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">ETP calculé</span>
                <b className="text-slate-900">{nf(totals.etp_calcule, 2)}</b>
              </div>
            </div>
          }
        >
          <ResultsTable
            tasks={tasks}
            loading={loading}
            showLineNumbers={showLineNumbers}
            nf={nf}
            emptyLabel="Aucun résultat à afficher."
          />
        </DataCard>
      </section>

      {/* LOADING TOAST */}
      {loading && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute bottom-6 right-6 px-3 py-2 rounded-xl bg-white/90 shadow-lg border text-sm text-slate-700">
            Calcul en cours...
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Small UI atoms ---------- */
function StatCard({
  title,
  value,
  icon: Icon,
  subtle = false,
  loading = false,
  accent = "from-blue-600 to-sky-500",
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent}`}
      />
      {Icon && (
        <div className="absolute right-3 top-3 opacity-20">
          <Icon className="h-6 w-6 text-[#0a5aa8]" />
        </div>
      )}
      <div className="text-[13px] leading-tight text-slate-600 font-medium">
        {title}
      </div>
      {loading ? (
        <div className="mt-2">
          <span className="inline-block h-4 w-24 rounded bg-slate-200 animate-pulse" />
        </div>
      ) : (
        <div
          className={`mt-1 font-extrabold ${
            subtle ? "text-slate-900" : "text-[#0a5aa8]"
          } text-[18px]`}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function DataCard({ title, children, footer, className }) {
  return (
    <Card className={["overflow-hidden", className || ""].join(" ")}>
      <div className="px-4 py-3 font-semibold text-slate-800">{title}</div>
      {children}
      {footer && <div className="px-4 py-3 border-t bg-slate-50">{footer}</div>}
    </Card>
  );
}

function Th({ children, center }) {
  return (
    <th
      className={[
        "px-3 py-2 text-xs font-semibold border-r border-white/10",
        "bg-[#0a5aa8] text-white",
        center ? "text-center" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
function Td({ children, center, className }) {
  return (
    <td
      className={[
        "px-3 py-2 text-[13px] leading-snug border-r border-slate-200",
        center ? "text-center" : "",
        className || "",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

/* ---------- Tables ---------- */
function TasksTable({ tasks, loading, showLineNumbers, nf, emptyLabel }) {
  return (
    <div className="overflow-auto max-h-[540px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 shadow-sm shadow-[#0a5aa8]/10">
          <tr>
            {showLineNumbers && <Th>#</Th>}
            <Th>Tâche</Th>
            <Th center>Phase</Th>
            <Th center>Unité</Th>
            <Th center>Moyenne (min)</Th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr
                key={"sk1" + i}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                {showLineNumbers && (
                  <Td>
                    <Skeleton w="w-6" />
                  </Td>
                )}
                <Td>
                  <Skeleton w="w-40" />
                </Td>
                <Td center>
                  <Skeleton w="w-16" />
                </Td>
                <Td center>
                  <Skeleton w="w-12" />
                </Td>
                <Td center>
                  <Skeleton w="w-10" />
                </Td>
              </tr>
            ))}
          {!loading &&
            tasks.map((t, i) => (
              <tr
                key={i}
                className={[
                  "transition-colors",
                  i % 2 === 0 ? "bg-white" : "bg-slate-50",
                  "hover:bg-blue-50/40",
                ].join(" ")}
              >
                {showLineNumbers && <Td>{i + 1}</Td>}
                <Td>{t.nom}</Td>
                <Td center>{t.phase || "-"}</Td>
                <Td center>{t.unite}</Td>
                <Td center>{nf(t.moyenne_min)}</Td>
              </tr>
            ))}
          {!loading && tasks.length === 0 && (
            <tr>
              <Td colSpan={showLineNumbers ? 5 : 4} className="text-slate-500">
                {emptyLabel}
              </Td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ResultsTable({ tasks, loading, showLineNumbers, nf, emptyLabel }) {
  return (
    <div className="overflow-auto max-h-[540px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 shadow-sm shadow-[#0a5aa8]/10">
          <tr>
            {showLineNumbers && <Th>#</Th>}
            <Th>Tâche</Th>
            <Th center>Nombre d'unités</Th>
            <Th center>Heures</Th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr
                key={"sk2" + i}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                {showLineNumbers && (
                  <Td>
                    <Skeleton w="w-6" />
                  </Td>
                )}
                <Td>
                  <Skeleton w="w-40" />
                </Td>
                <Td center>
                  <Skeleton w="w-12" />
                </Td>
                <Td center>
                  <Skeleton w="w-10" />
                </Td>
              </tr>
            ))}
          {!loading &&
            tasks.map((t, i) => (
              <tr
                key={i}
                className={[
                  "transition-colors",
                  i % 2 === 0 ? "bg-white" : "bg-slate-50",
                  "hover:bg-blue-50/40",
                ].join(" ")}
              >
                {showLineNumbers && <Td>{i + 1}</Td>}
                <Td>{t.nom}</Td>
                <Td center>{t.nb_unites != null ? nf(t.nb_unites, 0) : "-"}</Td>
                <Td center>
                  <b className="text-[#0a5aa8]">
                    {typeof t.heures === "number" ? nf(t.heures, 2) : "-"}
                  </b>
                </Td>
              </tr>
            ))}
          {!loading && tasks.length === 0 && (
            <tr>
              <Td colSpan={showLineNumbers ? 4 : 3} className="text-slate-500">
                {emptyLabel}
              </Td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Skeleton({ w = "w-24" }) {
  return (
    <span
      className={`inline-block ${w} h-3 bg-slate-200 animate-pulse rounded`}
    />
  );
}

/* ---------- Chart (Recharts fallback) ---------- */
function ChartTasks({ data, maxLabel = 22 }) {
  const [rc, setRc] = useState(null);
  useEffect(() => {
    let mounted = true;
    import("recharts")
      .then((mod) => mounted && setRc(mod))
      .catch(() => mounted && setRc(null));
    return () => {
      mounted = false;
    };
  }, []);

  const shorten = (s) => {
    if (!s) return "";
    const str = String(s);
    return str.length > maxLabel ? str.slice(0, maxLabel - 1) + "…" : str;
  };
  const view = data.map((d) => ({ ...d, label: shorten(d.label) }));

  if (!rc) return <MiniBarChart data={view} />;
  const {
    ResponsiveContainer,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Bar,
  } = rc;

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <BarChart
          data={view}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} h`, "Heures"]} />
          <Bar dataKey="value" fill="#0a5aa8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(
    1,
    ...data.map((d) => (Number.isFinite(d.value) ? d.value : 0))
  );
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[520px] space-y-2">
        {data.map((d, i) => {
          const v = Math.max(0, +d.value || 0);
          const widthPct = Math.min(100, (v / max) * 100);
          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-64 truncate text-[13px] text-slate-700"
                title={d.label}
              >
                {d.label}
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-[linear-gradient(90deg,#0a5aa8,#38bdf8)] transition-all"
                  style={{ width: widthPct + "%" }}
                />
              </div>
              <div className="w-16 text-right text-[13px] font-semibold text-slate-800">
                {v.toFixed(2)} h
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="text-slate-500 text-sm">
            Aucune donnée à afficher.
          </div>
        )}
      </div>
    </div>
  );
}
