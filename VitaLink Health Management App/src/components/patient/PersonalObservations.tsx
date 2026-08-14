import { useEffect, useState } from "react"

interface PersonalObservation {
  id: string
  text: string
  author: "patient"
  created_at: string
  version: number
}

interface Props {
  onSessionExpired: () => void
}

export default function PersonalObservations({ onSessionExpired }: Props) {
  const [observations, setObservations] = useState<PersonalObservation[]>([])
  const [text, setText] = useState("")
  const [editing, setEditing] = useState<PersonalObservation | null>(null)
  const [correction, setCorrection] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/v1/personal-observations", { credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) {
          onSessionExpired()
          return []
        }
        if (!response.ok) throw new Error("observations unavailable")
        return (await response.json()) as PersonalObservation[]
      })
      .then((items) => {
        if (active) setObservations(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (active)
          setError("Não foi possível carregar as observações pessoais.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const requestHeaders = () => {
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken) {
      setError("Recarregue a página para validar esta solicitação.")
      return null
    }
    return {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    }
  }

  const createObservation = async (event: React.FormEvent) => {
    event.preventDefault()
    const headers = requestHeaders()
    if (!headers || !text.trim()) {
      if (headers) setError("Escreva uma observação pessoal antes de salvar.")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/v1/personal-observations", {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify({ text: text.trim() }),
      })
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (!response.ok) throw new Error("observation creation failed")
      const created = (await response.json()) as PersonalObservation
      setObservations((current) => [created, ...current])
      setText("")
      setMessage("Observação pessoal salva.")
    } catch {
      setError("Não foi possível salvar a observação pessoal.")
    } finally {
      setSaving(false)
    }
  }

  const correctObservation = async (event: React.FormEvent) => {
    event.preventDefault()
    const headers = requestHeaders()
    if (!headers || !editing || !correction.trim()) {
      if (headers) setError("Escreva a correção antes de salvar.")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch(
        `/api/v1/personal-observations/${editing.id}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers,
          body: JSON.stringify({
            text: correction.trim(),
            expected_version: editing.version,
          }),
        },
      )
      if (response.status === 401) {
        onSessionExpired()
        return
      }
      if (response.status === 409) {
        setError(
          "Esta observação foi corrigida em outra sessão. Recarregue a página.",
        )
        return
      }
      if (!response.ok) throw new Error("observation correction failed")
      const corrected = (await response.json()) as PersonalObservation
      setObservations((current) =>
        current.map((item) => (item.id === editing.id ? corrected : item)),
      )
      setEditing(null)
      setCorrection("")
      setMessage("Correção salva como nova versão.")
    } catch {
      setError("Não foi possível corrigir a observação pessoal.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="rounded-2xl border bg-white p-5"
      style={{ borderColor: "var(--border)" }}
      aria-labelledby="personal-observations-title"
    >
      <h3
        id="personal-observations-title"
        className="font-semibold text-gray-900"
      >
        Observações pessoais
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Registros escritos por você sobre sua própria saúde.
      </p>
      <form onSubmit={createObservation} className="mt-4">
        <label className="block text-sm font-medium text-gray-700">
          Nova observação pessoal
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={4000}
            rows={3}
            className="mt-1 w-full resize-y rounded-xl border px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          Salvar observação
        </button>
      </form>
      {message && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-5 text-sm text-gray-500">
          Carregando observações pessoais...
        </p>
      ) : observations.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">
          Nenhuma observação pessoal registrada.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {observations.map((observation) => (
            <li key={observation.id} className="rounded-xl border p-4">
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {observation.text}
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Escrita por você ·{" "}
                {new Date(observation.created_at).toLocaleString("pt-BR")} ·
                versão {observation.version}
              </p>
              {editing?.id === observation.id ? (
                <form onSubmit={correctObservation} className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Correção da observação
                    <textarea
                      value={correction}
                      onChange={(event) => setCorrection(event.target.value)}
                      maxLength={4000}
                      rows={3}
                      className="mt-1 w-full resize-y rounded-xl border px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-teal-700"
                    >
                      Salvar correção
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-lg px-3 py-2 text-sm text-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(observation)
                    setCorrection(observation.text)
                  }}
                  className="mt-2 rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Corrigir
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
