import { useState } from "react"
import type { Page, UserType } from "@/data/mockData"
import logoWhite from "@/imports/VitaLink-1.png"
import logoGreen from "@/imports/LogoFundoBranco.png"

interface Props {
  onNavigate: (page: Page, userType?: UserType) => void
}

export default function LoginPage({ onNavigate }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/v1/sessions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totp_code: totpCode }),
      })
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Aguarde antes de tentar novamente."
            : "Não foi possível entrar com os dados informados.",
        )
        return
      }
      const csrfToken = response.headers.get("X-CSRF-Token")
      if (!csrfToken) {
        setError("Não foi possível proteger a sessão. Tente novamente.")
        return
      }
      sessionStorage.setItem("vitallink.csrf", csrfToken)
      onNavigate("patient-dashboard", "patient")
    } catch {
      setError("Não foi possível conectar ao VitaLink. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex"
      style={{ background: "var(--background)" }}
    >
      <section
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
        <img
          src={logoWhite}
          alt="VitaLink"
          className="relative z-10 h-14 w-auto object-contain self-start"
        />
        <div className="relative z-10">
          <h1 className="font-display text-5xl text-white leading-tight mb-6">
            Sua saúde,
            <br />
            <span className="italic">acompanhada</span>
            <br />
            de perto.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Resultados de exames, histórico clínico e recomendações médicas em
            um só lugar, seguro e acessível.
          </p>
          <div className="flex flex-col gap-3 mt-10">
            {[
              "Histórico clínico completo em um só lugar",
              "Acesso protegido por dois fatores",
              "Controle do paciente sobre seus dados",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/90 text-sm font-medium"
                style={{ background: "rgba(0,0,0,0.18)" }}
              >
                <span aria-hidden="true">✓</span>
                {feature}
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-white/60 text-xs">
          Ambiente acadêmico de demonstração. Não use dados reais.
        </p>
      </section>

      <section className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          <img
            src={logoGreen}
            alt="VitaLink"
            className="lg:hidden h-10 w-auto object-contain mb-8"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-gray-500 text-sm mb-7">
            Entre como paciente usando senha e aplicativo autenticador.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                autoComplete="username"
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "#fff" }}
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-16 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--border)", background: "#fff" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </span>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                Código do autenticador
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(event) =>
                  setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                pattern="\d{6}"
                required
                className="w-full px-4 py-3 rounded-xl border text-center text-xl font-mono tracking-[0.35em] outline-none"
                style={{ borderColor: "var(--border)", background: "#fff" }}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
              }}
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem uma conta?{" "}
            <button
              type="button"
              onClick={() => onNavigate("register")}
              className="font-semibold"
              style={{ color: "var(--primary)" }}
            >
              Criar conta
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
