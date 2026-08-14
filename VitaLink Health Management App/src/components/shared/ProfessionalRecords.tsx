import { useEffect, useMemo, useState } from "react"
import ClinicalDictation from "./ClinicalDictation"

export interface ProfessionalRecord {
  id: string
  kind: "consultation" | "note" | "recommendation"
  occurred_at: string
  content: string
  justification: string
  origin: "professional_entry"
  author: {
    name: string
    specialty: string
  }
  version: number
  created_at: string
}

const kindLabels = {
  consultation: "Consulta",
  note: "Anotação",
  recommendation: "Recomendação",
}

interface Props {
  patientId?: string
  categories?: string[]
  operations?: string[]
  mode?: "all" | "history" | "recommendations" | "consultations" | "notes"
  onSessionExpired?: () => void
}

export default function ProfessionalRecords({
  patientId,
  categories = [],
  operations = [],
  mode = "all",
  onSessionExpired,
}: Props) {
  const [records, setRecords] = useState<ProfessionalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [kind, setKind] = useState<ProfessionalRecord["kind"]>("consultation")
  const [occurredAt, setOccurredAt] = useState("")
  const [content, setContent] = useState("")
  const [justification, setJustification] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [editing, setEditing] = useState<ProfessionalRecord | null>(null)
  const [correctedContent, setCorrectedContent] = useState("")
  const [correctionReason, setCorrectionReason] = useState("")

  const allowedKinds = useMemo(() => {
    const values: ProfessionalRecord["kind"][] = []
    if (categories.includes("consultas")) values.push("consultation", "note")
    if (categories.includes("recomendações")) values.push("recommendation")
    if (mode === "recommendations")
      return values.filter((value) => value === "recommendation")
    if (mode === "history")
      return values.filter((value) => value !== "recommendation")
    if (mode === "consultations")
      return values.filter((value) => value === "consultation")
    if (mode === "notes")
      return values.filter(
        (value) => value === "note" || value === "recommendation",
      )
    return values
  }, [categories, mode])
  const canCreate = Boolean(
    patientId && operations.includes("anexar") && allowedKinds.length,
  )

  useEffect(() => {
    const query = patientId
      ? `?patient_id=${encodeURIComponent(patientId)}`
      : ""
    fetch(`/api/v1/professional-records${query}`, {
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (response.status === 401) onSessionExpired?.()
        if (!response.ok)
          throw new Error("Não foi possível carregar os registros.")
        return (await response.json()) as ProfessionalRecord[]
      })
      .then(setRecords)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [onSessionExpired, patientId])

  useEffect(() => {
    if (allowedKinds.length && !allowedKinds.includes(kind))
      setKind(allowedKinds[0])
  }, [allowedKinds, kind])

  const publish = async (event: React.FormEvent) => {
    event.preventDefault()
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (
      !csrfToken ||
      !occurredAt ||
      !content.trim() ||
      justification.trim().length < 10 ||
      !/^\d{6}$/.test(totpCode)
    ) {
      setError("Preencha o registro, a justificativa e o TOTP de seis dígitos.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const confirmation = await fetch("/api/v1/step-up-confirmations", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          action: "clinical_record_create",
          totp_code: totpCode,
        }),
      })
      if (confirmation.status === 401) onSessionExpired?.()
      if (!confirmation.ok)
        throw new Error("Não foi possível confirmar o TOTP.")
      const proof = (await confirmation.json()) as { id: string }
      const response = await fetch("/api/v1/professional-records", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          patient_id: patientId,
          kind,
          occurred_at: new Date(occurredAt).toISOString(),
          content: content.trim(),
          justification: justification.trim(),
          step_up_confirmation_id: proof.id,
        }),
      })
      const body = (await response.json()) as ProfessionalRecord & {
        message?: string
      }
      if (!response.ok)
        throw new Error(body.message ?? "Não foi possível publicar o registro.")
      setRecords((current) => [body, ...current])
      setOccurredAt("")
      setContent("")
      setJustification("")
      setTotpCode("")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível publicar o registro.",
      )
    } finally {
      setSaving(false)
    }
  }

  const visible = records.filter((record) => {
    if (mode === "recommendations") return record.kind === "recommendation"
    if (mode === "history") return record.kind !== "recommendation"
    if (mode === "consultations") return record.kind === "consultation"
    if (mode === "notes")
      return record.kind === "note" || record.kind === "recommendation"
    return true
  })

  const correct = async (event: React.FormEvent) => {
    event.preventDefault()
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (
      !editing ||
      !csrfToken ||
      !correctedContent.trim() ||
      correctionReason.trim().length < 3
    ) {
      setError("Informe o conteúdo corrigido e o motivo da correção.")
      return
    }
    setError("")
    try {
      const response = await fetch(
        `/api/v1/professional-records/${editing.id}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            occurred_at: editing.occurred_at,
            content: correctedContent.trim(),
            justification: editing.justification,
            expected_version: editing.version,
            correction_reason: correctionReason.trim(),
          }),
        },
      )
      if (response.status === 401) onSessionExpired?.()
      const body = (await response.json()) as ProfessionalRecord & {
        message?: string
      }
      if (!response.ok)
        throw new Error(body.message ?? "Não foi possível corrigir o registro.")
      setRecords((current) =>
        current.map((record) => (record.id === editing.id ? body : record)),
      )
      setEditing(null)
      setCorrectedContent("")
      setCorrectionReason("")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível corrigir o registro.",
      )
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="professional-records-title">
      <div>
        <h2 id="professional-records-title" className="font-bold text-gray-900">
          Registros profissionais
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Consultas são registros realizados, não agendamentos. Recomendações
          não são receitas nem diagnósticos.
        </p>
      </div>

      {canCreate && (
        <form
          onSubmit={(event) => void publish(event)}
          className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2"
          style={{ borderColor: "var(--border)" }}
        >
          <label className="text-sm font-medium text-gray-700">
            Tipo de registro
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as ProfessionalRecord["kind"])
              }
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
            >
              {allowedKinds.map((value) => (
                <option key={value} value={value}>
                  {kindLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Data e hora
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
              required
            />
          </label>
          <div className="text-sm font-medium text-gray-700 sm:col-span-2">
            <label htmlFor="professional-record-content">Conteúdo</label>
            <textarea
              id="professional-record-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
              required
            />
            <ClinicalDictation
              patientId={patientId!}
              category={
                kind === "recommendation" ? "recomendações" : "consultas"
              }
              operation="anexar"
              onDraft={setContent}
              onSessionExpired={onSessionExpired}
            />
          </div>
          <label className="text-sm font-medium text-gray-700">
            Justificativa
            <input
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              minLength={10}
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
              required
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Código do autenticador
            <input
              value={totpCode}
              onChange={(event) =>
                setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-xl border px-3 py-2.5 tracking-widest"
              required
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
            style={{ background: "var(--primary)" }}
          >
            {saving ? "Publicando..." : "Publicar registro"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando registros profissionais...</p>
      ) : visible.length === 0 ? (
        <p>Nenhum registro profissional.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((record) => (
            <li
              key={record.id}
              className="rounded-2xl border bg-white p-5"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase text-teal-700">
                    {kindLabels[record.kind]}
                  </span>
                  <p className="text-sm font-semibold text-gray-900">
                    {record.author.name} · {record.author.specialty}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(record.occurred_at).toLocaleString("pt-BR")} · v
                  {record.version}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                {record.content}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Justificativa: {record.justification}
              </p>
              {patientId && operations.includes("atualizar") && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(record)
                    setCorrectedContent(record.content)
                    setCorrectionReason("")
                  }}
                  className="mt-3 text-sm font-semibold text-teal-700"
                >
                  Corrigir
                </button>
              )}
              {editing?.id === record.id && (
                <form
                  onSubmit={(event) => void correct(event)}
                  className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-4"
                >
                  <div className="text-sm font-medium text-gray-700">
                    <label htmlFor={`corrected-record-${record.id}`}>
                      Conteúdo corrigido
                    </label>
                    <textarea
                      id={`corrected-record-${record.id}`}
                      value={correctedContent}
                      onChange={(event) =>
                        setCorrectedContent(event.target.value)
                      }
                      rows={3}
                      className="mt-1 w-full rounded-xl border px-3 py-2.5"
                      required
                    />
                    <ClinicalDictation
                      patientId={patientId!}
                      category={
                        editing.kind === "recommendation"
                          ? "recomendações"
                          : "consultas"
                      }
                      operation="atualizar"
                      onDraft={setCorrectedContent}
                      onSessionExpired={onSessionExpired}
                    />
                  </div>
                  <label className="text-sm font-medium text-gray-700">
                    Motivo da correção
                    <input
                      value={correctionReason}
                      onChange={(event) =>
                        setCorrectionReason(event.target.value)
                      }
                      minLength={3}
                      className="mt-1 w-full rounded-xl border px-3 py-2.5"
                      required
                    />
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                      style={{ background: "var(--primary)" }}
                    >
                      Salvar nova versão
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-sm text-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
