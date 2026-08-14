import { useState } from "react"

interface Notification {
  id: string
  kind: string
  created_at: string
  read_at: string | null
}

const labels: Record<string, string> = {
  access_request_created: "Nova solicitação de acesso",
  access_request_granted: "Acesso autorizado",
  access_request_rejected: "Solicitação de acesso recusada",
  authorization_revoked: "Acesso revogado",
  authorization_reduced: "Escopo de acesso reduzido",
  document_available: "Documento disponível",
  document_rejected: "Documento rejeitado",
  clinical_message: "Nova mensagem clínica",
  clinical_message_correction: "Correção de mensagem clínica",
  account_recovery_requested: "Recuperação de conta solicitada",
}

export default function NotificationsPanel({
  onSessionExpired,
}: {
  onSessionExpired?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [error, setError] = useState("")
  const unread = notifications.filter((notification) => !notification.read_at)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/v1/notifications", {
        credentials: "same-origin",
      })
      if (response.status === 401) onSessionExpired?.()
      const body = (await response.json()) as Notification[] & {
        message?: string
      }
      if (!response.ok)
        throw new Error(
          body.message ?? "Não foi possível carregar as notificações.",
        )
      setNotifications(body)
      setLoaded(true)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar as notificações.",
      )
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    setOpen((current) => !current)
    if (!open && !loaded && !loading) void load()
  }

  const markRead = async (notification: Notification) => {
    const csrf = sessionStorage.getItem("vitallink.csrf")
    if (!csrf) {
      setError("Recarregue a página para validar esta ação.")
      return
    }
    try {
      const response = await fetch(`/api/v1/notifications/${notification.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrf },
      })
      if (response.status === 401) onSessionExpired?.()
      const body = (await response.json()) as Notification & {
        message?: string
      }
      if (!response.ok)
        throw new Error(
          body.message ?? "Não foi possível atualizar a notificação.",
        )
      setNotifications((current) =>
        current.map((item) => (item.id === body.id ? body : item)),
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar a notificação.",
      )
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Abrir notificações"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <section className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Notificações</h2>
            {unread.length > 0 && (
              <span className="text-xs font-semibold text-red-600">
                {unread.length} não lida{unread.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {loading ? (
            <p role="status" className="mt-3 text-sm text-gray-500">
              Carregando notificações...
            </p>
          ) : error ? (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          ) : notifications.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Nenhuma notificação.</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-800">
                    {labels[notification.kind] ?? "Atualização da conta"}
                  </p>
                  <time className="text-xs text-gray-500">
                    {new Date(notification.created_at).toLocaleString("pt-BR")}
                  </time>
                  {!notification.read_at && (
                    <button
                      type="button"
                      onClick={() => void markRead(notification)}
                      className="mt-2 block text-xs font-semibold text-teal-700"
                    >
                      Marcar como lida
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
