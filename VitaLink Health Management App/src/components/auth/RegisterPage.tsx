import { useState } from "react"
import type { UserType, Page } from "@/data/mockData"

interface Props {
  onNavigate: (page: Page, userType?: UserType) => void
}

const specialties = [
  "Cardiologia",
  "Clínica Geral",
  "Dermatologia",
  "Endocrinologia",
  "Gastroenterologia",
  "Ginecologia",
  "Neurologia",
  "Nefrologia",
  "Oftalmologia",
  "Ortopedia",
  "Pediatria",
  "Pneumologia",
  "Psiquiatria",
  "Reumatologia",
  "Urologia",
  "Outra",
]

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
  hint,
}: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
        style={{ borderColor: "var(--border)", background: "#fff" }}
        onFocus={(event) =>
          (event.currentTarget.style.borderColor = "var(--primary)")
        }
        onBlur={(event) =>
          (event.currentTarget.style.borderColor = "var(--border)")
        }
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </label>
  )
}

export default function RegisterPage({ onNavigate }: Props) {
  const [userType] = useState<UserType>("patient")
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: "",
    email: "",
    cpf: "",
    birthdate: "",
    phone: "",
    password: "",
    confirm: "",
    crm: "",
    uf: "SP",
    specialty: "",
    institution: "",
    bloodType: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [error, setError] = useState("")
  const [activationStep, setActivationStep] =
    useState<"email" | "totp" | "recovery">("email")
  const [emailCode, setEmailCode] = useState("")
  const [activationCsrf, setActivationCsrf] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [totpSecret, setTotpSecret] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [offlineRecoveryKey, setOfflineRecoveryKey] = useState("")

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (userType === "doctor" && step === 1) {
      setStep(2)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (userType === "doctor") {
      onNavigate("doctor-dashboard", "doctor")
      return
    }
    if (form.password !== form.confirm) {
      setError("As senhas informadas não coincidem.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/v1/patient-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          cpf: form.cpf.replace(/\D/g, ""),
          birthdate: form.birthdate,
          phone: form.phone,
          password: form.password,
          blood_type: form.bloodType || null,
        }),
      })
      if (!response.ok) {
        setError(
          response.status === 422
            ? "Revise os dados informados e tente novamente."
            : "Não foi possível solicitar o cadastro. Tente novamente.",
        )
        return
      }
      setSubmittedEmail(form.email)
    } catch {
      setError("Não foi possível conectar ao VitaLink. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailConfirmation = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const confirmation = await fetch("/api/v1/email-verifications", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail, code: emailCode }),
      })
      if (!confirmation.ok) {
        setError("Código inválido ou expirado.")
        return
      }
      const csrfToken = confirmation.headers.get("X-CSRF-Token")
      if (!csrfToken) {
        setError("Não foi possível validar a ativação da conta.")
        return
      }
      setActivationCsrf(csrfToken)
      const enrollment = await fetch("/api/v1/totp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      })
      if (!enrollment.ok) {
        setError("Não foi possível iniciar a proteção da conta.")
        return
      }
      const data = await enrollment.json()
      setTotpSecret(data.secret)
      setActivationStep("totp")
    } catch {
      setError("Não foi possível conectar ao VitaLink. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleTotpConfirmation = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/v1/totp/confirmations", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": activationCsrf,
        },
        body: JSON.stringify({ code: totpCode }),
      })
      if (!response.ok) {
        setError("Código do autenticador inválido.")
        return
      }
      const data = await response.json()
      setRecoveryCodes(data.recovery_codes)
      setOfflineRecoveryKey(data.offline_recovery_key)
      setActivationStep("recovery")
    } catch {
      setError("Não foi possível conectar ao VitaLink. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--background)" }}
    >
      {/* Left */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #064E3B 0%, #0D9488 60%, #38BDF8 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10">
          <button
            onClick={() => onNavigate("login")}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
          >
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar ao login
          </button>
        </div>

        <div className="relative z-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L8 8H4L7 14H3L12 22L21 14H17L20 8H16L12 2Z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M9 12H15M12 9V15"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="font-display text-4xl text-white leading-tight mb-4">
            {userType === "patient"
              ? "Cuide melhor\nda sua saúde"
              : "Conecte-se\naos seus\npacientes"}
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            {userType === "patient"
              ? "Tenha acesso a seus resultados de exames, histórico médico e orientações do seu médico — em tempo real, com segurança total."
              : "Gerencie seus pacientes, acompanhe resultados de exames e comunique-se com colegas especialistas de forma segura e eficiente."}
          </p>

          <div className="mt-8 space-y-3">
            {(userType === "patient"
              ? [
                  "Exames e histórico em um só lugar",
                  "Gráficos de evolução da saúde",
                  "Alertas para exames futuros",
                  "Recomendações do seu médico",
                ]
              : [
                  "Lista completa de pacientes",
                  "Adição de valores de referência",
                  "Notas e recomendações clínicas",
                  "Comunicação entre especialistas",
                ]
            ).map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/50 text-xs">
          © 2026 VitaLink · Dados protegidos pela LGPD
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[460px]">
          <button
            onClick={() => onNavigate("login")}
            className="lg:hidden flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors"
          >
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>

          {submittedEmail ? (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "#ECFDF5", color: "var(--teal-600)" }}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </div>
              {activationStep === "email" && (
                <form onSubmit={handleEmailConfirmation}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Confirme seu e-mail
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Se os dados puderem ser cadastrados, enviaremos um código
                    para{" "}
                    <strong className="text-gray-700">{submittedEmail}</strong>.
                  </p>
                  <InputField
                    label="Código recebido por e-mail"
                    value={emailCode}
                    onChange={setEmailCode}
                    placeholder="000000"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    Confirmar e-mail
                  </button>
                </form>
              )}

              {activationStep === "totp" && (
                <form onSubmit={handleTotpConfirmation}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Proteja sua conta
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    Adicione a chave abaixo ao seu aplicativo autenticador e
                    informe o código gerado.
                  </p>
                  <code className="block break-all rounded-xl bg-gray-100 p-3 mb-5 text-sm text-gray-700">
                    {totpSecret}
                  </code>
                  <InputField
                    label="Código do autenticador"
                    value={totpCode}
                    onChange={setTotpCode}
                    placeholder="000000"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    Ativar proteção
                  </button>
                </form>
              )}

              {activationStep === "recovery" && (
                <div role="status">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Guarde seus códigos
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    Esta é a única vez que os códigos serão exibidos. Guarde-os
                    fora do VitaLink.
                  </p>
                  <ul className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-4 mb-4 font-mono text-sm text-gray-700">
                    {recoveryCodes.map((code) => (
                      <li key={code}>{code}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mb-1">
                    Chave de recuperação offline
                  </p>
                  <code className="block break-all rounded-xl bg-amber-50 border border-amber-100 p-3 mb-5 text-sm text-amber-900">
                    {offlineRecoveryKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => onNavigate("login")}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    Ir para o login
                  </button>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3 mt-4"
                >
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Criar conta
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {userType === "doctor" && step === 2
                  ? "Informações profissionais"
                  : "Preencha seus dados para começar"}
              </p>

              <div className="bg-gray-100 rounded-xl p-3 mb-6 text-center text-sm font-medium text-teal-700">
                👤 Cadastro de paciente
              </div>

              {/* Doctor step indicator */}
              {userType === "doctor" && (
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={
                          step >= s
                            ? { background: "var(--primary)", color: "#fff" }
                            : { background: "#E2E8F0", color: "#94A3B8" }
                        }
                      >
                        {step > s ? "✓" : s}
                      </div>
                      <span className="text-xs text-gray-500">
                        {s === 1 ? "Dados pessoais" : "Dados profissionais"}
                      </span>
                      {s === 1 && <div className="w-8 h-px bg-gray-300" />}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleNext} className="space-y-4">
                {/* Patient form OR Doctor step 1 */}
                {(userType === "patient" || step === 1) && (
                  <>
                    <InputField
                      label="Nome completo"
                      value={form.name}
                      onChange={(v) => set("name", v)}
                      placeholder="Maria da Silva"
                    />
                    <InputField
                      label="E-mail"
                      type="email"
                      value={form.email}
                      onChange={(v) => set("email", v)}
                      placeholder="seu@email.com"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="CPF"
                        value={form.cpf}
                        onChange={(v) => set("cpf", v)}
                        placeholder="000.000.000-00"
                      />
                      <InputField
                        label="Data de nascimento"
                        type="date"
                        value={form.birthdate}
                        onChange={(v) => set("birthdate", v)}
                      />
                    </div>

                    <InputField
                      label="Telefone"
                      type="tel"
                      value={form.phone}
                      onChange={(v) => set("phone", v)}
                      placeholder="(11) 99999-9999"
                    />

                    {userType === "patient" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Tipo sanguíneo
                        </label>
                        <select
                          value={form.bloodType}
                          onChange={(e) => set("bloodType", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                          style={{
                            borderColor: "var(--border)",
                            background: "#fff",
                          }}
                        >
                          <option value="">Selecione</option>
                          {[
                            "A+",
                            "A-",
                            "B+",
                            "B-",
                            "AB+",
                            "AB-",
                            "O+",
                            "O-",
                          ].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => set("password", e.target.value)}
                          placeholder="Mínimo 12 caracteres"
                          required
                          className="w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none"
                          style={{
                            borderColor: "var(--border)",
                            background: "#fff",
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "var(--primary)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor = "var(--border)")
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
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
                            {showPassword ? (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </>
                            ) : (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>

                    <InputField
                      label="Confirmar senha"
                      type="password"
                      value={form.confirm}
                      onChange={(v) => set("confirm", v)}
                      placeholder="Repita a senha"
                    />
                  </>
                )}

                {/* Doctor step 2 */}
                {userType === "doctor" && step === 2 && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <InputField
                          label="CRM"
                          value={form.crm}
                          onChange={(v) => set("crm", v)}
                          placeholder="142890"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          UF
                        </label>
                        <select
                          value={form.uf}
                          onChange={(e) => set("uf", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                          style={{
                            borderColor: "var(--border)",
                            background: "#fff",
                          }}
                        >
                          {[
                            "AC",
                            "AL",
                            "AP",
                            "AM",
                            "BA",
                            "CE",
                            "DF",
                            "ES",
                            "GO",
                            "MA",
                            "MT",
                            "MS",
                            "MG",
                            "PA",
                            "PB",
                            "PR",
                            "PE",
                            "PI",
                            "RJ",
                            "RN",
                            "RS",
                            "RO",
                            "RR",
                            "SC",
                            "SP",
                            "SE",
                            "TO",
                          ].map((uf) => (
                            <option key={uf} value={uf}>
                              {uf}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Especialidade
                      </label>
                      <select
                        value={form.specialty}
                        onChange={(e) => set("specialty", e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                        style={{
                          borderColor: "var(--border)",
                          background: "#fff",
                        }}
                      >
                        <option value="">Selecione sua especialidade</option>
                        {specialties.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <InputField
                      label="Instituição / Hospital"
                      value={form.institution}
                      onChange={(v) => set("institution", v)}
                      placeholder="Hospital das Clínicas de SP"
                      required={false}
                    />

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex gap-3">
                        <svg
                          className="flex-shrink-0 mt-0.5 text-blue-500"
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
                        <p className="text-blue-700 text-xs leading-relaxed">
                          Seu CRM será verificado junto ao CFM. O processo leva
                          até 24 horas. Você receberá um e-mail assim que a
                          verificação for concluída.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-1">
                  {userType === "doctor" && step === 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      Voltar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Criando conta...
                      </span>
                    ) : userType === "doctor" && step === 1 ? (
                      "Próximo →"
                    ) : (
                      "Criar conta"
                    )}
                  </button>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3"
                  >
                    {error}
                  </p>
                )}

                <p className="text-center text-xs text-gray-400">
                  Ao criar uma conta, você concorda com os Termos de Uso e
                  Política de Privacidade.
                </p>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem uma conta?{" "}
            <button
              onClick={() => onNavigate("login")}
              className="font-semibold"
              style={{ color: "var(--primary)" }}
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
