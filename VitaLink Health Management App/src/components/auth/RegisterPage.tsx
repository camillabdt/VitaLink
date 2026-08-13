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

export default function RegisterPage({ onNavigate }: Props) {
  const [userType, setUserType] = useState<UserType>("patient")
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

  const handleSubmit = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onNavigate(
        userType === "patient" ? "patient-dashboard" : "doctor-dashboard",
        userType,
      )
    }, 1000)
  }

  const InputField = ({
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
    onChange: (v: string) => void
    placeholder?: string
    required?: boolean
    hint?: string
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
        style={{ borderColor: "var(--border)", background: "#fff" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )

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

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Criar conta</h2>
          <p className="text-gray-500 text-sm mb-6">
            {userType === "doctor" && step === 2
              ? "Informações profissionais"
              : "Preencha seus dados para começar"}
          </p>

          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(["patient", "doctor"] as UserType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setUserType(type)
                  setStep(1)
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={
                  userType === type
                    ? {
                        background: "#fff",
                        color: "var(--teal-700)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }
                    : { color: "#64748B" }
                }
              >
                {type === "patient" ? "👤 Paciente" : "🩺 Médico"}
              </button>
            ))}
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
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ),
                      )}
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
                      placeholder="Mínimo 8 caracteres"
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
                    style={{ borderColor: "var(--border)", background: "#fff" }}
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
                      Seu CRM será verificado junto ao CFM. O processo leva até
                      24 horas. Você receberá um e-mail assim que a verificação
                      for concluída.
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

            <p className="text-center text-xs text-gray-400">
              Ao criar uma conta, você concorda com os{" "}
              <span className="underline cursor-pointer">Termos de Uso</span> e{" "}
              <span className="underline cursor-pointer">
                Política de Privacidade
              </span>
              .
            </p>
          </form>

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
