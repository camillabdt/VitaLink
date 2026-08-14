import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import LoginPage from "./LoginPage"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("patient enters with password and TOTP through the public API", async () => {
  const user = userEvent.setup()
  const onNavigate = vi.fn()
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, {
      status: 204,
      headers: { "X-CSRF-Token": "session-csrf-token" },
    }),
  )
  render(<LoginPage onNavigate={onNavigate} />)

  await user.type(screen.getByLabelText("E-mail"), "patient@example.com")
  await user.type(
    screen.getByLabelText("Senha"),
    "uma senha longa e segura 2026",
  )
  await user.type(screen.getByLabelText("Código do autenticador"), "123456")
  await user.click(screen.getByRole("button", { name: "Entrar" }))

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/sessions",
    expect.objectContaining({ method: "POST", credentials: "same-origin" }),
  )
  expect(onNavigate).toHaveBeenCalledWith("patient-dashboard", "patient")
  expect(sessionStorage.getItem("vitallink.csrf")).toBe("session-csrf-token")
  expect(
    screen.queryByRole("button", { name: "Google" }),
  ).not.toBeInTheDocument()
  expect(screen.queryByText(/biometria/i)).not.toBeInTheDocument()
})

test("patient sees a safe message when login attempts are limited", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 429, headers: { "Retry-After": "30" } }),
  )
  render(<LoginPage onNavigate={vi.fn()} />)

  await user.type(screen.getByLabelText("E-mail"), "patient@example.com")
  await user.type(
    screen.getByLabelText("Senha"),
    "uma senha longa e segura 2026",
  )
  await user.type(screen.getByLabelText("Código do autenticador"), "123456")
  await user.click(screen.getByRole("button", { name: "Entrar" }))

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Aguarde antes de tentar novamente.",
  )
})
