import { useEffect, useMemo, useRef, useState } from "react"
import Layout from "@/components/shared/Layout"
import DocumentUploadModal from "@/components/shared/DocumentUploadModal"
import ClinicalGoals from "@/components/shared/ClinicalGoals"
import ClinicalMessages from "@/components/shared/ClinicalMessages"
import ProfessionalRecords from "@/components/shared/ProfessionalRecords"
import ClinicalResults from "@/components/patient/ClinicalResults"
import type { Page } from "@/data/mockData"

interface Props {
  onNavigate: (page: Page) => void
  onLogout: () => void
  messagesOnly?: boolean
}

interface AuthorizedPatient {
  id: string
  name: string
  categories: string[]
  operations: string[]
  expires_at: string
}

interface AuthorizedPatientDetail extends AuthorizedPatient {
  birthdate: string
  blood_type: string | null
  phone: string
}

interface LabeledValueProps {
  label: string
  value: string | number
}

export default function AuthorizedPatientsDashboard({
  onNavigate,
  onLogout,
  messagesOnly = false,
}: Props) {
  const [patients, setPatients] = useState<AuthorizedPatient[]>([])
  const [selectedPatient, setSelectedPatient] =
    useState<AuthorizedPatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [messagePatientId, setMessagePatientId] = useState("")

  const handleSessionExpired = () => {
    sessionStorage.removeItem("vitallink.csrf")
    onNavigate("login")
  }

  useEffect(() => {
    let active = true
    const loadPatients = (clearDetail = false) => {
      fetch("/api/v1/patients", { credentials: "same-origin" })
        .then(async (response) => {
          if (response.status === 401) {
            handleSessionExpired()
            return []
          }
          if (!response.ok) throw new Error("patients unavailable")
          return (await response.json()) as AuthorizedPatient[]
        })
        .then((authorizedPatients) => {
          if (!active) return
          const currentPatients = Array.isArray(authorizedPatients)
            ? authorizedPatients
            : []
          setPatients(currentPatients)
          if (clearDetail) setSelectedPatient(null)
        })
        .catch(() => {
          if (active)
            setError("Não foi possível carregar os pacientes autorizados.")
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    const revalidateVisiblePage = () => {
      if (document.visibilityState === "visible") loadPatients(true)
    }
    loadPatients()
    const revalidateFocusedPage = () => loadPatients(true)
    window.addEventListener("focus", revalidateFocusedPage)
    document.addEventListener("visibilitychange", revalidateVisiblePage)
    return () => {
      active = false
      window.removeEventListener("focus", revalidateFocusedPage)
      document.removeEventListener("visibilitychange", revalidateVisiblePage)
    }
  }, [])

  const filteredPatients = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.name
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")) &&
          (category === "all" || patient.categories.includes(category)),
      ),
    [category, patients, search],
  )
  const messagingPatients = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.categories.includes("mensagens") &&
          patient.operations.includes("consultar") &&
          patient.operations.includes("anexar"),
      ),
    [patients],
  )
  const messagePatient =
    messagingPatients.find((patient) => patient.id === messagePatientId) ??
    messagingPatients[0]

  const openPatient = async (patientId: string) => {
    setDetailLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/v1/patients/${patientId}`, {
        credentials: "same-origin",
      })
      if (response.status === 401) {
        handleSessionExpired()
        return
      }
      if (!response.ok) {
        setPatients((current) =>
          current.filter((patient) => patient.id !== patientId),
        )
        setError("O acesso a este paciente não está mais disponível.")
        return
      }
      setSelectedPatient((await response.json()) as AuthorizedPatientDetail)
    } catch {
      setError("Não foi possível consultar o paciente.")
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <Layout
      currentPage={messagesOnly ? "doctor-messages" : "doctor-dashboard"}
      userType="doctor"
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={
        messagesOnly
          ? "Mensagens"
          : selectedPatient
            ? selectedPatient.name
            : "Meus pacientes"
      }
      subtitle={
        messagesOnly
          ? "Comunicação com colegas"
          : selectedPatient
            ? "Detalhes permitidos pela autorização vigente"
            : `${patients.length} pacientes com autorização vigente`
      }
      action={
        selectedPatient && !messagesOnly ? (
          <button
            type="button"
            onClick={() => setSelectedPatient(null)}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            Voltar à lista
          </button>
        ) : null
      }
    >
      {messagesOnly ? (
        loading ? (
          <p role="status">Carregando mensagens...</p>
        ) : error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : messagePatient ? (
          <div className="space-y-4">
            <label className="block max-w-sm text-sm font-medium text-gray-700">
              Contexto do paciente
              <select
                value={messagePatient.id}
                onChange={(event) => setMessagePatientId(event.target.value)}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
              >
                {messagingPatients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </label>
            <ClinicalMessages
              key={messagePatient.id}
              patientId={messagePatient.id}
              categories={messagePatient.categories}
              operations={messagePatient.operations}
              onSessionExpired={handleSessionExpired}
              showHeading={false}
            />
          </div>
        ) : (
          <p>Nenhum paciente disponível para mensagens.</p>
        )
      ) : selectedPatient ? (
        <PatientDetail
          patient={selectedPatient}
          onSessionExpired={handleSessionExpired}
        />
      ) : (
        <PatientList
          patients={filteredPatients}
          total={patients.length}
          loading={loading || detailLoading}
          error={error}
          search={search}
          category={category}
          onSearch={setSearch}
          onCategory={setCategory}
          onSelect={(patientId) => void openPatient(patientId)}
          onSessionExpired={handleSessionExpired}
        />
      )}
    </Layout>
  )
}

function PatientList({
  patients,
  total,
  loading,
  error,
  search,
  category,
  onSearch,
  onCategory,
  onSelect,
  onSessionExpired,
}: {
  patients: AuthorizedPatient[]
  total: number
  loading: boolean
  error: string
  search: string
  category: string
  onSearch: (value: string) => void
  onCategory: (value: string) => void
  onSelect: (patientId: string) => void
  onSessionExpired: () => void
}) {
  const codeInput = useRef<HTMLInputElement>(null)
  const [accessCode, setAccessCode] = useState("")
  const [justification, setJustification] = useState("")
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState("")
  const [requestMessage, setRequestMessage] = useState("")

  const requestAccess = async (event: React.FormEvent) => {
    event.preventDefault()
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken) {
      setRequestError("Recarregue a página para validar esta solicitação.")
      return
    }
    setRequestLoading(true)
    setRequestError("")
    setRequestMessage("")
    try {
      const response = await fetch("/api/v1/access-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          code: accessCode.trim(),
          justification: justification.trim(),
        }),
      })
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (!response.ok) {
        setRequestError(
          response.status === 422
            ? "O código informado não é válido."
            : "Não foi possível enviar a solicitação.",
        )
        return
      }
      const pending = (await response.json()) as { patient: string }
      setRequestMessage(`Solicitação enviada para ${pending.patient}.`)
      setAccessCode("")
      setJustification("")
    } catch {
      setRequestError("Não foi possível enviar a solicitação. Tente novamente.")
    } finally {
      setRequestLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2">
        <Metric label="Pacientes autorizados" value={total} />
        <Metric label="Resultado do filtro" value={patients.length} />
      </section>

      <section
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              Solicitar novo acesso
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Use apenas o código temporário compartilhado pelo paciente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => codeInput.current?.focus()}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            + Novo paciente
          </button>
        </div>
        <form
          onSubmit={requestAccess}
          className="mt-4 grid gap-3 lg:grid-cols-[1fr_2fr_auto] lg:items-end"
        >
          <div>
            <label
              htmlFor="access-code"
              className="block text-sm font-medium text-gray-700"
            >
              Código temporário
            </label>
            <input
              ref={codeInput}
              id="access-code"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              minLength={32}
              required
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="access-justification"
              className="block text-sm font-medium text-gray-700"
            >
              Justificativa clínica
            </label>
            <input
              id="access-justification"
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              minLength={10}
              required
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={requestLoading}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {requestLoading ? "Enviando..." : "Enviar solicitação"}
          </button>
        </form>
        {requestMessage && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {requestMessage}
          </p>
        )}
        {requestError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {requestError}
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: "var(--border)" }}
      >
        <PatientFilters
          search={search}
          category={category}
          onSearch={onSearch}
          onCategory={onCategory}
        />
        {loading ? (
          <p role="status" className="mt-5 text-sm text-gray-500">
            Carregando pacientes autorizados...
          </p>
        ) : error ? (
          <p role="alert" className="mt-5 text-sm text-red-600">
            {error}
          </p>
        ) : patients.length === 0 ? (
          <p className="mt-5 text-sm text-gray-500">
            Nenhum paciente autorizado encontrado.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {patients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: LabeledValueProps) {
  return (
    <div
      className="rounded-2xl border bg-white p-5"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function PatientFilters({
  search,
  category,
  onSearch,
  onCategory,
}: {
  search: string
  category: string
  onSearch: (value: string) => void
  onCategory: (value: string) => void
}) {
  const categories = [
    "histórico",
    "consultas",
    "exames",
    "laudos",
    "receitas",
    "imagens",
    "recomendações",
    "metas",
    "mensagens",
  ]
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
      <div>
        <label htmlFor="patient-search" className="sr-only">
          Buscar pacientes autorizados
        </label>
        <input
          id="patient-search"
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar pacientes autorizados"
          className="w-full rounded-xl border px-4 py-2.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="category-filter" className="sr-only">
          Filtrar por categoria
        </label>
        <select
          id="category-filter"
          value={category}
          onChange={(event) => onCategory(event.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function PatientCard({
  patient,
  onSelect,
}: {
  patient: AuthorizedPatient
  onSelect: (patientId: string) => void
}) {
  return (
    <li
      className="rounded-2xl border p-5"
      style={{ borderColor: "var(--border)" }}
    >
      <h2 className="font-semibold text-gray-900">{patient.name}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {patient.categories.map((item) => (
          <span
            key={item}
            className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700"
          >
            {item}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Acesso até {new Date(patient.expires_at).toLocaleDateString("pt-BR")}
      </p>
      <button
        type="button"
        onClick={() => onSelect(patient.id)}
        className="mt-4 rounded-xl px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
      >
        Ver detalhes
      </button>
    </li>
  )
}

function PatientDetail({
  patient,
  onSessionExpired,
}: {
  patient: AuthorizedPatientDetail
  onSessionExpired: () => void
}) {
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] =
    useState<"overview" | "exams" | "consultations" | "notes" | "goals" | "team">(
      "overview",
    )
  const age = calculateAge(patient.birthdate)
  const documentCategories = ["exames", "receitas", "laudos", "imagens"]
  const tabs = [
    { id: "overview", label: "Visão Geral", visible: true },
    {
      id: "exams",
      label: "Exames",
      visible: patient.categories.some((value) =>
        documentCategories.includes(value),
      ),
    },
    {
      id: "consultations",
      label: "Consultas",
      visible: patient.categories.includes("consultas"),
    },
    {
      id: "notes",
      label: "Notas",
      visible:
        patient.categories.includes("consultas") ||
        patient.categories.includes("recomendações"),
    },
    {
      id: "goals",
      label: "Metas clínicas",
      visible: patient.categories.includes("metas"),
    },
    {
      id: "team",
      label: "Equipe médica",
      visible: patient.categories.includes("mensagens"),
    },
  ].filter((tab) => tab.visible)

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0E9F8A, #0D9488)" }}
            aria-hidden="true"
          >
            {patient.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900">{patient.name}</h2>
            <p className="text-sm text-gray-500">
              {age} anos ·{" "}
              {patient.blood_type || "Tipo sanguíneo não informado"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Telefone: {patient.phone}</span>
              <span>
                Acesso até{" "}
                {new Date(patient.expires_at).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="Seções do paciente"
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl p-1"
        style={{ background: "var(--muted)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium"
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
      </nav>

      {activeTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section
            className="rounded-2xl border bg-white p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900">Dados autorizados</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Nascimento"
                value={formatDate(patient.birthdate)}
              />
              <DetailItem label="Telefone" value={patient.phone} />
              <DetailItem
                label="Tipo sanguíneo"
                value={patient.blood_type || "Não informado"}
              />
              <DetailItem
                label="Validade do acesso"
                value={new Date(patient.expires_at).toLocaleString("pt-BR")}
              />
            </dl>
          </section>
          <section
            className="rounded-2xl border bg-white p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900">Escopo vigente</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {patient.categories.map((value) => (
                <span
                  key={value}
                  className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700"
                >
                  {value}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Operações permitidas: {patient.operations.join(", ")}.
            </p>
          </section>
          {patient.categories.includes("exames") && (
            <section className="lg:col-span-2">
              <ClinicalResults
                mode="charts"
                patientId={patient.id}
                onSessionExpired={onSessionExpired}
              />
            </section>
          )}
        </div>
      )}

      {activeTab === "exams" && (
        <div className="space-y-4">
          {patient.operations.includes("anexar") && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              + Adicionar documento
            </button>
          )}
          {patient.categories.includes("exames") ? (
            <ClinicalResults
              mode="history"
              patientId={patient.id}
              onSessionExpired={onSessionExpired}
            />
          ) : (
            <p className="text-sm text-gray-500">
              Esta autorização permite documentos, mas não resultados
              estruturados de exames.
            </p>
          )}
        </div>
      )}

      {activeTab === "consultations" && (
        <ProfessionalRecords
          patientId={patient.id}
          categories={["consultas"]}
          operations={patient.operations}
          mode="consultations"
          onSessionExpired={onSessionExpired}
        />
      )}

      {activeTab === "notes" && (
        <ProfessionalRecords
          patientId={patient.id}
          categories={patient.categories.filter((value) =>
            ["consultas", "recomendações"].includes(value),
          )}
          operations={patient.operations}
          mode="notes"
          onSessionExpired={onSessionExpired}
        />
      )}

      {activeTab === "goals" && (
        <ClinicalGoals
          patientId={patient.id}
          categories={patient.categories}
          operations={patient.operations}
          onSessionExpired={onSessionExpired}
        />
      )}

      {activeTab === "team" && (
        <ClinicalMessages
          patientId={patient.id}
          categories={patient.categories}
          operations={patient.operations}
          onSessionExpired={onSessionExpired}
        />
      )}
      {showUpload && (
        <DocumentUploadModal
          patientId={patient.id}
          onClose={() => setShowUpload(false)}
          onSave={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}

function DetailItem({ label, value }: LabeledValueProps) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
}

function calculateAge(birthdate: string) {
  const today = new Date()
  const birth = new Date(`${birthdate}T00:00:00`)
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age -= 1
  }
  return age
}
