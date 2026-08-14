import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface ClinicalResult {
  id: string
  exam_name: string
  value: number
  unit: string
  measured_at: string
  origin: string
  reference_min: number
  reference_max: number
  confirmed: boolean
  range_position: "below" | "within" | "above"
  author: "patient" | "professional"
  version: number
  created_at: string
}

interface ResultInput {
  exam_name: string
  value: string
  unit: string
  measured_at: string
  origin: string
  reference_min: string
  reference_max: string
}

const emptyResult = (): ResultInput => ({
  exam_name: "",
  value: "",
  unit: "",
  measured_at: new Date().toISOString().slice(0, 10),
  origin: "",
  reference_min: "",
  reference_max: "",
})

const positionLabels = {
  below: "Abaixo",
  within: "Dentro",
  above: "Acima",
}

export function ClinicalResultForm({
  onSaved,
  patientId,
}: {
  onSaved: (results: ClinicalResult[]) => void
  patientId?: string
}) {
  const [rows, setRows] = useState<ResultInput[]>([emptyResult()])
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const updateRow = (
    index: number,
    field: keyof ResultInput,
    value: string,
  ) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    )
  }

  const save = async () => {
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken || !confirmed) {
      setError("Confirme os resultados antes de salvar.")
      return
    }
    if (
      rows.some(
        (row) =>
          !row.exam_name.trim() ||
          !row.unit.trim() ||
          !row.measured_at ||
          !row.origin.trim() ||
          !row.value.trim() ||
          !row.reference_min.trim() ||
          !row.reference_max.trim() ||
          !Number.isFinite(Number(row.value)) ||
          !Number.isFinite(Number(row.reference_min)) ||
          !Number.isFinite(Number(row.reference_max)) ||
          Number(row.reference_min) > Number(row.reference_max),
      )
    ) {
      setError("Preencha os campos e confira o intervalo de referência.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const saved: ClinicalResult[] = []
      for (const row of rows) {
        const response = await fetch("/api/v1/clinical-results", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            ...row,
            confirmed: true,
            patient_id: patientId,
          }),
        })
        const body = (await response.json()) as ClinicalResult & {
          message?: string
        }
        if (!response.ok)
          throw new Error(body.message ?? "Revise os campos informados.")
        saved.push(body)
      }
      setRows([emptyResult()])
      setConfirmed(false)
      onSaved(saved)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar os resultados.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="manual-results-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="manual-results-title" className="font-bold text-gray-900">
            Resultados estruturados
          </h2>
          <p className="text-xs text-gray-500">
            Registre somente valores conferidos no documento de origem.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyResult()])}
          className="text-sm font-semibold"
          style={{ color: "var(--primary)" }}
        >
          + Adicionar linha
        </button>
      </div>

      {rows.map((row, index) => (
        <fieldset
          key={index}
          className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ borderColor: "var(--border)" }}
        >
          <legend className="px-2 text-xs font-semibold text-gray-500">
            Resultado {index + 1}
          </legend>
          <ResultField
            label="Exame"
            value={row.exam_name}
            onChange={(value) => updateRow(index, "exam_name", value)}
          />
          <ResultField
            label="Valor"
            type="number"
            value={row.value}
            onChange={(value) => updateRow(index, "value", value)}
          />
          <ResultField
            label="Unidade"
            value={row.unit}
            onChange={(value) => updateRow(index, "unit", value)}
          />
          <ResultField
            label="Data"
            type="date"
            value={row.measured_at}
            onChange={(value) => updateRow(index, "measured_at", value)}
          />
          <ResultField
            label="Origem"
            value={row.origin}
            onChange={(value) => updateRow(index, "origin", value)}
          />
          <ResultField
            label="Referência mínima"
            type="number"
            value={row.reference_min}
            onChange={(value) => updateRow(index, "reference_min", value)}
          />
          <ResultField
            label="Referência máxima"
            type="number"
            value={row.reference_max}
            onChange={(value) => updateRow(index, "reference_max", value)}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setRows((current) =>
                  current.filter((_, rowIndex) => rowIndex !== index),
                )
              }
              className="self-end rounded-xl border px-3 py-2 text-sm text-red-600"
              style={{ borderColor: "var(--border)" }}
            >
              Remover linha {index + 1}
            </button>
          )}
        </fieldset>
      ))}

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Confirmo que conferi valores, unidades, data, origem e referências.
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--primary)" }}
      >
        {saving ? "Salvando..." : "Salvar resultados confirmados"}
      </button>
    </section>
  )
}

function ResultField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="text-xs font-semibold text-gray-600">
      {label}
      <input
        required
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border px-3 py-2 text-sm font-normal text-gray-900"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  )
}

