import { useEffect, useState } from "react"
import Layout from "@/components/shared/Layout"
import type { Page, PatientDoctorAccess } from "@/data/mockData"
import {
  currentPatient,
  patientDoctorAccess,
  patientAccessLogs,
  fmtDate,
} from "@/data/mockData"
import doctorImg from "@/imports/ChatGPT_Image_3_de_ago._de_2026__11_38_29.png"

interface Props {
  onNavigate: (page: Page) => void
  onLogout: () => void
}

interface AccountSession {
  id: string
  current: boolean
  created_at: string
  last_used_at: string
  expires_at: string
}

export default function PatientProfile({ onNavigate, onLogout }: Props) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(
    "Tenho histórico familiar de doenças cardíacas. Faço acompanhamento regular. Pratico caminhada 3x/semana. Tomo vitamina D conforme indicação médica desde julho de 2026.",
  )
  const [editNote, setEditNote] = useState(note)
  const [form, setForm] = useState({
    name: currentPatient.name,
    email: currentPatient.email,
    phone: currentPatient.phone,
    birthdate: currentPatient.birthdate,
    bloodType: currentPatient.bloodType,
    weight: String(currentPatient.weight),
    height: String(currentPatient.height),
  })
  const [savingNote, setSavingNote] = useState(false)
  const [doctors, setDoctors] =
    useState<PatientDoctorAccess[]>(patientDoctorAccess)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [activeTab, setActiveTab] =
    useState<"personal" | "doctors" | "security">("personal")
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState("")
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmation: "",
    totpCode: "",
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const handleSessionExpired = () => {
    sessionStorage.removeItem("vitallink.csrf")
    onNavigate("login")
  }

  useEffect(() => {
    if (activeTab !== "security") return
    let active = true
    setSessionsLoading(true)
    setSessionsError("")
    fetch("/api/v1/sessions", { credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) {
          handleSessionExpired()
          return []
        }
        if (!response.ok) throw new Error("sessions unavailable")
        return (await response.json()) as AccountSession[]
      })
      .then((items) => {
        if (active) setSessions(items)
      })
      .catch(() => {
        if (active)
          setSessionsError("Não foi possível carregar as sessões ativas.")
      })
      .finally(() => {
        if (active) setSessionsLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeTab])

  const endSession = async (sessionId: string) => {
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken) {
      setSessionsError("Recarregue a página para validar esta solicitação.")
      return
    }
    setSessionsError("")
    try {
      const response = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      })
      if (response.status === 401) {
        handleSessionExpired()
        return
      }
      if (!response.ok) throw new Error("session revoke failed")
      setSessions((current) =>
        current.filter((session) => session.id !== sessionId),
      )
    } catch {
      setSessionsError("Não foi possível encerrar a sessão. Tente novamente.")
    }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError("")
    setPasswordMessage("")
    if (passwordForm.newPassword !== passwordForm.confirmation) {
      setPasswordError("As senhas não coincidem.")
      return
    }
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken) {
      setPasswordError("Recarregue a página para validar esta solicitação.")
      return
    }
    setPasswordSaving(true)
    const headers = {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    }
    try {
      const stepUp = await fetch("/api/v1/step-up-confirmations", {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify({
          action: "password_change",
          totp_code: passwordForm.totpCode,
        }),
      })
      if (stepUp.status === 401) {
        handleSessionExpired()
        return
      }
      if (!stepUp.ok) {
        setPasswordError(
          stepUp.status === 429
            ? "Aguarde antes de tentar novamente."
            : "Não foi possível confirmar o TOTP.",
        )
        return
      }
      const confirmation = (await stepUp.json()) as { id: string }
      const response = await fetch("/api/v1/me/password", {
        method: "PATCH",
        credentials: "same-origin",
        headers,
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          step_up_confirmation_id: confirmation.id,
        }),
      })
      if (response.status === 401) {
        handleSessionExpired()
        return
      }
      if (!response.ok) {
        setPasswordError("Não foi possível atualizar a senha.")
        return
      }
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmation: "",
        totpCode: "",
      })
      setPasswordMessage("Senha atualizada com segurança.")
    } catch {
      setPasswordError("Não foi possível atualizar a senha. Tente novamente.")
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSaveNote = () => {
    setSavingNote(true)
    setTimeout(() => {
      setNote(editNote)
      setSavingNote(false)
    }, 600)
  }

  const removeDoctor = (doctorId: string) => {
    setDoctors((prev) => prev.filter((d) => d.doctorId !== doctorId))
    setConfirmRemove(null)
  }

  const bmi = (
    Number(form.weight) / Math.pow(Number(form.height) / 100, 2)
  ).toFixed(1)
  const bmiStatus =
    Number(bmi) < 18.5
      ? "Abaixo do peso"
      : Number(bmi) < 25
        ? "Peso normal"
        : Number(bmi) < 30
          ? "Sobrepeso"
          : "Obesidade"

  const tabs = [
    { id: "personal", label: "Informações pessoais" },
    { id: "doctors", label: `Meus médicos (${doctors.length})` },
    { id: "security", label: "Segurança" },
  ] as const

  return (
    <Layout
      currentPage="patient-profile"
      userType="patient"
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Meu Perfil"
      subtitle="Gerencie suas informações pessoais e de saúde"
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Avatar + identity header */}
        <div
          className="bg-white rounded-2xl border p-6"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                  }}
                >
                  {form.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <button
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center"
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
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{form.name}</h2>
                <p className="text-gray-500 text-sm">{form.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "var(--teal-100)",
                      color: "var(--teal-700)",
                    }}
                  >
                    Tipo {form.bloodType}
                  </span>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "#EDE9FE", color: "#6D28D9" }}
                  >
                    Paciente
                  </span>
                  <span className="text-xs text-gray-400">
                    {doctors.length} médico{doctors.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {activeTab === "personal" && (
              <button
                onClick={() => (editing ? setEditing(false) : setEditing(true))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={
                  editing
                    ? { background: "var(--primary)", color: "#fff" }
                    : { background: "var(--muted)", color: "var(--foreground)" }
                }
              >
                {editing ? (
                  <>
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
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Salvar
                  </>
                ) : (
                  <>
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
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Editar
                  </>
                )}
              </button>
            )}
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-4 mt-5 p-4 rounded-xl"
            style={{ background: "var(--muted)" }}
          >
            {[
              { label: "Peso", value: `${form.weight} kg` },
              { label: "Altura", value: `${form.height} cm` },
              { label: "IMC", value: `${bmi} · ${bmiStatus}` },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl w-fit"
          style={{ background: "var(--muted)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
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

        {/* ── Personal info ── */}
        {activeTab === "personal" && (
          <>
            <div
              className="bg-white rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">
                Informações Pessoais
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Nome completo", key: "name", type: "text" },
                  { label: "E-mail", key: "email", type: "email" },
                  { label: "Telefone", key: "phone", type: "tel" },
                  {
                    label: "Data de nascimento",
                    key: "birthdate",
                    type: "date",
                  },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      {label}
                    </label>
                    {editing ? (
                      <input
                        type={type}
                        value={(form as any)[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                        style={{
                          borderColor: "var(--border)",
                          background: "#FAFAFA",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--primary)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--border)")
                        }
                      />
                    ) : (
                      <div
                        className="px-4 py-2.5 rounded-xl text-sm text-gray-900"
                        style={{ background: "var(--muted)" }}
                      >
                        {(form as any)[key] || "—"}
                      </div>
                    )}
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    CPF
                  </label>
                  <div
                    className="px-4 py-2.5 rounded-xl text-sm text-gray-400"
                    style={{ background: "var(--muted)" }}
                  >
                    {currentPatient.cpf}{" "}
                    <span className="text-xs">(não editável)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Tipo sanguíneo
                  </label>
                  {editing ? (
                    <select
                      value={form.bloodType}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bloodType: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                      style={{
                        borderColor: "var(--border)",
                        background: "#FAFAFA",
                      }}
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (t) => (
                          <option key={t}>{t}</option>
                        ),
                      )}
                    </select>
                  ) : (
                    <div
                      className="px-4 py-2.5 rounded-xl text-sm text-gray-900"
                      style={{ background: "var(--muted)" }}
                    >
                      {form.bloodType}
                    </div>
                  )}
                </div>

                {editing && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        value={form.weight}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, weight: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                        style={{
                          borderColor: "var(--border)",
                          background: "#FAFAFA",
                        }}
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
                        Altura (cm)
                      </label>
                      <input
                        type="number"
                        value={form.height}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, height: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                        style={{
                          borderColor: "var(--border)",
                          background: "#FAFAFA",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--primary)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--border)")
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Health notes */}
            <div
              className="bg-white rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Minhas Anotações de Saúde
                </h3>
                <span className="text-xs text-gray-400">
                  Visível para você e seus médicos
                </span>
              </div>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none leading-relaxed transition-all"
                style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                placeholder="Registre sintomas, medicamentos, observações importantes..."
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {editNote.length} caracteres
                </span>
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote || editNote === note}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {savingNote ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
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
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  Salvar anotação
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Doctors ── */}
        {activeTab === "doctors" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex gap-3">
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-amber-700 text-sm leading-relaxed">
                Os médicos listados abaixo têm acesso aos seus dados de saúde,
                exames e anotações. Você pode remover um médico a qualquer
                momento — o acesso é revogado imediatamente.
              </p>
            </div>

            {doctors.map((doc) => (
              <div
                key={doc.doctorId}
                className="bg-white rounded-2xl border p-5"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-4">
                  {doc.avatar ? (
                    <img
                      src={doc.avatar}
                      alt={doc.doctorName}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border"
                      style={{ borderColor: "var(--border)" }}
                    />
                  ) : doc.doctorId === "d1" ? (
                    <div
                      className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <img
                        src={doctorImg}
                        alt={doc.doctorName}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {doc.doctorName}
                      </span>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: "var(--teal-100)",
                          color: "var(--teal-700)",
                        }}
                      >
                        {doc.specialty}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {doc.crm}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Acesso concedido em {fmtDate(doc.grantedAt)}
                    </div>
                  </div>

                  {confirmRemove === doc.doctorId ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-gray-600 hidden sm:inline">
                        Confirmar remoção?
                      </span>
                      <button
                        onClick={() => removeDoctor(doc.doctorId)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
                        style={{ background: "#EF4444" }}
                      >
                        Remover
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(doc.doctorId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 border border-red-100 hover:bg-red-50 transition-colors flex-shrink-0"
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
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Remover acesso
                    </button>
                  )}
                </div>

                {/* What this doctor can see */}
                <div className="mt-4 flex gap-2 flex-wrap">
                  {[
                    "Exames",
                    "Histórico",
                    "Anotações",
                    "Valores de referência",
                  ].map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                      style={{ background: "#F1F5F9", color: "#64748B" }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="#0E9F8A"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {doctors.length === 0 && (
              <div
                className="bg-white rounded-2xl border p-10 text-center"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "var(--muted)" }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700">
                  Nenhum médico vinculado
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Solicite que seu médico crie um vínculo pelo sistema.
                </p>
              </div>
            )}

            <div
              className="bg-white rounded-2xl border p-5"
              style={{ borderColor: "var(--border)" }}
            >
              <h4 className="font-semibold text-gray-900 mb-1">
                Adicionar médico
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                Compartilhe este código com seu médico para que ele solicite
                acesso:
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 px-4 py-3 rounded-xl font-mono text-sm font-semibold tracking-widest text-center text-teal-700"
                  style={{
                    background: "var(--teal-50)",
                    letterSpacing: "0.2em",
                  }}
                >
                  ANA-2026-RF49
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors flex-shrink-0"
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copiar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Security ── */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <div
              className="bg-white rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">
                Alterar senha
              </h3>
              <form onSubmit={changePassword} className="space-y-4 max-w-md">
                {[
                  ["Senha atual", "currentPassword", "current-password"],
                  ["Nova senha", "newPassword", "new-password"],
                  [
                    "Confirmar nova senha",
                    "confirmation",
                    "new-password-confirmation",
                  ],
                ].map(([label, field, id]) => (
                  <div key={field}>
                    <label
                      htmlFor={id}
                      className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide"
                    >
                      {label}
                    </label>
                    <input
                      id={id}
                      type="password"
                      minLength={field === "currentPassword" ? 1 : 12}
                      maxLength={128}
                      value={passwordForm[(field as keyof typeof passwordForm)]}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      required
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                      style={{
                        borderColor: "var(--border)",
                        background: "#FAFAFA",
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label
                    htmlFor="password-change-totp"
                    className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide"
                  >
                    TOTP adicional
                  </label>
                  <input
                    id="password-change-totp"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={passwordForm.totpCode}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        totpCode: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                    required
                    className="w-full px-4 py-2.5 rounded-xl border text-sm text-center font-mono tracking-[0.3em] outline-none"
                    style={{
                      borderColor: "var(--border)",
                      background: "#FAFAFA",
                    }}
                  />
                </div>
                {passwordError && (
                  <p role="alert" className="text-sm text-red-600">
                    {passwordError}
                  </p>
                )}
                {passwordMessage && (
                  <p role="status" className="text-sm text-emerald-700">
                    {passwordMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {passwordSaving ? "Atualizando..." : "Atualizar senha"}
                </button>
              </form>
            </div>

            <div
              className="bg-white rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="font-semibold text-gray-900 mb-1">
                Autenticação em dois fatores
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Adicione uma camada extra de proteção para seus dados de saúde.
              </p>
              <div
                className="flex items-center justify-between p-4 rounded-xl border"
                style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "#FEF9C3" }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Aplicativo autenticador
                    </div>
                    <div className="text-xs text-emerald-700">Ativo</div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  Recuperação disponível na entrada
                </span>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">
                Sessões ativas
              </h3>
              {sessionsLoading && (
                <p className="text-sm text-gray-500">Carregando sessões...</p>
              )}
              {sessionsError && (
                <p role="alert" className="text-sm text-red-600 mb-3">
                  {sessionsError}
                </p>
              )}
              {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                <p className="text-sm text-gray-500">
                  Nenhuma sessão ativa encontrada.
                </p>
              )}
              {sessions.map((activeSession) => (
                <div
                  key={activeSession.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--muted)" }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748B"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        Sessão iniciada em{" "}
                        {new Date(activeSession.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                        {activeSession.current && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "#DCFCE7", color: "#166534" }}
                          >
                            Este dispositivo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Último uso:{" "}
                        {new Date(activeSession.last_used_at).toLocaleString(
                          "pt-BR",
                        )}
                      </div>
                    </div>
                  </div>
                  {!activeSession.current && (
                    <button
                      onClick={() => endSession(activeSession.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                    >
                      Encerrar sessão
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div
              className="bg-white rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--teal-100)" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--teal-700)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">
                  Histórico de Acessos
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Registro de quem acessou seus dados, o quê foi acessado e
                quando.
              </p>
              <div className="space-y-0">
                {patientAccessLogs.map((log, i) => {
                  const roleConfig = {
                    doctor: {
                      label: "Médico",
                      bg: "var(--teal-100)",
                      text: "var(--teal-700)",
                    },
                    patient: {
                      label: "Paciente",
                      bg: "#DBEAFE",
                      text: "#1D4ED8",
                    },
                    system: {
                      label: "Sistema",
                      bg: "#F1F5F9",
                      text: "#64748B",
                    },
                  }
                  const rc = roleConfig[log.actorRole]
                  const initials =
                    log.actorRole === "system"
                      ? "⚙"
                      : log.actorName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl"
                      style={{
                        background: i % 2 === 0 ? "#F8FAFC" : "transparent",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{
                          background:
                            log.actorRole === "system"
                              ? "#94A3B8"
                              : log.actorRole === "patient"
                                ? "#3B82F6"
                                : "linear-gradient(135deg, #0E9F8A, #0D9488)",
                        }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {log.actorName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: rc.bg, color: rc.text }}
                          >
                            {rc.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-gray-400">
                            {" "}
                            · {log.resource}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-medium text-gray-700">
                          {fmtDate(log.date)}
                        </div>
                        <div className="text-xs text-gray-400">{log.time}</div>
                        <div className="text-xs text-gray-300 font-mono mt-0.5 truncate max-w-[120px]">
                          {log.device}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
