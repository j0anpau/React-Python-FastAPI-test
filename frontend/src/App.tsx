import { useState, useMemo, useEffect } from "react";
import VehicleUseModule from "./VehicleUseModule";

const API = "http://localhost:8000";

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED CSS
// ══════════════════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Mono', monospace; background: #0d1117; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #30363d; }
  input[type=range] { -webkit-appearance: none; width: 100%; height: 3px; border-radius: 2px; outline: none; cursor: pointer; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; border: 2px solid #0d1117; cursor: pointer; transition: transform 0.15s; }
  input[type=range]:hover::-webkit-slider-thumb { transform: scale(1.3); }
  .tab  { background: none; border: none; cursor: pointer; padding: 10px 18px; font-family: inherit; font-size: 11px; letter-spacing: .1em; color: #484f58; border-bottom: 2px solid transparent; transition: all .2s; }
  .tab:hover { color: #58a6ff; }
  .tab.on   { color: #58a6ff; border-bottom-color: #58a6ff; }
  .preset   { background: #161b22; border: 1px solid #30363d; color: #8b949e; cursor: pointer; padding: 5px 10px; border-radius: 4px; font-family: inherit; font-size: 10px; transition: all .2s; }
  .preset:hover, .preset.on { background: #1c2a3a; border-color: #58a6ff; color: #58a6ff; }
  .card { background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 14px; }
  .lbl  { font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: #484f58; margin-bottom: 8px; }
  .mod-tab  { background: none; border: none; cursor: pointer; padding: 12px 28px; font-family: inherit; font-size: 11px; letter-spacing: .12em; color: #484f58; border-bottom: 3px solid transparent; transition: all .2s; text-transform: uppercase; }
  .mod-tab:hover { color: #c9d1d9; }
  .mod-tab.active-energy { color: #f5c842; border-bottom-color: #f5c842; }
  .mod-tab.active-lca    { color: #4ade80; border-bottom-color: #4ade80; }
  .mod-tab.active-vehicle{ color: #38bdf8; border-bottom-color: #38bdf8; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .pulse { animation: pulse 1.5s ease-in-out infinite; }
`;

// ══════════════════════════════════════════════════════════════════════════════
// ENERGY MODULE DATA
// ══════════════════════════════════════════════════════════════════════════════
const EMISSION_FACTORS = {
  coal: { label: "Coal", factor: 820, color: "#6b5344" },
  gas: { label: "Natural Gas (CCGT)", factor: 490, color: "#a08060" },
  oil: { label: "Oil / Diesel Gen.", factor: 650, color: "#8b7040" },
  nuclear: { label: "Nuclear", factor: 12, color: "#e8a838" },
  hydro: { label: "Hydro", factor: 24, color: "#3a8fc7" },
  wind_on: { label: "Wind (onshore)", factor: 11, color: "#5bbf6e" },
  wind_off: { label: "Wind (offshore)", factor: 12, color: "#3da86e" },
  solar_pv: { label: "Solar PV", factor: 45, color: "#f5c842" },
  biomass: { label: "Biomass", factor: 230, color: "#7aad58" },
  geothermal: { label: "Geothermal", factor: 38, color: "#c07a3a" },
};

const FUEL_UPSTREAM = {
  gasoline: { label: "Gasoline (E0)", wtt: 14.8, ttw: 73.4, mj_per_liter: 31.3 },
  diesel: { label: "Diesel (B0)", wtt: 15.8, ttw: 74.1, mj_per_liter: 34.7 },
  e10: { label: "Gasoline (E10)", wtt: 17.1, ttw: 67.6, mj_per_liter: 30.5 },
  b20: { label: "Diesel (B20)", wtt: 20.3, ttw: 62.2, mj_per_liter: 34.0 },
  cng: { label: "CNG", wtt: 13.5, ttw: 56.4, mj_per_kg: 47.5 },
  lpg: { label: "LPG", wtt: 9.6, ttw: 66.5, mj_per_liter: 23.4 },
  h2_smr: { label: "Hydrogen (SMR)", wtt: 99.5, ttw: 0, note: "per kg" },
};

const PRESETS_ENERGY = {
  eu_2023: { label: "EU Mix 2023", values: { coal: 12, gas: 18, oil: 2, nuclear: 22, hydro: 12, wind_on: 14, wind_off: 7, solar_pv: 9, biomass: 3, geothermal: 1 } },
  global_avg: { label: "Global Average 2023", values: { coal: 35, gas: 22, oil: 3, nuclear: 10, hydro: 15, wind_on: 7, wind_off: 1, solar_pv: 5, biomass: 1, geothermal: 1 } },
  spain_2023: { label: "Spain 2023", values: { coal: 2, gas: 20, oil: 1, nuclear: 20, hydro: 10, wind_on: 24, wind_off: 0, solar_pv: 14, biomass: 3, geothermal: 0 } },
  france_2024: { label: "France 2024", values: { coal: 1, gas: 5, oil: 0, nuclear: 70, hydro: 10, wind_on: 7, wind_off: 1, solar_pv: 5, biomass: 1, geothermal: 0 } },
  high_renewable: { label: "High Renewable (2050)", values: { coal: 0, gas: 5, oil: 0, nuclear: 15, hydro: 15, wind_on: 25, wind_off: 15, solar_pv: 20, biomass: 4, geothermal: 1 } },
  coal_heavy: { label: "Coal Heavy", values: { coal: 65, gas: 20, oil: 5, nuclear: 3, hydro: 3, wind_on: 2, wind_off: 0, solar_pv: 1, biomass: 1, geothermal: 0 } },
  US_2024: { label: "United States 2024", values: { coal: 15, gas: 43, oil: 0.4, nuclear: 18, hydro: 6, wind_on: 10, wind_off: 0.1, solar_pv: 7, biomass: 1.5, geothermal: 0.4 } },
  gipuzkoa_2023: { label: "TBD Gipuzkoa 2023", values: { coal: 1, gas: 5, oil: 0, nuclear: 0, hydro: 10, wind_on: 7, wind_off: 1, solar_pv: 5, biomass: 69, geothermal: 0 } },
  DE_2024: { label: "Germany 2024", values: { coal: 23, gas: 13, oil: 0.5, nuclear: 0, hydro: 4, wind_on: 26, wind_off: 7, solar_pv: 15, biomass: 5, geothermal: 0.1 } },
  CL_2024: { label: "Chile 2024", values: { coal: 16, gas: 12, oil: 2, nuclear: 0, hydro: 30, wind_on: 12, wind_off: 0, solar_pv: 21, biomass: 3, geothermal: 1 } },
  CN_2024: { label: "China 2024", values: { coal: 58, gas: 3, oil: 0.8, nuclear: 4.4, hydro: 13.5, wind_on: 9, wind_off: 0.8, solar_pv: 8.3, biomass: 2, geothermal: 0 } },
  TW_2024: { label: "Taiwan 2024", values: { coal: 39, gas: 42, oil: 2, nuclear: 4.2, hydro: 1.5, wind_on: 1.5, wind_off: 2, solar_pv: 5.5, biomass: 2, geothermal: 0 } },
};

const ENERGY_SCORE_BANDS = [
  { max: 50, label: "Excellent", color: "#4ade80" },
  { max: 150, label: "Good", color: "#a3e635" },
  { max: 300, label: "Moderate", color: "#facc15" },
  { max: 500, label: "High", color: "#f97316" },
  { max: Infinity, label: "Very High", color: "#ef4444" },
];

// ══════════════════════════════════════════════════════════════════════════════
// LCA MODULE DATA  (unchanged from your original)
// ══════════════════════════════════════════════════════════════════════════════
const TECH_FLEET = {
  icev_gasoline: { label: "ICEV Gasoline", color: "#f97316", category: "fossil" },
  icev_diesel: { label: "ICEV Diesel", color: "#e8a838", category: "fossil" },
  hev_gasoline: { label: "HEV Gasoline", color: "#facc15", category: "hybrid" },
  phev: { label: "PHEV", color: "#a3e635", category: "hybrid" },
  bev: { label: "BEV", color: "#4ade80", category: "electric" },
  fcev: { label: "FCEV", color: "#38bdf8", category: "electric" },
  cng: { label: "CNG / LNG", color: "#c084fc", category: "fossil" },
};

const LCA_FACTORS = {
  icev_gasoline: { mfg: 6.2, infra: 0.5, use: 118.0, disposal: 0.8 },
  icev_diesel: { mfg: 6.5, infra: 0.5, use: 105.0, disposal: 0.8 },
  hev_gasoline: { mfg: 7.8, infra: 0.5, use: 75.0, disposal: 1.2 },
  phev: { mfg: 11.2, infra: 0.6, use: 55.0, disposal: 1.5 },
  bev: { mfg: 18.5, infra: 0.7, use: 0.0, disposal: 2.1 },
  fcev: { mfg: 14.0, infra: 0.8, use: 28.0, disposal: 1.8 },
  cng: { mfg: 6.0, infra: 0.5, use: 92.0, disposal: 0.8 },
};

const TURNOVER_CURVES = {
  slow: { label: "Slow Turnover (15 yr)", halflife: 15 },
  medium: { label: "Medium Turnover (12 yr)", halflife: 12 },
  fast: { label: "Fast Turnover (8 yr)", halflife: 8 },
  ev_push: { label: "EV Policy Push", halflife: 9 },
};

const PRESETS_FLEET = {
  europe_2023: { label: "Europe 2023", fleet: { icev_gasoline: 38, icev_diesel: 32, hev_gasoline: 10, phev: 6, bev: 8, fcev: 1, cng: 5 } },
  europe_2030: { label: "Europe 2030 (target)", fleet: { icev_gasoline: 22, icev_diesel: 18, hev_gasoline: 16, phev: 12, bev: 26, fcev: 2, cng: 4 } },
  europe_2040: { label: "Europe 2040", fleet: { icev_gasoline: 8, icev_diesel: 5, hev_gasoline: 12, phev: 10, bev: 58, fcev: 5, cng: 2 } },
  high_bev: { label: "High BEV Scenario", fleet: { icev_gasoline: 2, icev_diesel: 2, hev_gasoline: 5, phev: 6, bev: 80, fcev: 4, cng: 1 } },
  fossil_heavy: { label: "Fossil Heavy", fleet: { icev_gasoline: 50, icev_diesel: 35, hev_gasoline: 5, phev: 3, bev: 3, fcev: 0, cng: 4 } },
};

const LCA_SCORE_BANDS = [
  { max: 30, label: "Net-Zero", color: "#4ade80" },
  { max: 60, label: "Excellent", color: "#a3e635" },
  { max: 90, label: "Good", color: "#facc15" },
  { max: 120, label: "Moderate", color: "#f97316" },
  { max: Infinity, label: "High", color: "#ef4444" },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function normalize(obj) {
  const total = Object.values(obj).reduce((a, b) => a + b, 0);
  if (total === 0) return obj;
  const out = {};
  for (const k in obj) out[k] = (obj[k] / total) * 100;
  return out;
}
function getScoreBand(val, bands) { return bands.find(b => val <= b.max) || bands.at(-1); }
function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx, cy, r, startDeg, endDeg) {
  if (Math.abs(endDeg - startDeg) >= 359.9)
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

// Maps the frontend mix keys → backend payload
// (wind_on + wind_off → wind, rest 1:1)
function toApiPayload(mix, transmissionLoss, year) {
  return {
    grid_mix: {
      coal: mix.coal ?? 0,
      oil: mix.oil ?? 0,
      gas: mix.gas ?? 0,
      nuclear: mix.nuclear ?? 0,
      hydro: mix.hydro ?? 0,
      wind: (mix.wind_on ?? 0) + (mix.wind_off ?? 0),
      solar_pv: mix.solar_pv ?? 0,
      solar_csp: 0,
      geothermal: mix.geothermal ?? 0,
      biomass: mix.biomass ?? 0,
    },
    transmission_loss: transmissionLoss,
    upstream_factor: 0,
    year,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ENERGY MODULE
// ══════════════════════════════════════════════════════════════════════════════
function EnergyModule({ onGridIntensityChange }) {
  const [mix, setMix] = useState(PRESETS_ENERGY.eu_2023.values);
  const [preset, setPreset] = useState("eu_2023");
  const [transmissionLoss, setTransmission] = useState(5);
  const [gridYear, setGridYear] = useState(2030);
  const [activeTab, setActiveTab] = useState("grid");

  // ── API state ───────────────────────────────────────────────────────────────
  const [apiResult, setApiResult] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(null); // null=checking, true, false
  const [apiError, setApiError] = useState(null);
  const [savedYears, setSavedYears] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error'

  const debouncedMix = useDebounce(mix, 300);
  const debouncedLoss = useDebounce(transmissionLoss, 300);

  // ── Call backend on every change ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setApiLoading(true);

    fetch(`${API}/api/energy/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiPayload(debouncedMix, debouncedLoss, gridYear)),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (cancelled) return;
        setApiResult(data);
        setApiOnline(true);
        setApiError(null);
      })
      .catch(err => {
        if (cancelled) return;
        setApiOnline(false);
        setApiError(err.message);
        setApiResult(null);
      })
      .finally(() => { if (!cancelled) setApiLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedMix, debouncedLoss, gridYear]);

  // ── Local fallback (same formula, runs instantly) ───────────────────────────
  const total = useMemo(() => Object.values(mix).reduce((a, b) => a + b, 0), [mix]);
  const normalized = useMemo(() => normalize(mix), [mix]);

  const localGridIntensity = useMemo(() => {
    let t = 0;
    for (const k in normalized) t += (normalized[k] / 100) * EMISSION_FACTORS[k].factor;
    return t;
  }, [normalized]);
  const localAdjusted = useMemo(() => localGridIntensity / (1 - transmissionLoss / 100), [localGridIntensity, transmissionLoss]);

  // Prefer API values, fall back to local
  const gridIntensity = apiResult?.grid_ef_base ?? localGridIntensity;
  const adjustedIntensity = apiResult?.grid_ef_adjusted ?? localAdjusted;
  const renewableShare = apiResult?.renewable_share ?? ["hydro", "wind_on", "wind_off", "solar_pv", "biomass", "geothermal"].reduce((s, k) => s + normalized[k], 0);
  const fossilShare = apiResult?.fossil_share ?? (normalized.coal + normalized.gas + normalized.oil);

  // Broadcast to parent (LCA module)
  useEffect(() => { onGridIntensityChange(adjustedIntensity); }, [adjustedIntensity]);

  const band = getScoreBand(adjustedIntensity, ENERGY_SCORE_BANDS);

  const donutSegments = useMemo(() => {
    let cum = 0;
    return Object.entries(EMISSION_FACTORS).map(([key, info]) => {
      const pct = normalized[key] / 100;
      const angle = pct * 360;
      const start = cum;
      cum += angle;
      return { key, ...info, pct, startAngle: start, angle };
    });
  }, [normalized]);

  function applyPreset(key) { setPreset(key); setMix({ ...PRESETS_ENERGY[key].values }); }
  function updateSlider(key, val) { setPreset("custom"); setMix(prev => ({ ...prev, [key]: Number(val) })); }

  // ── Load list of saved years on mount ────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/energy/scenarios`)
      .then(r => r.json())
      .then(data => setSavedYears(data.map(s => s.year)))
      .catch(() => { });
  }, []);

  // ── Auto-load mix when year changes (if saved) ───────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/energy/scenarios/${gridYear}`)
      .then(r => r.json())
      .then(data => {
        if (data.found) {
          setMix(data.mix);
          setTransmission(data.transmission_loss);
          setPreset("custom");
        }
      })
      .catch(() => { });
  }, [gridYear]);

  // ── Save current mix for current year ────────────────────────────────────────
  function saveScenario() {
    setSaveStatus("saving");
    fetch(`${API}/api/energy/scenarios/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: gridYear, mix, transmission_loss: transmissionLoss }),
    })
      .then(r => r.json())
      .then(() => {
        setSaveStatus("saved");
        setSavedYears(prev => prev.includes(gridYear) ? prev : [...prev, gridYear].sort());
        setTimeout(() => setSaveStatus(null), 2000);
      })
      .catch(() => { setSaveStatus("error"); setTimeout(() => setSaveStatus(null), 2000); });
  }

  return (
    <div>
      {/* ── API status banner ── */}
      <div style={{ padding: "6px 22px", background: apiOnline ? "#0d1f12" : apiOnline === false ? "#1a0a0a" : "#0d1117", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", gap: "10px" }}>
        {apiOnline === null && <span style={{ fontSize: "10px", color: "#484f58" }}>⏳ Connecting to Python API…</span>}
        {apiOnline === true && (
          <>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
            <span style={{ fontSize: "10px", color: "#4ade80", letterSpacing: ".1em" }}>PYTHON API CONNECTED</span>
            {apiLoading && <span style={{ fontSize: "10px", color: "#484f58" }} className="pulse">↻ calculating…</span>}
            <span style={{ fontSize: "10px", color: "#484f58", marginLeft: 8 }}>→ {API}/api/energy/calculate</span>
          </>
        )}
        {apiOnline === false && (
          <>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ fontSize: "10px", color: "#ef4444", letterSpacing: ".1em" }}>API OFFLINE — LOCAL FALLBACK</span>
            <span style={{ fontSize: "10px", color: "#484f58" }}>Start: uvicorn main:app --reload --port 8000</span>
          </>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ borderBottom: "1px solid #21262d", padding: "0 22px", display: "flex" }}>
        {[["grid", "Electricity Grid"], ["fuel", "Fuel Upstream"], ["output", "Module Output"]].map(([id, lbl]) => (
          <button key={id} className={`tab${activeTab === id ? " on" : ""}`} onClick={() => setActiveTab(id)}>{lbl}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", padding: "0 0 0 12px" }}>
          <span style={{ fontSize: "10px", color: "#484f58" }}>YEAR</span>
          <select value={gridYear} onChange={e => setGridYear(Number(e.target.value))}
            style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", padding: "4px 8px", borderRadius: "4px", fontFamily: "inherit", fontSize: "11px" }}>
            {[2023, 2025, 2030, 2035, 2040, 2045, 2050].map(y => (
              <option key={y} value={y}>{y} {savedYears.includes(y) ? "✓" : ""}</option>
            ))}
          </select>
          <button onClick={saveScenario} disabled={saveStatus === "saving"}
            style={{
              background: saveStatus === "saved" ? "#1a4d2e" : saveStatus === "error" ? "#3d1515" : "#161b22",
              border: `1px solid ${saveStatus === "saved" ? "#4ade80" : saveStatus === "error" ? "#ef4444" : "#30363d"}`,
              color: saveStatus === "saved" ? "#4ade80" : saveStatus === "error" ? "#ef4444" : "#8b949e",
              borderRadius: "4px", padding: "4px 12px", cursor: "pointer",
              fontFamily: "inherit", fontSize: "10px", letterSpacing: ".1em",
              transition: "all .2s"
            }}>
            {saveStatus === "saving" ? "SAVING…" : saveStatus === "saved" ? "✓ SAVED" : saveStatus === "error" ? "✗ ERROR" : "SAVE"}
          </button>
        </div>
      </div>

      <div style={{ padding: "22px" }}>
        {activeTab === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px" }}>
            <div>
              <div style={{ marginBottom: "16px" }}>
                <div className="lbl">Quick Presets</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Object.entries(PRESETS_ENERGY).map(([k, p]) => (
                    <button key={k} className={`preset${preset === k ? " on" : ""}`} onClick={() => applyPreset(k)}>{p.label}</button>
                  ))}
                </div>
              </div>

              {Math.abs(total - 100) > 1 && (
                <div style={{ background: "#2d1f0e", border: "1px solid #7a4f1e", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "11px", color: "#e3a03f" }}>
                  ⚠ Mix sums to {total.toFixed(1)}% — auto-normalized.
                </div>
              )}

              <div style={{ display: "grid", gap: "10px" }}>
                {Object.entries(EMISSION_FACTORS).map(([key, info]) => {
                  const pct = normalized[key];
                  const contrib = (pct / 100) * info.factor;
                  return (
                    <div key={key} className="card" style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: info.color }} />
                          <span style={{ fontSize: "12px" }}>{info.label}</span>
                          <span style={{ fontSize: "10px", color: "#484f58" }}>{info.factor} gCO₂/kWh</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "11px", color: "#58a6ff" }}>{pct.toFixed(1)}%</span>
                          <span style={{ fontSize: "10px", color: "#484f58", minWidth: "64px", textAlign: "right" }}>+{contrib.toFixed(1)} gCO₂</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="range" min="0" max="100" step="1" value={mix[key]}
                          onChange={e => updateSlider(key, e.target.value)}
                          style={{ background: `linear-gradient(to right,${info.color} ${mix[key]}%,#30363d ${mix[key]}%)` }} />
                        <style>{`input[type=range]::-webkit-slider-thumb{background:${info.color}}`}</style>
                        <input type="number" min="0" max="100" value={mix[key]}
                          onChange={e => updateSlider(key, e.target.value)}
                          style={{ width: "50px", background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", borderRadius: "4px", padding: "3px 6px", fontFamily: "inherit", fontSize: "11px", textAlign: "right" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card" style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px" }}>Transmission & Distribution Losses</span>
                  <span style={{ fontSize: "11px", color: "#58a6ff" }}>{transmissionLoss}%</span>
                </div>
                <input type="range" min="0" max="25" step="0.5" value={transmissionLoss}
                  onChange={e => setTransmission(Number(e.target.value))}
                  style={{ background: `linear-gradient(to right,#8b5e3c ${transmissionLoss * 4}%,#30363d ${transmissionLoss * 4}%)` }} />
                <div style={{ fontSize: "10px", color: "#484f58", marginTop: "4px" }}>Typical: 3–10% · EU avg ~5%</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <div className="lbl">Grid Mix</div>
                {apiLoading && <span style={{ position: "absolute", top: 12, right: 14, fontSize: "9px", color: "#484f58" }} className="pulse">↻ API</span>}
                <svg width="280" height="280" viewBox="0 0 190 190">
                  {donutSegments.map(seg => seg.pct > 0.001 && (
                    <path key={seg.key} d={arcPath(95, 95, 80, seg.startAngle, seg.startAngle + seg.angle)}
                      fill={seg.color} stroke="#0d1117" strokeWidth="2" style={{ transition: "all .3s" }}>
                      <title>{seg.label}: {normalized[seg.key].toFixed(1)}%</title>
                    </path>
                  ))}
                  <circle cx="95" cy="95" r="52" fill="#0d1117" />
                  <text x="95" y="90" textAnchor="middle" fill={band.color} fontSize="20" fontWeight="600" fontFamily="Helvetica">{adjustedIntensity.toFixed(0)}</text>
                  <text x="95" y="105" textAnchor="middle" fill="#484f58" fontSize="8" fontFamily="Helvetica">gCO₂/kWh</text>
                  <text x="95" y="118" textAnchor="middle" fill={band.color} fontSize="8" fontFamily="Helvetica">{band.label}</text>
                </svg>
              </div>

              <div className="card">
                <div className="lbl">Summary</div>
                {[
                  { l: "At source", v: `${gridIntensity.toFixed(1)} gCO₂/kWh`, c: band.color },
                  { l: "After T&D losses", v: `${adjustedIntensity.toFixed(1)} gCO₂/kWh`, c: band.color },
                  { l: "Renewables", v: `${renewableShare.toFixed(1)}%`, c: "#4ade80" },
                  { l: "Fossil fuels", v: `${fossilShare.toFixed(1)}%`, c: fossilShare > 50 ? "#ef4444" : "#f97316" },
                  { l: "Nuclear", v: `${normalized.nuclear.toFixed(1)}%`, c: "#e8a838" },
                  { l: "Source", v: apiOnline ? "🐍 Python API" : "📐 Local", c: apiOnline ? "#4ade80" : "#484f58" },
                ].map(item => (
                  <div key={item.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d" }}>
                    <span style={{ fontSize: "11px", color: "#8b949e" }}>{item.l}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: item.c }}>{item.v}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="lbl">Intensity Scale</div>
                {ENERGY_SCORE_BANDS.map(b => (
                  <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: b.color }} />
                    <span style={{ fontSize: "11px", color: b.color, width: "68px" }}>{b.label}</span>
                    <span style={{ fontSize: "10px", color: "#484f58" }}>{b.max === Infinity ? ">500" : `≤${b.max}`} gCO₂/kWh</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="lbl">Intensity Contribution by Source</div>
                {Object.entries(EMISSION_FACTORS).filter(([k]) => normalized[k] > 0.5).map(([k, info]) => {
                  const contrib = (normalized[k] / 100) * info.factor;
                  const pct = (contrib / adjustedIntensity) * 100;
                  return (
                    <div key={k} style={{ marginBottom: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#8b949e", marginBottom: "2px" }}>
                        <span>{info.label}</span><span style={{ color: info.color }}>{contrib.toFixed(1)}</span>
                      </div>
                      <div style={{ height: "4px", background: "#21262d", borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: info.color, borderRadius: "2px", transition: "width .3s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "fuel" && (
          <div>
            <div style={{ fontSize: "12px", color: "#8b949e", lineHeight: "1.8", marginBottom: "18px" }}>
              Well-to-Tank (WTT) + Tank-to-Wheel (TTW) emission factors. Based on JEC Well-to-Wheels study, values in gCO₂eq/MJ.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #30363d" }}>
                  {["Fuel Type", "WTT (gCO₂eq/MJ)", "TTW (gCO₂eq/MJ)", "WTW Total", "WTW per unit"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#484f58", fontSize: "10px", letterSpacing: ".1em", fontWeight: "400" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(FUEL_UPSTREAM).map(([key, f], i) => {
                  const wtw = f.wtt + f.ttw;
                  let perUnit = "—";
                  if (f.mj_per_liter) perUnit = (wtw * f.mj_per_liter).toFixed(0) + " /l";
                  if (f.mj_per_kg) perUnit = (wtw * f.mj_per_kg).toFixed(0) + " /kg";
                  if (f.note) perUnit = (wtw * 120).toFixed(0) + " /kg H₂";
                  return (
                    <tr key={key} style={{ background: i % 2 === 0 ? "#161b22" : "transparent", borderBottom: "1px solid #21262d" }}>
                      <td style={{ padding: "10px 14px", color: "#c9d1d9", fontWeight: "500" }}>{f.label}</td>
                      <td style={{ padding: "10px 14px", color: "#8b949e" }}>{f.wtt}</td>
                      <td style={{ padding: "10px 14px", color: "#8b949e" }}>{f.ttw}</td>
                      <td style={{ padding: "10px 14px", fontWeight: "600", color: wtw > 80 ? "#f97316" : "#c9d1d9" }}>{wtw.toFixed(1)}</td>
                      <td style={{ padding: "10px 14px", color: "#58a6ff" }}>{perUnit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: "20px", background: "#0d1f2d", border: "1px solid #1c3651", borderRadius: "8px", padding: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: ".12em", color: "#58a6ff", marginBottom: "12px" }}>⚡ ELECTRICITY UPSTREAM — BEV USE PHASE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                {[
                  { lbl: "Grid Intensity (configured)", val: adjustedIntensity.toFixed(1), unit: "gCO₂eq/kWh", color: band.color },
                  { lbl: "Equiv. WTT factor", val: (adjustedIntensity / 3.6).toFixed(1), unit: "gCO₂eq/MJ", color: "#4ade80" },
                  { lbl: "BEV at 18 kWh/100 km", val: (adjustedIntensity * 0.18).toFixed(0), unit: "gCO₂eq/km", color: band.color },
                  { lbl: "BEV at 22 kWh/100 km", val: (adjustedIntensity * 0.22).toFixed(0), unit: "gCO₂eq/km (heavy)", color: band.color },
                ].map(item => (
                  <div key={item.lbl}>
                    <div style={{ fontSize: "10px", color: "#484f58", marginBottom: "3px" }}>{item.lbl}</div>
                    <div style={{ fontSize: "26px", fontWeight: "600", color: item.color }}>{item.val}</div>
                    <div style={{ fontSize: "10px", color: "#484f58" }}>{item.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "output" && (
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="card" style={{ background: "#0d1a14", borderColor: band.color + "55", borderTopWidth: "3px", borderTopColor: band.color }}>
              <div className="lbl">Module Output — Grid Electricity · Year {gridYear}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-end" }}>
                {[
                  { lbl: "Grid Electricity", val: adjustedIntensity.toFixed(1), unit: "gCO₂eq / kWh", color: band.color },
                  { lbl: "Diesel (WTW)", val: "3,110", unit: "gCO₂eq / liter", color: "#f97316" },
                  { lbl: "Gasoline (WTW)", val: "2,760", unit: "gCO₂eq / liter", color: "#f97316" },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-end", gap: "20px" }}>
                    {idx > 0 && <div style={{ color: "#21262d", fontSize: "32px", paddingBottom: "10px" }}>|</div>}
                    <div>
                      <div style={{ fontSize: "10px", color: "#484f58", marginBottom: "4px" }}>{item.lbl}</div>
                      <div style={{ fontSize: "40px", fontWeight: "600", letterSpacing: "-1px", color: item.color }}>{item.val}</div>
                      <div style={{ fontSize: "12px", color: "#484f58" }}>{item.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#0d1f12", border: "1px solid #1a4d2e", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "#4ade80" }}>LIVE SYNC</span>
              <span style={{ fontSize: "11px", color: "#484f58" }}>Grid intensity</span>
              <span style={{ fontSize: "13px", fontWeight: "600", color: band.color }}>{adjustedIntensity.toFixed(1)} gCO₂/kWh</span>
              <span style={{ fontSize: "11px", color: "#484f58" }}>is being broadcast to the LCA Module in real time.</span>
              <span style={{ fontSize: "10px", color: apiOnline ? "#4ade80" : "#484f58", marginLeft: "auto" }}>
                {apiOnline ? "🐍 Python API" : "📐 Local calc"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LCA MODULE  (exactly as your original — no changes)
// ══════════════════════════════════════════════════════════════════════════════
function LCAModule({ gridIntensityFromEnergy }) {
  const [fleet, setFleet] = useState(PRESETS_FLEET.europe_2023.fleet);
  const [preset, setPreset] = useState("europe_2023");
  const [renewableRate, setRenewable] = useState(30);
  const [avgAge, setAvgAge] = useState(9);
  const [turnover, setTurnover] = useState("medium");
  const [scenario, setScenario] = useState(2030);
  const [activeTab, setActiveTab] = useState("fleet");
  const [phevUtility, setPhevUtility] = useState(40);

  const gridIntensity = gridIntensityFromEnergy;

  const total = useMemo(() => Object.values(fleet).reduce((a, b) => a + b, 0), [fleet]);
  const norm = useMemo(() => normalize(fleet), [fleet]);

  const bevUsePhase = useMemo(() => {
    const gridFraction = 1 - renewableRate / 100;
    return gridIntensity * gridFraction * 0.20;
  }, [gridIntensity, renewableRate]);

  const phevUsePhase = useMemo(() => {
    const elec = phevUtility / 100;
    return elec * bevUsePhase + (1 - elec) * LCA_FACTORS.phev.use;
  }, [phevUtility, bevUsePhase]);

  const ageFactor = useMemo(() => 1 + (avgAge - 5) * 0.005, [avgAge]);

  const lcaBreakdown = useMemo(() => {
    let mfg = 0, infra = 0, use = 0, disposal = 0;
    for (const [key, pct] of Object.entries(norm)) {
      const f = LCA_FACTORS[key];
      const w = pct / 100;
      const usePh = key === "bev" ? bevUsePhase : key === "phev" ? phevUsePhase : f.use * ageFactor;
      mfg += w * f.mfg; infra += w * f.infra; use += w * usePh; disposal += w * f.disposal;
    }
    return { mfg, infra, use, disposal, total: mfg + infra + use + disposal };
  }, [norm, bevUsePhase, phevUsePhase, ageFactor]);

  const totalFleetGCO2km = lcaBreakdown.total;
  const band = getScoreBand(totalFleetGCO2km, LCA_SCORE_BANDS);
  const energyBand = getScoreBand(gridIntensity, ENERGY_SCORE_BANDS);
  const evShare = useMemo(() => (norm.bev || 0) + (norm.fcev || 0) + (norm.phev || 0), [norm]);
  const fossilShare = useMemo(() => (norm.icev_gasoline || 0) + (norm.icev_diesel || 0) + (norm.cng || 0), [norm]);

  const donutSegments = useMemo(() => {
    let cum = 0;
    return Object.entries(TECH_FLEET).map(([key, info]) => {
      const pct = norm[key] / 100;
      const angle = pct * 360;
      const start = cum;
      cum += angle;
      return { key, ...info, pct, startAngle: start, angle };
    });
  }, [norm]);

  const phaseColors = { mfg: "#38bdf8", infra: "#818cf8", use: "#f97316", disposal: "#a78bfa" };
  const phaseLabels = { mfg: "Manufacturing", infra: "Transport & Infra", use: "Use Phase", disposal: "Disposal" };

  const phaseDonut = useMemo(() => {
    const tot = lcaBreakdown.total || 1;
    let cum = 0;
    return Object.entries({ mfg: lcaBreakdown.mfg, infra: lcaBreakdown.infra, use: lcaBreakdown.use, disposal: lcaBreakdown.disposal }).map(([key, val]) => {
      const angle = (val / tot) * 360;
      const start = cum;
      cum += angle;
      return { key, val, startAngle: start, angle };
    });
  }, [lcaBreakdown]);

  function applyPreset(key) { setPreset(key); setFleet({ ...PRESETS_FLEET[key].fleet }); }
  function updateFleet(key, val) { setPreset("custom"); setFleet(prev => ({ ...prev, [key]: Number(val) })); }

  return (
    <div>
      <div style={{ margin: "0", padding: "8px 22px", background: "#0d1f12", borderBottom: "1px solid #1a4d2e", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", flexShrink: 0 }} />
        <span style={{ fontSize: "10px", letterSpacing: ".12em", color: "#4ade80" }}>LIVE ← ENERGY MODULE</span>
        <span style={{ fontSize: "11px", color: "#484f58" }}>Grid Intensity:</span>
        <span style={{ fontSize: "14px", fontWeight: "600", color: energyBand.color }}>{gridIntensity.toFixed(1)}</span>
        <span style={{ fontSize: "10px", color: "#484f58" }}>gCO₂/kWh</span>
        <span style={{ fontSize: "10px", color: "#484f58", marginLeft: "8px" }}>→ BEV use phase:</span>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#4ade80" }}>{bevUsePhase.toFixed(1)}</span>
        <span style={{ fontSize: "10px", color: "#484f58" }}>gCO₂/km</span>
      </div>

      <div style={{ borderBottom: "1px solid #21262d", padding: "0 22px", display: "flex" }}>
        {[["fleet", "Technology Fleet"], ["lifecycle", "Vehicle Lifecycle Rates"], ["output", "LCA Output"]].map(([id, lbl]) => (
          <button key={id} className={`tab${activeTab === id ? " on" : ""}`} onClick={() => setActiveTab(id)}>{lbl}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", padding: "0 0 0 12px" }}>
          <span style={{ fontSize: "10px", color: "#484f58" }}>YEAR</span>
          <select value={scenario} onChange={e => setScenario(Number(e.target.value))}
            style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", padding: "4px 8px", borderRadius: "4px", fontFamily: "inherit", fontSize: "11px" }}>
            {[2023, 2025, 2030, 2035, 2040, 2045, 2050].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding: "22px" }}>
        {activeTab === "fleet" && (
          <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "20px" }}>
            <div>
              <div className="card" style={{ marginBottom: "16px", borderTop: "3px solid #4ade80" }}>
                <div className="lbl">↙ LCA Inputs</div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#8b949e" }}>Renewable Rate (EV) — % año a año</span>
                    <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600" }}>{renewableRate}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={renewableRate}
                    onChange={e => setRenewable(Number(e.target.value))}
                    style={{ background: `linear-gradient(to right,#4ade80 ${renewableRate}%,#30363d ${renewableRate}%)` }} />
                </div>
                <div style={{ background: "#0d1f12", borderRadius: "6px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
                    <span style={{ fontSize: "11px", color: "#484f58" }}>Grid Intensity — from Energy Module</span>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: energyBand.color }}>{gridIntensity.toFixed(1)} gCO₂/kWh</span>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div className="lbl">Fleet Presets</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Object.entries(PRESETS_FLEET).map(([k, p]) => (
                    <button key={k} className={`preset${preset === k ? " on" : ""}`} onClick={() => applyPreset(k)}>{p.label}</button>
                  ))}
                </div>
              </div>

              {Math.abs(total - 100) > 1 && (
                <div style={{ background: "#2d1f0e", border: "1px solid #7a4f1e", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "11px", color: "#e3a03f" }}>
                  ⚠ Fleet sums to {total.toFixed(1)}% — auto-normalised.
                </div>
              )}

              <div style={{ display: "grid", gap: "10px" }}>
                {Object.entries(TECH_FLEET).map(([key, info]) => {
                  const pct = norm[key];
                  const f = LCA_FACTORS[key];
                  const usePh = key === "bev" ? bevUsePhase : key === "phev" ? phevUsePhase : f.use;
                  const tot = f.mfg + f.infra + usePh + f.disposal;
                  return (
                    <div key={key} className="card" style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: info.color }} />
                          <span style={{ fontSize: "12px" }}>{info.label}</span>
                          <span style={{ fontSize: "10px", color: "#484f58" }}>{tot.toFixed(0)} gCO₂/km</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "11px", color: "#58a6ff" }}>{pct.toFixed(1)}%</span>
                          <span style={{ fontSize: "10px", color: "#484f58", minWidth: "70px", textAlign: "right" }}>+{((pct / 100) * tot).toFixed(1)} avg</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="range" min="0" max="100" step="1" value={fleet[key]}
                          onChange={e => updateFleet(key, e.target.value)}
                          style={{ background: `linear-gradient(to right,${info.color} ${fleet[key]}%,#30363d ${fleet[key]}%)` }} />
                        <style>{`input[type=range]::-webkit-slider-thumb{background:${info.color}}`}</style>
                        <input type="number" min="0" max="100" value={fleet[key]}
                          onChange={e => updateFleet(key, e.target.value)}
                          style={{ width: "50px", background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", borderRadius: "4px", padding: "3px 6px", fontFamily: "inherit", fontSize: "11px", textAlign: "right" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="lbl">Technology Fleet Mix</div>
                <svg width="280" height="280" viewBox="0 0 190 190">
                  {donutSegments.map(seg => seg.pct > 0.001 && (
                    <path key={seg.key} d={arcPath(95, 95, 80, seg.startAngle, seg.startAngle + seg.angle)}
                      fill={seg.color} stroke="#0d1117" strokeWidth="2" style={{ transition: "all .3s" }}>
                      <title>{seg.label}: {norm[seg.key].toFixed(1)}%</title>
                    </path>
                  ))}
                  <circle cx="95" cy="95" r="52" fill="#0d1117" />
                  <text x="95" y="88" textAnchor="middle" fill={band.color} fontSize="18" fontWeight="600" fontFamily="IBM Plex Mono">{totalFleetGCO2km.toFixed(0)}</text>
                  <text x="95" y="101" textAnchor="middle" fill="#484f58" fontSize="7.5" fontFamily="IBM Plex Mono">gCO₂/km avg</text>
                  <text x="95" y="114" textAnchor="middle" fill={band.color} fontSize="8" fontFamily="IBM Plex Mono">{band.label}</text>
                </svg>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "4px" }}>
                  {Object.entries(TECH_FLEET).map(([k, info]) => norm[k] > 0.5 && (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "7px", height: "7px", borderRadius: "2px", background: info.color }} />
                      <span style={{ fontSize: "10px", color: "#8b949e" }}>{info.label} <span style={{ color: info.color }}>{norm[k].toFixed(0)}%</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="lbl">Fleet Summary</div>
                {[
                  { l: "Fleet avg LCA intensity", v: `${totalFleetGCO2km.toFixed(1)} gCO₂/km`, c: band.color },
                  { l: "EV + PHEV share", v: `${evShare.toFixed(1)}%`, c: "#4ade80" },
                  { l: "Fossil share", v: `${fossilShare.toFixed(1)}%`, c: fossilShare > 50 ? "#ef4444" : "#f97316" },
                  { l: "BEV effective use phase", v: `${bevUsePhase.toFixed(1)} gCO₂/km`, c: "#38bdf8" },
                  { l: "PHEV blended use phase", v: `${phevUsePhase.toFixed(1)} gCO₂/km`, c: "#a3e635" },
                ].map(item => (
                  <div key={item.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d" }}>
                    <span style={{ fontSize: "11px", color: "#8b949e" }}>{item.l}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: item.c }}>{item.v}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="lbl">LCA Fleet Intensity Scale</div>
                {LCA_SCORE_BANDS.map(b => (
                  <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: b.color }} />
                    <span style={{ fontSize: "11px", color: b.color, width: "68px" }}>{b.label}</span>
                    <span style={{ fontSize: "10px", color: "#484f58" }}>{b.max === Infinity ? ">120" : `≤${b.max}`} gCO₂/km</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "lifecycle" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="card" style={{ borderTop: "3px solid #58a6ff" }}>
                <div className="lbl">↙ Age Fleet & Technology Input</div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#8b949e" }}>Fleet Average Age</span>
                    <span style={{ fontSize: "11px", color: "#f5c842", fontWeight: "600" }}>{avgAge} years</span>
                  </div>
                  <input type="range" min="1" max="25" step="0.5" value={avgAge}
                    onChange={e => setAvgAge(Number(e.target.value))}
                    style={{ background: `linear-gradient(to right,#f5c842 ${(avgAge - 1) / 24 * 100}%,#30363d ${(avgAge - 1) / 24 * 100}%)` }} />
                </div>
                <div style={{ background: "#0d1117", borderRadius: "6px", padding: "10px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "#8b949e" }}>Age degradation factor</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#f5c842" }}>×{ageFactor.toFixed(3)}</span>
                </div>
              </div>

              <div className="card" style={{ borderTop: "3px solid #818cf8" }}>
                <div className="lbl">↙ Turnover Curve</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                  {Object.entries(TURNOVER_CURVES).map(([k, c]) => (
                    <button key={k} onClick={() => setTurnover(k)}
                      style={{ background: turnover === k ? "#1c2a3a" : "#0d1117", border: `1px solid ${turnover === k ? "#818cf8" : "#21262d"}`, borderRadius: "6px", padding: "10px 14px", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .2s" }}>
                      <span style={{ fontSize: "12px", color: turnover === k ? "#818cf8" : "#8b949e" }}>{c.label}</span>
                      <span style={{ fontSize: "10px", color: "#484f58" }}>T½ = {c.halflife} yr</span>
                    </button>
                  ))}
                </div>
                <div style={{ background: "#0d1117", borderRadius: "6px", padding: "10px" }}>
                  <div style={{ fontSize: "10px", color: "#484f58", marginBottom: "4px" }}>PHEV Electric Mode Utility Factor</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#8b949e" }}>% km in electric mode</span>
                    <span style={{ fontSize: "11px", color: "#a3e635", fontWeight: "600" }}>{phevUtility}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={phevUtility}
                    onChange={e => setPhevUtility(Number(e.target.value))}
                    style={{ background: `linear-gradient(to right,#a3e635 ${phevUtility}%,#30363d ${phevUtility}%)` }} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="lbl">LCA Phase Breakdown (Fleet Average)</div>
                <svg width="240" height="240" viewBox="0 0 190 190">
                  {phaseDonut.map(seg => seg.val > 0.001 && (
                    <path key={seg.key} d={arcPath(95, 95, 78, seg.startAngle, seg.startAngle + seg.angle)}
                      fill={phaseColors[seg.key]} stroke="#0d1117" strokeWidth="2" style={{ transition: "all .3s" }}>
                      <title>{phaseLabels[seg.key]}: {seg.val.toFixed(1)} gCO₂/km</title>
                    </path>
                  ))}
                  <circle cx="95" cy="95" r="50" fill="#0d1117" />
                  <text x="95" y="90" textAnchor="middle" fill={band.color} fontSize="19" fontWeight="600" fontFamily="IBM Plex Mono">{lcaBreakdown.total.toFixed(0)}</text>
                  <text x="95" y="103" textAnchor="middle" fill="#484f58" fontSize="7.5" fontFamily="IBM Plex Mono">gCO₂/km</text>
                  <text x="95" y="116" textAnchor="middle" fill={band.color} fontSize="8" fontFamily="IBM Plex Mono">WTW Total</text>
                </svg>
              </div>

              <div className="card">
                <div className="lbl">Manufacturing · Transport & Infra · Use Phase · Disposal</div>
                {Object.entries({ mfg: lcaBreakdown.mfg, infra: lcaBreakdown.infra, use: lcaBreakdown.use, disposal: lcaBreakdown.disposal }).map(([key, val]) => {
                  const pct = (val / (lcaBreakdown.total || 1)) * 100;
                  return (
                    <div key={key} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                        <span style={{ color: phaseColors[key] }}>{phaseLabels[key]}</span>
                        <span style={{ color: "#c9d1d9", fontWeight: "600" }}>{val.toFixed(2)} <span style={{ color: "#484f58", fontWeight: "400" }}>gCO₂/km</span></span>
                      </div>
                      <div style={{ height: "6px", background: "#21262d", borderRadius: "3px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: phaseColors[key], borderRadius: "3px", transition: "width .3s" }} />
                      </div>
                      <div style={{ fontSize: "10px", color: "#484f58", marginTop: "2px" }}>{pct.toFixed(1)}% of total lifecycle</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "output" && (
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="card" style={{ background: "#0d1a14", borderColor: band.color + "55", borderTopWidth: "3px", borderTopColor: band.color }}>
              <div className="lbl">LCA Module Output · Scenario {scenario}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-end" }}>
                {[
                  { lbl: "Fleet Average LCA", val: totalFleetGCO2km.toFixed(1), unit: "gCO₂eq / km", color: band.color },
                  { lbl: "Manufacturing Phase", val: lcaBreakdown.mfg.toFixed(1), unit: "gCO₂eq / km", color: "#38bdf8" },
                  { lbl: "Use Phase", val: lcaBreakdown.use.toFixed(1), unit: "gCO₂eq / km", color: "#f97316" },
                  { lbl: "Disposal + Infra", val: (lcaBreakdown.disposal + lcaBreakdown.infra).toFixed(1), unit: "gCO₂eq / km", color: "#a78bfa" },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-end", gap: "20px" }}>
                    {idx > 0 && <div style={{ color: "#21262d", fontSize: "32px", paddingBottom: "10px" }}>|</div>}
                    <div>
                      <div style={{ fontSize: "10px", color: "#484f58", marginBottom: "4px" }}>{item.lbl}</div>
                      <div style={{ fontSize: "40px", fontWeight: "600", letterSpacing: "-1px", color: item.color }}>{item.val}</div>
                      <div style={{ fontSize: "12px", color: "#484f58" }}>{item.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="card" style={{ borderTop: "3px solid #f5c842" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#f5c842", marginBottom: "4px" }}>→ Vehicle Use Module</div>
                {[
                  { n: "Fleet avg LCA", v: `${totalFleetGCO2km.toFixed(1)} gCO₂/km`, c: band.color },
                  { n: "BEV use phase", v: `${bevUsePhase.toFixed(1)} gCO₂/km`, c: "#38bdf8" },
                  { n: "PHEV blended", v: `${phevUsePhase.toFixed(1)} gCO₂/km`, c: "#a3e635" },
                  { n: "Fleet EV share", v: `${evShare.toFixed(1)}%`, c: "#4ade80" },
                ].map(r => (
                  <div key={r.n} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d" }}>
                    <span style={{ fontSize: "11px", color: "#8b949e" }}>{r.n}</span>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ borderTop: "3px solid #4ade80" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#4ade80", marginBottom: "4px" }}>→ Fleet Output (g CO₂ / pmt)</div>
                {[
                  { n: "gCO₂/km fleet avg", v: `${totalFleetGCO2km.toFixed(1)}`, c: band.color },
                  { n: "gCO₂/pmt (1.5 occ.)", v: `${(totalFleetGCO2km / 1.5).toFixed(1)}`, c: "#4ade80" },
                  { n: "Mfg share", v: `${((lcaBreakdown.mfg / (lcaBreakdown.total || 1)) * 100).toFixed(1)}%`, c: "#38bdf8" },
                  { n: "Scenario year", v: `${scenario}`, c: "#c9d1d9" },
                ].map(r => (
                  <div key={r.n} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d" }}>
                    <span style={{ fontSize: "11px", color: "#8b949e" }}>{r.n}</span>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
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
export default function MobilityCarbonModel() {
  const [activeModule, setActiveModule] = useState("energy");
  const [gridIntensityShared, setGridIntensity] = useState(233);

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#0d1117", color: "#c9d1d9", minHeight: "100vh" }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ borderBottom: "1px solid #21262d", padding: "6px 10px", display: "flex", alignItems: "center", gap: "10px", background: "#161b22" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#58a6ff", boxShadow: "0 0 8px #58a6ffaa" }} />
        <span style={{ fontSize: "10px", letterSpacing: ".15em", color: "#484f58" }}>MOBILITY CARBON MODEL</span>
        <span style={{ color: "#30363d" }}>›</span>
        <span style={{ fontSize: "10px", letterSpacing: ".15em", color: "#c9d1d9" }}>INTEGRATED PLATFORM</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
          <span style={{ fontSize: "10px", color: "#484f58" }}>Grid →LCA sync active:</span>
          <span style={{ fontSize: "11px", fontWeight: "600", color: "#4ade80" }}>{gridIntensityShared.toFixed(1)} gCO₂/kWh</span>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #21262d", background: "#0d1117", display: "flex" }}>
        <button className={`mod-tab${activeModule === "energy" ? " active-energy" : ""}`} onClick={() => setActiveModule("energy")}>
          ⚡ Energy Module
        </button>
        <button className={`mod-tab${activeModule === "lca" ? " active-lca" : ""}`} onClick={() => setActiveModule("lca")}>
          ♻ LCA Module
        </button>
        <button className={`mod-tab${activeModule === "vehicle" ? " active-vehicle" : ""}`} onClick={() => setActiveModule("vehicle")}>
          🚗 Vehicle Use Module
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 20px", borderLeft: "1px solid #21262d", marginLeft: "4px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
          <span style={{ fontSize: "9px", letterSpacing: ".1em", color: "#4ade80" }}>ENERGY → LCA LIVE</span>
        </div>
      </div>

      {activeModule === "energy" && <EnergyModule onGridIntensityChange={setGridIntensity} />}
      {activeModule === "lca" && <LCAModule gridIntensityFromEnergy={gridIntensityShared} />}
      {activeModule === "vehicle" && <VehicleUseModule />}
    </div>
  );
}
