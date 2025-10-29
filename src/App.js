import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import logo from "./assets/logo.png"; // 


const SG_BLUE = "#305496";
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const STORAGE_KEY_TARIFFE = "sgimpianti_tariffe_operai_v1";

// Tariffe di default (nomi + costi)
const DEFAULT_WORKERS =  [
  { name: "DOMENICO GIOVINAZZO", normale: 17.11, trasferta: 20.98 },
  { name: "DAVIDE AGOSTINO", normale: 17.75, trasferta: 21.72 },
  { name: "GIUSEPPE GALLUCCIO", normale: 14.16, trasferta: 18.03 },
  { name: "GIUSEPPE SCAGLIONE", normale: 17.75, trasferta: 21.72 },
  { name: "VINCENZO IANNIZZI", normale: 17.11, trasferta: 20.98 },
  { name: "EMMANUEL SCAGLIONE", normale: 14.16, trasferta: 18.03 },
  { name: "MICHELE PETULLA'", normale: 18.8, trasferta: 22.67 },
  { name: "DJAMEL BOUMAZA", normale: 14.16, trasferta: 18.03 },
  { name: "DOMENICO CUTRUPI", normale: 14.16, trasferta: 18.03 },
  { name: "ANGELO SCAGLIONE", normale: 18.8, trasferta: 22.67 },
  { name: "SILVIO GALLUCCIO", normale: 18.8, trasferta: 22.67 },
];

function Header() {
  return (
    <div
      className="header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        borderBottom: "3px solid #305496",
        paddingBottom: "10px",
        marginBottom: "20px",
      }}
    >
      <img
        src={logo}
        alt="SG Impianti Logo"
        style={{ height: "80px", width: "auto", borderRadius: "10px" }}
      />
      <div>
        <h1 style={{ margin: 0, color: "#305496" }}>
          SG IMPIANTI TECNOLOGICI SNC di Scaglione Angelo & Galluccio Silvio
        </h1>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          Via Giuseppe Impastato, 27 — 89024 Polistena (RC) — P.IVA: 03118920804 — PEC:
          sg-impianti@pec.it — SDI: M5UXCR1
        </p>
      </div>
    </div>
  );
}


