
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import logo from "./assets/logo.png";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SG_BLUE = "#305496";
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const STORAGE_KEY_TARIFFE = "sgimpianti_tariffe_operai_v1";

const DEFAULT_WORKERS = [
  { name: "DOMENICO GIOVINAZZO", normale: 18.55, trasferta: 22.41 },
  { name: "DAVIDE AGOSTINO", normale: 19.17, trasferta: 23.05 },
  { name: "GIUSEPPE GALLUCCIO", normale: 15.59, trasferta: 19.46 },
  { name: "GIUSEPPE SCAGLIONE", normale: 20.23, trasferta: 24.10 },
  { name: "VINCENZO IANNIZZI", normale: 18.55, trasferta: 22.41 },
  { name: "EMMANUEL SCAGLIONE", normale: 15.59, trasferta: 19.46 },
  { name: "MICHELE PETULLA'", normale: 20.23, trasferta: 24.10 },
  { name: "DJAMEL BOUMAZA", normale: 15.59, trasferta: 19.46 },
  { name: "DOMENICO CUTRUPI", normale: 15.59, trasferta: 19.46 },
  { name: "ANGELO SCAGLIONE", normale: 20.23, trasferta: 24.10 },
  { name: "SILVIO GALLUCCIO", normale: 20.23, trasferta: 24.10 },
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

  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [site, setSite] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  const [dayRows, setDayRows] = useState(
    workers.map((w) => ({ name: w.name, tipo: "Normale", ore: 0, nota: "" }))
  );
	// 🚐 Gestione veicoli aziendali
const [vanPlate, setVanPlate] = useState("");
const [driverMorning, setDriverMorning] = useState("");
const [driverAfternoon, setDriverAfternoon] = useState("");

  useEffect(() => {
    setDayRows((prev) => {
      const byName = new Map(prev.map((r) => [r.name, r]));
      return workers.map(
        (w) => byName.get(w.name) ?? { name: w.name, tipo: "Normale", ore: 0, nota: "" }
      );
    });
  }, [workers]);

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
      prev.map((e) => (e.id === id ? { ...e, fileName: file.name, fileUrl: url } : e))
    );
  };

  const salvaSuFile = () => {
    const dati = { date, site, location, vanPlate, driverMorning, driverAfternoon, workers, dayRows, expenses, note };
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: "application/json" });
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
    wsData.push(["Targa Furgone", vanPlate]);
wsData.push(["Conducente Mattina", driverMorning]);
wsData.push(["Conducente Pomeriggio", driverAfternoon]);
wsData.push([]);

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

  // ✅ FUNZIONE COMPLETA PDF (con logo, intestazione e multipagina)
  const esportaPDF = () => {
    const elemento = document.querySelector(".container");
    html2canvas(elemento, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      // Intestazione con logo e dati principali
      pdf.addImage(logo, "PNG", 10, 10, 40, 20);
      pdf.setFontSize(14);
      pdf.text("SG IMPIANTI TECNOLOGICI SNC", 60, 18);
      pdf.setFontSize(10);
      pdf.text(`Data: ${date}`, 60, 25);
      pdf.text(`Cantiere: ${site || "-"}`, 60, 30);
      pdf.text(`Località: ${location || "-"}`, 60, 35);
      pdf.text(`Furgone: ${vanPlate || "-"}`, 60, 40);
      pdf.text(`Mattina: ${driverMorning || "-"}`, 60, 45);
      pdf.text(`Pomeriggio: ${driverAfternoon || "-"}`, 60, 50);


      // Calcolo dimensioni multipagina
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const yStart = 60;
      let y = 0;
      while (y < imgHeight) {
        pdf.addImage(imgData, "PNG", 0, yStart - y, imgWidth, imgHeight);
        y += pageHeight - yStart;
        if (y < imgHeight) pdf.addPage();
      }

      pdf.save(`Giornale_${date}.pdf`);
    });
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
	  return (
    <div className="container">
      <Header />

      {/* Tabs */}
      <div className="tabs" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["giornale", "operai", "archivio", "impostazioni"].map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: activeTab === tab ? `2px solid ${SG_BLUE}` : "1px solid #ddd",
              background: activeTab === tab ? "#e9efff" : "#f8fafc",
              cursor: "pointer",
            }}
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
          <div className="card" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, color: SG_BLUE }}>Dati giornata</h3>
            <div className="row" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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
