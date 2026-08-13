import { useState, useEffect } from "react"
import type { UserType, Page } from "@/data/mockData"
import logoWhite from "@/imports/VitaLink-1.png"
import logoGreen from "@/imports/LogoFundoBranco.png"

interface Props {
  onNavigate: (page: Page, userType?: UserType) => void
}

// Steps matching the 7-step security spec
type DoctorStep = "identify" | "auth-select" | "passkey" | "totp" | "hardware" | "icp" | "session" // 1 – CRM+UF or email // 2+3 – account found + registered authenticators // 4a – biometric challenge // 4b – TOTP code // 4c – hardware key // 4d – ICP-Brasil certificate // 5 – cryptographic timeline + session created

type AuthMethod = "passkey" | "totp" | "hardware" | "icp"

// Simulate which authenticators this account has registered
const REGISTERED_METHODS: AuthMethod[] = ["passkey", "totp"]

interface AuthMethodDef {
  id: AuthMethod
  label: string
  sublabel: string
  recommended?: boolean
  icon: React.ReactNode
}

const METHOD_DEFS: AuthMethodDef[] = [
  {
    id: "passkey",
    label: "Passkey com biometria",
    sublabel: "Digital, Face ID ou PIN do dispositivo",
    recommended: true,
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
        <path d="M12 10a2 2 0 00-2 2v4" />
        <path d="M10 8.5A4 4 0 0116 12v4" />
        <path d="M7.5 7A6 6 0 0118 12v4" />
        <path d="M5 6A8 8 0 0120 12v4" />
        <path d="M12 16v2" />
      </svg>
    ),
  },
  {
    id: "totp",
    label: "Aplicativo autenticador",
    sublabel: "Google Authenticator, Authy ou similar",
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
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h4M9 15h2" />
      </svg>
    ),
  },
  {
    id: "hardware",
    label: "Chave física de segurança",
    sublabel: "YubiKey, token USB ou NFC",
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
        <rect x="2" y="8" width="20" height="8" rx="4" />
        <circle cx="17" cy="12" r="1.5" fill="currentColor" />
        <circle cx="7" cy="12" r="2" />
      </svg>
    ),
  },
  {
    id: "icp",
    label: "Certificado digital ICP-Brasil",
    sublabel: "e-CPF ou e-CNPJ emitido por AC credenciada",
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
        <path d="M12 2l3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1L12 2z" />
      </svg>
    ),
  },
]

const SESSION_STEPS = [
  { label: "Conta localizada", detail: "CRM verificado · Dr. Carlos Mendes" },
  {
    label: "Desafio criptográfico enviado",
    detail: "ECDSA P-256 · nonce 8f3a…c12d",
  },
  {
    label: "Dispositivo assinou o desafio",
    detail: "Assinatura confirmada localmente",
  },
  {
    label: "Assinatura validada no servidor",
    detail: "Chave pública verificada · RPID ok",
  },
  {
    label: "Sessão criada",
    detail: "JWT · dispositivo registrado · expira em 8 h",
  },
]

const UF_LIST = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
]