export default function ClinicalResults({
  mode,
  patientId,
  onSessionExpired,
}: {
  mode: "history" | "charts"
  patientId?: string
  onSessionExpired?: () => void
}) {
  const [results, setResults] = useState<ClinicalResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<ClinicalResult | null>(null)
  const [correctedValue, setCorrectedValue] = useState("")
  const [correctionReason, setCorrectionReason] = useState("")

  useEffect(() => {
    const query = patientId
      ? `?patient_id=${encodeURIComponent(patientId)}`
      : ""
    fetch(`/api/v1/clinical-results${query}`, { credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) onSessionExpired?.()
        if (!response.ok)
          throw new Error("Não foi possível carregar os resultados.")
        return (await response.json()) as ClinicalResult[]
      })
      .then(setResults)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [onSessionExpired, patientId])

  const series = useMemo(() => {
    const grouped = new Map<string, ClinicalResult[]>()
    for (const result of results) {
      const key = `${result.exam_name}\u0000${result.unit}`
      grouped.set(key, [...(grouped.get(key) ?? []), result])
    }
    return [...grouped.values()].map((items) =>
      items.sort((left, right) =>
        left.measured_at.localeCompare(right.measured_at),
      ),
    )
  }, [results])

  if (loading) return <p role="status">Carregando resultados...</p>
  if (error) return <p role="alert">{error}</p>
  if (results.length === 0) return <p>Nenhum resultado confirmado.</p>

  if (mode === "history") {
    return (
      <div className="space-y-4">
        <div
          className="overflow-x-auto rounded-2xl border bg-white"
          style={{ borderColor: "var(--border)" }}
        >
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                {[
                  "Exame",
                  "Valor",
                  "Referência",
                  "Posição",
                  "Data",
                  "Origem",
                  "Ação",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr
                  key={result.id}
                  className="border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-4 py-3 text-sm font-semibold">
                    {result.exam_name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {result.value} {result.unit}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {result.reference_min}–{result.reference_max} {result.unit}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {positionLabels[result.range_position]}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(
                      `${result.measured_at}T12:00:00`,
                    ).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-sm">{result.origin}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(result)
                        setCorrectedValue(String(result.value))
                        setCorrectionReason("")
                      }}
                      className="text-sm font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      Corrigir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing && (
          <form
            className="rounded-2xl border bg-white p-4"
            style={{ borderColor: "var(--border)" }}
            onSubmit={(event) => {
              event.preventDefault()
              const csrfToken = sessionStorage.getItem("vitallink.csrf")
              if (!csrfToken) return
              void fetch(`/api/v1/clinical-results/${editing.id}`, {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                  "Content-Type": "application/json",
                  "X-CSRF-Token": csrfToken,
                },
                body: JSON.stringify({
                  exam_name: editing.exam_name,
                  value: correctedValue,
                  unit: editing.unit,
                  measured_at: editing.measured_at,
                  reference_min: editing.reference_min,
                  reference_max: editing.reference_max,
                  confirmed: true,
                  expected_version: editing.version,
                  correction_reason: correctionReason,
                }),
              })
                .then(async (response) => {
                  const body = (await response.json()) as ClinicalResult & {
                    message?: string
                  }
                  if (!response.ok)
                    throw new Error(
                      body.message ?? "Não foi possível corrigir o resultado.",
                    )
                  setResults((current) =>
                    current.map((result) =>
                      result.id === editing.id ? body : result,
                    ),
                  )
                  setEditing(null)
                })
                .catch((caught: Error) => setError(caught.message))
            }}
          >
            <h3 className="font-semibold text-gray-900">
              Corrigir {editing.exam_name}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              A origem e a autoria serão preservadas na nova versão.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ResultField
                label={`Valor em ${editing.unit}`}
                type="number"
                value={correctedValue}
                onChange={setCorrectedValue}
              />
              <ResultField
                label="Motivo da correção"
                value={correctionReason}
                onChange={setCorrectionReason}
              />
            </div>
            <div className="mt-3 flex gap-3">
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
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {series.map((items) => {
        const latest = items.at(-1)!
        return (
          <section
            key={`${latest.exam_name}-${latest.unit}`}
            className="rounded-2xl border bg-white p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-gray-900">{latest.exam_name}</h3>
            <p className="mb-4 text-xs text-gray-500">
              Unidade: {latest.unit} · origem e referência por ponto
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={items}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="measured_at" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <ReferenceLine
                  y={latest.reference_min}
                  stroke="#3B82F6"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={latest.reference_max}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={latest.unit}
                  stroke="#0E9F8A"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        )
      })}
    </div>
  )
}
