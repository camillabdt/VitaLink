import { useState, useMemo } from "react"
import Layout from "@/components/shared/Layout"
import MentionTextarea from "@/components/shared/MentionTextarea"
import type { Mentionable } from "@/components/shared/MentionTextarea"
import StepUpAuthModal from "@/components/shared/StepUpAuthModal"
import type { StepUpReason } from "@/components/shared/StepUpAuthModal"
import type {
  Page,
  Patient,
  DoctorReferenceValue,
  DocType,
} from "@/data/mockData"
import {
  patients,
  doctorMessages,
  collegeDoctors,
  recentExams,
  examHistory,
  doctorRecommendations,
  patientReferenceValues,
  computeAverageRefs,
  specialistNotes,
  patientDoctorAccess,
  patientDocuments,
  patientConsultations,
  fmtDate,
} from "@/data/mockData"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import maleDoctorImg from "@/imports/ChatGPT_Image_3_de_ago._de_2026__11_38_29.png"

interface Props {
  onNavigate: (page: Page) => void
  onLogout: () => void
}

const statusConfig = {
  stable: { label: "Estável", bg: "#DCFCE7", text: "#166534" },
  attention: { label: "Atenção", bg: "#FEF9C3", text: "#854D0E" },
  critical: { label: "Crítico", bg: "#FEE2E2", text: "#991B1B" },
}

const examStatusConfig = {
  normal: { label: "Normal", bg: "#DCFCE7", text: "#166534" },
  high: { label: "Alto", bg: "#FEE2E2", text: "#991B1B" },
  low: { label: "Baixo", bg: "#DBEAFE", text: "#1E40AF" },
  critical: { label: "Crítico", bg: "#FEE2E2", text: "#7F1D1D" },
}

const noteTypeConfig = {
  referral: {
    label: "Encaminhamento",
    bg: "#EDE9FE",
    border: "#C4B5FD",
    text: "#5B21B6",
  },
  observation: {
    label: "Observação",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1D4ED8",
  },
  urgent: {
    label: "Urgente",
    bg: "#FEE2E2",
    border: "#FCA5A5",
    text: "#991B1B",
  },
}

export default function DoctorDashboard({ onNavigate, onLogout }: Props) {
  const [view, setView] = useState<"list" | "detail" | "messages">("list")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] =
    useState<"all" | "stable" | "attention" | "critical">("all")

  const filtered = patients.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: patients.length,
    critical: patients.filter((p) => p.status === "critical").length,
    attention: patients.filter((p) => p.status === "attention").length,
    stable: patients.filter((p) => p.status === "stable").length,
  }

  const unreadNotes = specialistNotes.filter(
    (n) => !n.read && n.toDoctorId === "d1",
  ).length

  return (
    <Layout
      currentPage={view === "messages" ? "doctor-messages" : "doctor-dashboard"}
      userType="doctor"
      onNavigate={(page) => {
        if (page === "doctor-messages") setView("messages")
        else if (page === "doctor-dashboard") setView("list")
        else onNavigate(page)
      }}
      onLogout={onLogout}
      title={
        view === "list"
          ? "Meus Pacientes"
          : view === "messages"
            ? "Mensagens"
            : selectedPatient?.name || ""
      }
      subtitle={
        view === "list"
          ? `${patients.length} pacientes em acompanhamento`
          : view === "messages"
            ? "Comunicação com colegas"
            : "Detalhes e histórico clínico"
      }
      action={
        view === "detail" ? (
          <button
            onClick={() => setView("list")}
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
            Voltar à lista
          </button>
        ) : null
      }
    >
      {view === "list" && (
        <PatientListView
          patients={filtered}
          stats={stats}
          search={search}
          onSearch={setSearch}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          onSelect={(p) => {
            setSelectedPatient(p)
            setView("detail")
          }}
          unreadNotes={unreadNotes}
        />
      )}
      {view === "detail" && selectedPatient && (
        <PatientDetailView patient={selectedPatient} />
      )}
      {view === "messages" && <MessagesView />}
    </Layout>
  )
}

// ─── Patient list ──────────────────────────────────────────────────────────

