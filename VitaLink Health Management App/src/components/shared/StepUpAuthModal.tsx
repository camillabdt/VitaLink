import { useState, useEffect } from "react"

export type StepUpReason = "clinical" | "document"

interface Props {
  reason: StepUpReason
  onConfirm: () => void
  onCancel: () => void
}

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

export default function StepUpAuthModal({
  reason,
  onConfirm,
  onCancel,
}: Props) {
  const [method, setMethod] = useState<"passkey" | "totp" | "icp">(
    reason === "document" ? "icp" : "passkey",
  )
  const [totpCode, setTotpCode] = useState("")
  const [biometryState, setBiometryState] =
    useState<"idle" | "scanning" | "done">("idle")
  const [icpState, setIcpState] = useState<"idle" | "reading" | "done">("idle")

  const handleBiometryTap = () => {
    setBiometryState("scanning")
    setTimeout(() => {
      setBiometryState("done")
      setTimeout(onConfirm, 500)
    }, 1100)
  }

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (totpCode.length === 6) setTimeout(onConfirm, 300)
  }

  const handleIcp = () => {
    setIcpState("reading")
    setTimeout(() => {
      setIcpState("done")
      setTimeout(onConfirm, 500)
    }, 1400)
  }

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onCancel])

  const isDocument = reason === "document"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isDocument ? "#FEF9C3" : "#F0FDF9" }}
              >
                {isDocument ? (
                  <StarIcon color="#92400E" />
                ) : (
                  <ShieldIcon color="var(--teal-600)" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">
                  {isDocument
                    ? "Assinatura digital requerida"
                    : "Confirme sua identidade"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {isDocument
                    ? "Documentos formais exigem certificado ICP-Brasil"
                    : "Esta ação clínica sensível requer re-autenticação"}
                </div>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors -mt-1"
            >
              <XIcon />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Method tabs — only for clinical */}
          {!isDocument && (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              {([
                ["passkey", "Passkey"],
                ["totp", "Autenticador"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setMethod(id)
                    setBiometryState("idle")
                    setTotpCode("")
                  }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={
                    method === id
                      ? {
                          background: "#fff",
                          color: "var(--teal-700)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }
                      : { color: "#64748B" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Passkey */}
          {method === "passkey" && (
            <div className="flex flex-col items-center text-center">
              <button
                onClick={handleBiometryTap}
                disabled={biometryState !== "idle"}
                className="relative mb-4 focus:outline-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
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
                        ? "0 0 0 6px rgba(14,159,138,0.15), 0 0 0 12px rgba(14,159,138,0.07)"
                        : "0 4px 16px rgba(14,159,138,0.12)",
                  }}
                >
                  {biometryState === "done" ? (
                    <CheckIcon color="white" size={28} />
                  ) : (
                    <FingerprintIcon
                      color={
                        biometryState === "scanning"
                          ? "#fff"
                          : "var(--teal-600)"
                      }
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
                {biometryState === "idle" && "Toque para usar biometria"}
                {biometryState === "scanning" && (
                  <span style={{ color: "var(--primary)" }}>
                    Verificando...
                  </span>
                )}
                {biometryState === "done" && (
                  <span className="text-emerald-600">Confirmado</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Impressão digital, Face ID ou PIN do dispositivo
              </p>
            </div>
          )}

          {/* TOTP */}
          {method === "totp" && (
            <form onSubmit={handleTotpSubmit}>
              <p className="text-sm text-gray-600 mb-3 text-center">
                Informe o código de 6 dígitos do seu aplicativo autenticador
              </p>
              <input
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000 000"
                autoFocus
                inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl border text-center text-2xl font-mono tracking-[0.4em] outline-none transition-all"
                style={{
                  borderColor: "var(--border)",
                  letterSpacing: "0.35em",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                type="submit"
                disabled={totpCode.length !== 6}
                className="w-full mt-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                }}
              >
                Confirmar
              </button>
            </form>
          )}

          {/* ICP-Brasil */}
          {method === "icp" && (
            <div className="flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "#FEF9C3", border: "1.5px solid #FDE68A" }}
              >
                {icpState === "done" ? (
                  <CheckIcon color="#92400E" size={26} />
                ) : (
                  <CertIcon scanning={icpState === "reading"} />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {icpState === "idle" && "Certificado ICP-Brasil"}
                {icpState === "reading" && (
                  <span style={{ color: "#B45309" }}>Lendo certificado...</span>
                )}
                {icpState === "done" && (
                  <span className="text-emerald-600">Assinatura aplicada</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mb-5">
                {icpState === "idle"
                  ? "Conecte seu token USB ou smart card para assinar digitalmente o documento"
                  : icpState === "reading"
                    ? "Aguarde enquanto o certificado é lido..."
                    : "Documento assinado com validade jurídica"}
              </p>
              {icpState === "idle" && (
                <button
                  onClick={handleIcp}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #D97706, #B45309)",
                    color: "#fff",
                  }}
                >
                  Usar token / smart card
                </button>
              )}
              {icpState === "reading" && (
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "#B45309" }}
                >
                  <span className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                  Processando...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border"
            style={{ borderColor: "var(--border)" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────

function ShieldIcon({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function StarIcon({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1L12 2z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

type CheckIconProps = { color: string } & { size?: number }

function CheckIcon({ color, size = 20 }: CheckIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function FingerprintIcon({
  color,
  scanning,
}: {
  color: string
  scanning: boolean
}) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={
        scanning ? { filter: "drop-shadow(0 0 5px rgba(255,255,255,0.6))" } : {}
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

function CertIcon({ scanning }: { scanning: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B45309"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={
        scanning ? { filter: "drop-shadow(0 0 4px rgba(180,83,9,0.4))" } : {}
      }
    >
      <rect x="3" y="3" width="12" height="16" rx="1.5" />
      <path d="M6 7h6M6 10h6M6 13h3" />
      <circle cx="18" cy="18" r="4" />
      <path d="M16.5 18l1 1 2-2" />
    </svg>
  )
}
