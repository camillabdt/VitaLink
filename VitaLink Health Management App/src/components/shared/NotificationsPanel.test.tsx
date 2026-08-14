import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import NotificationsPanel from "./NotificationsPanel"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("lists owned notifications and persists an individual read", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  const unread = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    kind: "document_available",
    created_at: "2026-08-14T10:00:00Z",
    read_at: null,
  }
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify([unread]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...unread, read_at: "2026-08-14T10:05:00Z" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    )

  render(<NotificationsPanel />)
  await user.click(screen.getByRole("button", { name: "Abrir notificações" }))
  expect(await screen.findByText("Documento disponível")).toBeInTheDocument()
  expect(screen.getByText("1 não lida")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Marcar como lida" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    expect.objectContaining({
      method: "PATCH",
      headers: { "X-CSRF-Token": "csrf-token" },
    }),
  )
  expect(screen.queryByText("1 não lida")).not.toBeInTheDocument()
})

test("shows empty state and returns an expired session", async () => {
  const user = userEvent.setup()
  const onSessionExpired = vi.fn()
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Entre novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  )
  render(<NotificationsPanel onSessionExpired={onSessionExpired} />)

  await user.click(screen.getByRole("button", { name: "Abrir notificações" }))

  expect(onSessionExpired).toHaveBeenCalledOnce()
  expect(await screen.findByRole("alert")).toHaveTextContent("Entre novamente.")
})
