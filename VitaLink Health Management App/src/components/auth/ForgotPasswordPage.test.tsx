import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import ForgotPasswordPage from "./ForgotPasswordPage"

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, "", "/")
})

test("patient requests password recovery through the generic public endpoint", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        message:
          "Se a conta puder ser recuperada, enviaremos as instruções por e-mail.",
      }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    ),
  )
  render(<ForgotPasswordPage onNavigate={vi.fn()} />)

  await user.type(screen.getByLabelText("E-mail"), "patient@example.com")
  await user.click(
    screen.getByRole("button", { name: "Enviar link de redefinição" }),
  )

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/password-recovery-requests",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "patient@example.com" }),
    }),
  )
  expect(
    await screen.findByRole("heading", { name: "Verifique seu e-mail" }),
  ).toBeInTheDocument()
  expect(screen.queryByText("patient@example.com")).not.toBeInTheDocument()
})

test("patient concludes password reset from the e-mail token", async () => {
  const user = userEvent.setup()
  window.history.replaceState(
    {},
    "",
    "/reset-password?token=synthetic-password-reset-token-with-safe-length",
  )
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 204 }),
  )
  render(<ForgotPasswordPage onNavigate={vi.fn()} />)

  await user.type(
    screen.getByLabelText("Nova senha"),
    "uma nova senha longa e segura 2026",
  )
  await user.type(
    screen.getByLabelText("Confirmar nova senha"),
    "uma nova senha longa e segura 2026",
  )
  await user.click(screen.getByRole("button", { name: "Redefinir senha" }))

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/password-resets",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        token: "synthetic-password-reset-token-with-safe-length",
        new_password: "uma nova senha longa e segura 2026",
      }),
    }),
  )
  expect(
    await screen.findByRole("heading", { name: "Senha redefinida" }),
  ).toBeInTheDocument()
})

test("patient requests reinforced recovery after losing the authenticator", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        message:
          "Se a conta puder ser recuperada, enviaremos as instruções por e-mail.",
      }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    ),
  )
  render(<ForgotPasswordPage onNavigate={vi.fn()} />)

  await user.click(
    screen.getByRole("button", { name: "Perdi acesso ao autenticador" }),
  )
  await user.type(screen.getByLabelText("E-mail"), "patient@example.com")
  await user.click(
    screen.getByRole("button", {
      name: "Enviar instruções de recuperação",
    }),
  )

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/totp-recovery-requests",
    expect.objectContaining({ method: "POST" }),
  )
  expect(
    await screen.findByRole("heading", { name: "Verifique seu e-mail" }),
  ).toBeInTheDocument()
})

test("patient completes reinforced recovery and enrolls a new authenticator", async () => {
  const user = userEvent.setup()
  window.history.replaceState(
    {},
    "",
    "/recover-totp?token=synthetic-totp-recovery-token-with-safe-length",
  )
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(null, {
        status: 204,
        headers: { "X-CSRF-Token": "activation-csrf-token" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          secret: "JBSWY3DPEHPK3PXP",
          provisioning_uri: "otpauth://totp/VitaLink:patient@example.com",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          recovery_codes: ["NEWCODE1", "NEWCODE2"],
          offline_recovery_key: "new-offline-recovery-key",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
  render(<ForgotPasswordPage onNavigate={vi.fn()} />)

  await user.type(
    screen.getByLabelText("Chave offline de recuperação"),
    "old-offline-recovery-key",
  )
  await user.click(
    screen.getByRole("button", { name: "Validar fatores de recuperação" }),
  )
  expect(await screen.findByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument()
  await user.type(
    screen.getByLabelText("Código do novo autenticador"),
    "123456",
  )
  await user.click(
    screen.getByRole("button", { name: "Ativar novo autenticador" }),
  )

  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    1,
    "/api/v1/totp-recoveries",
    expect.objectContaining({ method: "POST" }),
  )
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    2,
    "/api/v1/totp",
    expect.objectContaining({
      headers: expect.objectContaining({
        "X-CSRF-Token": "activation-csrf-token",
      }),
    }),
  )
  expect(
    await screen.findByRole("heading", { name: "Guarde seus novos códigos" }),
  ).toBeInTheDocument()
  expect(screen.getByText("new-offline-recovery-key")).toBeInTheDocument()
})
