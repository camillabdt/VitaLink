import React, { useCallback, useEffect, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts"
import Layout from "@/components/shared/Layout"
import type { Page } from "@/data/mockData"
import {
  examHistory,
  recentExams,
  doctorRecommendations,
  currentPatient,
  fmtDate,
} from "@/data/mockData"
import DocumentUploadModal from "@/components/shared/DocumentUploadModal"
import type { StoredDocument } from "@/components/shared/DocumentUploadModal"
import DocumentViewerModal from "@/components/shared/DocumentViewerModal"
import PersonalObservations from "@/components/patient/PersonalObservations"
import ClinicalResults from "@/components/patient/ClinicalResults"
import ClinicalGoals from "@/components/shared/ClinicalGoals"
import ProfessionalRecords from "@/components/shared/ProfessionalRecords"

interface Props {
  onNavigate: (page: Page) => void
  onLogout: () => void
  initialTab?: PatientTab
}

type PatientTab = "overview" | "documents" | "observations" | "charts" | "recommendations"

const statusConfig = {
  normal: { label: "Normal", bg: "#DCFCE7", text: "#166534" },
  high: { label: "Alto", bg: "#FEE2E2", text: "#991B1B" },
  low: { label: "Baixo", bg: "#DBEAFE", text: "#1E40AF" },
  critical: { label: "Crítico", bg: "#FEE2E2", text: "#7F1D1D" },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white border rounded-xl px-4 py-3 shadow-lg"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-semibold text-gray-900">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function PatientDashboard({
  onNavigate,
  onLogout,
  initialTab = "overview",
}: Props) {
  const [activeTab, setActiveTab] = useState<PatientTab>(initialTab)

  const handleSessionExpired = useCallback(() => {
    sessionStorage.removeItem("vitallink.csrf")
    onNavigate("login")
  }, [onNavigate])

  const tabs = [
    { id: "overview", label: "Visão Geral" },
    { id: "documents", label: "Documentos" },
    { id: "observations", label: "Histórico" },
    { id: "charts", label: "Evolução" },
    { id: "recommendations", label: "Recomendações" },
  ] as const

  const summaryCards = [
    {
      label: "Próximo Exame",
      value: "18 ago",
      sub: "Hemograma completo",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      color: "#F59E0B",
      bg: "#FEF9C3",
    },
    {
      label: "Glicemia",
      value: "95 mg/dL",
      sub: "Normal · Jul 2026",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      color: "#0E9F8A",
      bg: "#CCFBF1",
    },
    {
      label: "Pressão Arterial",
      value: "116/76",
      sub: "Normal · Jul 2026",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      ),
      color: "#8B5CF6",
      bg: "#EDE9FE",
    },
    {
      label: "Vitamina D",
      value: "18 ng/mL",
      sub: "Baixo · Atenção",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
      color: "#EF4444",
      bg: "#FEE2E2",
    },
  ]

  return (
    <Layout
      currentPage="patient-dashboard"
      userType="patient"
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={`Olá, ${currentPatient.name.split(" ")[0]} 👋`}
      subtitle="Aqui está um resumo da sua saúde hoje"
      action={
        <button
          onClick={() => onNavigate("import-exam")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0E9F8A, #0D9488)" }}
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
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
          </svg>
          Importar exame
        </button>
      }
    >
      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ background: "var(--muted)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
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
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab summaryCards={summaryCards} />}
      {activeTab === "documents" && <DocumentsTab />}
      {activeTab === "observations" && (
        <div className="space-y-6">
          <PersonalObservations onSessionExpired={handleSessionExpired} />
          <ClinicalResults
            mode="history"
            onSessionExpired={handleSessionExpired}
          />
          <ProfessionalRecords
            mode="history"
            onSessionExpired={handleSessionExpired}
          />
        </div>
      )}
      {activeTab === "charts" && (
        <div className="space-y-6">
          <ClinicalResults
            mode="charts"
            onSessionExpired={handleSessionExpired}
          />
          <ClinicalGoals onSessionExpired={handleSessionExpired} />
        </div>
      )}
      {activeTab === "recommendations" && (
        <ProfessionalRecords
          mode="recommendations"
          onSessionExpired={handleSessionExpired}
        />
      )}
    </Layout>
  )
}

function OverviewTab({ summaryCards }: { summaryCards: any[] }) {
  return (
    <div className="space-y-6">
      {/* Alert banner */}
      <div
        className="flex items-start gap-3 px-4 py-3.5 rounded-xl border-l-4 bg-amber-50 border border-amber-100"
        style={{ borderLeftColor: "#F59E0B" }}
      >
        <svg
          className="flex-shrink-0 mt-0.5 text-amber-500"
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
            Vitamina D abaixo do ideal
          </p>
          <p className="text-amber-700 text-xs mt-0.5">
            Dr. Carlos Mendes recomenda iniciar suplementação.{" "}
            <span className="underline cursor-pointer font-medium">
              Ver recomendação
            </span>
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-4 border card-hover"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
              <span className="text-xs text-gray-400">
                {card.sub.split("·")[1]?.trim() || ""}
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            <div
              className="text-xs mt-1 font-medium"
              style={{ color: card.color }}
            >
              {card.sub.split("·")[0]?.trim()}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Glicemia chart */}
        <div
          className="lg:col-span-2 bg-white rounded-2xl p-5 border"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                Evolução da Glicemia
              </h3>
              <p className="text-xs text-gray-500">
                Últimos 6 meses · meta: &lt;100 mg/dL
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "#DCFCE7", color: "#166534" }}
            >
              Normal
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={examHistory}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="glucGrad" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={99}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "limite",
                  position: "right",
                  fontSize: 10,
                  fill: "#F59E0B",
                }}
              />
              <Area
                type="monotone"
                dataKey="glicemia"
                name="Glicemia"
                stroke="#0E9F8A"
                strokeWidth={2.5}
                fill="url(#glucGrad)"
                dot={{ r: 4, fill: "#0E9F8A", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Colesterol chart */}
        <div
          className="bg-white rounded-2xl p-5 border"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Colesterol Total</h3>
              <p className="text-xs text-gray-500">meta: &lt;200 mg/dL</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={examHistory}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
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
                domain={[160, 240]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={200}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Bar
                dataKey="colesterol"
                name="Colesterol"
                fill="#8B5CF6"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center mt-2">
            <span className="text-2xl font-bold text-gray-900">188</span>
            <span className="text-sm text-gray-500 ml-1">mg/dL</span>
            <div className="text-xs text-green-600 font-medium mt-0.5">
              ↓ 12% desde março
            </div>
          </div>
        </div>
      </div>

      {/* Recent exams + Doctor rec */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent exams */}
        <div
          className="bg-white rounded-2xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="font-semibold text-gray-900">Últimos Resultados</h3>
            <button
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              Ver todos
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {recentExams.slice(0, 5).map((exam) => {
              const cfg = statusConfig[exam.status]
              const pct = Math.min(
                100,
                Math.max(
                  0,
                  ((exam.value - exam.refMin) / (exam.refMax - exam.refMin)) *
                    100,
                ),
              )
              return (
                <div
                  key={exam.id}
                  className="px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {exam.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {fmtDate(exam.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {exam.value}{" "}
                        <span className="text-xs font-normal text-gray-400">
                          {exam.unit}
                        </span>
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 mt-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background:
                          exam.status === "normal"
                            ? "#0E9F8A"
                            : exam.status === "high"
                              ? "#EF4444"
                              : "#3B82F6",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>ref: {exam.refMin}</span>
                    <span>
                      {exam.refMax} {exam.unit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Doctor recs */}
        <div
          className="bg-white rounded-2xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="font-semibold text-gray-900">Do seu Médico</h3>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              3 novas
            </span>
          </div>
          <div className="px-5 space-y-3 pb-5">
            {doctorRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl p-4 border cursor-pointer hover:shadow-sm transition-shadow"
                style={{
                  borderColor:
                    rec.type === "alert" ? "#FED7AA" : "var(--border)",
                  background:
                    rec.type === "alert"
                      ? "#FFFBEB"
                      : rec.type === "note"
                        ? "#F0FDF9"
                        : "#FAFAFA",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                      }}
                    >
                      {rec.doctor
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-800">
                        {rec.doctor}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        · {rec.specialty}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {fmtDate(rec.date)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                  {rec.message}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {rec.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--teal-100)",
                        color: "var(--teal-700)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const docTypeConfig: Record<StoredDocument["category"], {
  label: string
  bg: string
  text: string
  icon: React.ReactNode
}> = {
  exames: {
    label: "Exame",
    bg: "#CCFBF1",
    text: "#0E7490",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  receitas: {
    label: "Receita",
    bg: "#DBEAFE",
    text: "#1D4ED8",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  laudos: {
    label: "Laudo",
    bg: "#FEF9C3",
    text: "#92400E",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  imagens: {
    label: "Imagem",
    bg: "#EDE9FE",
    text: "#5B21B6",
    icon: (
      <svg
        width="16"
        height="16"
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
    ),
  },
}

function DocumentsTab() {
  const [docFilter, setDocFilter] =
    useState<"all" | StoredDocument["category"]>("all")
  const [docs, setDocs] = useState<StoredDocument[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [viewing, setViewing] = useState<StoredDocument | null>(null)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    fetch("/api/v1/documents", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("documents unavailable")
        return (await response.json()) as StoredDocument[]
      })
      .then(setDocs)
      .catch(() => setLoadError("Não foi possível carregar os documentos."))
  }, [])

  const filterChips: Array<{
    id: "all" | StoredDocument["category"]
    label: string
  }> = [
    { id: "all", label: "Todos" },
    { id: "exames", label: "Exames" },
    { id: "receitas", label: "Receitas" },
    { id: "laudos", label: "Laudos" },
    { id: "imagens", label: "Imagens" },
  ]

  const filtered =
    docFilter === "all"
      ? docs
      : docs.filter((document) => document.category === docFilter)

  const counts: Record<string, number> = { all: docs.length }
  for (const document of docs) {
    counts[document.category] = (counts[document.category] ?? 0) + 1
  }

  return (
    <>
      <div className="space-y-5">
        {loadError && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {loadError}
          </p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setDocFilter(chip.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                style={
                  docFilter === chip.id
                    ? { background: "var(--primary)", color: "#fff" }
                    : { background: "var(--muted)", color: "#64748B" }
                }
              >
                {chip.label}
                {counts[chip.id] > 0 && (
                  <span
                    className="text-xs rounded-full px-1.5 py-0.5 leading-none"
                    style={
                      docFilter === chip.id
                        ? {
                            background: "rgba(255,255,255,0.25)",
                            color: "#fff",
                          }
                        : { background: "#E2E8F0", color: "#64748B" }
                    }
                  >
                    {counts[chip.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowUpload(true)}
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
            Adicionar documento
          </button>
        </div>

        {filtered.length === 0 ? (
          <div
            className="bg-white rounded-2xl border py-16 flex flex-col items-center gap-3 text-gray-400"
            style={{ borderColor: "var(--border)" }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm">Nenhum documento encontrado</p>
            <button
              onClick={() => setShowUpload(true)}
              className="text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              Adicionar primeiro documento
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((doc) => {
              const cfg = docTypeConfig[doc.category]
              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border p-4 flex flex-col gap-3 card-hover"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.text }}
                    >
                      {cfg.icon}
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.text }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {doc.original_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {fmtDate(doc.created_at.slice(0, 10))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono font-medium uppercase"
                      style={{ background: "#F1F5F9", color: "#64748B" }}
                    >
                      {doc.content_type.split("/")[1].replace("jpeg", "jpg")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(doc.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-2 mt-auto pt-2 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <button
                      onClick={() => setViewing(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all hover:opacity-90 text-white"
                      style={{ background: "var(--primary)" }}
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
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Visualizar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <DocumentUploadModal
          onSave={(doc) => {
            setDocs((prev) => [doc, ...prev])
            setShowUpload(false)
            setViewing(doc)
          }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {viewing && (
        <DocumentViewerModal doc={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  )
}

function HistoryTab() {
  const [filter, setFilter] = useState("all")
  const categories = [
    "all",
    ...Array.from(new Set(recentExams.map((e) => e.category))),
  ]

  const filtered =
    filter === "all"
      ? recentExams
      : recentExams.filter((e) => e.category === filter)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
            style={
              filter === cat
                ? { background: "var(--primary)", color: "#fff" }
                : { background: "var(--muted)", color: "#64748B" }
            }
          >
            {cat === "all" ? "Todos" : cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-2xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "#FAFAFA",
                }}
              >
                {[
                  "Exame",
                  "Valor",
                  "Referência",
                  "Status",
                  "Data",
                  "Médico",
                  "Laboratório",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((exam, i) => {
                const cfg = statusConfig[exam.status]
                return (
                  <tr
                    key={exam.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{
                      borderBottom:
                        i < filtered.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-gray-900">
                        {exam.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {exam.category}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                      {exam.value}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        {exam.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {exam.refMin}–{exam.refMax} {exam.unit}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {fmtDate(exam.date)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {exam.doctor}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {exam.lab}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ChartsTab() {
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Glicemia */}
        <div
          className="bg-white rounded-2xl p-5 border"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="font-semibold text-gray-900 mb-1">
            Glicemia em Jejum
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Valores normais: 70–99 mg/dL
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={examHistory}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0E9F8A" stopOpacity={0.2} />
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
                domain={[70, 120]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={99}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                label={{
                  value: "limite",
                  position: "right",
                  fontSize: 10,
                  fill: "#F59E0B",
                }}
              />
              <Area
                type="monotone"
                dataKey="glicemia"
                name="Glicemia"
                stroke="#0E9F8A"
                strokeWidth={2.5}
                fill="url(#g1)"
                dot={{ r: 4, fill: "#0E9F8A", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Colesterol */}
        <div
          className="bg-white rounded-2xl p-5 border"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="font-semibold text-gray-900 mb-1">Colesterol Total</h3>
          <p className="text-xs text-gray-500 mb-4">
            Valores normais: &lt;200 mg/dL
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={examHistory}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
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
                domain={[160, 240]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={200} stroke="#F59E0B" strokeDasharray="4 4" />
              <Bar
                dataKey="colesterol"
                name="Colesterol"
                fill="#8B5CF6"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hemoglobina */}
        <div
          className="bg-white rounded-2xl p-5 border"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="font-semibold text-gray-900 mb-1">Hemoglobina</h3>
          <p className="text-xs text-gray-500 mb-4">
            Valores normais (♀): 12–16 g/dL
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={examHistory}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
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
                domain={[11, 17]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={12} stroke="#3B82F6" strokeDasharray="4 4" />
              <ReferenceLine y={16} stroke="#EF4444" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="hemoglobina"
                name="Hemoglobina"
                stroke="#EC4899"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#EC4899", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pressão */}
        <div
          className="bg-white rounded-2xl p-5 border"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="font-semibold text-gray-900 mb-1">
            Pressão Sistólica
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Valores normais: 90–120 mmHg
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={examHistory}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
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
                domain={[100, 140]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={120}
                stroke="#EF4444"
                strokeDasharray="4 4"
                label={{
                  value: "limite",
                  position: "right",
                  fontSize: 10,
                  fill: "#EF4444",
                }}
              />
              <Area
                type="monotone"
                dataKey="pressaoSistolica"
                name="Pressão Sistólica"
                stroke="#F59E0B"
                strokeWidth={2.5}
                fill="url(#pressGrad)"
                dot={{ r: 4, fill: "#F59E0B", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function RecommendationsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Orientações dos seus médicos — atualizadas em tempo real.
      </p>
      {doctorRecommendations.map((rec) => {
        const typeColors = {
          recommendation: {
            bg: "#F0FDF9",
            border: "#A7F3D0",
            icon: "#059669",
            label: "Recomendação",
          },
          alert: {
            bg: "#FFFBEB",
            border: "#FCD34D",
            icon: "#D97706",
            label: "Alerta",
          },
          note: {
            bg: "#EFF6FF",
            border: "#BFDBFE",
            icon: "#2563EB",
            label: "Observação",
          },
        }
        const tc = typeColors[(rec.type as keyof typeof typeColors)]
        return (
          <div
            key={rec.id}
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                }}
              >
                {rec.doctor
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <span className="font-semibold text-gray-900 text-sm">
                      {rec.doctor}
                    </span>
                    <span className="text-sm text-gray-500">
                      {" "}
                      · {rec.specialty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium border"
                      style={{
                        background: tc.bg,
                        borderColor: tc.border,
                        color: tc.icon,
                      }}
                    >
                      {tc.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmtDate(rec.date)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {rec.message}
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {rec.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: "var(--teal-100)",
                        color: "var(--teal-700)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
