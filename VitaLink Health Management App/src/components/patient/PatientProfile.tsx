import { useEffect, useState } from "react"
import Layout from "@/components/shared/Layout"
import type { Page, UserType } from "@/data/mockData"

interface Props {
  userType?: UserType
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

interface OwnedProfileResponse {
  role: "patient" | "professional"
  status: string
  version: number
  profile: {
    name: string
    email: string
    cpf: string
    birthdate: string
    phone: string
    blood_type?: string | null
    crm?: string
    uf?: string
    specialty?: string
    institution?: string | null
  }
}

const emptyProfile: OwnedProfileResponse = {
  role: "patient",
  status: "active",
  version: 1,
  profile: {
    name: "",
    email: "",
    cpf: "",
    birthdate: "",
    phone: "",
    blood_type: "",
  },
}

export default function PatientProfile({
  userType = "patient",
  onNavigate,
  onLogout,
}: Props) {
  const [account, setAccount] = useState<OwnedProfileResponse>(emptyProfile)
  const [form, setForm] = useState(emptyProfile.profile)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState("")
  const [profileMessage, setProfileMessage] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<"personal" | "security">(
    "personal",
  )
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

  const loadProfile = async () => {
    setProfileLoading(true)
    setProfileError("")
    try {
      const response = await fetch("/api/v1/me", {
        credentials: "same-origin",
      })
      if (response.status === 401) {
        handleSessionExpired()
        return
      }
      if (!response.ok) throw new Error("profile unavailable")
      const current = (await response.json()) as OwnedProfileResponse
      setAccount(current)
      setForm(current.profile)
    } catch {
      setProfileError("Não foi possível carregar o perfil.")
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

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

  const saveProfile = async () => {
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken) {
      setProfileError("Recarregue a página para validar esta solicitação.")
      return
    }
    setProfileSaving(true)
    setProfileError("")
    setProfileMessage("")
    const payload =
      account.role === "patient"
        ? {
            expected_version: account.version,
            name: form.name,
            birthdate: form.birthdate,
            phone: form.phone,
            blood_type: form.blood_type,
          }
        : {
            expected_version: account.version,
            phone: form.phone,
            institution: form.institution || null,
          }
    try {
      const response = await fetch("/api/v1/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
      })
      if (response.status === 401) {
        handleSessionExpired()
        return
      }
      if (response.status === 409) {
        setProfileError(
          "O perfil foi alterado em outra sessão. Recarregue antes de tentar novamente.",
        )
        return
      }
      if (!response.ok) throw new Error("profile update failed")
      const updated = (await response.json()) as OwnedProfileResponse
      setAccount(updated)
      setForm(updated.profile)
      setEditing(false)
      setProfileMessage("Perfil atualizado.")
    } catch {
      setProfileError("Não foi possível atualizar o perfil. Tente novamente.")
    } finally {
      setProfileSaving(false)
    }
  }

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
        current.filter((activeSession) => activeSession.id !== sessionId),
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
      if (!response.ok) throw new Error("password update failed")
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

  const fields =
    account.role === "patient"
      ? [
          ["name", "Nome completo", "text", true],
          ["email", "E-mail confirmado", "email", false],
          ["cpf", "CPF", "text", false],
          ["birthdate", "Data de nascimento", "date", true],
          ["phone", "Telefone", "tel", true],
          ["blood_type", "Tipo sanguíneo", "text", true],
        ]
      : [
          ["name", "Nome completo", "text", false],
          ["email", "E-mail confirmado", "email", false],
          ["cpf", "CPF", "text", false],
          ["birthdate", "Data de nascimento", "date", false],
          ["phone", "Telefone", "tel", true],
          ["crm", "CRM", "text", false],
          ["uf", "UF", "text", false],
          ["specialty", "Especialidade validada", "text", false],
          ["institution", "Instituição", "text", true],
        ]

  return (
    <Layout
      currentPage={
        userType === "patient" ? "patient-profile" : "doctor-profile"
      }
      userType={userType}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Meu Perfil"
      subtitle="Gerencie seus dados permitidos e a segurança da conta"
      userName={form.name || undefined}
      userSubtitle={
        account.role === "patient"
          ? "Paciente"
          : form.specialty || "Profissional"
      }
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {profileLoading ? (
          <p role="status" className="text-sm text-gray-500">
            Carregando perfil...
          </p>
        ) : profileError && !account.profile.name ? (
          <div role="alert" className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-red-600">{profileError}</p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <section
              className="bg-white rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
              aria-labelledby="profile-name"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                    aria-hidden="true"
                  >
                    {form.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="profile-name"
                      className="text-xl font-bold text-gray-900"
                    >
                      {form.name}
                    </h2>
                    <p className="break-all text-sm text-gray-500">
                      {form.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: "var(--teal-100)",
                          color: "var(--teal-700)",
                        }}
                      >
                        {account.role === "patient"
                          ? `Tipo ${form.blood_type || "não informado"}`
                          : `${form.crm}/${form.uf}`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {account.role === "patient"
                          ? "Paciente"
                          : `Profissional · ${form.specialty}`}
                      </span>
                    </div>
                  </div>
                </div>
                {activeTab === "personal" && (
                  <button
                    type="button"
                    onClick={() =>
                      editing ? void saveProfile() : setEditing(true)
                    }
                    disabled={profileSaving}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{
                      background: editing ? "var(--primary)" : "var(--muted)",
                      color: editing ? "#fff" : "var(--foreground)",
                    }}
                  >
                    {profileSaving
                      ? "Salvando..."
                      : editing
                        ? "Salvar"
                        : "Editar"}
                  </button>
                )}
              </div>
              {profileMessage && (
                <p role="status" className="mt-3 text-sm text-emerald-700">
                  {profileMessage}
                </p>
              )}
              {profileError && account.profile.name && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {profileError}
                </p>
              )}
            </section>

            <div
              className="flex gap-1 p-1 rounded-xl w-fit"
              style={{ background: "var(--muted)" }}
              role="tablist"
              aria-label="Seções do perfil"
            >
              {[
                ["personal", "Informações pessoais"],
                ["security", "Segurança"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id as "personal" | "security")}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={
                    activeTab === id
                      ? { background: "#fff", color: "var(--teal-700)" }
                      : { color: "#64748B" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "personal" && (
              <section
                className="bg-white rounded-2xl border p-6"
                style={{ borderColor: "var(--border)" }}
                aria-labelledby="personal-data-title"
              >
                <h3
                  id="personal-data-title"
                  className="font-semibold text-gray-900 mb-4"
                >
                  Informações pessoais
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {fields.map(([key, label, type, editable]) => (
                    <div key={String(key)}>
                      <label
                        htmlFor={`profile-${key}`}
                        className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide"
                      >
                        {label}
                      </label>
                      {editing && editable ? (
                        <input
                          id={`profile-${key}`}
                          type={String(type)}
                          value={String(form[(key as keyof typeof form)] || "")}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [String(key)]: event.target.value,
                            }))
                          }
                          required={key !== "institution"}
                          className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-teal-600"
                          style={{ borderColor: "var(--border)" }}
                        />
                      ) : (
                        <div
                          id={`profile-${key}`}
                          className="min-h-10 break-all rounded-xl px-4 py-2.5 text-sm text-gray-900"
                          style={{ background: "var(--muted)" }}
                        >
                          {String(
                            form[(key as keyof typeof form)] || "Não informado",
                          )}
                          {!editable && (
                            <span className="ml-2 text-xs text-gray-500">
                              (não editável)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "security" && (
              <div className="space-y-5">
                <section
                  className="bg-white rounded-2xl border p-6"
                  style={{ borderColor: "var(--border)" }}
                  aria-labelledby="password-title"
                >
                  <h3
                    id="password-title"
                    className="font-semibold text-gray-900 mb-4"
                  >
                    Atualizar senha
                  </h3>
                  <form
                    onSubmit={changePassword}
                    className="grid sm:grid-cols-2 gap-4"
                  >
                    {[
                      ["currentPassword", "Senha atual"],
                      ["newPassword", "Nova senha"],
                      ["confirmation", "Confirmar nova senha"],
                      ["totpCode", "TOTP adicional"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label
                          htmlFor={`password-${key}`}
                          className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide"
                        >
                          {label}
                        </label>
                        <input
                          id={`password-${key}`}
                          type={key === "totpCode" ? "text" : "password"}
                          inputMode={key === "totpCode" ? "numeric" : undefined}
                          value={
                            passwordForm[(key as keyof typeof passwordForm)]
                          }
                          onChange={(event) =>
                            setPasswordForm((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          required
                          minLength={key === "newPassword" ? 12 : undefined}
                          maxLength={key === "totpCode" ? 6 : 128}
                          className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-teal-600"
                          style={{ borderColor: "var(--border)" }}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--primary)" }}
                      >
                        {passwordSaving ? "Atualizando..." : "Atualizar senha"}
                      </button>
                    </div>
                  </form>
                  {passwordMessage && (
                    <p role="status" className="mt-3 text-sm text-emerald-700">
                      {passwordMessage}
                    </p>
                  )}
                  {passwordError && (
                    <p role="alert" className="mt-3 text-sm text-red-600">
                      {passwordError}
                    </p>
                  )}
                </section>

                <section
                  className="bg-white rounded-2xl border p-6"
                  style={{ borderColor: "var(--border)" }}
                  aria-labelledby="sessions-title"
                >
                  <h3
                    id="sessions-title"
                    className="font-semibold text-gray-900 mb-4"
                  >
                    Sessões ativas
                  </h3>
                  {sessionsLoading ? (
                    <p role="status" className="text-sm text-gray-500">
                      Carregando sessões...
                    </p>
                  ) : sessionsError ? (
                    <p role="alert" className="text-sm text-red-600">
                      {sessionsError}
                    </p>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhuma outra sessão ativa.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {sessions.map((activeSession) => (
                        <li
                          key={activeSession.id}
                          className="flex items-center justify-between gap-4 rounded-xl p-4"
                          style={{ background: "var(--muted)" }}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activeSession.current
                                ? "Este dispositivo"
                                : "Outra sessão"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Último uso:{" "}
                              {new Date(
                                activeSession.last_used_at,
                              ).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          {!activeSession.current && (
                            <button
                              type="button"
                              onClick={() => void endSession(activeSession.id)}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Encerrar sessão
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
