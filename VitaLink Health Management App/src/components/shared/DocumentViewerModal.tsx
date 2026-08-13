import { useState } from "react"
import type { MedicalDocument } from "@/data/mockData"
import { fmtDate } from "@/data/mockData"

interface Props {
  doc: MedicalDocument
  onClose: () => void
  onShare?: () => void
}

export default function DocumentViewerModal({ doc, onClose, onShare }: Props) {
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)

  const handleShare = () => {
    setSharing(true)
    setTimeout(() => {
      setSharing(false)
      setShared(true)
    }, 900)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="m-auto flex w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
      >
        {/* Document viewer area */}
        <div className="flex-1 flex flex-col bg-gray-100 min-w-0">
          {/* Viewer toolbar */}
          <div
            className="flex items-center justify-between px-5 py-3 bg-white border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <TypeBadge doc={doc} />
              <span className="font-semibold text-gray-900 text-sm truncate max-w-[240px]">
                {doc.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Baixar
              </button>
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
          </div>

          {/* Document render */}
          <div className="flex-1 overflow-y-auto p-5 flex items-start justify-center">
            {doc.type === "prescription" ? (
              <PrescriptionView doc={doc} />
            ) : doc.type === "image" ? (
              <ImageView doc={doc} />
            ) : doc.type === "report" ? (
              <ReportView doc={doc} />
            ) : (
              <ExamView doc={doc} />
            )}
          </div>
        </div>

        {/* Metadata sidebar */}
        <div
          className="w-72 flex-shrink-0 border-l flex flex-col overflow-y-auto"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Informações
            </div>
            <MetaRow label="Tipo">
              <TypeBadge doc={doc} />
            </MetaRow>
            <MetaRow label="Data">{fmtDate(doc.date)}</MetaRow>
            <MetaRow label="Médico">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-800">
                  {doc.doctor}
                </div>
                <div className="text-xs text-gray-400">{doc.specialty}</div>
              </div>
            </MetaRow>
            <MetaRow label="Arquivo">
              <span
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded uppercase"
                style={{ background: "#F1F5F9", color: "#475569" }}
              >
                {doc.fileType}
              </span>
            </MetaRow>
            {doc.size !== "—" && <MetaRow label="Tamanho">{doc.size}</MetaRow>}
          </div>

          {doc.note && (
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {doc.type === "prescription" ? "Medicamentos" : "Observações"}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {doc.note}
              </p>
            </div>
          )}

          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Compartilhamento
            </div>
            {doc.sharedWith.length === 0 ? (
              <p className="text-xs text-gray-400">
                Este documento não foi compartilhado com nenhum médico.
              </p>
            ) : (
              <p className="text-xs text-gray-600">
                Compartilhado com <strong>{doc.sharedWith.length}</strong>{" "}
                médico(s).
              </p>
            )}
            {shared ? (
              <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Link de compartilhamento copiado
              </div>
            ) : (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-medium transition-all hover:bg-gray-50"
                style={{ borderColor: "var(--border)", color: "#64748B" }}
              >
                {sharing ? (
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                )}
                Compartilhar com médico
              </button>
            )}
          </div>

          <div className="px-5 py-4 mt-auto">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Document type renderers ──────────────────────────────────────────────────

function PrescriptionView({ doc }: { doc: MedicalDocument }) {
  const meds = doc.note
    ? doc.note.split("\n").filter(Boolean)
    : ["(medicamentos não informados)"]

  return (
    <div
      className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden border"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="px-7 py-5 border-b"
        style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "#1D4ED8" }}
            >
              Receita Médica Digital
            </div>
            <div className="font-display text-lg text-gray-900">
              VitaLink · Prontuário Eletrônico
            </div>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "#DBEAFE" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="12" y2="17" />
            </svg>
          </div>
        </div>
      </div>

      <div className="px-7 py-5 space-y-5">
        {/* Doctor */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: "var(--muted)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0E9F8A, #0D9488)" }}
          >
            {doc.doctor
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {doc.doctor}
            </div>
            <div className="text-xs text-gray-500">{doc.specialty}</div>
          </div>
        </div>

        {/* Patient + date */}
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div>
            <div className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">
              Paciente
            </div>
            <div className="font-medium text-gray-800">Ana Ribeiro</div>
          </div>
          <div>
            <div className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">
              Data
            </div>
            <div className="font-medium text-gray-800">{fmtDate(doc.date)}</div>
          </div>
        </div>

        {/* Medications */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
            Prescrição
          </div>
          <div className="space-y-2">
            {meds.map((med, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl border"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
                  style={{ background: "#1D4ED8", minWidth: 20 }}
                >
                  {i + 1}
                </div>
                <span className="text-sm text-gray-800">{med}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signature area */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-xs text-gray-400">
            <span className="font-medium text-gray-600">
              Assinado digitalmente
            </span>
            <br />
            {doc.doctor} · {fmtDate(doc.date)}
          </div>
          {/* QR placeholder */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "#F1F5F9" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path
                d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"
                fill="#94A3B8"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExamView({ doc }: { doc: MedicalDocument }) {
  const rows = [
    { label: "Hemácias", value: "4,52", unit: "milhões/µL", status: "normal" },
    { label: "Hemoglobina", value: "13,8", unit: "g/dL", status: "normal" },
    { label: "Hematócrito", value: "41,2", unit: "%", status: "normal" },
    { label: "Leucócitos", value: "7.200", unit: "/µL", status: "normal" },
    { label: "Plaquetas", value: "218.000", unit: "/µL", status: "normal" },
  ]

  return (
    <div
      className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden border"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="px-6 py-4 border-b"
        style={{ background: "#F0FDF9", borderColor: "#99F6E4" }}
      >
        <div
          className="text-xs font-bold uppercase tracking-widest mb-0.5"
          style={{ color: "var(--teal-700)" }}
        >
          Resultado de Exame
        </div>
        <div className="font-semibold text-gray-900">{doc.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {doc.doctor} · {fmtDate(doc.date)}
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        <div className="grid grid-cols-3 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <span>Parâmetro</span>
          <span className="text-center">Resultado</span>
          <span className="text-right">Situação</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-3 px-5 py-3 items-center"
          >
            <div>
              <div className="text-sm text-gray-800">{r.label}</div>
              <div className="text-xs text-gray-400">{r.unit}</div>
            </div>
            <div className="text-center font-semibold text-gray-900 text-sm">
              {r.value}
            </div>
            <div className="flex justify-end">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium badge-green">
                {r.status === "normal" ? "Normal" : r.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div
        className="px-5 py-3 text-xs text-gray-400 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        Laboratório VitaLab · CNES 1234567 · Responsável técnico: {doc.doctor}
      </div>
    </div>
  )
}

function ReportView({ doc }: { doc: MedicalDocument }) {
  return (
    <div
      className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden border"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="px-6 py-4 border-b"
        style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
      >
        <div
          className="text-xs font-bold uppercase tracking-widest mb-0.5"
          style={{ color: "#B45309" }}
        >
          Laudo Médico
        </div>
        <div className="font-semibold text-gray-900">{doc.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {doc.doctor} · {fmtDate(doc.date)}
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Indicação clínica
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {doc.note ||
              "Acompanhamento de rotina conforme solicitação médica."}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Descrição
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Exame realizado com técnica adequada e sem intercorrências.
            Parâmetros dentro dos limites esperados para a faixa etária da
            paciente. Ausência de alterações morfológicas relevantes.
          </p>
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ background: "#DCFCE7", border: "1px solid #BBF7D0" }}
        >
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-0.5">
            Conclusão
          </div>
          <p className="text-sm text-emerald-800">
            Exame dentro dos parâmetros normais para a idade e contexto clínico
            apresentado.
          </p>
        </div>
      </div>
      <div
        className="px-6 py-3 border-t text-xs text-gray-400 flex justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <span>
          {doc.doctor} · {doc.specialty}
        </span>
        <span>{fmtDate(doc.date)}</span>
      </div>
    </div>
  )
}

function ImageView({ doc }: { doc: MedicalDocument }) {
  return (
    <div className="w-full max-w-md space-y-3">
      {/* Simulated medical image */}
      <div
        className="bg-black rounded-2xl overflow-hidden aspect-square flex items-center justify-center relative"
        style={{ maxHeight: 340 }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, #fff 0%, transparent 60%)",
          }}
        />
        <div className="text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4B5563"
            strokeWidth="1"
            className="mx-auto mb-3"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="#4B5563" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <div className="text-gray-400 text-sm font-mono">{doc.name}</div>
          <div className="text-gray-500 text-xs mt-1">
            Visualização indisponível no navegador
          </div>
          <div className="text-gray-600 text-xs mt-0.5 uppercase tracking-widest font-mono">
            {doc.fileType}
          </div>
        </div>
        {/* DICOM-style overlays */}
        <div className="absolute top-3 left-3 text-gray-500 text-xs font-mono">
          <div>ANA RIBEIRO · F · 38A</div>
          <div>{fmtDate(doc.date)}</div>
        </div>
        <div className="absolute top-3 right-3 text-gray-500 text-xs font-mono text-right">
          <div>{doc.doctor}</div>
          <div>{doc.specialty}</div>
        </div>
      </div>
      <button
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        style={{ borderColor: "var(--border)" }}
      >
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
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Baixar imagem original
      </button>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  exam: { label: "Exame", bg: "#F0FDF9", text: "var(--teal-700)" },
  prescription: { label: "Receita", bg: "#EFF6FF", text: "#1D4ED8" },
  report: { label: "Laudo", bg: "#FFFBEB", text: "#B45309" },
  image: { label: "Imagem", bg: "#F5F3FF", text: "#6D28D9" },
}

function TypeBadge({ doc }: { doc: MedicalDocument }) {
  const cfg = TYPE_CFG[doc.type]
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  )
}

function MetaRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between py-2 border-b last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs text-gray-700 font-medium">{children}</span>
    </div>
  )
}
