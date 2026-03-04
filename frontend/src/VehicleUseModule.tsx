import { useState, useEffect, useRef } from "react";
import Globe from "react-globe.gl";

const API = "http://localhost:8000";
const POPULATION_GIPUZKOA = 729810;

// ── UI-only mode metadata (labels, icons, colors) — formulas live in Python ──
const MODES_UI = {
    car_gasoline: { label: "Car — Gasoline", icon: "🚗", group: "road", color: "#f97316" },
    car_diesel: { label: "Car — Diesel", icon: "🚗", group: "road", color: "#e8a838" },
    car_bev: { label: "Car — BEV", icon: "⚡", group: "road", color: "#4ade80" },
    car_phev: { label: "Car — PHEV", icon: "🔋", group: "road", color: "#a3e635" },
    motorcycle: { label: "Motorcycle", icon: "🏍", group: "road", color: "#fb923c" },
    bus_diesel: { label: "Bus — Diesel", icon: "🚌", group: "transit", color: "#3a8fc7" },
    bus_bev: { label: "Bus — Electric", icon: "🚌", group: "transit", color: "#38bdf8" },
    train: { label: "Train / Metro", icon: "🚆", group: "transit", color: "#a78bfa" },
    freight_hgv: { label: "Freight HGV", icon: "🚛", group: "freight", color: "#6b7280" },
    freight_lgv: { label: "Freight LGV", icon: "🚐", group: "freight", color: "#9ca3af" },
};

// ── Default VKT and degradation — displayed in sliders, sent to Python ────────
const DEFAULT_VKT = {
    car_gasoline: 2800, car_diesel: 2100, car_bev: 140, car_phev: 80,
    motorcycle: 180, bus_diesel: 52, bus_bev: 6, train: 90,
    freight_hgv: 380, freight_lgv: 210,
};
const DEFAULT_DEGRAD = {
    car_gasoline: 8, car_diesel: 7, car_bev: 3, car_phev: 4,
    motorcycle: 6, bus_diesel: 10, bus_bev: 3, train: 2,
    freight_hgv: 12, freight_lgv: 9,
};

const BENCHMARKS = [
    { label: "Net Zero 1.5°C", value: 0.3, color: "#4ade80" },
    { label: "Paris 2°C target", value: 0.7, color: "#a3e635" },
    { label: "EU average 2023", value: 1.8, color: "#f97316" },
    { label: "Spain 2023", value: 1.6, color: "#facc15" },
];

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(val, ms) {
    const [d, setD] = useState(val);
    useEffect(() => {
        const t = setTimeout(() => setD(val), ms);
        return () => clearTimeout(t);
    }, [val, ms]);
    return d;
}

// ── Locations — add more here to expand to new regions ───────────────────────
const LOCATIONS = [
    { id: "gipuzkoa", name: "Gipuzkoa", label: "GIPUZKOA, BASQUE COUNTRY", lat: 43.18, lng: -2.47, color: "#f5c842", altitude: 0.06 },
    // { id: "barcelona", name: "Barcelona", label: "BARCELONA, CATALONIA",   lat: 41.38, lng:  2.18, color: "#38bdf8", altitude: 0.06 },
    // { id: "oslo",      name: "Oslo",      label: "OSLO, NORWAY",           lat: 59.91, lng: 10.75, color: "#4ade80", altitude: 0.06 },
];

