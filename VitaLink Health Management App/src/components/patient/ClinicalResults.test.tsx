import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import ClinicalResults, { ClinicalResultForm } from "./ClinicalResults"
import type { ClinicalResult } from "./ClinicalResults"

const result = (changes: Partial<ClinicalResult> = {}): ClinicalResult => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  exam_name: "Glicemia em jejum",
  value: 95,
  unit: "mg/dL",
  measured_at: "2026-08-10",
  origin: "Laboratório sintético",
  reference_min: 70,
  reference_max: 99,
  confirmed: true,
  range_position: "within",
  author: "patient",
  version: 1,
  created_at: "2026-08-14T06:00:00Z",
  ...changes,
})

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("manual rows require confirmation and persist the real fields", async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(result()), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  )
  render(<ClinicalResultForm onSaved={onSaved} />)

  await user.type(screen.getByLabelText("Exame"), "Glicemia em jejum")
  await user.type(screen.getByLabelText("Valor"), "95")
  await user.type(screen.getByLabelText("Unidade"), "mg/dL")
  await user.type(screen.getByLabelText("Origem"), "Laboratório sintético")
  await user.type(screen.getByLabelText("Referência mínima"), "70")
  await user.type(screen.getByLabelText("Referência máxima"), "99")
  await user.click(screen.getByText(/Confirmo que conferi/))
  await user.click(
    screen.getByRole("button", { name: "Salvar resultados confirmados" }),
  )

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/clinical-results",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"confirmed":true'),
    }),
  )
  expect(onSaved).toHaveBeenCalledWith([result()])
})

test("manual rows reject incomplete data and can be added or removed", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  const fetchSpy = vi.spyOn(globalThis, "fetch")
  render(<ClinicalResultForm onSaved={vi.fn()} />)

  await user.click(screen.getByRole("button", { name: "+ Adicionar linha" }))
  expect(screen.getByText("Resultado 2")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Remover linha 2" }))
  expect(screen.queryByText("Resultado 2")).not.toBeInTheDocument()
  await user.click(screen.getByText(/Confirmo que conferi/))
  await user.click(
    screen.getByRole("button", { name: "Salvar resultados confirmados" }),
  )

  expect(screen.getByRole("alert")).toHaveTextContent("Preencha os campos")
  expect(fetchSpy).not.toHaveBeenCalled()
})

test("history corrects a result by creating the next visible version", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify([result()]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(result({ value: 80, version: 2 })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

  render(<ClinicalResults mode="history" />)
  await user.click(await screen.findByRole("button", { name: "Corrigir" }))
  const value = screen.getByLabelText("Valor em mg/dL")
  await user.clear(value)
  await user.type(value, "80")
  await user.type(
    screen.getByLabelText("Motivo da correção"),
    "Digitação sintética incorreta.",
  )
  await user.click(screen.getByRole("button", { name: "Salvar nova versão" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/clinical-results/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"expected_version":1'),
    }),
  )
  expect(await screen.findByText("80 mg/dL")).toBeInTheDocument()
})

test("charts keep equal exam names in separate unit series", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify([
        result(),
        result({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          value: 5.3,
          unit: "mmol/L",
        }),
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  )

  render(<ClinicalResults mode="charts" />)

  expect(
    await screen.findAllByRole("heading", { name: "Glicemia em jejum" }),
  ).toHaveLength(2)
  expect(screen.getByText(/Unidade: mg\/dL/)).toBeInTheDocument()
  expect(screen.getByText(/Unidade: mmol\/L/)).toBeInTheDocument()
  expect(screen.queryByText(/diagnóstico|prioridade/i)).not.toBeInTheDocument()
})

test("charts handle empty data and a single confirmed point", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([result()]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
  const empty = render(<ClinicalResults mode="charts" />)
  expect(
    await screen.findByText("Nenhum resultado confirmado."),
  ).toBeInTheDocument()
  empty.unmount()

  render(<ClinicalResults mode="charts" />)
  expect(
    await screen.findByRole("heading", { name: "Glicemia em jejum" }),
  ).toBeInTheDocument()
  expect(screen.getByText(/Unidade: mg\/dL/)).toBeInTheDocument()
})
