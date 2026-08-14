import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import PatientProfile from "./PatientProfile"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("patient loads and ends an owned active session", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "11111111-1111-4111-8111-111111111111",
            current: true,
            created_at: "2026-08-13T20:00:00Z",
            last_used_at: "2026-08-13T21:00:00Z",
            expires_at: "2026-08-14T04:00:00Z",
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            current: false,
            created_at: "2026-08-13T19:00:00Z",
            last_used_at: "2026-08-13T20:30:00Z",
            expires_at: "2026-08-14T03:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  render(<PatientProfile onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await user.click(screen.getByRole("button", { name: "Segurança" }))
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/sessions",
    expect.objectContaining({ credentials: "same-origin" }),
  )
  expect(await screen.findByText("Este dispositivo")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Encerrar sessão" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/sessions/22222222-2222-4222-8222-222222222222",
    expect.objectContaining({
      method: "DELETE",
      headers: { "X-CSRF-Token": "session-csrf-token" },
    }),
  )
  expect(
    screen.queryByRole("button", { name: "Encerrar sessão" }),
  ).not.toBeInTheDocument()
})

test("patient changes password after a TOTP step-up", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "33333333-3333-4333-8333-333333333333",
          expires_at: "2026-08-13T22:05:00Z",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  render(<PatientProfile onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await user.click(screen.getByRole("button", { name: "Segurança" }))
  await user.type(
    screen.getByLabelText("Senha atual"),
    "senha atual segura 2026",
  )
  await user.type(
    screen.getByLabelText("Nova senha"),
    "nova senha muito segura 2026",
  )
  await user.type(
    screen.getByLabelText("Confirmar nova senha"),
    "nova senha muito segura 2026",
  )
  await user.type(screen.getByLabelText("TOTP adicional"), "123456")
  await user.click(screen.getByRole("button", { name: "Atualizar senha" }))

  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    2,
    "/api/v1/step-up-confirmations",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        action: "password_change",
        totp_code: "123456",
      }),
    }),
  )
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    3,
    "/api/v1/me/password",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({
        current_password: "senha atual segura 2026",
        new_password: "nova senha muito segura 2026",
        step_up_confirmation_id: "33333333-3333-4333-8333-333333333333",
      }),
    }),
  )
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Senha atualizada com segurança.",
  )
})