export default function LoginPage({ onNavigate }: Props) {
  const [userType, setUserType] = useState<UserType>("patient")

  // Patient
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [patientLoading, setPatientLoading] = useState(false)

  // Doctor – step 1: identify
  const [identifier, setIdentifier] = useState("")
  const [uf, setUf] = useState("SP")
  const [identifyLoading, setIdentifyLoading] = useState(false)
  const isEmail = identifier.includes("@")
  const isCrm = !isEmail && identifier.trim().length > 0

  // Doctor – steps
  const [doctorStep, setDoctorStep] = useState<DoctorStep>("identify")
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>("passkey")

  // Doctor – passkey
  const [biometryState, setBiometryState] =
    useState<"idle" | "scanning" | "done">("idle")

  // Doctor – TOTP
  const [totpCode, setTotpCode] = useState("")

  // Doctor – ICP
  const [icpState, setIcpState] = useState<"idle" | "reading" | "done">("idle")

  // Doctor – session timeline
  const [sessionStep, setSessionStep] = useState(-1)
  const [sessionDone, setSessionDone] = useState(false)

  useEffect(() => {
    if (doctorStep !== "session") return
    let i = 0
    const tick = () => {
      setSessionStep(i)
      i++
      if (i < SESSION_STEPS.length) setTimeout(tick, 600)
      else {
        setTimeout(() => setSessionDone(true), 400)
        setTimeout(() => onNavigate("doctor-dashboard", "doctor"), 1800)
      }
    }
    setTimeout(tick, 250)
  }, [doctorStep])

  const resetDoctor = () => {
    setDoctorStep("identify")
    setBiometryState("idle")
    setTotpCode("")
    setIcpState("idle")
    setSessionStep(-1)
    setSessionDone(false)
  }

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return
    setIdentifyLoading(true)
    setTimeout(() => {
      setIdentifyLoading(false)
      setDoctorStep("auth-select")
    }, 900)
  }

  const handleAuthConfirm = () => {
    setDoctorStep(selectedMethod)
  }

  const handleBiometryTap = () => {
    setBiometryState("scanning")
    setTimeout(() => {
      setBiometryState("done")
      setTimeout(() => setDoctorStep("session"), 400)
    }, 1100)
  }

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (totpCode.length === 6) setDoctorStep("session")
  }

  const handleIcp = () => {
    setIcpState("reading")
    setTimeout(() => {
      setIcpState("done")
      setTimeout(() => setDoctorStep("session"), 500)
    }, 1400)
  }

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPatientLoading(true)
    setTimeout(() => {
      setPatientLoading(false)
      onNavigate("patient-dashboard", "patient")
    }, 800)
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--background)" }}
    >
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #064E3B 0%, #0D9488 50%, #0EA5E9 100%)",
        }}
      >
        <div
          className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #fff 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #fff 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <VitaLinkLogo light />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-5xl text-white leading-tight mb-6">
            Sua saúde,
            <br />
            <span className="italic">acompanhada</span>
            <br />
            de perto.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Resultados de exames, histórico clínico e recomendações médicas —
            tudo em um só lugar, seguro e acessível.
          </p>
          <div className="flex flex-col gap-3 mt-10">
            {[
              { icon: "🗂️", label: "Histórico clínico completo em um só lugar" },
              {
                icon: "🔗",
                label: "Resultados cruzados com diversas especialidades",
              },
              { icon: "🎯", label: "Controle total sobre a sua saúde" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(0,0,0,0.18)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
                }}
              >
                <span className="text-2xl leading-none">{f.icon}</span>
                <span className="text-white/90 text-sm font-medium leading-tight">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20">
          <p className="text-white/90 text-sm leading-relaxed italic">
            "Finalmente consigo acompanhar meus exames e entender os resultados.
            O VitaLink mudou minha relação com a saúde."
          </p>
          <div className="flex items-center gap-3 mt-3">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&auto=format"
              alt="Ana"
              className="w-9 h-9 rounded-full object-cover"
            />
            <div>
              <div className="text-white font-medium text-sm">Ana Ribeiro</div>
              <div className="text-white/60 text-xs">Paciente desde 2024</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden mb-8">
            <VitaLinkLogo />
          </div>

          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-7">
            {(["patient", "doctor"] as UserType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setUserType(t)
                  resetDoctor()
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={
                  userType === t
                    ? {
                        background: "#fff",
                        color: "var(--teal-700)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }
                    : { color: "#64748B" }
                }
              >
                {t === "patient" ? "👤 Paciente" : "🩺 Médico"}
              </button>
            ))}
          </div>

          {/* ────────── PATIENT ────────── */}
          {userType === "patient" && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-500 text-sm mb-7">
                Acesse sua conta para continuar
              </p>
              <form onSubmit={handlePatientSubmit} className="space-y-4">
                <Field label="E-mail">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{ borderColor: "var(--border)", background: "#fff" }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--primary)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </Field>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => onNavigate("forgot-password")}
                      className="text-xs font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-all"
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>
                <SubmitBtn loading={patientLoading} label="Entrar" />
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                Não tem uma conta?{" "}
                <button
                  onClick={() => onNavigate("register")}
                  className="font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  Criar conta
                </button>
              </p>
              <Divider />
              <div className="grid grid-cols-2 gap-3">
                {["Google", "Apple"].map((p) => (
                  <button
                    key={p}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {p === "Google" ? <GoogleIcon /> : <AppleIcon />} {p}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ────────── DOCTOR ────────── */}
          {userType === "doctor" && (
            <>
              {/* ── Step 1: Identify ── */}
              {doctorStep === "identify" && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Acesso médico
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Informe seu CRM + UF ou e-mail profissional
                  </p>

                  {/* Security badge */}
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-6"
                    style={{
                      background: "#F0FDF9",
                      border: "1px solid #99F6E4",
                    }}
                  >
                    <ShieldCheckIcon />
                    <div>
                      <div
                        className="text-xs font-semibold"
                        style={{ color: "var(--teal-700)" }}
                      >
                        Acesso protegido — sem senha
                      </div>
                      <div className="text-xs text-gray-500">
                        Passkey, chave física, autenticador ou ICP-Brasil
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleIdentify} className="space-y-3">
                    {/* CRM row */}
                    {!isEmail && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          CRM + UF
                          {isCrm && (
                            <span
                              className="ml-2 text-xs font-normal"
                              style={{ color: "var(--teal-600)" }}
                            >
                              detectado
                            </span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <input
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="142890"
                            required={!isEmail}
                            className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all font-mono"
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
                          <select
                            value={uf}
                            onChange={(e) => setUf(e.target.value)}
                            className="px-3 py-3 rounded-xl border text-sm outline-none transition-all font-semibold bg-white"
                            style={{
                              borderColor: "var(--border)",
                              minWidth: 72,
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "var(--primary)")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor = "var(--border)")
                            }
                          >
                            {UF_LIST.map((u) => (
                              <option key={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400">ou</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Email row */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        E-mail profissional
                        {isEmail && (
                          <span
                            className="ml-2 text-xs font-normal"
                            style={{ color: "var(--teal-600)" }}
                          >
                            detectado
                          </span>
                        )}
                      </label>
                      <input
                        value={isEmail ? identifier : ""}
                        onChange={(e) => setIdentifier(e.target.value)}
                        type="email"
                        placeholder="nome@hospital.com.br"
                        required={isEmail}
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
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
                    </div>

                    <div className="pt-1">
                      <SubmitBtn
                        loading={identifyLoading}
                        label="Localizar conta"
                        disabled={!identifier.trim()}
                      />
                    </div>
                  </form>

                  <p className="text-center text-sm text-gray-500 mt-6">
                    Primeiro acesso?{" "}
                    <button
                      onClick={() => onNavigate("register")}
                      className="font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      Criar conta médica
                    </button>
                  </p>
                </>
              )}

              {/* ── Steps 2+3: Account found + authenticators ── */}
              {doctorStep === "auth-select" && (
                <>
                  <BackBtn onClick={resetDoctor} />

                  {/* Account card */}
                  <div
                    className="flex items-center gap-3 p-4 rounded-2xl border mb-6"
                    style={{ borderColor: "var(--border)", background: "#fff" }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                      }}
                    >
                      CM
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900">
                        Dr. Carlos Mendes
                      </div>
                      <div className="text-xs text-gray-500">
                        CRM/{uf} {identifier || "142890"} · Cardiologia
                      </div>
                    </div>
                    <span
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0"
                      style={{ background: "#DCFCE7", color: "#166534" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      CRM verificado
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Autenticadores cadastrados
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Selecione o método para autenticar este acesso
                  </p>

                  <div className="space-y-2 mb-6">
                    {METHOD_DEFS.map((m) => {
                      const registered = REGISTERED_METHODS.includes(m.id)
                      return (
                        <button
                          key={m.id}
                          onClick={() => registered && setSelectedMethod(m.id)}
                          disabled={!registered}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all"
                          style={
                            !registered
                              ? {
                                  borderColor: "var(--border)",
                                  background: "#FAFAFA",
                                  opacity: 0.5,
                                  cursor: "not-allowed",
                                }
                              : selectedMethod === m.id
                                ? {
                                    borderColor: "var(--primary)",
                                    background: "#F0FDF9",
                                    boxShadow: "0 0 0 1px var(--primary)",
                                  }
                                : {
                                    borderColor: "var(--border)",
                                    background: "#fff",
                                  }
                          }
                        >
                          <span
                            style={{
                              color:
                                registered && selectedMethod === m.id
                                  ? "var(--primary)"
                                  : "#94A3B8",
                            }}
                          >
                            {m.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">
                                {m.label}
                              </span>
                              {m.recommended && registered && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                  style={{
                                    background: "#CCFBF1",
                                    color: "var(--teal-700)",
                                  }}
                                >
                                  Recomendado
                                </span>
                              )}
                              {!registered && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">
                                  Não configurado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {m.sublabel}
                            </div>
                          </div>
                          {registered && (
                            <div
                              className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={
                                selectedMethod === m.id
                                  ? {
                                      borderColor: "var(--primary)",
                                      background: "var(--primary)",
                                    }
                                  : { borderColor: "#CBD5E1" }
                              }
                            >
                              {selectedMethod === m.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={handleAuthConfirm}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    Autenticar com{" "}
                    {
                      METHOD_DEFS.find(
                        (m) => m.id === selectedMethod,
                      )?.label.split(" ")[0]
                    }
                  </button>
                </>
              )}

              {/* ── Step 4a: Passkey biometric ── */}
              {doctorStep === "passkey" && (
                <div className="flex flex-col items-center text-center">
                  <BackBtn onClick={() => setDoctorStep("auth-select")} />
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "#F0FDF9",
                      border: "1.5px solid var(--teal-200)",
                    }}
                  >
                    <ShieldCheckIcon />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Autorizar com passkey
                  </h2>
                  <p className="text-sm text-gray-500 mb-7 max-w-xs">
                    Use a biometria ou PIN do seu dispositivo para assinar o
                    desafio criptográfico. A biometria nunca sai do aparelho.
                  </p>

                  <button
                    onClick={handleBiometryTap}
                    disabled={biometryState !== "idle"}
                    className="relative mb-5 focus:outline-none"
                  >
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background:
                          biometryState === "done"
                            ? "linear-gradient(135deg, #059669, #10B981)"
                            : biometryState === "scanning"
                              ? "linear-gradient(135deg, #0E9F8A, #0D9488)"
                              : "linear-gradient(135deg, #F0FDF9, #CCFBF1)",
                        border: `2px solid ${
                          biometryState === "idle"
                            ? "var(--teal-200)"
                            : "transparent"
                        }`,
                        boxShadow:
                          biometryState === "scanning"
                            ? "0 0 0 8px rgba(14,159,138,0.15), 0 0 0 16px rgba(14,159,138,0.07)"
                            : "0 4px 20px rgba(14,159,138,0.12)",
                      }}
                    >
                      {biometryState === "done" ? (
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <FingerprintIcon
                          scanning={biometryState === "scanning"}
                        />
                      )}
                    </div>
                    {biometryState === "scanning" && (
                      <div
                        className="absolute inset-0 rounded-full animate-ping opacity-20"
                        style={{ background: "var(--primary)" }}
                      />
                    )}
                  </button>

                  <p className="text-sm font-medium text-gray-700">
                    {biometryState === "idle" && "Toque para autenticar"}
                    {biometryState === "scanning" && (
                      <span style={{ color: "var(--primary)" }}>
                        Verificando no dispositivo...
                      </span>
                    )}
                    {biometryState === "done" && (
                      <span className="text-emerald-600">
                        Confirmado — criando sessão
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Impressão digital · Face ID · PIN seguro
                  </p>

                  {/* Flow diagram */}
                  <div className="mt-8 w-full text-left px-2">
                    <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                      Como funciona
                    </div>
                    <div className="space-y-2">
                      {[
                        "Médico informa CRM",
                        "Sistema envia desafio criptográfico",
                        "Médico autoriza com biometria",
                        "Dispositivo assina o desafio",
                        "Sistema valida assinatura → sessão criada",
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                            style={{
                              background: "var(--teal-100)",
                              color: "var(--teal-700)",
                            }}
                          >
                            {i + 1}
                          </div>
                          <span className="text-xs text-gray-500">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4b: TOTP ── */}
              {doctorStep === "totp" && (
                <div className="flex flex-col">
                  <BackBtn onClick={() => setDoctorStep("auth-select")} />
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "#F0FDF9",
                      border: "1.5px solid var(--teal-200)",
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--teal-600)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M9 7h6M9 11h4M9 15h2" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Código do autenticador
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Abra o app autenticador e informe o código de 6 dígitos
                  </p>
                  <form onSubmit={handleTotpSubmit}>
                    <input
                      value={totpCode}
                      onChange={(e) =>
                        setTotpCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="000 000"
                      autoFocus
                      inputMode="numeric"
                      className="w-full px-4 py-4 rounded-xl border text-center text-3xl font-mono outline-none transition-all mb-4"
                      style={{
                        borderColor: "var(--border)",
                        letterSpacing: "0.45em",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--primary)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border)")
                      }
                    />
                    <SubmitBtn
                      label="Verificar código"
                      disabled={totpCode.length !== 6}
                    />
                  </form>
                </div>
              )}

              {/* ── Step 4c: Hardware key ── */}
              {doctorStep === "hardware" && (
                <div className="flex flex-col items-center text-center">
                  <BackBtn onClick={() => setDoctorStep("auth-select")} />
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "#F0FDF9",
                      border: "1.5px solid var(--teal-200)",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--teal-600)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="8" width="20" height="8" rx="4" />
                      <circle cx="17" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="7" cy="12" r="2" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Chave física
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Insira ou aproxime sua chave de segurança (YubiKey, token
                    USB ou NFC)
                  </p>
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
                    style={{
                      background: "#F8FAFC",
                      border: "1px dashed var(--border)",
                    }}
                  >
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin flex-shrink-0" />
                    <span className="text-sm text-gray-500">
                      Aguardando chave USB ou NFC...
                    </span>
                  </div>
                  <button
                    onClick={() => setDoctorStep("session")}
                    className="w-full mt-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    Simular toque na chave
                  </button>
                </div>
              )}

              {/* ── Step 4d: ICP-Brasil ── */}
              {doctorStep === "icp" && (
                <div className="flex flex-col items-center text-center">
                  <BackBtn onClick={() => setDoctorStep("auth-select")} />
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "#FEF9C3",
                      border: "1.5px solid #FDE68A",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B45309"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="12" height="16" rx="1.5" />
                      <path d="M6 7h6M6 10h6M6 13h3" />
                      <circle cx="18" cy="18" r="4" />
                      <path d="M16.5 18l1 1 2-2" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Certificado ICP-Brasil
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Conecte seu token ou smart card para assinar com validade
                    jurídica
                  </p>
                  {icpState === "idle" && (
                    <button
                      onClick={handleIcp}
                      className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                      style={{
                        background: "linear-gradient(135deg, #D97706, #B45309)",
                      }}
                    >
                      Usar token / smart card
                    </button>
                  )}
                  {icpState === "reading" && (
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
                      style={{
                        background: "#FFFBEB",
                        border: "1px solid #FDE68A",
                      }}
                    >
                      <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin flex-shrink-0" />
                      <span className="text-sm" style={{ color: "#B45309" }}>
                        Lendo certificado...
                      </span>
                    </div>
                  )}
                  {icpState === "done" && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Certificado verificado — criando sessão
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 5: Session timeline ── */}
              {doctorStep === "session" && (
                <div className="flex flex-col">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "#F0FDF9",
                      border: "1.5px solid var(--teal-200)",
                    }}
                  >
                    <ShieldCheckIcon />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {sessionDone ? "Sessão criada" : "Verificando identidade"}
                  </h2>
                  <p className="text-sm text-gray-500 mb-7">
                    {sessionDone
                      ? "Redirecionando para o painel médico..."
                      : "Validando assinatura criptográfica"}
                  </p>

                  <div className="space-y-0">
                    {SESSION_STEPS.map((step, i) => {
                      const done = i <= sessionStep
                      const active = i === sessionStep && !sessionDone
                      const isLast = i === SESSION_STEPS.length - 1
                      return (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 mt-0.5"
                              style={
                                done
                                  ? {
                                      background: "var(--primary)",
                                      border: "2px solid var(--primary)",
                                    }
                                  : {
                                      background: "#fff",
                                      border: "2px solid #E2E8F0",
                                    }
                              }
                            >
                              {done ? (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-gray-200" />
                              )}
                            </div>
                            {!isLast && (
                              <div
                                className="w-0.5 flex-1 my-1 transition-all duration-500"
                                style={{
                                  background:
                                    i < sessionStep
                                      ? "var(--primary)"
                                      : "#E2E8F0",
                                  minHeight: 18,
                                }}
                              />
                            )}
                          </div>
                          <div className="pb-4 pt-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold transition-colors ${
                                  done ? "text-gray-900" : "text-gray-300"
                                }`}
                              >
                                {step.label}
                              </span>
                              {active && (
                                <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
                              )}
                            </div>
                            <p
                              className={`text-xs font-mono mt-0.5 transition-colors ${
                                done ? "text-gray-400" : "text-gray-200"
                              }`}
                            >
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {sessionDone && (
                    <div
                      className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl"
                      style={{ background: "#DCFCE7", color: "#166534" }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-sm font-semibold">
                        Sessão criada com sucesso
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <p className="text-center text-xs text-gray-400 mt-8">
            Ao entrar, você concorda com os{" "}
            <span className="underline cursor-pointer">Termos de Uso</span> e{" "}
            <span className="underline cursor-pointer">
              Política de Privacidade
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Reusable sub-components ──────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function SubmitBtn({
  loading,
  label,
  disabled,
}: {
  loading?: boolean
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #0E9F8A, #0D9488)" }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Localizando...
        </span>
      ) : (
        label
      )}
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="self-start flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Voltar
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400">ou continue com</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function ShieldCheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--teal-600)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function FingerprintIcon({ scanning }: { scanning: boolean }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke={scanning ? "#fff" : "var(--teal-600)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={
        scanning ? { filter: "drop-shadow(0 0 5px rgba(255,255,255,0.5))" } : {}
      }
    >
      <path d="M12 10a2 2 0 00-2 2v4" />
      <path d="M10 8.5A4 4 0 0116 12v4" />
      <path d="M7.5 7A6 6 0 0118 12v4" />
      <path d="M5 6A8 8 0 0120 12v4" />
      <path d="M12 16v2" />
    </svg>
  )
}

function VitaLinkLogo({ light = false }: { light?: boolean }) {
  return (
    <img
      src={light ? logoWhite : logoGreen}
      alt="VitaLink"
      className={`w-auto object-contain ${light ? "h-14" : "h-10"}`}
    />
  )
}

function Eye() {
  return (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOff() {
  return (
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
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}