function PatientListView({
  patients,
  stats,
  search,
  onSearch,
  filterStatus,
  onFilterStatus,
  onSelect,
  unreadNotes,
}: {
  patients: Patient[]
  stats: any
  search: string
  onSearch: (v: string) => void
  filterStatus: string
  onFilterStatus: (v: any) => void
  onSelect: (p: Patient) => void
  unreadNotes: number
}) {
  const [accessSearch, setAccessSearch] = useState("")
  const [accessResult, setAccessResult] = useState(false)
  const [accessJustification, setAccessJustification] = useState("")
  const [accessSent, setAccessSent] = useState(false)

  const handleAccessSearch = () => {
    if (accessSearch.trim().length > 0) setAccessResult(true)
  }

  const handleAccessSend = () => {
    if (accessJustification.trim()) setAccessSent(true)
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total de pacientes",
            value: stats.total,
            icon: "👥",
            bg: "#EDE9FE",
            color: "#6D28D9",
          },
          {
            label: "Estável",
            value: stats.stable,
            icon: "✅",
            bg: "#DCFCE7",
            color: "#166534",
          },
          {
            label: "Atenção necessária",
            value: stats.attention,
            icon: "⚠️",
            bg: "#FEF9C3",
            color: "#854D0E",
          },
          {
            label: "Estado crítico",
            value: stats.critical,
            icon: "🚨",
            bg: "#FEE2E2",
            color: "#991B1B",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-4 border card-hover"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: s.bg }}
              >
                {s.icon}
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {s.value}
              </span>
            </div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Unread specialist notes banner */}
      {unreadNotes > 0 && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-violet-50 border border-violet-100">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#EDE9FE" }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6D28D9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-violet-800 text-sm font-medium">
              {unreadNotes} nota{unreadNotes > 1 ? "s" : ""} de especialista não
              lida{unreadNotes > 1 ? "s" : ""}
            </p>
            <p className="text-violet-600 text-xs">
              Colegas adicionaram observações sobre seus pacientes.
            </p>
          </div>
        </div>
      )}

      {/* Doctor card */}
      <div
        className="bg-white rounded-2xl border p-5 flex items-center gap-5 flex-wrap"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border"
          style={{ borderColor: "var(--border)" }}
        >
          <img
            src={maleDoctorImg}
            alt="Dr. Carlos Mendes"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">Dr. Carlos Mendes</h3>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: "var(--teal-100)",
                color: "var(--teal-700)",
              }}
            >
              Cardiologista
            </span>
            <span className="text-xs text-gray-400">CRM/SP 142890</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Hospital das Clínicas · carlos.mendes@vitalink.med.br
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            className="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            Ver agenda
          </button>
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            + Novo paciente
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar paciente ou condição..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm outline-none transition-all"
            style={{ borderColor: "var(--border)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "stable", "attention", "critical"] as const).map((f) => {
            const labels = {
              all: "Todos",
              stable: "Estável",
              attention: "Atenção",
              critical: "Crítico",
            }
            return (
              <button
                key={f}
                onClick={() => onFilterStatus(f)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                style={
                  filterStatus === f
                    ? { background: "var(--primary)", color: "#fff" }
                    : {
                        background: "#fff",
                        color: "#64748B",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {labels[f]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Patient cards */}
      {patients.length === 0 ? (
        <div
          className="bg-white rounded-2xl border py-16 text-center text-gray-400"
          style={{ borderColor: "var(--border)" }}
        >
          <svg
            className="mx-auto mb-3"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Nenhum paciente encontrado
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.map((p) => {
            const cfg = statusConfig[p.status]
            const soon = new Date(p.nextExam) <= new Date("2026-08-10")
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="bg-white rounded-2xl border p-5 text-left transition-all duration-200 group"
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.08)"
                  e.currentTarget.style.borderColor = "var(--primary)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = ""
                  e.currentTarget.style.borderColor = "var(--border)"
                  e.currentTarget.style.transform = ""
                }}
              >
                {/* Top row: avatar + status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm leading-tight">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {p.age} anos · Tipo {p.bloodType}
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-2"
                    style={{ background: cfg.bg, color: cfg.text }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Condition */}
                <div className="text-xs text-gray-500 mb-4 line-clamp-1">
                  <span className="font-medium text-gray-600">Condição: </span>
                  {p.condition}
                </div>

                {/* Bottom: two mini info blocks */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: "var(--muted)" }}
                  >
                    <div className="text-xs text-gray-400 mb-0.5">
                      Última consulta
                    </div>
                    <div className="text-xs font-semibold text-gray-700">
                      {fmtDate(p.lastVisit)}
                    </div>
                  </div>
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: soon ? "#FEF9C3" : "var(--muted)" }}
                  >
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: soon ? "#92400E" : "#94A3B8" }}
                    >
                      Próximo exame
                    </div>
                    <div
                      className="text-xs font-semibold flex items-center gap-1"
                      style={{ color: soon ? "#B45309" : "#374151" }}
                    >
                      {fmtDate(p.nextExam)}
                      {soon && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Access request section */}
      <div
        className="bg-white rounded-2xl border p-5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-0.5 h-4 rounded-full"
            style={{ background: "var(--primary)" }}
          />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Solicitar acesso a novo paciente
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4 mt-2">
          Busque um paciente pelo CPF ou nome para solicitar acesso à sua ficha
          clínica.
        </p>

        {accessSent ? (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "#F0FDF9" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#CCFBF1" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0E9F8A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-green-800">
                Solicitação enviada
              </div>
              <div className="text-xs text-green-700">
                Aguardando autorização do paciente.
              </div>
            </div>
            <button
              onClick={() => {
                setAccessSent(false)
                setAccessResult(false)
                setAccessSearch("")
                setAccessJustification("")
              }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Nova busca
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={accessSearch}
                onChange={(e) => setAccessSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAccessSearch()}
                placeholder="Nome ou CPF do paciente..."
                className="flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "var(--border)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                onClick={handleAccessSearch}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                Buscar
              </button>
            </div>

            {accessResult && (
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 p-3.5 rounded-xl border"
                  style={{
                    borderColor: "var(--border)",
                    background: "#FAFAFA",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #64748B, #475569)",
                    }}
                  >
                    JF
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                      João Ferreira
                    </div>
                    <div className="text-xs text-gray-500">
                      45 anos · CPF 123.***.***-45
                    </div>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "#F1F5F9", color: "#64748B" }}
                  >
                    Paciente encontrado
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Justificativa clínica
                  </label>
                  <textarea
                    value={accessJustification}
                    onChange={(e) => setAccessJustification(e.target.value)}
                    rows={3}
                    placeholder="Descreva o motivo clínico para solicitar acesso ao prontuário deste paciente..."
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                    style={{ borderColor: "var(--border)" }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--primary)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>
                <button
                  onClick={handleAccessSend}
                  disabled={!accessJustification.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--primary)" }}
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
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Enviar solicitação
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Patient detail ────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="bg-white border rounded-xl px-3 py-2 shadow-lg text-xs"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-semibold text-gray-500 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function PatientDetailView({ patient }: { patient: Patient }) {
  const [activeTab, setActiveTab] =
    useState<"overview" | "exams" | "consultas" | "notes" | "reference" | "team">(
      "overview",
    )
  const [newNote, setNewNote] = useState("")
  const [notes, setNotes] = useState(doctorRecommendations)
  const [refValues, setRefValues] = useState<DoctorReferenceValue[]>(
    patientReferenceValues,
  )
  const [newRef, setNewRef] = useState({
    name: "",
    min: "",
    max: "",
    unit: "",
    note: "",
  })
  const [expandedRef, setExpandedRef] = useState<string | null>(null)
  const [stepUp, setStepUp] = useState<StepUpReason | null>(null)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const aggregated = computeAverageRefs(refValues)
  const unreadSpecialistNotes = specialistNotes.filter(
    (n) => !n.read && n.toDoctorId === "d1",
  )

  const mentionables = useMemo<Mentionable[]>(() => {
    const seen = new Set<string>()
    const result: Mentionable[] = []
    for (const d of collegeDoctors) {
      if (!seen.has(d.id)) {
        seen.add(d.id)
        result.push({
          id: d.id,
          name: d.name,
          role: d.specialty,
          avatar: d.avatar,
        })
      }
    }
    for (const a of patientDoctorAccess) {
      if (!seen.has(a.doctorId)) {
        seen.add(a.doctorId)
        result.push({ id: a.doctorId, name: a.doctorName, role: a.specialty })
      }
    }
    return result
  }, [])

  const commitNote = () => {
    if (!newNote.trim()) return
    setNotes((prev) => [
      {
        id: `n${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        doctor: "Dr. Carlos Mendes",
        specialty: "Cardiologia",
        avatar: "",
        message: newNote,
        type: "note",
        tags: [],
      },
      ...prev,
    ])
    setNewNote("")
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    setPendingAction(() => commitNote)
    setStepUp("clinical")
  }

  const handleSignDocument = () => {
    if (!newNote.trim()) return
    setPendingAction(() => commitNote)
    setStepUp("document")
  }

  const handleStepUpConfirm = () => {
    pendingAction?.()
    setStepUp(null)
    setPendingAction(null)
  }

  const handleAddRef = () => {
    if (!newRef.name || !newRef.min || !newRef.max) return
    const newEntry: DoctorReferenceValue = {
      id: `rv${Date.now()}`,
      doctorId: "d1",
      doctorName: "Dr. Carlos Mendes",
      specialty: "Cardiologia",
      examName: newRef.name,
      min: Number(newRef.min),
      max: Number(newRef.max),
      unit: newRef.unit,
      addedAt: "2026-08-03",
      note: newRef.note || undefined,
    }
    setRefValues((prev) => [...prev, newEntry])
    setNewRef({ name: "", min: "", max: "", unit: "", note: "" })
  }

  const removeRef = (id: string) =>
    setRefValues((prev) => prev.filter((r) => r.id !== id))

  const cfg = statusConfig[patient.status]

  return (
    <div className="space-y-5">
      {/* Patient header */}
      <div
        className="bg-white rounded-2xl border p-5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <img
            src={patient.avatar}
            alt={patient.name}
            className="w-16 h-16 rounded-2xl object-cover border flex-shrink-0"
            style={{ borderColor: "var(--border)" }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">
                {patient.name}
              </h2>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: cfg.bg, color: cfg.text }}
              >
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {patient.age} anos · {patient.bloodType} · {patient.condition}
            </p>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
              <span>📅 Última consulta: {fmtDate(patient.lastVisit)}</span>
              <span>
                🔬 Próximo exame:{" "}
                <strong
                  className={
                    new Date(patient.nextExam) <= new Date("2026-08-10")
                      ? "text-amber-600"
                      : "text-gray-700"
                  }
                >
                  {fmtDate(patient.nextExam)}
                </strong>
              </span>
              <span>📞 {patient.phone}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
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
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.12 1.22 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              Ligar
            </button>
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              + Agendar consulta
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit flex-wrap"
        style={{ background: "var(--muted)" }}
      >
        {[
          { id: "overview", label: "Visão Geral" },
          { id: "exams", label: "Exames" },
          { id: "consultas", label: "Consultas" },
          { id: "notes", label: "Notas" },
          { id: "reference", label: "Valores de Referência" },
          {
            id: "team",
            label: `Equipe médica${
              unreadSpecialistNotes.length > 0
                ? ` (${unreadSpecialistNotes.length})`
                : ""
            }`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative"
            style={
              activeTab === tab.id
                ? {
                    background: "#fff",
                    color: "var(--teal-700)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }
                : { color: "#64748B" }
            }
          >
            {tab.label}
            {tab.id === "team" && unreadSpecialistNotes.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ background: "#EF4444" }}
              >
                {unreadSpecialistNotes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900 mb-4">
              Evolução Glicêmica
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={examHistory}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dGluc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0E9F8A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0E9F8A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[80, 120]}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="glicemia"
                  name="Glicemia"
                  stroke="#0E9F8A"
                  strokeWidth={2.5}
                  fill="url(#dGluc)"
                  dot={{ r: 3, fill: "#0E9F8A", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div
            className="bg-white rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900 mb-2">Resumo Clínico</h3>
            {recentExams.slice(0, 5).map((exam) => {
              const ec = examStatusConfig[exam.status]
              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {exam.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {exam.category} · {fmtDate(exam.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {exam.value}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        {exam.unit}
                      </span>
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: ec.bg, color: ec.text }}
                    >
                      {ec.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Exams ── */}
      {activeTab === "exams" && <ExamsTab aggregated={aggregated} />}

      {/* ── Consultas ── */}
      {activeTab === "consultas" && <ConsultasDocTab />}

      {/* ── Notes ── */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900 mb-3">
              Nova Nota / Recomendação
            </h3>
            <MentionTextarea
              value={newNote}
              onChange={setNewNote}
              rows={4}
              placeholder="Escreva uma nota clínica ou recomendação para o paciente..."
              mentionables={mentionables}
            />
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border hover:bg-gray-50 transition-colors"
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
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  Anexar exame
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border hover:bg-gray-50 transition-colors"
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
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  Gravar áudio
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignDocument}
                  disabled={!newNote.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40 border"
                  style={{
                    borderColor: "#FDE68A",
                    background: "#FFFBEB",
                    color: "#B45309",
                  }}
                  title="Documento formal — exige certificado ICP-Brasil"
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
                    <path d="M12 2l3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1L12 2z" />
                  </svg>
                  Assinar
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--primary)" }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Publicar nota
                </button>
              </div>
            </div>
          </div>
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-2xl border p-5"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    {note.doctor
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {note.doctor}
                    </span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      · {note.specialty}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {fmtDate(note.date)}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {note.message}
              </p>
              {note.tags.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        background: "var(--teal-100)",
                        color: "var(--teal-700)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Reference values ── */}
      {activeTab === "reference" && (
        <div className="space-y-5">
          {/* Aggregated averages — shared view */}
          <div
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-900">
                Médias calculadas pela equipe
              </h3>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: "var(--teal-100)",
                  color: "var(--teal-700)",
                }}
              >
                Compartilhado com todos os médicos
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              O sistema calcula automaticamente a média dos valores de
              referência adicionados por cada médico. Nenhuma suposição é feita
              — a média reflete apenas o que a equipe indicou.
            </p>

            <div className="space-y-3">
              {aggregated.map((agg) => (
                <div
                  key={agg.examName}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Average row */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    onClick={() =>
                      setExpandedRef(
                        expandedRef === agg.examName ? null : agg.examName,
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #0E9F8A, #0D9488)",
                        }}
                      >
                        Ø
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {agg.examName}
                        </div>
                        <div className="text-xs text-gray-400">
                          Média de {agg.doctorCount} médico
                          {agg.doctorCount > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {agg.avgMin} – {agg.avgMax}{" "}
                          <span className="text-xs font-normal text-gray-400">
                            {agg.unit}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          intervalo médio
                        </div>
                      </div>
                      <svg
                        className="text-gray-400 transition-transform"
                        style={{
                          transform:
                            expandedRef === agg.examName
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                        }}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Individual doctor values */}
                  {expandedRef === agg.examName && (
                    <div
                      className="border-t"
                      style={{
                        borderColor: "var(--border)",
                        background: "#FAFAFA",
                      }}
                    >
                      {agg.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                            style={{
                              background:
                                entry.doctorId === "d1"
                                  ? "#0E9F8A"
                                  : entry.doctorId === "d2"
                                    ? "#8B5CF6"
                                    : "#F59E0B",
                            }}
                          >
                            {entry.doctorName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-gray-800">
                                {entry.doctorName}
                              </span>
                              <span className="text-xs text-gray-400">
                                · {entry.specialty}
                              </span>
                              <span className="text-xs text-gray-400">
                                · {fmtDate(entry.addedAt)}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-700 mt-0.5">
                              {entry.min} – {entry.max}{" "}
                              <span className="text-xs font-normal text-gray-400">
                                {entry.unit}
                              </span>
                            </div>
                            {entry.note && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                "{entry.note}"
                              </p>
                            )}
                          </div>
                          {entry.doctorId === "d1" && (
                            <button
                              onClick={() => removeRef(entry.id)}
                              className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0 mt-0.5"
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
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {aggregated.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Nenhum valor de referência definido ainda.
                </div>
              )}
            </div>
          </div>

          {/* Add new reference value */}
          <div
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900 mb-1">
              Adicionar meu valor de referência
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Defina intervalos de referência do seu ponto de vista clínico.
              Serão incluídos no cálculo da média da equipe.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Nome do exame
                </label>
                <input
                  value={newRef.name}
                  onChange={(e) =>
                    setNewRef((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="ex: Glicemia em Jejum"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Mínimo
                </label>
                <input
                  value={newRef.min}
                  onChange={(e) =>
                    setNewRef((p) => ({ ...p, min: e.target.value }))
                  }
                  placeholder="0"
                  type="number"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Máximo
                </label>
                <input
                  value={newRef.max}
                  onChange={(e) =>
                    setNewRef((p) => ({ ...p, max: e.target.value }))
                  }
                  placeholder="200"
                  type="number"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Unidade
                </label>
                <input
                  value={newRef.unit}
                  onChange={(e) =>
                    setNewRef((p) => ({ ...p, unit: e.target.value }))
                  }
                  placeholder="mg/dL"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Observação (opcional)
                </label>
                <input
                  value={newRef.note}
                  onChange={(e) =>
                    setNewRef((p) => ({ ...p, note: e.target.value }))
                  }
                  placeholder="Justificativa clínica..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            </div>
            <button
              onClick={handleAddRef}
              disabled={!newRef.name || !newRef.min || !newRef.max}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              <svg
                width="14"
                height="14"
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
              Adicionar referência
            </button>
          </div>
        </div>
      )}

      {/* ── Medical team & specialist notes ── */}
      {activeTab === "team" && (
        <div className="space-y-5">
          {/* Doctors with access */}
          <div
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900 mb-4">
              Equipe médica com acesso a este paciente
            </h3>
            <div className="space-y-3">
              {patientDoctorAccess.map((doc) => (
                <div
                  key={doc.doctorId}
                  className="flex items-center gap-3 p-3.5 rounded-xl border"
                  style={{
                    borderColor: "var(--border)",
                    background: "#FAFAFA",
                  }}
                >
                  {doc.avatar ? (
                    <img
                      src={doc.avatar}
                      alt={doc.doctorName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                      }}
                    >
                      {doc.doctorName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {doc.doctorName}
                      </span>
                      {doc.doctorId === "d1" && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "var(--teal-100)",
                            color: "var(--teal-700)",
                          }}
                        >
                          Você
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.specialty} · {doc.crm}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Desde {fmtDate(doc.grantedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specialist notes directed at this doctor */}
          <div
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900 mb-1">
              Notas de especialistas para você
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Observações de colegas direcionadas a você sobre este paciente.
            </p>
            <div className="space-y-4">
              {specialistNotes.map((note) => {
                const tc = noteTypeConfig[note.type]
                return (
                  <div
                    key={note.id}
                    className="rounded-2xl border p-5"
                    style={{
                      borderColor: note.read ? "var(--border)" : tc.border,
                      background: note.read ? "#FAFAFA" : tc.bg,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={note.fromAvatar}
                        alt={note.fromDoctorName}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                              {note.fromDoctorName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {note.fromSpecialty}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium border"
                              style={{
                                background: tc.bg,
                                borderColor: tc.border,
                                color: tc.text,
                              }}
                            >
                              {tc.label}
                            </span>
                            {!note.read && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  background: "#DCFCE7",
                                  color: "#166534",
                                }}
                              >
                                Novo
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {fmtDate(note.date)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          {note.subject}
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {note.content}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-white transition-colors"
                            style={{ borderColor: "var(--border)" }}
                          >
                            Responder
                          </button>
                          <button
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-white transition-colors"
                            style={{ borderColor: "var(--border)" }}
                          >
                            Ver histórico do paciente
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step-up auth modal — passos 6 (clínico) e 7 (documento formal) */}
      {stepUp && (
        <StepUpAuthModal
          reason={stepUp}
          onConfirm={handleStepUpConfirm}
          onCancel={() => {
            setStepUp(null)
            setPendingAction(null)
          }}
        />
      )}
    </div>
  )
}

// ─── ExamsTab (doctor detail) ──────────────────────────────────────────────

const docTypeLabels: Record<DocType, string> = {
  exam: "Exames",
  prescription: "Receitas",
  report: "Laudos",
  image: "Imagens",
}

const docTypeBadge: Record<DocType, Record<"bg" | "text", string>> = {
  exam: { bg: "#CCFBF1", text: "#0E7490" },
  prescription: { bg: "#DBEAFE", text: "#1D4ED8" },
  report: { bg: "#FEF9C3", text: "#92400E" },
  image: { bg: "#EDE9FE", text: "#5B21B6" },
}

function ExamsTab({
  aggregated,
}: {
  aggregated: ReturnType<typeof computeAverageRefs>
}) {
  const [docFilter, setDocFilter] = useState<"all" | DocType>("all")
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    type: "exam" as DocType,
    name: "",
    note: "",
    file: null as File | null,
  })

  const docChips: Array<{ id: "all" | DocType } & { label: string }> = [
    { id: "all", label: "Todos" },
    { id: "exam", label: "Exames" },
    { id: "prescription", label: "Receitas" },
    { id: "report", label: "Laudos" },
    { id: "image", label: "Imagens" },
  ]

  const filteredDocs =
    docFilter === "all"
      ? patientDocuments
      : patientDocuments.filter((d) => d.type === docFilter)

  return (
    <div className="space-y-5">
      <div
        className="bg-white rounded-2xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {docChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setDocFilter(chip.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  docFilter === chip.id
                    ? { background: "var(--primary)", color: "#fff" }
                    : { background: "var(--muted)", color: "#64748B" }
                }
              >
                {chip.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar documento
          </button>
        </div>

        {showAddForm && (
          <div
            className="px-5 py-4 border-b bg-gray-50 space-y-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Tipo
                </label>
                <select
                  value={addForm.type}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      type: e.target.value as DocType,
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)", background: "#fff" }}
                >
                  <option value="exam">Exame</option>
                  <option value="prescription">Receita</option>
                  <option value="report">Laudo</option>
                  <option value="image">Imagem</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Nome
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nome do documento..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Observação
                </label>
                <input
                  type="text"
                  value={addForm.note}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="Observação opcional..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Arquivo
              </label>
              <label
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-dashed cursor-pointer hover:bg-white transition-colors"
                style={{
                  borderColor: addForm.file
                    ? "var(--primary)"
                    : "var(--border)",
                  background: addForm.file
                    ? "rgba(var(--primary-rgb, 20,184,166), 0.04)"
                    : undefined,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={addForm.file ? "var(--primary)" : "#94A3B8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span
                  className="text-sm"
                  style={{ color: addForm.file ? "var(--primary)" : "#94A3B8" }}
                >
                  {addForm.file
                    ? addForm.file.name
                    : "Clique para anexar um arquivo (PDF, JPG, PNG…)"}
                </span>
                {addForm.file && (
                  <>
                    <span className="ml-auto text-xs text-gray-400">
                      {(addForm.file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setAddForm((prev) => ({ ...prev, file: null }))
                      }}
                      className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remover arquivo"
                    >
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
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setAddForm((prev) => ({ ...prev, file: f }))
                  }}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setAddForm({ type: "exam", name: "", note: "", file: null })
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setAddForm({ type: "exam", name: "", note: "", file: null })
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-white transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {docFilter === "all" ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    background: "#FAFAFA",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {[
                    "Exame",
                    "Valor",
                    "Ref. média (equipe)",
                    "Status",
                    "Data",
                    "Lab",
                    "Anexo",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam, i) => {
                  const ec = examStatusConfig[exam.status]
                  const avg = aggregated.find((a) => a.examName === exam.name)
                  return (
                    <tr
                      key={exam.id}
                      className="hover:bg-gray-50"
                      style={{
                        borderBottom:
                          i < recentExams.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {exam.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {exam.value}{" "}
                        <span className="text-xs font-normal text-gray-400">
                          {exam.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                        {avg ? (
                          <div>
                            <span className="font-medium text-gray-700">
                              {avg.avgMin}–{avg.avgMax} {avg.unit}
                            </span>
                            <span className="text-gray-400 ml-1">
                              ({avg.doctorCount} dr
                              {avg.doctorCount > 1 ? "s" : "."})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: ec.bg, color: ec.text }}
                        >
                          {ec.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                        {fmtDate(exam.date)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                        {exam.lab}
                      </td>
                      <td className="px-5 py-3.5">
                        {exam.attachmentType ? (
                          <button
                            className="flex items-center gap-1 text-xs font-medium transition-colors"
                            style={{ color: "var(--primary)" }}
                          >
                            {exam.attachmentType === "pdf" ? (
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
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
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
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                  ry="2"
                                />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            )}
                            Ver
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            {filteredDocs.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                Nenhum documento do tipo "{docTypeLabels[docFilter]}"
                encontrado.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDocs.map((doc) => {
                  const badge = docTypeBadge[doc.type]
                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border p-4 space-y-2"
                      style={{
                        borderColor: "var(--border)",
                        background: "#FAFAFA",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {doc.name}
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {docTypeLabels[doc.type]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {fmtDate(doc.date)} · {doc.doctor}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-mono font-medium uppercase"
                          style={{ background: "#F1F5F9", color: "#64748B" }}
                        >
                          {doc.fileType}
                        </span>
                        <span className="text-xs text-gray-400">
                          {doc.size}
                        </span>
                      </div>
                      {doc.note && (
                        <p className="text-xs text-gray-500 italic line-clamp-2">
                          "{doc.note}"
                        </p>
                      )}
                      <button
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-white transition-colors w-full text-center"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Visualizar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ConsultasDocTab (doctor detail) ──────────────────────────────────────

function ConsultasDocTab() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: "",
    motivo: "",
    tipo: "Presencial",
    obs: "",
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Consultas do Paciente</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0E9F8A, #0D9488)" }}
        >
          <svg
            width="14"
            height="14"
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
          Registrar consulta
        </button>
      </div>

      {showForm && (
        <div
          className="bg-white rounded-2xl border p-5 space-y-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h4 className="font-semibold text-gray-900">Nova Consulta</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Data
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "var(--border)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Tipo
              </label>
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
              >
                <option>Presencial</option>
                <option>Telemedicina</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Motivo
              </label>
              <input
                type="text"
                value={form.motivo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, motivo: e.target.value }))
                }
                placeholder="Motivo da consulta..."
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "var(--border)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Observações
              </label>
              <textarea
                value={form.obs}
                onChange={(e) =>
                  setForm((f) => ({ ...f, obs: e.target.value }))
                }
                rows={3}
                placeholder="Observações e evolução clínica..."
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: "var(--border)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {patientConsultations.map((c, i) => (
          <div key={c.id} className="flex gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: "var(--primary)" }}
              />
              {i < patientConsultations.length - 1 && (
                <div
                  className="w-px flex-1 mt-1"
                  style={{ background: "var(--border)", minHeight: "2rem" }}
                />
              )}
            </div>
            <div
              className="bg-white rounded-2xl border p-4 flex-1 mb-2"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {c.motivo}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.doctorName} · {c.specialty}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {fmtDate(c.date)}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {c.summary}
              </p>
              {(c.documents.length > 0 || c.prescriptions.length > 0) && (
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  {c.documents.length > 0 && (
                    <span>
                      {c.documents.length} documento
                      {c.documents.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {c.prescriptions.length > 0 && (
                    <span>
                      {c.prescriptions.length} receita
                      {c.prescriptions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Messages ──────────────────────────────────────────────────────────────

function MessagesView() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [chatMessages, setChatMessages] = useState([
    {
      id: "1",
      from: "Dra. Beatriz Lima",
      text: "Carlos, sobre a paciente Ana Ribeiro: o TSH voltou normal mas gostaria de acompanhar a vitamina D junto com você. Pode revisar a suplementação que prescreveu?",
      time: "14:32",
      mine: false,
    },
    {
      id: "2",
      from: "Eu",
      text: "Claro, Beatriz! Eu prescrevi 4.000 UI/dia por 3 meses. Podemos reavaliar juntos em outubro, o que acha?",
      time: "14:45",
      mine: true,
    },
  ])

  const sendMessage = () => {
    if (!message.trim()) return
    setChatMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        from: "Eu",
        text: message,
        time: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mine: true,
      },
    ])
    setMessage("")
  }

  return (
    <div className="grid lg:grid-cols-3 gap-5" style={{ minHeight: "70vh" }}>
      <div
        className="bg-white rounded-2xl border overflow-hidden flex flex-col"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold text-gray-900 mb-3">Colegas</h3>
          <input
            placeholder="Buscar médico..."
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
          />
        </div>
        <div className="overflow-y-auto flex-1 px-3 py-2 space-y-0.5">
          {collegeDoctors.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedChat(doc.id)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left"
              style={
                selectedChat === doc.id
                  ? { background: "var(--teal-50)", color: "var(--teal-700)" }
                  : { color: "#374151" }
              }
              onMouseEnter={(e) => {
                if (selectedChat !== doc.id)
                  e.currentTarget.style.background = "#F8FAFC"
              }}
              onMouseLeave={(e) => {
                if (selectedChat !== doc.id)
                  e.currentTarget.style.background = "transparent"
              }}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={doc.avatar}
                  alt={doc.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    doc.online ? "bg-green-400" : "bg-gray-300"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{doc.name}</div>
                <div className="text-xs text-gray-400">{doc.specialty}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Recentes
          </p>
          {doctorMessages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => setSelectedChat(msg.fromId)}
              className="w-full flex items-start gap-3 py-2.5 hover:bg-gray-50 rounded-xl px-2 transition-colors text-left"
            >
              <img
                src={msg.avatar}
                alt={msg.from}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {msg.from}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {msg.time}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {msg.content}
                </p>
              </div>
              {!msg.read && (
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        className="lg:col-span-2 bg-white rounded-2xl border flex flex-col"
        style={{ borderColor: "var(--border)" }}
      >
        {selectedChat ? (
          <>
            <div
              className="flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              {collegeDoctors
                .filter((d) => d.id === selectedChat)
                .map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={doc.avatar}
                        alt={doc.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          doc.online ? "bg-green-400" : "bg-gray-300"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {doc.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {doc.specialty} · {doc.online ? "Online" : "Offline"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.mine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    style={
                      msg.mine
                        ? {
                            background: "var(--primary)",
                            color: "#fff",
                            borderBottomRightRadius: 4,
                          }
                        : {
                            background: "#F1F5F9",
                            color: "#1E293B",
                            borderBottomLeftRadius: 4,
                          }
                    }
                  >
                    {msg.text}
                    <div className="text-xs mt-1 opacity-60">{msg.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="px-5 py-4 border-t flex gap-3"
              style={{ borderColor: "var(--border)" }}
            >
              <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage()
                }}
                placeholder="Mensagem..."
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                style={{ background: "var(--primary)" }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--teal-50)" }}
            >
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
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Selecione uma conversa
            </h3>
            <p className="text-sm text-gray-500">
              Escolha um colega para iniciar ou continuar uma conversa sobre um
              caso clínico.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