// ══════════════════════════════════════════════════════════════════════════════
// GLOBE COMPONENT — react-globe.gl
// ══════════════════════════════════════════════════════════════════════════════
function GlobeIntro({ onArrive }) {
    const globeEl = useRef(null);
    const [phase, setPhase] = useState("idle");   // idle | flying | fade
    const [fadeOut, setFadeOut] = useState(false);
    const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

    // Responsive resize
    useEffect(() => {
        const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // Initial camera position — overview of Europe
    useEffect(() => {
        if (!globeEl.current) return;
        globeEl.current.pointOfView({ lat: 45, lng: 10, altitude: 2.2 }, 0);
    }, []);

    function flyTo(loc) {
        if (!globeEl.current || phase !== "idle") return;
        setPhase("flying");
        // Zoom into the location over 2.5s
        globeEl.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: 0.35 }, 2500);
        // After zoom completes → fade out → show module
        setTimeout(() => {
            setPhase("fade");
            setFadeOut(true);
            setTimeout(onArrive, 700);
        }, 2800);
    }

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh", background: "#020810", overflow: "hidden" }}>

            <Globe
                ref={globeEl}
                width={size.w}
                height={size.h}
                backgroundColor="#020810"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                atmosphereColor="#1a6fad"
                atmosphereAltitude={0.18}
                showGraticules={true}
                // ── Location markers ──────────────────────────────────────────────────
                pointsData={LOCATIONS}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointAltitude="altitude"
                pointRadius={0.5}
                pointResolution={12}
                pointLabel={d => `
          <div style="font-family:'IBM Plex Mono',monospace;background:rgba(10,15,25,0.92);border:1px solid ${d.color};border-radius:4px;padding:6px 12px;font-size:11px;color:${d.color};letter-spacing:.12em">
            ◎ ${d.label}
          </div>
        `}
                // ── Pulsing rings ─────────────────────────────────────────────────────
                ringsData={LOCATIONS}
                ringLat="lat"
                ringLng="lng"
                ringColor={() => "#f5c842"}
                ringMaxRadius={3}
                ringPropagationSpeed={1.5}
                ringRepeatPeriod={900}
            />

            {/* Fade overlay */}
            <div style={{ position: "absolute", inset: 0, background: "#020810", opacity: fadeOut ? 1 : 0, transition: "opacity 0.7s ease", pointerEvents: "none" }} />

            {/* Header */}
            <div style={{ position: "absolute", top: 24, left: 32, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#58a6ff", boxShadow: "0 0 10px #58a6ff" }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".2em", color: "#484f58" }}>MOBILITY CARBON MODEL</span>
                <span style={{ color: "#30363d" }}>›</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".2em", color: "#c9d1d9" }}>VEHICLE USE MODULE</span>
            </div>

            {/* Location selector buttons */}
            <div style={{
                position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                opacity: phase === "idle" ? 1 : 0, transition: "opacity 0.4s ease",
                pointerEvents: phase === "idle" ? "auto" : "none",
            }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".2em", color: "#484f58" }}>
                    SELECT REGION TO ANALYSE
                </div>

                {/* ── Add more location buttons here ── */}
                {LOCATIONS.map(loc => (
                    <button key={loc.id}
                        onClick={() => flyTo(loc)}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = loc.color; e.currentTarget.style.color = loc.color; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#30363d"; e.currentTarget.style.color = "#8b949e"; }}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", background: "rgba(10,15,25,0.85)", border: "1px solid #30363d", borderRadius: 4, color: "#8b949e", padding: "10px 28px", fontSize: 12, letterSpacing: ".15em", cursor: "pointer", transition: "all .2s", backdropFilter: "blur(8px)", minWidth: 280, textAlign: "center" }}>
                        ◎ {loc.label}
                    </button>
                ))}
                {/* Future regions — uncomment in LOCATIONS array above to activate:   */}
                {/* ◎ BARCELONA, CATALONIA  |  ◎ OSLO, NORWAY  |  ◎ LONDON, UK       */}

                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#30363d", letterSpacing: ".1em" }}>
                    MORE REGIONS COMING SOON
                </div>
            </div>

            {/* Flying status */}
            {phase === "flying" && (
                <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".2em", color: "#f5c842" }}>
                    ↓ FLYING TO GIPUZKOA…
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// VEHICLE MODULE UI — all calculations in Python backend
// ══════════════════════════════════════════════════════════════════════════════
function VehicleModuleUI() {
    const [activeTab, setActiveTab] = useState("demand");
    const [targetYear, setTargetYear] = useState(2030);
    const [growthRate, setGrowthRate] = useState(1.2);
    const [vkt, setVkt] = useState(DEFAULT_VKT);
    const [degrad, setDegrad] = useState(DEFAULT_DEGRAD);

    // ── API state ─────────────────────────────────────────────────────────────
    const [results, setResults] = useState([]);
    const [totalEmissions, setTotal] = useState(0);
    const [perCapita, setPerCapita] = useState(0);
    const [growthFactor, setGrowthFactor] = useState(1);
    const [calcLoading, setCalcLoading] = useState(false);
    const [apiOnline, setApiOnline] = useState(null);
    const [gridScenarios, setGridScenarios] = useState({});
    const [yearGridEF, setYearGridEF] = useState(null);
    const [backendDefaults, setBackendDefaults] = useState(null);

    // ── Load saved energy scenarios list ─────────────────────────────────────
    useEffect(() => {
        fetch(`${API}/api/energy/scenarios`)
            .then(r => r.json())
            .then(list => {
                const map = {};
                list.forEach(s => { map[s.year] = s; });
                setGridScenarios(map);
                setApiOnline(true);
            })
            .catch(() => setApiOnline(false));
    }, []);

    // ── Load grid_ef for target year from DB ──────────────────────────────────
    useEffect(() => {
        fetch(`${API}/api/energy/scenarios/${targetYear}`)
            .then(r => r.json())
            .then(d => setYearGridEF(d.found ? d.grid_ef : null))
            .catch(() => setYearGridEF(null));
    }, [targetYear, gridScenarios]);

    // ── Load backend defaults (Python model parameters) ───────────────────────
    useEffect(() => {
        fetch(`${API}/api/vehicle-use/defaults`)
            .then(r => r.json())
            .then(d => setBackendDefaults(d))
            .catch(() => { });
    }, []);

    // ── Debounce inputs before sending to backend ─────────────────────────────
    const dVkt = useDebounce(vkt, 400);
    const dDegrad = useDebounce(degrad, 400);
    const dGrowth = useDebounce(growthRate, 400);

    // ── Call Python backend for ALL calculations ──────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setCalcLoading(true);

        const payload = {
            modes: Object.fromEntries(
                Object.keys(DEFAULT_VKT).map(key => [
                    key,
                    { vkt_base: dVkt[key] ?? 0, degradation_pct: dDegrad[key] ?? 0 }
                ])
            ),
            growth_rate_pct: dGrowth,
            base_year: 2023,
            target_year: targetYear,
            population: POPULATION_GIPUZKOA,
            // grid_ef NOT sent — backend reads it from DB automatically
        };

        fetch(`${API}/api/vehicle-use/calculate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(data => {
                if (cancelled) return;
                setResults(data.results);
                setTotal(data.total_emissions_kt);
                setPerCapita(data.per_capita_t);
                setGrowthFactor(data.growth_factor);
                setApiOnline(true);
            })
            .catch(() => { if (!cancelled) setApiOnline(false); })
            .finally(() => { if (!cancelled) setCalcLoading(false); });

        return () => { cancelled = true; };
    }, [dVkt, dDegrad, dGrowth, targetYear]);

    const savedYearsList = Object.keys(gridScenarios).map(Number).sort();
    const maxKt = results.length > 0 ? Math.max(...results.map(r => r.emissions_kt)) : 1;
    const perCapitaColor = perCapita < 0.3 ? "#4ade80" : perCapita < 0.7 ? "#a3e635" : perCapita < 1.8 ? "#facc15" : "#ef4444";

    const css = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin:0; padding:0; }
    ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#0d1117} ::-webkit-scrollbar-thumb{background:#30363d}
    input[type=range]{-webkit-appearance:none;width:100%;height:3px;border-radius:2px;outline:none;cursor:pointer;}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;border:2px solid #0d1117;cursor:pointer;transition:transform .15s}
    input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.3)}
    .tab{background:none;border:none;cursor:pointer;padding:10px 18px;font-family:inherit;font-size:11px;letter-spacing:.1em;color:#484f58;border-bottom:2px solid transparent;transition:all .2s}
    .tab:hover{color:#38bdf8} .tab.on{color:#38bdf8;border-bottom-color:#38bdf8}
    .card{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:14px}
    .lbl{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#484f58;margin-bottom:8px}
    @keyframes fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .fadein{animation:fadein .5s ease forwards}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}} .pulse{animation:pulse 1.5s ease-in-out infinite}
  `;

    return (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#0d1117", color: "#c9d1d9", minHeight: "100vh" }} className="fadein">
            <style>{css}</style>

            {/* ── Header ── */}
            <div style={{ borderBottom: "1px solid #21262d", padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#161b22" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8aa" }} />
                    <span style={{ fontSize: 10, letterSpacing: ".15em", color: "#484f58" }}>MOBILITY CARBON MODEL</span>
                    <span style={{ color: "#30363d" }}>›</span>
                    <span style={{ fontSize: 10, letterSpacing: ".15em" }}>VEHICLE USE MODULE</span>
                    <span style={{ color: "#30363d" }}>›</span>
                    <span style={{ fontSize: 10, letterSpacing: ".15em", color: "#f5c842" }}>GIPUZKOA</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* API / Python status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: apiOnline ? "#4ade80" : "#ef4444", boxShadow: apiOnline ? "0 0 5px #4ade80" : "none" }} />
                        <span style={{ fontSize: 9, color: apiOnline ? "#4ade80" : "#ef4444", letterSpacing: ".1em" }}>
                            {apiOnline ? `🐍 PYTHON API ${calcLoading ? "↻" : "✓"}` : "API OFFLINE"}
                        </span>
                    </div>
                    <span style={{ fontSize: 10, color: "#484f58" }}>TARGET YEAR</span>
                    <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))}
                        style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", padding: "4px 8px", borderRadius: 4, fontFamily: "inherit", fontSize: 11 }}>
                        {[2025, 2030, 2035, 2040, 2045, 2050].map(y => (
                            <option key={y} value={y}>{y} {gridScenarios[y] ? "⚡" : ""}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Energy Module sync banner ── */}
            <div style={{ padding: "8px 22px", background: yearGridEF ? "#0d1f12" : "#1a1a0a", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", gap: 12 }}>
                {yearGridEF ? (
                    <>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
                        <span style={{ fontSize: 10, letterSpacing: ".12em", color: "#4ade80" }}>← ENERGY MODULE {targetYear}</span>
                        <span style={{ fontSize: 11, color: "#484f58" }}>Grid EF:</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#f5c842" }}>{yearGridEF.toFixed(1)}</span>
                        <span style={{ fontSize: 10, color: "#484f58" }}>gCO₂/kWh — read from DB by Python backend → applied to BEV / electric modes</span>
                    </>
                ) : (
                    <>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f97316" }} />
                        <span style={{ fontSize: 10, color: "#f97316" }}>NO SAVED GRID FOR {targetYear}</span>
                        <span style={{ fontSize: 10, color: "#484f58" }}>
                            {savedYearsList.length > 0
                                ? `Saved years: ${savedYearsList.join(", ")} — Python using fallback 120 gCO₂/kWh`
                                : "Go to Energy Module → SAVE to sync grid intensity"}
                        </span>
                    </>
                )}
            </div>

            {/* ── KPI strip ── */}
            <div style={{ borderBottom: "1px solid #21262d", padding: "12px 22px", display: "flex", gap: 40 }}>
                <div>
                    <div style={{ fontSize: 9, color: "#484f58", letterSpacing: ".12em", marginBottom: 2 }}>TOTAL EXHAUST EMISSIONS</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#38bdf8" }}>{totalEmissions.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: "#484f58" }}>kt CO₂ / year</div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: "#484f58", letterSpacing: ".12em", marginBottom: 2 }}>PER CAPITA</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: perCapitaColor }}>{perCapita.toFixed(2)}</div>
                    <div style={{ fontSize: 9, color: "#484f58" }}>t CO₂ / hab / year</div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: "#484f58", letterSpacing: ".12em", marginBottom: 2 }}>GROWTH FACTOR 2023→{targetYear}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#facc15" }}>×{growthFactor.toFixed(3)}</div>
                    <div style={{ fontSize: 9, color: "#484f58" }}>{growthRate > 0 ? "+" : ""}{growthRate}% / year</div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: "#484f58", letterSpacing: ".12em", marginBottom: 2 }}>GRID EF (from DB)</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#f5c842" }}>{(yearGridEF ?? 120).toFixed(0)}</div>
                    <div style={{ fontSize: 9, color: "#484f58" }}>gCO₂ / kWh</div>
                </div>
                {calcLoading && (
                    <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
                        <span style={{ fontSize: 10, color: "#484f58" }} className="pulse">🐍 Python calculating…</span>
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <div style={{ borderBottom: "1px solid #21262d", padding: "0 22px", display: "flex" }}>
                {[["demand", "Travel Demand"], ["fleet", "Fleet & Degradation"], ["results", "Exhaust Emissions"], ["benchmarks", "Benchmarks"], ["model", "Python Model"]].map(([id, lbl]) => (
                    <button key={id} className={`tab${activeTab === id ? " on" : ""}`} onClick={() => setActiveTab(id)}>{lbl}</button>
                ))}
            </div>

            <div style={{ padding: 22, maxWidth: 1100, margin: "0 auto" }}>

                {/* ── TRAVEL DEMAND ── */}
                {activeTab === "demand" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
                        <div>
                            {/* Pipeline diagram */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 8 }}>
                                {[
                                    { label: "Expected\nDemand Growth", active: true },
                                    { label: "VMT / VKT", active: true },
                                    { label: "Load\nFactors", active: false },
                                    { label: "Transport\nFleet", active: false },
                                    { label: "Avg Fuel\nConsumption", active: false },
                                    { label: "Degradation\n& losses", active: false },
                                    { label: "Exhaust\nEmissions", active: false },
                                ].map((s, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                        {i > 0 && <span style={{ color: "#30363d" }}>→</span>}
                                        <div style={{ background: s.active ? "#0d1f2d" : "#161b22", border: `1px solid ${s.active ? "#38bdf8" : "#21262d"}`, borderRadius: 6, padding: "6px 12px", textAlign: "center", fontSize: 9, color: s.active ? "#38bdf8" : "#484f58", whiteSpace: "pre-line", lineHeight: 1.5 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Growth rate */}
                            <div className="card" style={{ marginBottom: 16, borderTop: "3px solid #38bdf8" }}>
                                <div className="lbl">Expected Travel Demand Growth</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                            <span style={{ fontSize: 11, color: "#8b949e" }}>Annual VMT growth rate</span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: "#38bdf8" }}>{growthRate > 0 ? "+" : ""}{growthRate}% / year</span>
                                        </div>
                                        <input type="range" min={-3} max={5} step={0.1} value={growthRate}
                                            onChange={e => setGrowthRate(Number(e.target.value))}
                                            style={{ background: `linear-gradient(to right,#38bdf8 ${(growthRate + 3) / 8 * 100}%,#30363d ${(growthRate + 3) / 8 * 100}%)` }} />
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#484f58", marginTop: 3 }}>
                                            <span>-3% (decline)</span><span>0% (stable)</span><span>+5% (rapid growth)</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "center", background: "#0d1117", borderRadius: 6, padding: "10px 16px" }}>
                                        <div style={{ fontSize: 9, color: "#484f58", marginBottom: 2 }}>2023→{targetYear}</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, color: "#facc15" }}>×{growthFactor.toFixed(3)}</div>
                                        <div style={{ fontSize: 9, color: "#484f58" }}>growth factor</div>
                                    </div>
                                </div>
                            </div>

                            {/* VKT sliders */}
                            <div className="card">
                                <div className="lbl">Base VKT (2023) — Million Vehicle-km / Year</div>
                                <div style={{ display: "grid", gap: 10 }}>
                                    {Object.entries(MODES_UI).map(([key, mode]) => {
                                        const projected = (vkt[key] ?? 0) * growthFactor;
                                        return (
                                            <div key={key} style={{ background: "#0d1117", borderRadius: 6, padding: "10px 12px" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span>{mode.icon}</span>
                                                        <span style={{ fontSize: 11 }}>{mode.label}</span>
                                                        <span style={{ fontSize: 9, color: "#484f58", background: "#161b22", padding: "2px 6px", borderRadius: 3 }}>{mode.group}</span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 12 }}>
                                                        <span style={{ fontSize: 11, color: "#8b949e" }}>base: <span style={{ color: "#c9d1d9" }}>{vkt[key]}</span> M</span>
                                                        <span style={{ fontSize: 11, color: mode.color }}>→ {projected.toFixed(0)} M km</span>
                                                    </div>
                                                </div>
                                                <input type="range" min={0}
                                                    max={key.includes("train") ? 300 : key.includes("hgv") ? 800 : 5000}
                                                    step={10} value={vkt[key] ?? 0}
                                                    onChange={e => setVkt(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                                    style={{ background: `linear-gradient(to right,${mode.color} ${((vkt[key] ?? 0) / 5000) * 100}%,#30363d ${((vkt[key] ?? 0) / 5000) * 100}%)` }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right summary */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div className="card">
                                <div className="lbl">Total VMT by Group</div>
                                {["road", "transit", "freight"].map(g => {
                                    const tot = Object.entries(MODES_UI).filter(([, m]) => m.group === g).reduce((s, [k]) => s + (vkt[k] ?? 0) * growthFactor, 0);
                                    const color = g === "road" ? "#f97316" : g === "transit" ? "#38bdf8" : "#6b7280";
                                    return (
                                        <div key={g} style={{ marginBottom: 10 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                                                <span style={{ color, textTransform: "uppercase", letterSpacing: ".1em" }}>{g}</span>
                                                <span style={{ color }}>{tot.toFixed(0)} M km</span>
                                            </div>
                                            <div style={{ height: 4, background: "#21262d", borderRadius: 2 }}>
                                                <div style={{ height: "100%", width: `${Math.min((tot / 8000) * 100, 100)}%`, background: color, borderRadius: 2, transition: "width .3s" }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="card" style={{ borderTop: "3px solid #38bdf8" }}>
                                <div className="lbl">Active Inputs → Python</div>
                                {[
                                    { l: "Base year", v: "2023" },
                                    { l: "Target year", v: `${targetYear}` },
                                    { l: "Growth rate", v: `${growthRate > 0 ? "+" : ""}${growthRate}%/yr` },
                                    { l: "Growth factor", v: `×${growthFactor.toFixed(3)}` },
                                    { l: "Grid EF", v: yearGridEF ? `${yearGridEF.toFixed(1)} gCO₂/kWh (DB)` : "fallback 120 gCO₂/kWh" },
                                    { l: "Population", v: POPULATION_GIPUZKOA.toLocaleString() },
                                ].map(r => (
                                    <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #21262d" }}>
                                        <span style={{ fontSize: 10, color: "#484f58" }}>{r.l}</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#c9d1d9" }}>{r.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── FLEET & DEGRADATION ── */}
                {activeTab === "fleet" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="card">
                            <div className="lbl">Degradation & Mechanical Losses by Mode</div>
                            <div style={{ display: "grid", gap: 10 }}>
                                {Object.entries(MODES_UI).map(([key, mode]) => (
                                    <div key={key} style={{ background: "#0d1117", borderRadius: 6, padding: "10px 12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                            <span style={{ fontSize: 11 }}>{mode.icon} {mode.label}</span>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: mode.color }}>+{degrad[key]}%</span>
                                        </div>
                                        <input type="range" min={0} max={30} step={0.5} value={degrad[key] ?? 0}
                                            onChange={e => setDegrad(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                            style={{ background: `linear-gradient(to right,${mode.color} ${(degrad[key] / 30) * 100}%,#30363d ${(degrad[key] / 30) * 100}%)` }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Results table from Python */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div className="card">
                                <div className="lbl">Final EF per Mode — Computed by Python</div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid #30363d" }}>
                                            {["Mode", "Fuel", "EF (g/km)", "kt CO₂/yr"].map(h => (
                                                <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, color: "#484f58", fontWeight: 400 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r, i) => {
                                            const ui = MODES_UI[r.key];
                                            return (
                                                <tr key={r.key} style={{ background: i % 2 === 0 ? "#0d1117" : "transparent", borderBottom: "1px solid #21262d" }}>
                                                    <td style={{ padding: "7px 8px", color: "#c9d1d9" }}>{ui?.icon} {ui?.label}</td>
                                                    <td style={{ padding: "7px 8px", color: "#484f58" }}>{r.fuel}</td>
                                                    <td style={{ padding: "7px 8px", fontWeight: 600, color: ui?.color }}>{r.ef_per_km.toFixed(1)}</td>
                                                    <td style={{ padding: "7px 8px", color: "#38bdf8" }}>{r.emissions_kt.toFixed(3)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── EXHAUST EMISSIONS ── */}
                {activeTab === "results" && (
                    <div style={{ display: "grid", gap: 16 }}>
                        <div className="card" style={{ background: "#060f1e", borderTop: "3px solid #38bdf8" }}>
                            <div className="lbl">Exhaust Emissions — {targetYear} · Gipuzkoa · 🐍 Python Backend</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-end" }}>
                                <div>
                                    <div style={{ fontSize: 10, color: "#484f58", marginBottom: 4 }}>Total Exhaust</div>
                                    <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-1px", color: "#38bdf8" }}>{totalEmissions.toFixed(1)}</div>
                                    <div style={{ fontSize: 12, color: "#484f58" }}>kt CO₂ / year</div>
                                </div>
                                <div style={{ color: "#21262d", fontSize: 32 }}>|</div>
                                <div>
                                    <div style={{ fontSize: 10, color: "#484f58", marginBottom: 4 }}>Per Capita</div>
                                    <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-1px", color: perCapitaColor }}>{perCapita.toFixed(3)}</div>
                                    <div style={{ fontSize: 12, color: "#484f58" }}>t CO₂ / hab / year</div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="lbl">Breakdown by Transport Mode</div>
                            {[...results].sort((a, b) => b.emissions_kt - a.emissions_kt).map(r => {
                                const ui = MODES_UI[r.key];
                                const pct = maxKt > 0 ? (r.emissions_kt / maxKt) * 100 : 0;
                                return (
                                    <div key={r.key} style={{ marginBottom: 10 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                                            <span>{ui?.icon} {ui?.label}</span>
                                            <div style={{ display: "flex", gap: 16 }}>
                                                <span style={{ color: "#484f58" }}>{r.vkt_projected.toFixed(0)} M km</span>
                                                <span style={{ color: ui?.color, fontWeight: 600 }}>{r.emissions_kt.toFixed(3)} kt</span>
                                                <span style={{ color: "#484f58" }}>{r.intensity_g_pmt.toFixed(1)} g/pmt</span>
                                            </div>
                                        </div>
                                        <div style={{ height: 5, background: "#21262d", borderRadius: 2 }}>
                                            <div style={{ height: "100%", width: `${pct}%`, background: ui?.color, borderRadius: 2, transition: "width .3s" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── BENCHMARKS ── */}
                {activeTab === "benchmarks" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="card">
                            <div className="lbl">Per Capita Benchmark Comparison</div>
                            {BENCHMARKS.map(b => (
                                <div key={b.label} style={{ marginBottom: 14 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                        <span style={{ color: b.color }}>{b.label}</span>
                                        <span style={{ fontWeight: 600, color: b.color }}>{b.value} t CO₂/hab</span>
                                    </div>
                                    <div style={{ height: 6, background: "#21262d", borderRadius: 3 }}>
                                        <div style={{ height: "100%", width: `${Math.min((b.value / 2.5) * 100, 100)}%`, background: b.color, borderRadius: 3 }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ marginTop: 20, borderTop: "1px solid #21262d", paddingTop: 14 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                    <span style={{ color: perCapitaColor }}>⟶ Gipuzkoa {targetYear} (this scenario)</span>
                                    <span style={{ fontWeight: 600, color: perCapitaColor }}>{perCapita.toFixed(3)} t CO₂/hab</span>
                                </div>
                                <div style={{ height: 8, background: "#21262d", borderRadius: 3 }}>
                                    <div style={{ height: "100%", width: `${Math.min((perCapita / 2.5) * 100, 100)}%`, background: perCapitaColor, borderRadius: 3, transition: "width .4s" }} />
                                </div>
                            </div>
                            <div style={{ marginTop: 14, padding: "10px 12px", background: "#0d1117", borderRadius: 6 }}>
                                <div style={{ fontSize: 10, color: "#484f58", marginBottom: 4 }}>GAP TO PARIS 2°C TARGET</div>
                                <div style={{ fontSize: 22, fontWeight: 600, color: perCapita <= 0.7 ? "#4ade80" : "#ef4444" }}>
                                    {perCapita <= 0.7 ? "✓ ON TRACK" : `+${(perCapita - 0.7).toFixed(3)} t CO₂/hab`}
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="lbl">Scenario Summary</div>
                            {[
                                { l: "Region", v: "Gipuzkoa, Basque Country", c: "#f5c842" },
                                { l: "Population", v: POPULATION_GIPUZKOA.toLocaleString(), c: "#c9d1d9" },
                                { l: "Target year", v: `${targetYear}`, c: "#c9d1d9" },
                                { l: "Growth rate", v: `${growthRate > 0 ? "+" : ""}${growthRate}%/yr`, c: "#38bdf8" },
                                { l: "Growth factor", v: `×${growthFactor.toFixed(3)}`, c: "#facc15" },
                                { l: "Grid EF", v: `${(yearGridEF ?? 120).toFixed(1)} gCO₂/kWh`, c: "#f5c842" },
                                { l: "Total emissions", v: `${totalEmissions.toFixed(2)} kt/yr`, c: "#38bdf8" },
                                { l: "Per capita", v: `${perCapita.toFixed(3)} t/hab/yr`, c: perCapitaColor },
                                { l: "vs Paris 2°C", v: perCapita <= 0.7 ? "✓ Achieved" : `${((perCapita / 0.7 - 1) * 100).toFixed(0)}% above`, c: perCapita <= 0.7 ? "#4ade80" : "#ef4444" },
                                { l: "Calculated by", v: "🐍 Python backend", c: "#4ade80" },
                            ].map(r => (
                                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #21262d" }}>
                                    <span style={{ fontSize: 11, color: "#484f58" }}>{r.l}</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: r.c }}>{r.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── PYTHON MODEL TAB ── */}
                {activeTab === "model" && (
                    <div style={{ display: "grid", gap: 16 }}>
                        <div className="card" style={{ borderTop: "3px solid #4ade80" }}>
                            <div className="lbl">🐍 Python Model Parameters — backend/models/vehicle_use_model.py</div>
                            <div style={{ fontSize: 11, color: "#484f58", marginBottom: 14 }}>
                                These are the actual values loaded from your Python backend. To change a formula or parameter, edit <span style={{ color: "#58a6ff" }}>vehicle_use_model.py</span> and save — uvicorn reloads automatically.
                            </div>
                            {backendDefaults ? (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid #30363d" }}>
                                            {["Mode", "Fuel type", "Consumption", "Load factor", "Group"].map(h => (
                                                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, color: "#484f58", fontWeight: 400 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(backendDefaults).map(([key, params], i) => {
                                            const ui = MODES_UI[key];
                                            return (
                                                <tr key={key} style={{ background: i % 2 === 0 ? "#0d1117" : "transparent", borderBottom: "1px solid #21262d" }}>
                                                    <td style={{ padding: "8px 10px", color: "#c9d1d9" }}>{ui?.icon} {ui?.label ?? key}</td>
                                                    <td style={{ padding: "8px 10px", color: params.fuel === "electric" ? "#4ade80" : "#f97316" }}>{params.fuel}</td>
                                                    <td style={{ padding: "8px 10px", color: "#58a6ff" }}>
                                                        {params.consumption} {params.fuel === "electric" ? "kWh/100km" : "L/100km"}
                                                    </td>
                                                    <td style={{ padding: "8px 10px", color: "#c9d1d9" }}>{params.load}</td>
                                                    <td style={{ padding: "8px 10px", color: "#484f58" }}>{params.group}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ color: "#484f58", fontSize: 11 }}>⏳ Loading from Python backend…</div>
                            )}
                        </div>

                        <div className="card">
                            <div className="lbl">Core Formulas (in Python)</div>
                            <pre style={{ fontSize: 11, color: "#58a6ff", background: "#0d1117", padding: 16, borderRadius: 6, overflowX: "auto", lineHeight: 1.8 }}>{`# backend/models/vehicle_use_model.py

growth_factor = (1 + growth_rate_pct / 100) ** years

# For combustion vehicles:
ef_per_km = (consumption_L_per_100km / 100) * FUEL_EF[fuel] * (1 + degradation_pct / 100)

# For electric vehicles (grid_ef from DB):
ef_per_km = (consumption_kWh_per_100km / 100) * grid_ef * (1 + degradation_pct / 100)

# Emissions:
emissions_kt = vkt_projected_M * 1e6 * ef_per_km / 1e9

# Per capita:
per_capita_t = total_kt * 1e6 / population`}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function VehicleUseModule() {
    const [showModule, setShowModule] = useState(false);
    return showModule ? <VehicleModuleUI /> : <GlobeIntro onArrive={() => setShowModule(true)} />;
}
