import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import PersonalObservations from "./PersonalObservations"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("patient creates a persisted personal observation with explicit authorship", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          text: "Senti mais disposição após a caminhada.",
          author: "patient",
          created_at: "2026-08-14T06:00:00Z",
          version: 1,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    )

  render(<PersonalObservations onSessionExpired={vi.fn()} />)

  expect(
    await screen.findByText("Nenhuma observação pessoal registrada."),
  ).toBeInTheDocument()
  await user.type(
    screen.getByLabelText("Nova observação pessoal"),
    "Senti mais disposição após a caminhada.",
  )
  await user.click(screen.getByRole("button", { name: "Salvar observação" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/personal-observations",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ text: "Senti mais disposição após a caminhada." }),
    }),
  )
  expect(await screen.findByText(/Escrita por você/)).toBeInTheDocument()
  expect(screen.queryByText(/consulta|diagnóstico/i)).not.toBeInTheDocument()
})

test("patient corrects an observation using the visible version", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  const original = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    text: "Observação original.",
    author: "patient",
    created_at: "2026-08-14T06:00:00Z",
    version: 1,
  }
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify([original]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...original,
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          text: "Observação corrigida.",
          version: 2,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

  render(<PersonalObservations onSessionExpired={vi.fn()} />)

  await user.click(await screen.findByRole("button", { name: "Corrigir" }))
  const correction = screen.getByLabelText("Correção da observação")
  await user.clear(correction)
  await user.type(correction, "Observação corrigida.")
  await user.click(screen.getByRole("button", { name: "Salvar correção" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/personal-observations/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({
        text: "Observação corrigida.",
        expected_version: 1,
      }),
    }),
  )
  expect(await screen.findByText("Observação corrigida.")).toBeInTheDocument()
  expect(screen.getByText(/versão 2/)).toBeInTheDocument()
})

test("expired session leaves no observation content visible", async () => {
  const onSessionExpired = vi.fn()
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(null, { status: 401 }),
  )

  render(<PersonalObservations onSessionExpired={onSessionExpired} />)

  expect(
    await screen.findByText("Nenhuma observação pessoal registrada."),
  ).toBeInTheDocument()
  expect(onSessionExpired).toHaveBeenCalledOnce()
})