export default function App() {
  // --- Operai + salvataggio automatico ---
  const [workers, setWorkers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TARIFFE);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_WORKERS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TARIFFE, JSON.stringify(workers));
  }, [workers]);

  // --- Sezione giornale ---
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [site, setSite] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  const [dayRows, setDayRows] = useState(
    workers.map((w) => ({ name: w.name, tipo: "Normale", ore: 0, nota: "" }))
  );

  useEffect(() => {
    setDayRows((prev) => {
      const byName = new Map(prev.map((r) => [r.name, r]));
      return workers.map(
        (w) => byName.get(w.name) ?? { name: w.name, tipo: "Normale", ore: 0, nota: "" }
      );
    });
  }, [workers]);

  // --- Spese ---
  const [expenses, setExpenses] = useState([]);
  const dayExpenses = useMemo(() => expenses.filter((e) => e.date === date), [expenses, date]);

  const personaleTot = useMemo(() => {
    return dayRows.reduce((sum, r) => {
      const w = workers.find((w) => w.name === r.name);
      const cost =
        r.tipo === "Trasferta" ? Number(w?.trasferta || 0) : Number(w?.normale || 0);
      return sum + (Number(r.ore) || 0) * cost;
    }, 0);
  }, [dayRows, workers]);

  const speseTot = useMemo(
    () => dayExpenses.reduce((s, e) => s + Number(e.importo || 0), 0),
    [dayExpenses]
  );

  const giornoTot = personaleTot + speseTot;

  
  const setTipo = (name, tipo) => {
    setDayRows((prev) => prev.map((r) => (r.name === name ? { ...r, tipo } : r)));
  };

  const incOre = (name, delta) => {
    setDayRows((prev) =>
      prev.map((r) =>
        r.name === name ? { ...r, ore: Math.max(0, (Number(r.ore) || 0) + delta) } : r
      )
    );
  };

  const setOre = (name, ore) => {
    const n = Number(ore);
    setDayRows((prev) =>
      prev.map((r) => (r.name === name ? { ...r, ore: isNaN(n) ? 0 : n } : r))
    );
  };

  const setNotaRiga = (name, txt) => {
    setDayRows((prev) => prev.map((r) => (r.name === name ? { ...r, nota: txt } : r)));
  };

  // --- Gestione spese ---
  const addExpense = (partial = {}) => {
    const id = crypto.randomUUID();
    setExpenses((prev) => [
      ...prev,
      {
        id,
        date,
        tipo: partial.tipo || "Materiali",
        descrizione: partial.descrizione || "",
        importo: Number(partial.importo || 0),
        fileName: partial.fileName || "",
        fileUrl: partial.fileUrl || "",
      },
    ]);
  };

  const removeExpense = (id) => setExpenses((prev) => prev.filter((e) => e.id !== id));

  const handleFile = (id, file) => {
    const url = URL.createObjectURL(file);
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, fileName: file.name, fileUrl: url } : e
      )
    );
  };

  // --- Salvataggio & export ---
  const salvaSuFile = () => {
    const dati = { date, site, location, workers, dayRows, expenses, note };
    const blob = new Blob([JSON.stringify(dati, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `giornale_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const esportaExcel = () => {
    const wsData = [];
    wsData.push(["Data", date]);
    wsData.push(["Cantiere", site]);
    wsData.push(["Località", location]);
    wsData.push([]);
    wsData.push(["Elenco Operai"]);
    wsData.push(["Operaio", "Tipo", "Ore", "Costo orario", "Totale", "Note"]);

    dayRows.forEach((r) => {
      const w = workers.find((w) => w.name === r.name);
      const costo =
        r.tipo === "Trasferta" ? Number(w?.trasferta || 0) : Number(w?.normale || 0);
      const totale = (Number(r.ore) || 0) * costo;
      wsData.push([r.name, r.tipo, r.ore, costo, totale, r.nota || ""]);
    });

    wsData.push([]);
    wsData.push(["Totale Personale (€)", personaleTot]);
    wsData.push([]);
    wsData.push(["Spese Giornaliere"]);
    wsData.push(["Tipo", "Descrizione", "Importo (€)", "Documento"]);
    dayExpenses.forEach((e) => {
      wsData.push([e.tipo, e.descrizione, e.importo, e.fileName || ""]);
    });

    wsData.push([]);
    wsData.push(["Totale Spese (€)", speseTot]);
    wsData.push([]);
    wsData.push(["Totale Giornata (€)", giornoTot]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Giornale");
    XLSX.writeFile(wb, `Giornale_${date}.xlsx`);
  };

  const caricaDaFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dati = JSON.parse(e.target.result);
        setDate(dati.date || "");
        setSite(dati.site || "");
        setLocation(dati.location || "");
        setWorkers(dati.workers || workers);
        setDayRows(dati.dayRows || dayRows);
        setExpenses(dati.expenses || []);
        setNote(dati.note || "");
        alert("✅ Dati caricati correttamente!");
      } catch (err) {
        alert("❌ Errore nel file selezionato.");
      }
    };
    reader.readAsText(file);
  };

  const [activeTab, setActiveTab] = useState("giornale");

  // --- INTERFACCIA ---
  return (
    <div className="container">
      <Header />
      <div className="tabs">
        {["giornale", "operai", "archivio", "impostazioni"].map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "giornale"
              ? "Giornale"
              : tab === "operai"
              ? "Operai"
              : tab === "archivio"
              ? "Spese & PDF"
              : "Impostazioni"}
          </button>
        ))}
      </div>

      {/* --- GIORNALE --- */}
      {activeTab === "giornale" && (
        <>
          <div className="card">
            <h3>Dati giornata</h3>
            <div className="row">
              <div>
                <div>Data</div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <div>Cantiere</div>
                <input
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="Nome cantiere"
                />
              </div>
              <div>
                <div>Località</div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Comune / Indirizzo"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Personale</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Operaio</th>
                  <th>Tipo Giorno</th>
                  <th>Ore</th>
                  <th>Costo orario</th>
                  <th>Totale</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((r) => {
                  const w = workers.find((w) => w.name === r.name);
                  const costo =
                    r.tipo === "Trasferta"
                      ? Number(w?.trasferta || 0)
                      : Number(w?.normale || 0);
                  const totale = (Number(r.ore) || 0) * costo;
                  return (
                    <tr key={r.name}>
                      <td>
                        <strong>{r.name}</strong>
                      </td>
                      <td>
                        <select value={r.tipo} onChange={(e) => setTipo(r.name, e.target.value)}>
                          <option>Normale</option>
                          <option>Trasferta</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button className="small" onClick={() => incOre(r.name, -1)}>
                            -
                          </button>
                          <input
                            value={r.ore}
                            onChange={(e) => setOre(r.name, e.target.value)}
                            style={{ width: 80, textAlign: "center" }}
                          />
                          <button className="small" onClick={() => incOre(r.name, +1)}>
                            +
                          </button>
                        </div>
                      </td>
                      <td>{euro.format(costo)}</td>
                      <td>
                        <strong style={{ color: SG_BLUE }}>{euro.format(totale)}</strong>
                      </td>
                      <td>
                        <input
                          value={r.nota}
                          onChange={(e) => setNotaRiga(r.name, e.target.value)}
                          placeholder="Note..."
                          style={{ background: "#fff" }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <div className="kpi">
                <span>Totale Personale:</span>
                <strong>{euro.format(personaleTot)}</strong>
              </div>
            </div>
          </div>

          {/* --- SPESE --- */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Spese & Documenti (per il giorno selezionato)</h3>
              <button className="primary" onClick={() => addExpense()}>
                + Aggiungi spesa
              </button>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrizione</th>
                  <th>Importo</th>
                  <th>Documento (PDF)</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {dayExpenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <select
                        value={e.tipo}
                        onChange={(ev) =>
                          setExpenses((prev) =>
                            prev.map((x) =>
                              x.id === e.id ? { ...x, tipo: ev.target.value } : x
                            )
                          )
                        }
                      >
                        {"Carburante,Materiali,Extra,Pasti,Pernottamenti,Pedaggi,Noleggi,Forniture"
                          .split(",")
                          .map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={e.descrizione}
                        onChange={(ev) =>
                          setExpenses((prev) =>
                            prev.map((x) =>
                              x.id === e.id ? { ...x, descrizione: ev.target.value } : x
                            )
                          )
                        }
                        placeholder="Dettagli"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={e.importo}
                        onChange={(ev) =>
                          setExpenses((prev) =>
                            prev.map((x) =>
                              x.id === e.id
                                ? { ...x, importo: Number(ev.target.value) }
                                : x
                            )
                          )
                        }
                        style={{ width: 140 }}
                      />
                    </td>
                    <td>
                      {e.fileUrl ? (
                        <a
                          href={e.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#1d4ed8",
                            textDecoration: "underline",
                          }}
                        >
                          {e.fileName}
                        </a>
                      ) : (
                        <label style={{ color: "#1d4ed8", cursor: "pointer" }}>
                          Carica PDF
                          <input
                            type="file"
                            accept="application/pdf"
                            style={{ display: "none" }}
                            onChange={(ev) => {
                              const f = ev.target.files?.[0];
                              if (f) handleFile(e.id, f);
                            }}
                          />
                        </label>
                      )}
                    </td>
                    <td>
                      <button className="danger small" onClick={() => removeExpense(e.id)}>
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <div className="kpi">
                <span>Totale Spese:</span>
                <strong>{euro.format(speseTot)}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Riepilogo giornata</h3>
            <div className="row">
              <div className="kpi">
                <span>Personale</span>
                <strong>{euro.format(personaleTot)}</strong>
              </div>
              <div className="kpi">
                <span>Spese</span>
                <strong>{euro.format(speseTot)}</strong>
              </div>
              <div className="kpi">
                <span>Totale</span>
                <strong>{euro.format(giornoTot)}</strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- OPERAI --- */}
{activeTab === "operai" && (
  <div className="card">
    <h3>Tariffe Operai (non modificabili)</h3>
    <table className="table">
      <thead>
        <tr>
          <th>Operaio</th>
          <th>Costo orario (Normale)</th>
          <th>Costo orario (Trasferta)</th>
        </tr>
      </thead>
      <tbody>
        {workers.map((w) => (
          <tr key={w.name}>
            <td><strong>{w.name}</strong></td>
            <td>{new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(w.normale)}</td>
            <td>{new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(w.trasferta)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="footer-note">⚙️ Le tariffe possono essere aggiornate solo nel codice sorgente.</div>
  </div>
)}


      {/* --- ARCHIVIO --- */}
      {activeTab === "archivio" && (
        <div className="card">
          <h3>Archivio Spese & PDF</h3>
          {expenses.length === 0 ? (
            <div className="footer-note">Nessuna spesa registrata.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrizione</th>
                  <th>Importo</th>
                  <th>Documento</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.tipo}</td>
                    <td>{e.descrizione}</td>
                    <td>{euro.format(Number(e.importo || 0))}</td>
                    <td>
                      {e.fileUrl ? (
                        <a
                          href={e.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#1d4ed8", textDecoration: "underline" }}
                        >
                          {e.fileName}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button className="danger small" onClick={() => removeExpense(e.id)}>
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- IMPOSTAZIONI --- */}
      {activeTab === "impostazioni" && (
        <div className="card">
          <h3>Impostazioni & Utilità</h3>
          <div className="row">
            <div>
              <div>Data predefinita</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <div>Nome cantiere</div>
              <input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="Nome cantiere"
              />
            </div>
            <div>
              <div>Località</div>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Comune / Indirizzo"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => {
                setDayRows(
                  workers.map((w) => ({ name: w.name, tipo: "Normale", ore: 0, nota: "" }))
                );
                setNote("");
              }}
            >
              Reset giornata
            </button>

            <button
              onClick={() => {
                setWorkers(DEFAULT_WORKERS);
                setExpenses([]);
                setDayRows(
                  workers.map((w) => ({ name: w.name, tipo: "Normale", ore: 0, nota: "" }))
                );
                setNote("");
                setSite("");
                setLocation("");
              }}
            >
              Reset completo
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={salvaSuFile}>💾 Salva giornale su file</button>
            <button className="primary" onClick={esportaExcel}>
              📤 Esporta in Excel
            </button>

            <label
              style={{
                cursor: "pointer",
                background: "#e5e7eb",
                padding: "8px 12px",
                borderRadius: "10px",
              }}
            >
              📂 Carica giornale
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) caricaDaFile(file);
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
