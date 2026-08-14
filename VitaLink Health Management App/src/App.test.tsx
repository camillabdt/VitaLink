import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import App from "./App"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
  window.history.replaceState({}, "", "/")
})

test("password recovery e-mail link opens the reset form directly", () => {
  window.history.replaceState(
    {},
    "",
    "/reset-password?token=synthetic-password-reset-token-with-safe-length",
  )

  render(<App />)

  expect(screen.getByLabelText("Nova senha")).toBeInTheDocument()
  expect(
    screen.getByRole("heading", { name: "Crie uma nova senha" }),
  ).toBeInTheDocument()
})

test("patient logout revokes the server session before returning to login", async () => {
  const user = userEvent.setup()
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(null, {
        status: 204,
        headers: { "X-CSRF-Token": "session-csrf-token" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ role: "patient", status: "active" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  render(<App />)

  await user.type(screen.getByLabelText("E-mail"), "patient@example.com")
  await user.type(
    screen.getByLabelText("Senha"),
    "uma senha longa e segura 2026",
  )
  await user.type(screen.getByLabelText("Código do autenticador"), "123456")
  await user.click(screen.getByRole("button", { name: "Entrar" }))
  await user.click(await screen.findByRole("button", { name: "Sair" }))

  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    3,
    "/api/v1/sessions/current",
    expect.objectContaining({
      method: "DELETE",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": "session-csrf-token" },
    }),
  )
  expect(sessionStorage.getItem("vitallink.csrf")).toBeNull()
  expect(
    await screen.findByRole("heading", { name: "Bem-vindo de volta" }),
  ).toBeInTheDocument()
})
