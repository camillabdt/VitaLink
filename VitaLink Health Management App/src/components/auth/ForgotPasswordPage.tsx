import { useState } from "react"
import type { Page } from "@/data/mockData"
import logoGreen from "@/imports/LogoFundoBranco.png"

interface Props {
  onNavigate: (page: Page) => void
}

export default function ForgotPasswordPage({ onNavigate }: Props) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 1000)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-[440px]">
        {/* Back */}
        <button
          onClick={() => onNavigate("login")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-8 transition-colors"
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

        {/* Logo */}
        <div className="mb-8">
          <img
            src={logoGreen}
            alt="VitaLink"
            className="h-10 w-auto object-contain"
          />
        </div>

        {!sent ? (
          <div
            className="bg-white rounded-2xl p-8 shadow-sm border"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--teal-100)" }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--teal-700)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Redefinir senha
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Digite o e-mail associado à sua conta. Enviaremos um link seguro
              para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: "var(--border)",
                    background: "#FAFAFA",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Enviar link de redefinição"
                )}
              </button>
            </form>

            <div className="mt-5 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong>Não recebeu o e-mail?</strong> Verifique a pasta de spam
                ou aguarde alguns minutos. O link expira em 30 minutos.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="bg-white rounded-2xl p-8 shadow-sm border text-center"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Success animation */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "var(--teal-100)" }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--teal-700)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              E-mail enviado!
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              Enviamos um link de redefinição para
            </p>
            <p className="font-semibold text-gray-800 text-sm mb-6">{email}</p>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left mb-6">
              <div className="flex gap-2.5">
                <svg
                  className="flex-shrink-0 mt-0.5 text-amber-500"
                  width="15"
                  height="15"
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
                <p className="text-amber-700 text-xs leading-relaxed">
                  O link expira em <strong>30 minutos</strong>. Verifique também
                  a pasta de spam.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSent(false)}
                className="w-full py-3 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                Usar outro e-mail
              </button>
              <button
                onClick={() => onNavigate("login")}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                }}
              >
                Voltar ao login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
