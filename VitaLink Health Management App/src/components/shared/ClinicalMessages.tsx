import { useEffect, useMemo, useState } from "react"
import ClinicalDictation from "./ClinicalDictation"
import MentionTextarea, { type Mentionable } from "./MentionTextarea"

interface ProfessionalParty {
  id: string
  name: string
  specialty: string
}

interface MessageRecipient extends ProfessionalParty {
  unread_count: number
}

interface ClinicalMessage {
  id: string
  content: string
  mention_professional_ids: string[]
  sender: ProfessionalParty
  recipient: ProfessionalParty
  corrects_id: string | null
  correction_reason: string | null
  created_at: string
}

interface Props {
  patientId: string
  categories: string[]
  operations: string[]
  onSessionExpired?: () => void
  showHeading?: boolean
}

export default function ClinicalMessages({
  patientId,
  categories,
  operations,
  onSessionExpired,
  showHeading = true,
}: Props) {
  const [team, setTeam] = useState<MessageRecipient[]>([])
  const [selected, setSelected] = useState<MessageRecipient | null>(null)
  const [messages, setMessages] = useState<ClinicalMessage[]>([])
  const [search, setSearch] = useState("")
  const [content, setContent] = useState("")
  const [totp, setTotp] = useState("")
  const [editing, setEditing] = useState<ClinicalMessage | null>(null)
  const [correctedContent, setCorrectedContent] = useState("")
  const [correctionReason, setCorrectionReason] = useState("")
  const [correctionTotp, setCorrectionTotp] = useState("")
  const [loading, setLoading] = useState(true)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canRead =
    categories.includes("mensagens") && operations.includes("consultar")
  const canSend = canRead && operations.includes("anexar")
  const canCorrect = canRead && operations.includes("atualizar")
  const filteredTeam = useMemo(
    () =>
      team.filter((member) =>
        `${member.name} ${member.specialty}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
      ),
    [search, team],
  )
  const mentionables: Mentionable[] = team.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.specialty,
  }))

  useEffect(() => {
    if (!canRead) {
      setLoading(false)
      return
    }
    fetch(
      `/api/v1/clinical-message-recipients?patient_id=${encodeURIComponent(patientId)}`,
      { credentials: "same-origin" },
    )
      .then(async (response) => {
        if (response.status === 401) onSessionExpired?.()
        if (!response.ok)
          throw new Error("Não foi possível carregar a equipe de mensagens.")
        return (await response.json()) as MessageRecipient[]
      })
      .then(setTeam)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [canRead, onSessionExpired, patientId])

  const openConversation = async (member: MessageRecipient) => {
    setSelected(member)
    setConversationLoading(true)
    setError("")
    try {
      const response = await fetch(
        `/api/v1/clinical-messages?patient_id=${encodeURIComponent(patientId)}&peer_professional_id=${encodeURIComponent(member.id)}`,
        { credentials: "same-origin" },
      )
      if (response.status === 401) onSessionExpired?.()
      if (!response.ok) throw new Error("Não foi possível carregar a conversa.")
      setMessages((await response.json()) as ClinicalMessage[])
      setTeam((current) =>
        current.map((value) =>
          value.id === member.id ? { ...value, unread_count: 0 } : value,
        ),
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar a conversa.",
      )
    } finally {
      setConversationLoading(false)
    }
  }

  const confirmTotp = async (code: string): Promise<string> => {
    const csrf = sessionStorage.getItem("vitallink.csrf")
    if (!csrf || !/^\d{6}$/.test(code))
      throw new Error("Informe um TOTP válido.")
    const response = await fetch("/api/v1/step-up-confirmations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({
        action: "clinical_message_write",
        totp_code: code,
      }),
    })
    if (response.status === 401) onSessionExpired?.()
    if (!response.ok) throw new Error("Não foi possível confirmar o TOTP.")
    return ((await response.json()) as { id: string }).id
  }

  const mentionIds = (text: string) =>
    team
      .filter((member) => text.includes(`@${member.name}`))
      .map((member) => member.id)

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected || !content.trim()) return
    const csrf = sessionStorage.getItem("vitallink.csrf")
    if (!csrf) {
      setError("Recarregue a página para validar esta ação.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const proof = await confirmTotp(totp)
      const response = await fetch("/api/v1/clinical-messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          patient_id: patientId,
          recipient_professional_id: selected.id,
          content: content.trim(),
          mention_professional_ids: mentionIds(content),
          step_up_confirmation_id: proof,
        }),
      })
      if (response.status === 401) onSessionExpired?.()
      const created = (await response.json()) as ClinicalMessage & {
        message?: string
      }
      if (!response.ok)
        throw new Error(
          created.message ?? "Não foi possível enviar a mensagem.",
        )
      setMessages((current) => [...current, created])
      setContent("")
      setTotp("")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar a mensagem.",
      )
    } finally {
      setSaving(false)
    }
  }

  const startCorrection = (message: ClinicalMessage) => {
    setEditing(message)
    setCorrectedContent("")
    setCorrectionReason("")
    setCorrectionTotp("")
  }

  const correct = async (event: React.FormEvent) => {
    event.preventDefault()
    if (
      !editing ||
      !correctedContent.trim() ||
      correctionReason.trim().length < 3
    )
      return
    const csrf = sessionStorage.getItem("vitallink.csrf")
    if (!csrf) {
      setError("Recarregue a página para validar esta ação.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const proof = await confirmTotp(correctionTotp)
      const response = await fetch(
        `/api/v1/clinical-messages/${editing.id}/corrections`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify({
            content: correctedContent.trim(),
            mention_professional_ids: mentionIds(correctedContent),
            correction_reason: correctionReason.trim(),
            step_up_confirmation_id: proof,
          }),
        },
      )
      if (response.status === 401) onSessionExpired?.()
      const created = (await response.json()) as ClinicalMessage & {
        message?: string
      }
      if (!response.ok)
        throw new Error(
          created.message ?? "Não foi possível enviar a correção.",
        )
      setMessages((current) => [...current, created])
      setEditing(null)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar a correção.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="rounded-2xl border bg-white p-6"
      style={{ borderColor: "var(--border)" }}
    >
      {showHeading && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Equipe e mensagens
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Somente profissionais com autorização vigente para este paciente.
          </p>
        </div>
      )}
      {loading ? (
        <p role="status" className="mt-4 text-sm text-gray-500">
          Carregando equipe...
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside>
            <label className="block text-sm font-medium text-gray-700">
              Buscar profissional elegível
              <input
                aria-label="Buscar profissional elegível"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </label>
            {filteredTeam.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Nenhum profissional elegível.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {filteredTeam.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => void openConversation(member)}
                      className="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left"
                      aria-label={`${member.name}, ${member.specialty}`}
                    >
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">
                          {member.name}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {member.specialty}
                        </span>
                      </span>
                      {member.unread_count > 0 && (
                        <span className="rounded-full bg-teal-600 px-2 py-1 text-xs font-semibold text-white">
                          {member.unread_count} não lidas
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
          <div className="min-w-0">
            {!selected ? (
              <p className="text-sm text-gray-500">
                Selecione um profissional para abrir a conversa.
              </p>
            ) : conversationLoading ? (
              <p role="status" className="text-sm text-gray-500">
                Carregando conversa...
              </p>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900">
                  Conversa com {selected.name}
                </h3>
                {messages.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    Nenhuma mensagem nesta conversa.
                  </p>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {messages.map((message) => {
                      const sentByPeer = message.sender.id === selected.id
                      return (
                        <li key={message.id} className="rounded-xl border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {message.sender.name}
                            </p>
                            <time className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleString(
                                "pt-BR",
                              )}
                            </time>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                            {message.content}
                          </p>
                          {message.corrects_id && (
                            <p className="mt-2 text-xs text-amber-700">
                              Correção vinculada · {message.correction_reason}
                            </p>
                          )}
                          {canCorrect &&
                            !sentByPeer &&
                            !message.corrects_id && (
                              <button
                                type="button"
                                onClick={() => startCorrection(message)}
                                className="mt-3 text-sm font-semibold text-teal-700"
                              >
                                Corrigir mensagem
                              </button>
                            )}
                        </li>
                      )
                    })}
                  </ol>
                )}
                {canSend && (
                  <form
                    onSubmit={send}
                    className="mt-5 space-y-3 border-t pt-5"
                  >
                    <label className="block text-sm font-medium text-gray-700">
                      Mensagem clínica
                    </label>
                    <MentionTextarea
                      ariaLabel="Mensagem clínica"
                      value={content}
                      onChange={setContent}
                      mentionables={mentionables}
                      placeholder="Escreva uma mensagem clínica"
                    />
                    <ClinicalDictation
                      patientId={patientId}
                      category="mensagens"
                      operation="anexar"
                      onDraft={setContent}
                      onSessionExpired={onSessionExpired}
                    />
                    <TextInput
                      label="TOTP da mensagem"
                      value={totp}
                      onChange={setTotp}
                      pattern="[0-9]{6}"
                    />
                    <ActionButton disabled={saving}>
                      Enviar mensagem
                    </ActionButton>
                  </form>
                )}
                {editing && (
                  <form
                    onSubmit={correct}
                    className="mt-5 space-y-3 rounded-xl border p-4"
                  >
                    <label className="block text-sm font-medium text-gray-700">
                      Texto corrigido
                    </label>
                    <MentionTextarea
                      ariaLabel="Texto corrigido"
                      value={correctedContent}
                      onChange={setCorrectedContent}
                      mentionables={mentionables}
                    />
                    <ClinicalDictation
                      patientId={patientId}
                      category="mensagens"
                      operation="atualizar"
                      onDraft={setCorrectedContent}
                      onSessionExpired={onSessionExpired}
                    />
                    <TextInput
                      label="Motivo da correção"
                      value={correctionReason}
                      onChange={setCorrectionReason}
                      minLength={3}
                    />
                    <TextInput
                      label="TOTP da correção"
                      value={correctionTotp}
                      onChange={setCorrectionTotp}
                      pattern="[0-9]{6}"
                    />
                    <ActionButton disabled={saving}>
                      Enviar correção
                    </ActionButton>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function TextInput({
  label,
  value,
  onChange,
  minLength,
  pattern,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  minLength?: number
  pattern?: string
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={minLength}
        pattern={pattern}
        inputMode={pattern ? "numeric" : undefined}
        required
        className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
      />
    </label>
  )
}

function ActionButton({
  disabled,
  children,
}: {
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: "var(--primary)" }}
    >
      {disabled ? "Enviando..." : children}
    </button>
  )
}
