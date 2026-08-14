import { useState } from "react"

interface AuditEvent {
  id: string
  event: string
  status: string
  created_at: string
}

export default function AuditHistory({
  onSessionExpired,
}: {
  onSessionExpired?: () => void
}) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/v1/audit-events", {
        credentials: "same-origin",
      })
      if (response.status === 401) onSessionExpired?.()
      const body = (await response.json()) as AuditEvent[] & {
        message?: string
      }
      if (!response.ok)
        throw new Error(
          body.message ?? "Não foi possível carregar o histórico.",
        )
      setEvents(body)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar o histórico.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Histórico de acessos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Eventos permitidos do seu próprio perfil, sem conteúdo clínico.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border px-4 py-2 text-sm font-semibold text-teal-700 disabled:opacity-50"
        >
          {loading ? "Carregando..." : "Carregar histórico de acessos"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {events?.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">Nenhum evento disponível.</p>
      )}
      {events && events.length > 0 && (
        <ol className="mt-4 divide-y">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap justify-between gap-2 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {event.event}
                </p>
                <p className="text-xs text-gray-500">{event.status}</p>
              </div>
              <time className="text-xs text-gray-500">
                {new Date(event.created_at).toLocaleString("pt-BR")}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
