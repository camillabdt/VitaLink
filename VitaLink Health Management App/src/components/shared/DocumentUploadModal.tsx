import { useState, useRef, useCallback } from "react"
import type {
  DocType,
  MedicalDocument,
  PatientDoctorAccess,
} from "@/data/mockData"
import { fmtDate } from "@/data/mockData"

interface Props {
  doctors: PatientDoctorAccess[]
  onSave: (doc: MedicalDocument) => void
  onClose: () => void
  defaultType?: DocType
}

const TYPE_OPTIONS: {
  id: DocType
  label: string
  sublabel: string
  bg: string
  text: string
}[] = [
  {
    id: "exam",
    label: "Exame",
    sublabel: "Resultado laboratorial ou imagem clínica",
    bg: "#F0FDF9",
    text: "var(--teal-700)",
  },
  {
    id: "prescription",
    label: "Receita",
    sublabel: "Receita médica simples ou especial",
    bg: "#EFF6FF",
    text: "#1D4ED8",
  },
  {
    id: "report",
    label: "Laudo",
    sublabel: "Laudo radiológico, patológico ou técnico",
    bg: "#FFFBEB",
    text: "#B45309",
  },
  {
    id: "image",
    label: "Imagem",
    sublabel: "RX, TC, RM, US ou foto clínica",
    bg: "#F5F3FF",
    text: "#6D28D9",
  },
]

export default function DocumentUploadModal({
  doctors,
  onSave,
  onClose,
  defaultType = "exam",
}: Props) {
  const [docType, setDocType] = useState<DocType>(defaultType)
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState("")
  const [fileExt, setFileExt] = useState<"pdf" | "jpg" | "png" | "dicom">("pdf")
  const [dragOver, setDragOver] = useState(false)
  const [docName, setDocName] = useState("")
  const [doctorId, setDoctorId] = useState(doctors[0]?.doctorId ?? "")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const acceptFile = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf"
      setFileName(file.name)
      setFileSize(`${(file.size / 1024 / 1024).toFixed(1)} MB`)
      setFileExt(
        ["jpg", "jpeg"].includes(ext)
          ? "jpg"
          : ext === "png"
            ? "png"
            : ext === "dcm"
              ? "dicom"
              : "pdf",
      )
      if (!docName) setDocName(file.name.replace(/\.[^.]+$/, ""))
    },
    [docName],
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) acceptFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) acceptFile(file)
  }

  const handleSave = () => {
    if (!docName.trim() || !doctorId) return
    setSaving(true)
    const doctor = doctors.find((d) => d.doctorId === doctorId)
    setTimeout(() => {
      onSave({
        id: `doc_${Date.now()}`,
        type: docType,
        name: docName.trim(),
        date,
        doctor: doctor?.doctorName ?? "",
        specialty: doctor?.specialty ?? "",
        fileType: fileName ? fileExt : "pdf",
        size: fileSize || "—",
        note: note || undefined,
        sharedWith: [],
      })
    }, 600)
  }

  const cfg = TYPE_OPTIONS.find((t) => t.id === docType)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        style={{ maxHeight: "92vh", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <div className="text-base font-bold text-gray-900">
              Adicionar documento
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Envie um arquivo ou preencha os dados manualmente
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de documento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDocType(t.id)}
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all"
                  style={
                    docType === t.id
                      ? {
                          borderColor: "var(--primary)",
                          background: "#F0FDF9",
                          boxShadow: "0 0 0 1px var(--primary)",
                        }
                      : { borderColor: "var(--border)", background: "#fff" }
                  }
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: t.bg }}
                  >
                    <TypeIcon type={t.id} color={t.text} size={13} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {t.label}
                    </div>
                    <div className="text-xs text-gray-400 leading-tight">
                      {t.sublabel}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Arquivo
            </label>
            {!fileName ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all"
                style={{
                  borderColor: dragOver ? "var(--primary)" : "var(--border)",
                  background: dragOver ? "#F0FDF9" : "#FAFAFA",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: cfg.bg }}
                >
                  <UploadIcon color={cfg.text} />
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {dragOver ? "Solte aqui" : "Arraste ou clique para enviar"}
                </div>
                <div className="text-xs text-gray-400">
                  PDF, JPG, PNG, DICOM · máx. 50 MB
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.dcm"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}
                >
                  <span
                    className="text-xs font-bold uppercase"
                    style={{ color: cfg.text }}
                  >
                    {fileExt}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {fileName}
                  </div>
                  <div className="text-xs text-gray-400">{fileSize}</div>
                </div>
                <button
                  onClick={() => {
                    setFileName("")
                    setFileSize("")
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <FormField label="Nome do documento" required>
              <input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder={`Ex: ${cfg.label} de Hemograma Completo`}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: "var(--border)", background: "#fff" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Médico responsável" required>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none bg-white transition-all"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                >
                  {doctors.map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.doctorName}
                    </option>
                  ))}
                  <option value="external">Médico externo</option>
                </select>
              </FormField>
              <FormField label="Data">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none bg-white transition-all"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </FormField>
            </div>

            <FormField
              label={
                docType === "prescription"
                  ? "Medicamentos / instruções"
                  : "Observações"
              }
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  docType === "prescription"
                    ? "Ex: Metformina 500mg — 1 comprimido ao dia com refeição por 30 dias"
                    : "Informações adicionais sobre o documento..."
                }
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none resize-none transition-all"
                style={{ borderColor: "var(--border)", background: "#fff" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </FormField>
          </div>

          {/* Prescription notice */}
          {docType === "prescription" && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1D4ED8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 mt-0.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                Receitas digitais assinadas pelo médico aparecem automaticamente
                após uma consulta. Você também pode anexar uma foto ou PDF de
                uma receita física.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center gap-3"
          style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!docName.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0E9F8A, #0D9488)" }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : (
              "Salvar documento"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function TypeIcon({
  type,
  color,
  size,
}: {
  type: DocType
  color: string
  size: number
}) {
  if (type === "exam")
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 3H5a2 2 0 00-2 2v4" />
        <path d="M9 3h6" />
        <path d="M15 3h4a2 2 0 012 2v4" />
        <path d="M21 9v6" />
        <path d="M21 15v4a2 2 0 01-2 2h-4" />
        <path d="M15 21H9" />
        <path d="M9 21H5a2 2 0 01-2-2v-4" />
        <path d="M3 15V9" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    )
  if (type === "prescription")
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    )
  if (type === "report")
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="18" x2="12" y2="18" />
      </svg>
    )
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function UploadIcon({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
