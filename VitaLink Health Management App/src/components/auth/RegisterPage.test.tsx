import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import RegisterPage from "./RegisterPage"

afterEach(() => vi.restoreAllMocks())

test("patient requests registration and sees the e-mail confirmation state", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        message:
          "Se os dados puderem ser cadastrados, enviaremos as instruções de confirmação.",
      }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    ),
  )
  render(<RegisterPage onNavigate={vi.fn()} />)

  await user.type(
    screen.getByPlaceholderText("Maria da Silva"),
    "Paciente Sintética",
  )
  await user.type(
    screen.getByPlaceholderText("seu@email.com"),
    "patient@example.com",
  )
  await user.type(screen.getByPlaceholderText("000.000.000-00"), "52998224725")
  await user.type(screen.getByLabelText("Data de nascimento"), "1992-08-13")
  await user.type(
    screen.getByPlaceholderText("(11) 99999-9999"),
    "+5553999999999",
  )
  await user.type(
    screen.getByPlaceholderText("Mínimo 12 caracteres"),
    "uma senha longa e segura 2026",
  )
  await user.type(
    screen.getByPlaceholderText("Repita a senha"),
    "uma senha longa e segura 2026",
  )
  await user.click(screen.getByRole("button", { name: "Criar conta" }))

  expect(globalThis.fetch).toHaveBeenCalled()
  expect(
    await screen.findByRole("heading", { name: "Confirme seu e-mail" }),
  ).toBeInTheDocument()
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/patient-registrations",
    expect.objectContaining({ method: "POST" }),
  )
})

test("patient confirms e-mail and activates TOTP before login", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("{}", { status: 202 }))
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
          recovery_codes: ["A1B2C3D4", "E5F6G7H8"],
          offline_recovery_key: "offline-recovery-key",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
  render(<RegisterPage onNavigate={vi.fn()} />)

  await fillPatientRegistration(user)
  await user.click(screen.getByRole("button", { name: "Criar conta" }))
  await user.type(
    await screen.findByLabelText("Código recebido por e-mail"),
    "123456",
  )
  await user.click(screen.getByRole("button", { name: "Confirmar e-mail" }))
  await user.type(
    await screen.findByLabelText("Código do autenticador"),
    "654321",
  )
  await user.click(screen.getByRole("button", { name: "Ativar proteção" }))

  expect(
    await screen.findByRole("heading", { name: "Guarde seus códigos" }),
  ).toBeInTheDocument()
  expect(screen.getByText("offline-recovery-key")).toBeInTheDocument()
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    3,
    "/api/v1/totp",
    expect.objectContaining({
      headers: expect.objectContaining({
        "X-CSRF-Token": "activation-csrf-token",
      }),
    }),
  )
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    4,
    "/api/v1/totp/confirmations",
    expect.objectContaining({
      headers: expect.objectContaining({
        "X-CSRF-Token": "activation-csrf-token",
      }),
    }),
  )
})

async function fillPatientRegistration(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(
    screen.getByPlaceholderText("Maria da Silva"),
    "Paciente Sintética",
  )
  await user.type(
    screen.getByPlaceholderText("seu@email.com"),
    "patient@example.com",
  )
  await user.type(screen.getByPlaceholderText("000.000.000-00"), "52998224725")
  await user.type(screen.getByLabelText("Data de nascimento"), "1992-08-13")
  await user.type(
    screen.getByPlaceholderText("(11) 99999-9999"),
    "+5553999999999",
  )
  await user.type(
    screen.getByPlaceholderText("Mínimo 12 caracteres"),
    "uma senha longa e segura 2026",
  )
  await user.type(
    screen.getByPlaceholderText("Repita a senha"),
    "uma senha longa e segura 2026",
  )
}
