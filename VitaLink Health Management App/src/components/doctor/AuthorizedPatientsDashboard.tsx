import { useEffect, useMemo, useRef, useState } from "react"
import Layout from "@/components/shared/Layout"
import type { Page } from "@/data/mockData"

interface Props {
  onNavigate: (page: Page) => void
  onLogout: () => void
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
}: Props) {
  const [patients, setPatients] = useState<AuthorizedPatient[]>([])
  const [selectedPatient, setSelectedPatient] =
    useState<AuthorizedPatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

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
      currentPage="doctor-dashboard"
      userType="doctor"
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={selectedPatient ? selectedPatient.name : "Meus pacientes"}
      subtitle={
        selectedPatient
          ? "Detalhes permitidos pela autorização vigente"
          : `${patients.length} pacientes com autorização vigente`
      }
      action={
        selectedPatient ? (
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
      {selectedPatient ? (
        <PatientDetail patient={selectedPatient} />
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

function PatientDetail({ patient }: { patient: AuthorizedPatientDetail }) {
  return (
    <section
      className="max-w-3xl rounded-2xl border bg-white p-6"
      style={{ borderColor: "var(--border)" }}
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Dados autorizados do paciente
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Nome" value={patient.name} />
        <DetailItem label="Nascimento" value={formatDate(patient.birthdate)} />
        <DetailItem label="Telefone" value={patient.phone} />
        <DetailItem
          label="Tipo sanguíneo"
          value={patient.blood_type || "Não informado"}
        />
      </dl>
      <div className="mt-6 border-t pt-5">
        <h3 className="text-sm font-semibold text-gray-900">Escopo vigente</h3>
        <p className="mt-2 text-sm text-gray-600">
          Categorias: {patient.categories.join(", ")}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Operações: {patient.operations.join(", ")}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Expira em {new Date(patient.expires_at).toLocaleString("pt-BR")}
        </p>
      </div>
    </section>
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
