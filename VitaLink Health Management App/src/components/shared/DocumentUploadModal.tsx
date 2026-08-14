import { useRef, useState } from "react"

export interface StoredDocument {
  id: string
  category: "exames" | "receitas" | "laudos" | "imagens"
  original_name: string
  content_type: "application/pdf" | "image/jpeg" | "image/png"
  size: number
  status: "approved"
  created_at: string
}

interface Props {
  onSave: (document: StoredDocument) => void
  onClose: () => void
  patientId?: string
}

const categories = [
  ["exames", "Exame"],
  ["receitas", "Receita"],
  ["laudos", "Laudo"],
  ["imagens", "Imagem"],
] as const

export default function DocumentUploadModal({
  onSave,
  onClose,
  patientId,
}: Props) {
  const [category, setCategory] = useState<StoredDocument["category"]>("exames")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const chooseFile = (selected: File | undefined) => {
    setError("")
    if (!selected) return
    if (selected.size > 20 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 20 MB.")
      return
    }
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(selected.type)
    ) {
      setError("Escolha um arquivo PDF, JPG ou PNG.")
      return
    }
    setFile(selected)
  }

  const upload = async () => {
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!file || !csrfToken) {
      setError("Selecione um arquivo e confirme sua sessão.")
      return
    }
    const form = new FormData()
    form.append("category", category)
    form.append("file", file)
    if (patientId) form.append("patient_id", patientId)
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/v1/documents", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
        body: form,
      })
      const body = (await response.json()) as StoredDocument & {
        message?: string
      }
      if (!response.ok) {
        setError(body.message ?? "Não foi possível enviar o documento.")
        return
      }
      onSave(body)
    } catch {
      setError("O envio está temporariamente indisponível.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        aria-labelledby="document-upload-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="document-upload-title" className="font-bold text-gray-900">
              Adicionar documento
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              O arquivo fica indisponível até a verificação de segurança.
            </p>
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="text-gray-500"
          >
            ×
          </button>
        </div>

        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Categoria
        </label>
        <div className="mb-5 grid grid-cols-2 gap-2">
          {categories.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className="rounded-xl border px-3 py-2 text-sm font-medium"
              style={
                category === value
                  ? { borderColor: "var(--primary)", color: "var(--primary)" }
                  : { borderColor: "var(--border)", color: "#64748B" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="w-full rounded-xl border-2 border-dashed px-4 py-8 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="block text-sm font-semibold text-gray-700">
            {file?.name ?? "Selecionar PDF, JPG ou PNG"}
          </span>
          <span className="mt-1 block text-xs text-gray-400">
            Máximo de 20 MB por arquivo
          </span>
        </button>
        <input
          ref={fileInput}
          aria-label="Selecionar arquivo"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-600"
            style={{ borderColor: "var(--border)" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!file || saving}
            onClick={() => void upload()}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {saving ? "Verificando arquivo..." : "Enviar documento"}
          </button>
        </div>
      </section>
    </div>
  )
}
