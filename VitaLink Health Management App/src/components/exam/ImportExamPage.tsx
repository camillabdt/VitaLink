import { useState, useRef } from "react"
import Layout from "@/components/shared/Layout"
import type { Page, UserType } from "@/data/mockData"
import { simulatedExtractedExams } from "@/data/mockData"

interface Props {
  userType: UserType
  onNavigate: (page: Page) => void
  onLogout: () => void
}

type Step = "upload" | "processing" | "review" | "manual" | "done"

interface ExtractedField {
  name: string
  value: string
  unit: string
  category: string
  refMin: string
  refMax: string
  confirmed: boolean
}

export default function ImportExamPage({
  userType,
  onNavigate,
  onLogout,
}: Props) {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<{
    name: string
    type: string
    size: number
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([])
  const [manualExam, setManualExam] = useState("")
  const [manualDate, setManualDate] = useState("2026-08-03")
  const [manualLab, setManualLab] = useState("")
  const [manualRows, setManualRows] = useState([
    { name: "", value: "", unit: "", category: "", refMin: "", refMax: "" },
  ])
  const [savedCount, setSavedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile({ name: f.name, type: f.type, size: f.size })
    setStep("processing")

    // Simulate AI extraction with progress
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 18 + 5
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        // Simulate: 70% chance of success
        setTimeout(() => {
          const success = Math.random() > 0.3
          if (success) {
            setExtractedFields(
              simulatedExtractedExams.map((e) => ({ ...e, confirmed: true })),
            )
            setStep("review")
          } else {
            setStep("manual")
          }
        }, 500)
      }
      setProgress(Math.min(100, p))
    }, 200)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const confirmSave = () => {
    const count = extractedFields.filter((f) => f.confirmed).length
    setSavedCount(count)
    setStep("done")
  }

  const saveManual = () => {
    const count = manualRows.filter((r) => r.name && r.value).length
    setSavedCount(count)
    setStep("done")
  }

  const backPage =
    userType === "patient" ? "patient-dashboard" : "doctor-dashboard"

  return (
    <Layout
      currentPage={backPage}
      userType={userType}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Importar Exame"
      subtitle="Envie um PDF ou foto do exame para registrar no sistema"
      action={
        <button
          onClick={() => onNavigate(backPage)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
      }
    >
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-7">
          {[
            { key: "upload", label: "Enviar arquivo" },
            { key: "processing", label: "Processando" },
            { key: "review", label: "Revisar" },
            { key: "done", label: "Concluído" },
          ].map((s, i, arr) => {
            const stepOrder: Step[] = ["upload", "processing", "review", "done"]
            const current = stepOrder.indexOf(
              step === "manual" ? "review" : step,
            )
            const thisIdx = stepOrder.indexOf(s.key as Step)
            const active = thisIdx === current
            const done = thisIdx < current
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={
                      done
                        ? { background: "var(--primary)", color: "#fff" }
                        : active
                          ? { background: "var(--primary)", color: "#fff" }
                          : { background: "#E2E8F0", color: "#94A3B8" }
                    }
                  >
                    {done ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      active
                        ? "font-semibold text-gray-900"
                        : done
                          ? "text-gray-500"
                          : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className="w-8 h-px mx-1"
                    style={{ background: done ? "var(--primary)" : "#E2E8F0" }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all"
              style={{
                borderColor: dragOver ? "var(--primary)" : "var(--border)",
                background: dragOver ? "var(--teal-50)" : "#fff",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: dragOver ? "var(--teal-100)" : "var(--muted)",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={dragOver ? "var(--teal-700)" : "#94A3B8"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">
                Arraste o arquivo aqui
              </p>
              <p className="text-sm text-gray-500 mb-3">
                ou clique para selecionar
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  PDF
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  JPG, PNG
                </span>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">Até 20 MB</span>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl border p-5"
              style={{ borderColor: "var(--border)" }}
            >
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                Como funciona?
              </h4>
              <div className="space-y-3">
                {[
                  {
                    icon: "🔍",
                    title: "Leitura automática",
                    desc: "O sistema tenta identificar e extrair os valores do exame automaticamente do PDF ou foto.",
                  },
                  {
                    icon: "✏️",
                    title: "Revisão humana",
                    desc: "Você revisa os campos extraídos antes de salvar. Se a leitura falhar, pode inserir os valores manualmente visualizando o arquivo.",
                  },
                  {
                    icon: "📊",
                    title: "Dashboard atualizada",
                    desc: "Os resultados confirmados atualizam os gráficos e o histórico do paciente imediatamente.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() =>
                  handleFile(
                    new File([], "hemograma_jul2026.pdf", {
                      type: "application/pdf",
                    }),
                  )
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Demo: PDF (extração bem-sucedida)
              </button>
              <button
                onClick={() => {
                  setFile({
                    name: "exame_foto.jpg",
                    type: "image/jpeg",
                    size: 1024 * 800,
                  })
                  setStep("processing")
                  let p = 0
                  const iv = setInterval(() => {
                    p += Math.random() * 18 + 5
                    if (p >= 100) {
                      p = 100
                      clearInterval(iv)
                      setTimeout(() => setStep("manual"), 500)
                    }
                    setProgress(Math.min(100, p))
                  }, 200)
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Demo: Foto (entrada manual)
              </button>
            </div>
          </div>
        )}

        {/* ── Processing ── */}
        {step === "processing" && (
          <div
            className="bg-white rounded-2xl border p-10 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "var(--teal-50)" }}
            >
              {file?.type === "application/pdf" ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--teal-600)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--teal-600)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>
            <p className="font-semibold text-gray-900 mb-1">{file?.name}</p>
            <p className="text-sm text-gray-500 mb-6">
              {progress < 40
                ? "Lendo o arquivo…"
                : progress < 75
                  ? "Identificando campos e valores…"
                  : "Finalizando extração…"}
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #0E9F8A, #14B8A6)",
                }}
              />
            </div>
            <p className="text-xs text-gray-400">{Math.round(progress)}%</p>

            <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
              {[
                {
                  label: "Verificando integridade do arquivo",
                  done: progress > 15,
                },
                { label: "Extraindo texto e tabelas", done: progress > 40 },
                {
                  label: "Identificando marcadores clínicos",
                  done: progress > 65,
                },
                {
                  label: "Validando valores de referência",
                  done: progress > 85,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all`}
                    style={
                      item.done
                        ? { background: "#DCFCE7" }
                        : { background: "#F1F5F9" }
                    }
                  >
                    {item.done ? (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#166534"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <span
                    className={`text-xs ${
                      item.done ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Review extracted fields ── */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-100">
              <svg
                className="text-green-600 flex-shrink-0"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <p className="text-green-800 text-sm font-medium">
                  Extração bem-sucedida
                </p>
                <p className="text-green-700 text-xs">
                  {extractedFields.length} campos identificados em{" "}
                  <strong>{file?.name}</strong>. Revise e confirme antes de
                  salvar.
                </p>
              </div>
            </div>

            {/* Exam metadata */}
            <div
              className="bg-white rounded-2xl border p-5"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                Informações do exame
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Nome do exame
                  </label>
                  <input
                    value={manualExam || "Hemograma Completo"}
                    onChange={(e) => setManualExam(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "var(--border)" }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--primary)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Data do exame
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "var(--border)" }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--primary)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Laboratório
                  </label>
                  <input
                    value={manualLab || "Fleury Medicina e Saúde"}
                    onChange={(e) => setManualLab(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "var(--border)" }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--primary)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>
              </div>
            </div>

            {/* Extracted values */}
            <div
              className="bg-white rounded-2xl border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <h3 className="font-semibold text-gray-900 text-sm">
                  Valores extraídos
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>
                    {extractedFields.filter((f) => f.confirmed).length} de{" "}
                    {extractedFields.length} selecionados
                  </span>
                  <button
                    onClick={() =>
                      setExtractedFields((f) =>
                        f.map((r) => ({ ...r, confirmed: true })),
                      )
                    }
                    className="font-medium"
                    style={{ color: "var(--primary)" }}
                  >
                    Selecionar todos
                  </button>
                </div>
              </div>
              <div
                className="divide-y"
                style={{ borderColor: "var(--border)" }}
              >
                {extractedFields.map((field, i) => (
                  <div
                    key={i}
                    className="px-5 py-3.5 flex items-center gap-4"
                    style={{
                      background: field.confirmed ? "#fff" : "#FAFAFA",
                      opacity: field.confirmed ? 1 : 0.6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={field.confirmed}
                      onChange={(e) =>
                        setExtractedFields((prev) =>
                          prev.map((f, j) =>
                            j === i ? { ...f, confirmed: e.target.checked } : f,
                          ),
                        )
                      }
                      className="w-4 h-4 rounded flex-shrink-0 cursor-pointer accent-teal-600"
                    />
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <div className="text-xs text-gray-400 mb-0.5">
                          Exame
                        </div>
                        <input
                          value={field.name}
                          onChange={(e) =>
                            setExtractedFields((prev) =>
                              prev.map((f, j) =>
                                j === i ? { ...f, name: e.target.value } : f,
                              ),
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: "var(--border)" }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "var(--primary)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor = "var(--border)")
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-0.5">
                          Valor
                        </div>
                        <div className="flex gap-1">
                          <input
                            value={field.value}
                            onChange={(e) =>
                              setExtractedFields((prev) =>
                                prev.map((f, j) =>
                                  j === i ? { ...f, value: e.target.value } : f,
                                ),
                              )
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg border text-sm outline-none min-w-0"
                            style={{ borderColor: "var(--border)" }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "var(--primary)")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor = "var(--border)")
                            }
                          />
                          <input
                            value={field.unit}
                            onChange={(e) =>
                              setExtractedFields((prev) =>
                                prev.map((f, j) =>
                                  j === i ? { ...f, unit: e.target.value } : f,
                                ),
                              )
                            }
                            className="w-16 px-2.5 py-1.5 rounded-lg border text-sm outline-none"
                            style={{ borderColor: "var(--border)" }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "var(--primary)")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor = "var(--border)")
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-0.5">
                          Ref. mín
                        </div>
                        <input
                          value={field.refMin}
                          onChange={(e) =>
                            setExtractedFields((prev) =>
                              prev.map((f, j) =>
                                j === i ? { ...f, refMin: e.target.value } : f,
                              ),
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: "var(--border)" }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "var(--primary)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor = "var(--border)")
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-0.5">
                          Ref. máx
                        </div>
                        <input
                          value={field.refMax}
                          onChange={(e) =>
                            setExtractedFields((prev) =>
                              prev.map((f, j) =>
                                j === i ? { ...f, refMax: e.target.value } : f,
                              ),
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: "var(--border)" }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "var(--primary)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor = "var(--border)")
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => setStep("manual")}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                Inserir manualmente
              </button>
              <button
                onClick={confirmSave}
                disabled={!extractedFields.some((f) => f.confirmed)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Salvar {extractedFields.filter((f) => f.confirmed).length}{" "}
                resultado
                {extractedFields.filter((f) => f.confirmed).length !== 1
                  ? "s"
                  : ""}
              </button>
            </div>
          </div>
        )}

        {/* ── Manual entry ── */}
        {step === "manual" && (
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-100">
              <svg
                className="text-amber-500 flex-shrink-0 mt-0.5"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-amber-800 text-sm font-medium">
                  Não foi possível extrair automaticamente
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  O arquivo <strong>{file?.name}</strong> pode estar em um
                  formato não suportado ou com baixa qualidade. Visualize o
                  arquivo ao lado e preencha os valores manualmente.
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* PDF viewer placeholder */}
              <div
                className="bg-white rounded-2xl border overflow-hidden"
                style={{ borderColor: "var(--border)", minHeight: 420 }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{
                    borderColor: "var(--border)",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {file?.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-400">100%</span>
                    <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Simulated document */}
                <div
                  className="p-6 font-mono text-xs text-gray-600 leading-relaxed overflow-auto"
                  style={{ maxHeight: 400 }}
                >
                  <div className="text-center mb-4">
                    <div className="font-bold text-sm text-gray-800">
                      FLEURY MEDICINA E SAÚDE
                    </div>
                    <div className="text-gray-500">
                      CNPJ: 60.840.055/0024-10
                    </div>
                    <div className="text-gray-500">
                      Av. General Valdomiro de Lima, 508 — SP
                    </div>
                    <div className="mt-2 font-semibold text-gray-700">
                      LAUDO DE EXAME LABORATORIAL
                    </div>
                  </div>
                  <div
                    className="border-t pt-3 mt-3"
                    style={{ borderColor: "#E2E8F0" }}
                  >
                    <div className="grid grid-cols-2 gap-1 mb-3">
                      <span className="text-gray-500">Paciente:</span>
                      <span className="font-medium">Ana Ribeiro</span>
                      <span className="text-gray-500">Data:</span>
                      <span>03/08/2026</span>
                      <span className="text-gray-500">Médico:</span>
                      <span>Dr. Carlos Mendes</span>
                      <span className="text-gray-500">CRM:</span>
                      <span>142890</span>
                    </div>
                    <div className="font-bold text-gray-800 mb-2">
                      HEMOGRAMA COMPLETO
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th
                            className="text-left p-1.5 border"
                            style={{ borderColor: "#E2E8F0" }}
                          >
                            Exame
                          </th>
                          <th
                            className="text-left p-1.5 border"
                            style={{ borderColor: "#E2E8F0" }}
                          >
                            Resultado
                          </th>
                          <th
                            className="text-left p-1.5 border"
                            style={{ borderColor: "#E2E8F0" }}
                          >
                            Referência
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Glicemia em Jejum", "92 mg/dL", "70 - 99"],
                          ["Hemoglobina", "13.8 g/dL", "12.0 - 16.0"],
                          ["Hematócrito", "42.1 %", "36 - 48"],
                          ["Leucócitos", "6.200 /mm³", "4.000 - 11.000"],
                          ["Plaquetas", "248.000 /mm³", "150.000 - 400.000"],
                        ].map(([e, v, r]) => (
                          <tr key={e}>
                            <td
                              className="p-1.5 border"
                              style={{ borderColor: "#E2E8F0" }}
                            >
                              {e}
                            </td>
                            <td
                              className="p-1.5 border"
                              style={{ borderColor: "#E2E8F0" }}
                            >
                              {v}
                            </td>
                            <td
                              className="p-1.5 border text-gray-500"
                              style={{ borderColor: "#E2E8F0" }}
                            >
                              {r}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Manual form */}
              <div className="space-y-4">
                <div
                  className="bg-white rounded-2xl border p-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">
                    Informações do exame
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Nome do exame",
                        key: "manualExam",
                        value: manualExam,
                        setter: setManualExam,
                        placeholder: "ex: Hemograma Completo",
                      },
                      {
                        label: "Data",
                        key: "manualDate",
                        value: manualDate,
                        setter: setManualDate,
                        type: "date",
                        placeholder: "",
                      },
                      {
                        label: "Laboratório",
                        key: "manualLab",
                        value: manualLab,
                        setter: setManualLab,
                        placeholder: "ex: Fleury Medicina e Saúde",
                      },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                          {f.label}
                        </label>
                        <input
                          type={(f as any).type || "text"}
                          value={f.value}
                          onChange={(e) => f.setter(e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                          style={{ borderColor: "var(--border)" }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "var(--primary)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor = "var(--border)")
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="bg-white rounded-2xl border overflow-hidden"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <h4 className="font-semibold text-gray-900 text-sm">
                      Resultados
                    </h4>
                    <button
                      onClick={() =>
                        setManualRows((prev) => [
                          ...prev,
                          {
                            name: "",
                            value: "",
                            unit: "",
                            category: "",
                            refMin: "",
                            refMax: "",
                          },
                        ])
                      }
                      className="flex items-center gap-1 text-xs font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Linha
                    </button>
                  </div>
                  <div
                    className="divide-y"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {manualRows.map((row, i) => (
                      <div key={i} className="px-4 py-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              Exame
                            </div>
                            <input
                              value={row.name}
                              onChange={(e) =>
                                setManualRows((prev) =>
                                  prev.map((r, j) =>
                                    j === i
                                      ? { ...r, name: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                              placeholder="Nome"
                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                              style={{ borderColor: "var(--border)" }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "var(--primary)")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor = "var(--border)")
                              }
                            />
                          </div>
                          <div className="flex gap-1">
                            <div className="flex-1">
                              <div className="text-xs text-gray-400 mb-1">
                                Valor
                              </div>
                              <input
                                value={row.value}
                                onChange={(e) =>
                                  setManualRows((prev) =>
                                    prev.map((r, j) =>
                                      j === i
                                        ? { ...r, value: e.target.value }
                                        : r,
                                    ),
                                  )
                                }
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                                style={{ borderColor: "var(--border)" }}
                                onFocus={(e) =>
                                  (e.target.style.borderColor =
                                    "var(--primary)")
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor = "var(--border)")
                                }
                              />
                            </div>
                            <div className="w-14">
                              <div className="text-xs text-gray-400 mb-1">
                                Unidade
                              </div>
                              <input
                                value={row.unit}
                                onChange={(e) =>
                                  setManualRows((prev) =>
                                    prev.map((r, j) =>
                                      j === i
                                        ? { ...r, unit: e.target.value }
                                        : r,
                                    ),
                                  )
                                }
                                placeholder="mg/dL"
                                className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                                style={{ borderColor: "var(--border)" }}
                                onFocus={(e) =>
                                  (e.target.style.borderColor =
                                    "var(--primary)")
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor = "var(--border)")
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              Ref. mínimo
                            </div>
                            <input
                              value={row.refMin}
                              onChange={(e) =>
                                setManualRows((prev) =>
                                  prev.map((r, j) =>
                                    j === i
                                      ? { ...r, refMin: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                              placeholder="0"
                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                              style={{ borderColor: "var(--border)" }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "var(--primary)")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor = "var(--border)")
                              }
                            />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              Ref. máximo
                            </div>
                            <input
                              value={row.refMax}
                              onChange={(e) =>
                                setManualRows((prev) =>
                                  prev.map((r, j) =>
                                    j === i
                                      ? { ...r, refMax: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                              placeholder="200"
                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                              style={{ borderColor: "var(--border)" }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "var(--primary)")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor = "var(--border)")
                              }
                            />
                          </div>
                        </div>
                        {manualRows.length > 1 && (
                          <button
                            onClick={() =>
                              setManualRows((prev) =>
                                prev.filter((_, j) => j !== i),
                              )
                            }
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Remover linha
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveManual}
                  disabled={!manualRows.some((r) => r.name && r.value)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                  }}
                >
                  Salvar resultados
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {step === "done" && (
          <div
            className="bg-white rounded-2xl border p-10 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "var(--teal-50)" }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--teal-600)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Exame salvo com sucesso!
            </h2>
            <p className="text-gray-500 text-sm mb-1">
              <strong>{savedCount}</strong> resultado
              {savedCount !== 1 ? "s" : ""} adicionado
              {savedCount !== 1 ? "s" : ""} ao histórico.
            </p>
            <p className="text-gray-400 text-xs mb-8">
              Os gráficos e a dashboard foram atualizados automaticamente.
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => {
                  setStep("upload")
                  setFile(null)
                  setProgress(0)
                  setExtractedFields([])
                  setManualRows([
                    {
                      name: "",
                      value: "",
                      unit: "",
                      category: "",
                      refMin: "",
                      refMax: "",
                    },
                  ])
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                + Importar outro exame
              </button>
              <button
                onClick={() => onNavigate(backPage)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                }}
              >
                Ver dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
