import { useEffect, useState } from "react"
import ClinicalDictation from "./ClinicalDictation"

interface Author {
  name: string
  specialty: string
}

interface ClinicalGoal {
  id: string
  exam_name: string
  minimum: number
  maximum: number
  unit: string
  justification: string
  effective_at: string
  author: Author
  version: number
  created_at: string
}

interface FollowUpStatus {
  id: string
  status: string
  justification: string
  recorded_at: string
  author: Author
  version: number
  created_at: string
}

interface Props {
  patientId?: string
  categories?: string[]
  operations?: string[]
  onSessionExpired?: () => void
}

const emptyGoal = {
  examName: "",
  minimum: "",
  maximum: "",
  unit: "",
  justification: "",
  effectiveAt: "",
  totp: "",
}

export default function ClinicalGoals({
  patientId,
  categories = [],
  operations = [],
  onSessionExpired,
}: Props) {
  const [goals, setGoals] = useState<ClinicalGoal[]>([])
  const [followUps, setFollowUps] = useState<FollowUpStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [goalForm, setGoalForm] = useState(emptyGoal)
  const [followUpForm, setFollowUpForm] = useState({
    status: "",
    justification: "",
    recordedAt: "",
    totp: "",
  })
  const [editingGoal, setEditingGoal] = useState<ClinicalGoal | null>(null)
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpStatus | null>(
    null,
  )
  const [correction, setCorrection] = useState({
    status: "",
    minimum: "",
    maximum: "",
    unit: "",
    justification: "",
    date: "",
    reason: "",
    totp: "",
  })

  const hasCategory = !patientId || categories.includes("metas")
  const canCreate = Boolean(
    patientId && hasCategory && operations.includes("anexar"),
  )
  const canCorrect = Boolean(
    patientId && hasCategory && operations.includes("atualizar"),
  )

  useEffect(() => {
    const query = patientId
      ? `?patient_id=${encodeURIComponent(patientId)}`
      : ""
    const load = async <T,>(path: string): Promise<T[]> => {
      const response = await fetch(`/api/v1/${path}${query}`, {
        credentials: "same-origin",
      })
      if (response.status === 401) onSessionExpired?.()
      if (!response.ok)
        throw new Error("Não foi possível carregar metas e acompanhamento.")
      return (await response.json()) as T[]
    }
    Promise.allSettled([
      load<ClinicalGoal>("clinical-goals"),
      load<FollowUpStatus>("follow-up-statuses"),
    ])
      .then(([loadedGoals, loadedFollowUps]) => {
        if (loadedGoals.status === "fulfilled") setGoals(loadedGoals.value)
        if (loadedFollowUps.status === "fulfilled")
          setFollowUps(loadedFollowUps.value)
        if (
          loadedGoals.status === "rejected" ||
          loadedFollowUps.status === "rejected"
        )
          setError("Não foi possível carregar metas e acompanhamento.")
      })
      .finally(() => setLoading(false))
  }, [onSessionExpired, patientId])

  const confirmTotp = async (totp: string): Promise<string> => {
    const csrf = sessionStorage.getItem("vitallink.csrf")
    if (!csrf || !/^\d{6}$/.test(totp))
      throw new Error("Informe um TOTP válido.")
    const response = await fetch("/api/v1/step-up-confirmations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ action: "clinical_goal_write", totp_code: totp }),
    })
    if (response.status === 401) onSessionExpired?.()
    if (!response.ok) throw new Error("Não foi possível confirmar o TOTP.")
    return ((await response.json()) as { id: string }).id
  }

  const write = async <T,>(
    path: string,
    method: "POST" | "PATCH",
    body: object,
  ): Promise<T> => {
    const csrf = sessionStorage.getItem("vitallink.csrf")
    if (!csrf) throw new Error("Recarregue a página para validar esta ação.")
    const response = await fetch(`/api/v1/${path}`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body),
    })
    if (response.status === 401) onSessionExpired?.()
    const result = (await response.json()) as T & { message?: string }
    if (!response.ok)
      throw new Error(result.message ?? "Não foi possível salvar.")
    return result
  }

  const addGoal = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      const proof = await confirmTotp(goalForm.totp)
      const created = await write<ClinicalGoal>("clinical-goals", "POST", {
        patient_id: patientId,
        exam_name: goalForm.examName.trim(),
        minimum: Number(goalForm.minimum),
        maximum: Number(goalForm.maximum),
        unit: goalForm.unit.trim(),
        justification: goalForm.justification.trim(),
        effective_at: goalForm.effectiveAt,
        step_up_confirmation_id: proof,
      })
      setGoals((current) => [created, ...current])
      setGoalForm(emptyGoal)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível salvar.",
      )
    } finally {
      setSaving(false)
    }
  }

  const addFollowUp = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      const proof = await confirmTotp(followUpForm.totp)
      const created = await write<FollowUpStatus>(
        "follow-up-statuses",
        "POST",
        {
          patient_id: patientId,
          status: followUpForm.status.trim(),
          justification: followUpForm.justification.trim(),
          recorded_at: followUpForm.recordedAt,
          step_up_confirmation_id: proof,
        },
      )
      setFollowUps((current) => [created, ...current])
      setFollowUpForm({
        status: "",
        justification: "",
        recordedAt: "",
        totp: "",
      })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível salvar.",
      )
    } finally {
      setSaving(false)
    }
  }

  const beginGoalCorrection = (goal: ClinicalGoal) => {
    setEditingGoal(goal)
    setEditingFollowUp(null)
    setCorrection({
      status: "",
      minimum: String(goal.minimum),
      maximum: String(goal.maximum),
      unit: goal.unit,
      justification: goal.justification,
      date: goal.effective_at,
      reason: "",
      totp: "",
    })
  }

  const beginFollowUpCorrection = (followUp: FollowUpStatus) => {
    setEditingFollowUp(followUp)
    setEditingGoal(null)
    setCorrection({
      status: followUp.status,
      minimum: "",
      maximum: "",
      unit: "",
      justification: followUp.justification,
      date: followUp.recorded_at,
      reason: "",
      totp: "",
    })
  }

  const saveCorrection = async (event: React.FormEvent) => {
    event.preventDefault()
    const current = editingGoal ?? editingFollowUp
    if (!current) return
    setSaving(true)
    setError("")
    try {
      const proof = await confirmTotp(correction.totp)
      if (editingGoal) {
        const updated = await write<ClinicalGoal>(
          `clinical-goals/${editingGoal.id}`,
          "PATCH",
          {
            minimum: Number(correction.minimum),
            maximum: Number(correction.maximum),
            unit: correction.unit.trim(),
            justification: correction.justification.trim(),
            effective_at: correction.date,
            expected_version: editingGoal.version,
            correction_reason: correction.reason.trim(),
            step_up_confirmation_id: proof,
          },
        )
        setGoals((values) =>
          values.map((value) =>
            value.id === editingGoal.id ? updated : value,
          ),
        )
      } else if (editingFollowUp) {
        const updated = await write<FollowUpStatus>(
          `follow-up-statuses/${editingFollowUp.id}`,
          "PATCH",
          {
            status: correction.status.trim(),
            justification: correction.justification.trim(),
            recorded_at: correction.date,
            expected_version: editingFollowUp.version,
            correction_reason: correction.reason.trim(),
            step_up_confirmation_id: proof,
          },
        )
        setFollowUps((values) =>
          values.map((value) =>
            value.id === editingFollowUp.id ? updated : value,
          ),
        )
      }
      setEditingGoal(null)
      setEditingFollowUp(null)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível corrigir.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="space-y-5 rounded-2xl border bg-white p-6"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Metas e acompanhamento
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Metas permanecem separadas por profissional; o acompanhamento é
          informado manualmente.
        </p>
      </div>
      {loading && (
        <p role="status" className="text-sm text-gray-500">
          Carregando metas e acompanhamento...
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold text-gray-900">Metas clínicas</h3>
            {goals.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                Nenhuma meta clínica.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {goals.map((goal) => (
                  <li key={goal.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {goal.exam_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {goal.minimum} a {goal.maximum} {goal.unit}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        v{goal.version}
                      </span>
                    </div>
                    <div
                      role="meter"
                      aria-label={`Meta de ${goal.exam_name}`}
                      aria-valuetext={`${goal.minimum} a ${goal.maximum} ${goal.unit}`}
                      className="mt-3 h-2 rounded-full bg-teal-100"
                    >
                      <div className="h-2 w-2/3 rounded-full bg-teal-600" />
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                      {goal.justification}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {goal.author.name} · {goal.author.specialty} ·{" "}
                      {formatDate(goal.effective_at)}
                    </p>
                    {canCorrect && (
                      <button
                        type="button"
                        onClick={() => beginGoalCorrection(goal)}
                        className="mt-3 text-sm font-semibold text-teal-700"
                      >
                        Corrigir meta
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Acompanhamento manual
            </h3>
            {followUps.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                Nenhum acompanhamento informado.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {followUps.map((followUp) => (
                  <li key={followUp.id} className="rounded-xl border p-4">
                    <p className="font-medium text-gray-900">
                      {followUp.status}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {followUp.justification}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {followUp.author.name} · {followUp.author.specialty} ·{" "}
                      {formatDate(followUp.recorded_at)} · v{followUp.version}
                    </p>
                    {canCorrect && (
                      <button
                        type="button"
                        onClick={() => beginFollowUpCorrection(followUp)}
                        className="mt-3 text-sm font-semibold text-teal-700"
                      >
                        Corrigir acompanhamento
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {canCreate && (
        <div className="grid gap-5 border-t pt-5 lg:grid-cols-2">
          <form onSubmit={addGoal} className="space-y-3">
            <h3 className="font-semibold text-gray-900">Adicionar meta</h3>
            <TextField
              label="Exame da meta"
              value={goalForm.examName}
              onChange={(examName) => setGoalForm({ ...goalForm, examName })}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Limite mínimo"
                type="number"
                value={goalForm.minimum}
                onChange={(minimum) => setGoalForm({ ...goalForm, minimum })}
              />
              <TextField
                label="Limite máximo"
                type="number"
                value={goalForm.maximum}
                onChange={(maximum) => setGoalForm({ ...goalForm, maximum })}
              />
            </div>
            <TextField
              label="Unidade"
              value={goalForm.unit}
              onChange={(unit) => setGoalForm({ ...goalForm, unit })}
            />
            <TextField
              label="Justificativa da meta"
              value={goalForm.justification}
              onChange={(justification) =>
                setGoalForm({ ...goalForm, justification })
              }
              minLength={10}
            />
            <ClinicalDictation
              patientId={patientId!}
              category="metas"
              operation="anexar"
              onDraft={(justification) =>
                setGoalForm({ ...goalForm, justification })
              }
              onSessionExpired={onSessionExpired}
            />
            <TextField
              label="Data de vigência"
              type="date"
              value={goalForm.effectiveAt}
              onChange={(effectiveAt) =>
                setGoalForm({ ...goalForm, effectiveAt })
              }
            />
            <TextField
              label="TOTP da meta"
              inputMode="numeric"
              value={goalForm.totp}
              onChange={(totp) => setGoalForm({ ...goalForm, totp })}
              pattern="[0-9]{6}"
            />
            <SubmitButton disabled={saving}>Adicionar meta</SubmitButton>
          </form>
          <form onSubmit={addFollowUp} className="space-y-3">
            <h3 className="font-semibold text-gray-900">
              Informar acompanhamento
            </h3>
            <TextField
              label="Estado manual"
              value={followUpForm.status}
              onChange={(status) =>
                setFollowUpForm({ ...followUpForm, status })
              }
            />
            <TextField
              label="Justificativa do acompanhamento"
              value={followUpForm.justification}
              onChange={(justification) =>
                setFollowUpForm({ ...followUpForm, justification })
              }
              minLength={10}
            />
            <TextField
              label="Data do acompanhamento"
              type="date"
              value={followUpForm.recordedAt}
              onChange={(recordedAt) =>
                setFollowUpForm({ ...followUpForm, recordedAt })
              }
            />
            <TextField
              label="TOTP do acompanhamento"
              inputMode="numeric"
              value={followUpForm.totp}
              onChange={(totp) => setFollowUpForm({ ...followUpForm, totp })}
              pattern="[0-9]{6}"
            />
            <SubmitButton disabled={saving}>
              Registrar acompanhamento
            </SubmitButton>
          </form>
        </div>
      )}

      {(editingGoal || editingFollowUp) && (
        <form onSubmit={saveCorrection} className="space-y-3 border-t pt-5">
          <h3 className="font-semibold text-gray-900">Nova versão</h3>
          {editingGoal ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                label="Mínimo corrigido"
                type="number"
                value={correction.minimum}
                onChange={(minimum) =>
                  setCorrection({ ...correction, minimum })
                }
              />
              <TextField
                label="Máximo corrigido"
                type="number"
                value={correction.maximum}
                onChange={(maximum) =>
                  setCorrection({ ...correction, maximum })
                }
              />
              <TextField
                label="Unidade corrigida"
                value={correction.unit}
                onChange={(unit) => setCorrection({ ...correction, unit })}
              />
            </div>
          ) : (
            <TextField
              label="Estado corrigido"
              value={correction.status}
              onChange={(status) => setCorrection({ ...correction, status })}
            />
          )}
          <TextField
            label="Justificativa corrigida"
            value={correction.justification}
            onChange={(justification) =>
              setCorrection({ ...correction, justification })
            }
            minLength={10}
          />
          <ClinicalDictation
            patientId={patientId!}
            category="metas"
            operation="atualizar"
            onDraft={(justification) =>
              setCorrection({ ...correction, justification })
            }
            onSessionExpired={onSessionExpired}
          />
          <TextField
            label="Data corrigida"
            type="date"
            value={correction.date}
            onChange={(date) => setCorrection({ ...correction, date })}
          />
          <TextField
            label="Motivo da correção"
            value={correction.reason}
            onChange={(reason) => setCorrection({ ...correction, reason })}
            minLength={3}
          />
          <TextField
            label="TOTP da correção"
            inputMode="numeric"
            value={correction.totp}
            onChange={(totp) => setCorrection({ ...correction, totp })}
            pattern="[0-9]{6}"
          />
          <SubmitButton disabled={saving}>
            {editingGoal ? "Salvar meta" : "Salvar acompanhamento"}
          </SubmitButton>
        </form>
      )}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  minLength,
  pattern,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  minLength?: number
  pattern?: string
  inputMode?: "numeric"
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        aria-label={label}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={minLength}
        pattern={pattern}
        inputMode={inputMode}
        step={type === "number" ? "any" : undefined}
        required
        className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
      />
    </label>
  )
}

function SubmitButton({
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
      {disabled ? "Salvando..." : children}
    </button>
  )
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
}
