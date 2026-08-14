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

test("reload restores an authenticated session and persisted profile", async () => {
  const user = userEvent.setup()
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  const profile = {
    role: "patient",
    status: "active",
    version: 2,
    profile: {
      name: "Paciente Persistida",
      email: "persisted@example.com",
      cpf: "12345678909",
      birthdate: "1990-04-12",
      phone: "+5553988888888",
      blood_type: "AB+",
    },
  }
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify(profile), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(profile), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

  render(<App />)

  await user.click(await screen.findByRole("button", { name: "Configurações" }))
  expect(
    await screen.findByRole("heading", { name: "Paciente Persistida" }),
  ).toBeInTheDocument()
  expect(screen.getByText("+5553988888888")).toBeInTheDocument()
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

test("professional settings opens the persisted professional profile", async () => {
  const user = userEvent.setup()
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
  const professionalProfile = {
    role: "professional",
    status: "active",
    version: 1,
    profile: {
      name: "Profissional de Teste",
      email: "professional@example.com",
      cpf: "12345678909",
      birthdate: "1985-03-10",
      phone: "+5553999999999",
      crm: "CRM123",
      uf: "RS",
      specialty: "Cardiologia",
      institution: "Hospital Sintético",
    },
  }
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(null, {
        status: 204,
        headers: { "X-CSRF-Token": "session-csrf-token" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(professionalProfile), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(professionalProfile), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
  render(<App />)

  await user.click(
    screen.getByRole("button", { name: "Profissional de saúde" }),
  )
  await user.type(screen.getByLabelText("E-mail"), "professional@example.com")
  await user.type(
    screen.getByLabelText("Senha"),
    "uma senha profissional segura 2026",
  )
  await user.type(screen.getByLabelText("Código do autenticador"), "123456")
  await user.click(screen.getByRole("button", { name: "Entrar" }))
  await user.click(await screen.findByRole("button", { name: "Configurações" }))

  expect(
    await screen.findByRole("heading", { name: "Profissional de Teste" }),
  ).toBeInTheDocument()
  expect(screen.getByText("CRM123/RS")).toBeInTheDocument()
})
