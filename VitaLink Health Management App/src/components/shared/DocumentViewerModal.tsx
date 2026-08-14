import { useEffect, useState } from "react"
import type { StoredDocument } from "@/components/shared/DocumentUploadModal"

interface Professional {
  id: string
  name: string
  specialty: string
  institution: string | null
  expires_at: string
}

interface Props {
  doc: StoredDocument
  onClose: () => void
}

export default function DocumentViewerModal({ doc, onClose }: Props) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [totpCode, setTotpCode] = useState("")
  const [error, setError] = useState("")
  const contentUrl = `/api/v1/documents/${doc.id}/content`

  useEffect(() => {
    fetch(`/api/v1/documents/${doc.id}/authorized-professionals`, {
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((body: Professional[]) => setProfessionals(body))
      .catch(() => setProfessionals([]))
  }, [doc.id])

  const download = async () => {
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken || !/^\d{6}$/.test(totpCode)) {
      setError("Informe o código de seis dígitos do autenticador.")
      return
    }
    setError("")
    const confirmation = await fetch("/api/v1/step-up-confirmations", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        action: "document_download",
        totp_code: totpCode,
      }),
    })
    if (!confirmation.ok) {
      setError("Não foi possível confirmar o download.")
      return
    }
    const proof = (await confirmation.json()) as { id: string }
    const response = await fetch(
      `${contentUrl}?download=true&step_up_confirmation_id=${encodeURIComponent(proof.id)}`,
      { credentials: "same-origin" },
    )
    if (!response.ok) {
      setError("Não foi possível baixar o documento.")
      return
    }
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = doc.original_name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <section
        aria-labelledby="document-viewer-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 id="document-viewer-title" className="font-bold text-gray-900">
              {doc.original_name}
            </h2>
            <p className="text-xs text-gray-500">Documento verificado</p>
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="text-gray-500"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_280px]">
          <iframe
            title={`Visualização de ${doc.original_name}`}
            src={contentUrl}
            sandbox=""
            className="h-[55vh] w-full bg-gray-100"
          />
          <aside className="overflow-y-auto border-l p-5">
            <h3 className="text-sm font-semibold text-gray-800">
              Profissionais autorizados
            </h3>
            {professionals.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                Nenhum profissional possui acesso atual.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {professionals.map((professional) => (
                  <li
                    key={professional.id}
                    className="rounded-xl bg-gray-50 p-3 text-xs"
                  >
                    <strong className="block text-gray-800">
                      {professional.name}
                    </strong>
                    <span className="text-gray-500">
                      {professional.specialty}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <label
              className="mt-6 block text-xs font-semibold text-gray-700"
              htmlFor="document-totp"
            >
              Código do autenticador para baixar
            </label>
            <input
              id="document-totp"
              value={totpCode}
              onChange={(event) =>
                setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm tracking-widest"
              style={{ borderColor: "var(--border)" }}
            />
            <button
              type="button"
              onClick={() => void download()}
              className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              Confirmar e baixar
            </button>
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {error}
              </p>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}