<div className="row">
  <div>
    <div>Targa Furgone</div>
    <input
      value={vanPlate}
      onChange={(e) => setVanPlate(e.target.value)}
      placeholder="Es. FG123AB"
    />
  </div>
  <div>
    <div>Conducente (Mattina)</div>
    <select value={driverMorning} onChange={(e) => setDriverMorning(e.target.value)}>
      <option value="">-- Seleziona --</option>
      {workers.map((w) => (
        <option key={w.name}>{w.name}</option>
      ))}
    </select>
  </div>
  <div>
    <div>Conducente (Pomeriggio)</div>
    <select value={driverAfternoon} onChange={(e) => setDriverAfternoon(e.target.value)}>
      <option value="">-- Seleziona --</option>
      {workers.map((w) => (
        <option key={w.name}>{w.name}</option>
      ))}
    </select>
  </div>
</div>

          <div className="card" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, color: SG_BLUE }}>Personale</h3>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Operaio</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Tipo Giorno</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Ore</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Costo orario</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Totale</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((r) => {
                  const w = workers.find((w) => w.name === r.name);
                  const costo = r.tipo === "Trasferta" ? Number(w?.trasferta || 0) : Number(w?.normale || 0);
                  const totale = (Number(r.ore) || 0) * costo;
                  return (
                    <tr key={r.name}>
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                        <strong>{r.name}</strong>
                      </td>
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                        <select value={r.tipo} onChange={(e) => setTipo(r.name, e.target.value)}>
                          <option>Normale</option>
                          <option>Trasferta</option>
                        </select>
                      </td>
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button className="small" onClick={() => incOre(r.name, -1)}>-</button>
                          <input
                            value={r.ore}
                            onChange={(e) => setOre(r.name, e.target.value)}
                            style={{ width: 80, textAlign: "center" }}
                          />
                          <button className="small" onClick={() => incOre(r.name, +1)}>+</button>
                        </div>
                      </td>
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>{euro.format(costo)}</td>
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                        <strong style={{ color: SG_BLUE }}>{euro.format(totale)}</strong>
                      </td>
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
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
              <div className="kpi" style={{ display: "inline-flex", gap: 8, padding: "8px 12px", background: "#f1f5f9", borderRadius: 10 }}>
                <span>Totale Personale:</span>
                <strong>{euro.format(personaleTot)}</strong>
              </div>
            </div>
          </div>

          {/* --- SPESE --- */}
          <div className="card" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ marginTop: 0, color: SG_BLUE }}>Spese & Documenti (per il giorno selezionato)</h3>
              <button className="primary" onClick={() => addExpense()} style={{ background: SG_BLUE, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>
                + Aggiungi spesa
              </button>
            </div>

            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Tipo</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Descrizione</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Importo</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Documento (PDF)</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {dayExpenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                      <select
                        value={e.tipo}
                        onChange={(ev) =>
                          setExpenses((prev) =>
                            prev.map((x) => (x.id === e.id ? { ...x, tipo: ev.target.value } : x))
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
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                      <input
                        value={e.descrizione}
                        onChange={(ev) =>
                          setExpenses((prev) =>
                            prev.map((x) => (x.id === e.id ? { ...x, descrizione: ev.target.value } : x))
                          )
                        }
                        placeholder="Dettagli"
                      />
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={e.importo}
                        onChange={(ev) =>
                          setExpenses((prev) =>
                            prev.map((x) => (x.id === e.id ? { ...x, importo: Number(ev.target.value) } : x))
                          )
                        }
                        style={{ width: 140 }}
                      />
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
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
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                      <button className="danger small" onClick={() => removeExpense(e.id)} style={{ color: "#b91c1c" }}>
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <div className="kpi" style={{ display: "inline-flex", gap: 8, padding: "8px 12px", background: "#f1f5f9", borderRadius: 10 }}>
                <span>Totale Spese:</span>
                <strong>{euro.format(speseTot)}</strong>
              </div>
            </div>
          </div>

          <div className="card" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, color: SG_BLUE }}>Riepilogo giornata</h3>
            <div className="row" style={{ display: "flex", gap: 12 }}>
              <div className="kpi" style={{ padding: "8px 12px", background: "#eef2ff", borderRadius: 10 }}>
                <span>Personale</span>
                <strong style={{ display: "block" }}>{euro.format(personaleTot)}</strong>
              </div>
              <div className="kpi" style={{ padding: "8px 12px", background: "#e0f2fe", borderRadius: 10 }}>
                <span>Spese</span>
                <strong style={{ display: "block" }}>{euro.format(speseTot)}</strong>
              </div>
              <div className="kpi" style={{ padding: "8px 12px", background: "#ecfdf5", borderRadius: 10 }}>
                <span>Totale</span>
                <strong style={{ display: "block" }}>{euro.format(giornoTot)}</strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- OPERAI (sola lettura) --- */}
      {activeTab === "operai" && (
        <div className="card" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0, color: SG_BLUE }}>Tariffe Operai (non modificabili)</h3>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Operaio</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Costo orario (Normale)</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Costo orario (Trasferta)</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.name}>
                  <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}><strong>{w.name}</strong></td>
                  <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>{euro.format(w.normale)}</td>
                  <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>{euro.format(w.trasferta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="footer-note" style={{ marginTop: 8, color: "#64748b" }}>
            ⚙️ Le tariffe possono essere aggiornate solo nel codice sorgente.
          </div>
        </div>
      )}

      {/* --- ARCHIVIO SPESE --- */}
      {activeTab === "archivio" && (
        <div className="card" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0, color: SG_BLUE }}>Archivio Spese & PDF (tutte le date)</h3>
          {expenses.length === 0 ? (
            <div className="footer-note" style={{ color: "#64748b" }}>Nessuna spesa registrata.</div>
          ) : (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Data</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Tipo</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Descrizione</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Importo</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Documento</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>{e.date}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>{e.tipo}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>{e.descrizione}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>{euro.format(Number(e.importo || 0))}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                      {e.fileUrl ? (
                        <a href={e.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                          {e.fileName}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 8 }}>
                      <button className="danger small" onClick={() => removeExpense(e.id)} style={{ color: "#b91c1c" }}>
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
        <div className="card" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0, color: SG_BLUE }}>Impostazioni & Utilità</h3>
          <div className="row" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            <div>
              <div>Data predefinita</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <div>Nome cantiere</div>
              <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="Nome cantiere" />
            </div>
            <div>
              <div>Località</div>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Comune / Indirizzo" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => {
                setDayRows(workers.map((w) => ({ name: w.name, tipo: "Normale", ore: 0, nota: "" })));
                setNote("");
              }}
            >
              Reset giornata
            </button>

            <button
              onClick={() => {
                setWorkers(DEFAULT_WORKERS);
                setExpenses([]);
                setDayRows(workers.map((w) => ({ name: w.name, tipo: "Normale", ore: 0, nota: "" })));
                setNote("");
                setSite("");
                setLocation("");
              }}
            >
              Reset completo
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={salvaSuFile}>💾 Salva giornale su file</button>
            <button className="primary" onClick={esportaExcel}>📤 Esporta in Excel</button>
            <button onClick={esportaPDF}>📄 Esporta in PDF</button>

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

          <div className="footer-note" style={{ marginTop: 8, color: "#64748b" }}>
            Nota: i PDF caricati nelle spese restano disponibili finché la pagina resta aperta. Possiamo
            aggiungere salvataggio su server in un secondo momento.
          </div>
        </div>
      )}
    </div>
  );
}
