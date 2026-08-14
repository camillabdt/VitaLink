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
  const [error, setError] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [resetComplete, setResetComplete] = useState(false)
  const [recoveryKind, setRecoveryKind] = useState<"password" | "totp">(
    "password",
  )
  const recoveryToken =
    window.location.pathname === "/reset-password"
      ? new URLSearchParams(window.location.search).get("token")
      : null
  const totpRecoveryToken =
    window.location.pathname === "/recover-totp"
      ? new URLSearchParams(window.location.search).get("token")
      : null
  const [offlineRecoveryKey, setOfflineRecoveryKey] = useState("")
  const [activationCsrf, setActivationCsrf] = useState("")
  const [totpEnrollment, setTotpEnrollment] = useState<{
    secret: string
    provisioning_uri: string
  } | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [recoveryMaterial, setRecoveryMaterial] = useState<{
    recovery_codes: string[]
    offline_recovery_key: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch(
        recoveryKind === "totp"
          ? "/api/v1/totp-recovery-requests"
          : "/api/v1/password-recovery-requests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      )
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Aguarde antes de tentar novamente."
            : "Não foi possível solicitar a recuperação. Tente novamente.",
        )
        return
      }
      setSent(true)
    } catch {
      setError("Não foi possível solicitar a recuperação. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (newPassword !== passwordConfirmation) {
      setError("As senhas não coincidem.")
      return
    }
    if (!recoveryToken) {
      setError("O link de recuperação não é válido.")
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/v1/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: recoveryToken,
          new_password: newPassword,
        }),
      })
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Aguarde antes de tentar novamente."
            : "O link não é válido ou expirou.",
        )
        return
      }
      setResetComplete(true)
    } catch {
      setError("Não foi possível redefinir a senha. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleTotpRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!totpRecoveryToken) {
      setError("O link de recuperação não é válido.")
      return
    }
    setLoading(true)
    try {
      const recovery = await fetch("/api/v1/totp-recoveries", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: totpRecoveryToken,
          offline_recovery_key: offlineRecoveryKey,
        }),
      })
      const csrf = recovery.headers.get("X-CSRF-Token")
      if (!recovery.ok || !csrf) {
        setError(
          recovery.status === 429
            ? "Aguarde antes de tentar novamente."
            : "Os fatores de recuperação não são válidos ou expiraram.",
        )
        return
      }
      const enrollment = await fetch("/api/v1/totp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrf },
      })
      if (!enrollment.ok) {
        setError("Não foi possível iniciar o novo autenticador.")
        return
      }
      setActivationCsrf(csrf)
      setTotpEnrollment(await enrollment.json())
    } catch {
      setError("Não foi possível concluir a recuperação. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleTotpConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
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
        setError(
          response.status === 429
            ? "Aguarde antes de tentar novamente."
            : "Código inválido. Confira o aplicativo autenticador.",
        )
        return
      }
      setRecoveryMaterial(await response.json())
    } catch {
      setError("Não foi possível ativar o novo autenticador.")
    } finally {
      setLoading(false)
    }
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

        {totpRecoveryToken ? (
          <div
            className="bg-white rounded-2xl p-8 shadow-sm border"
            style={{ borderColor: "var(--border)" }}
          >
            {recoveryMaterial ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Guarde seus novos códigos
                </h2>
                <p className="text-gray-500 text-sm mb-5">
                  Estes valores aparecem uma única vez. Guarde-os fora deste
                  dispositivo.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {recoveryMaterial.recovery_codes.map((code) => (
                    <code
                      key={code}
                      className="rounded-lg bg-gray-50 p-2 text-center text-xs"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Chave offline
                </p>
                <code className="block rounded-lg bg-amber-50 p-3 text-sm break-all mb-5">
                  {recoveryMaterial.offline_recovery_key}
                </code>
                <button
                  onClick={() => onNavigate("login")}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  Voltar ao login
                </button>
              </div>
            ) : totpEnrollment ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Cadastre o novo autenticador
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  Adicione a chave abaixo ao aplicativo autenticador e informe o
                  código gerado.
                </p>
                <code className="block rounded-lg bg-gray-50 p-3 text-sm break-all mb-5">
                  {totpEnrollment.secret}
                </code>
                <form onSubmit={handleTotpConfirmation} className="space-y-4">
                  <div>
                    <label
                      htmlFor="new-totp-code"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Código do novo autenticador
                    </label>
                    <input
                      id="new-totp-code"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) =>
                        setTotpCode(event.target.value.replace(/\D/g, ""))
                      }
                      required
                      className="w-full px-4 py-3 rounded-xl border text-center font-mono tracking-[0.3em]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--primary)" }}
                  >
                    {loading ? "Ativando..." : "Ativar novo autenticador"}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Confirme a recuperação
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Informe a chave offline guardada na ativação da conta.
                </p>
                <form onSubmit={handleTotpRecovery} className="space-y-4">
                  <div>
                    <label
                      htmlFor="offline-recovery-key"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Chave offline de recuperação
                    </label>
                    <input
                      id="offline-recovery-key"
                      type="password"
                      value={offlineRecoveryKey}
                      onChange={(event) =>
                        setOfflineRecoveryKey(event.target.value)
                      }
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--primary)" }}
                  >
                    {loading
                      ? "Validando..."
                      : "Validar fatores de recuperação"}
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : recoveryToken ? (
          <div
            className="bg-white rounded-2xl p-8 shadow-sm border"
            style={{ borderColor: "var(--border)" }}
          >
            {resetComplete ? (
              <div className="text-center">
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
                  Senha redefinida
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Entre novamente com sua senha e o mesmo aplicativo
                  autenticador.
                </p>
                <button
                  onClick={() => onNavigate("login")}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                  }}
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Crie uma nova senha
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  A nova senha deve ter pelo menos 12 caracteres. Seu TOTP será
                  preservado e as sessões anteriores serão encerradas.
                </p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Nova senha
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      minLength={12}
                      maxLength={128}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{
                        borderColor: "var(--border)",
                        background: "#FAFAFA",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password-confirmation"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Confirmar nova senha
                    </label>
                    <input
                      id="password-confirmation"
                      type="password"
                      minLength={12}
                      maxLength={128}
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{
                        borderColor: "var(--border)",
                        background: "#FAFAFA",
                      }}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    {loading ? "Redefinindo..." : "Redefinir senha"}
                  </button>
                </form>
              </>
            )}
          </div>
        ) : !sent ? (
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
              {recoveryKind === "totp"
                ? "Recuperar autenticador"
                : "Redefinir senha"}
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              {recoveryKind === "totp"
                ? "Enviaremos um link seguro. Para concluir, você também precisará da chave offline guardada na ativação."
                : "Digite o e-mail associado à sua conta. Enviaremos um link seguro para redefinir sua senha."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  E-mail
                </label>
                <input
                  id="recovery-email"
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

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

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
                ) : recoveryKind === "totp" ? (
                  "Enviar instruções de recuperação"
                ) : (
                  "Enviar link de redefinição"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setRecoveryKind((kind) =>
                  kind === "password" ? "totp" : "password",
                )
                setError("")
              }}
              className="w-full mt-4 text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              {recoveryKind === "password"
                ? "Perdi acesso ao autenticador"
                : "Quero redefinir minha senha"}
            </button>

            <div className="mt-5 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong>Não recebeu o e-mail?</strong> Verifique a pasta de spam
                ou aguarde alguns minutos. O link expira em 15 minutos.
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
              Verifique seu e-mail
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              Se a conta puder ser recuperada, enviaremos as instruções por
              e-mail.
            </p>

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
                  O link expira em <strong>15 minutos</strong>. Verifique também
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
