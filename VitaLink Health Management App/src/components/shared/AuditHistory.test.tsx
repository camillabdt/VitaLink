import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import AuditHistory from "./AuditHistory"

afterEach(() => vi.restoreAllMocks())

test("loads the minimal account audit history on demand", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify([
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          event: "Acesso ao prontuário",
          status: "Concluído",
          created_at: "2026-08-14T10:00:00Z",
        },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  )
  render(<AuditHistory />)

  await user.click(
    screen.getByRole("button", { name: "Carregar histórico de acessos" }),
  )

  expect(await screen.findByText("Acesso ao prontuário")).toBeInTheDocument()
  expect(screen.getByText("Concluído")).toBeInTheDocument()
  expect(
    screen.queryByText(/actor|target|reason|metadata/i),
  ).not.toBeInTheDocument()
})

test("shows the persisted empty state", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  )
  render(<AuditHistory />)
  await user.click(
    screen.getByRole("button", { name: "Carregar histórico de acessos" }),
  )
  expect(
    await screen.findByText("Nenhum evento disponível."),
  ).toBeInTheDocument()
})

test("returns an expired audit session to authentication", async () => {
  const user = userEvent.setup()
  const onSessionExpired = vi.fn()
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Entre novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  )
  render(<AuditHistory onSessionExpired={onSessionExpired} />)

  await user.click(
    screen.getByRole("button", { name: "Carregar histórico de acessos" }),
  )

  expect(onSessionExpired).toHaveBeenCalledOnce()
  expect(await screen.findByRole("alert")).toHaveTextContent("Entre novamente.")
})
