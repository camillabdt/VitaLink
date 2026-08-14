import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import PatientProfile from "./PatientProfile"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

function patientProfileResponse() {
  return new Response(
    JSON.stringify({
      role: "patient",
      status: "active",
      version: 1,
      profile: {
        name: "Paciente de Teste",
        email: "profile@example.com",
        cpf: "12345678909",
        birthdate: "1990-04-12",
        phone: "+5553999999999",
        blood_type: "AB+",
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

test("patient profile renders persisted owner data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(patientProfileResponse())

  render(<PatientProfile onNavigate={vi.fn()} onLogout={vi.fn()} />)

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/me",
    expect.objectContaining({ credentials: "same-origin" }),
  )
  expect(
    await screen.findByRole("heading", { name: "Paciente de Teste" }),
  ).toBeInTheDocument()
  expect(screen.getAllByText("profile@example.com")).not.toHaveLength(0)
  expect(screen.getByText("Tipo AB+")).toBeInTheDocument()
})

test("patient saves editable profile fields through the API", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(patientProfileResponse())
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          role: "patient",
          status: "active",
          version: 2,
          profile: {
            name: "Paciente de Teste",
            email: "profile@example.com",
            cpf: "12345678909",
            birthdate: "1990-04-12",
            phone: "+5553988888888",
            blood_type: "AB+",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
  render(<PatientProfile onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await screen.findByRole("heading", { name: "Paciente de Teste" })
  await user.click(screen.getByRole("button", { name: "Editar" }))
  const phone = screen.getByDisplayValue("+5553999999999")
  await user.clear(phone)
  await user.type(phone, "+5553988888888")
  await user.click(screen.getByRole("button", { name: "Salvar" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/me",
    expect.objectContaining({
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": "session-csrf-token",
      },
      body: JSON.stringify({
        expected_version: 1,
        name: "Paciente de Teste",
        birthdate: "1990-04-12",
        phone: "+5553988888888",
        blood_type: "AB+",
      }),
    }),
  )
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Perfil atualizado.",
  )
})

test("patient generates and copies a temporary access code", async () => {
  const user = userEvent.setup()
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(patientProfileResponse())
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "44444444-4444-4444-8444-444444444444",
          code: "synthetic-temporary-code-with-32-chars",
          expires_at: "2026-08-15T04:00:00Z",
          status: "active",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    )

  render(<PatientProfile onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await screen.findByRole("heading", { name: "Paciente de Teste" })
  await user.click(screen.getByRole("tab", { name: "Acesso temporário" }))
  expect(await screen.findByText("Nenhum código gerado.")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Gerar código" }))
  expect(
    await screen.findByText("synthetic-temporary-code-with-32-chars"),
  ).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Copiar código" }))

  expect(writeText).toHaveBeenCalledWith(
    "synthetic-temporary-code-with-32-chars",
  )
})

test("patient revokes an owned active access code", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(patientProfileResponse())
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "66666666-6666-4666-8666-666666666666",
            created_at: "2026-08-14T04:00:00Z",
            expires_at: "2026-08-15T04:00:00Z",
            status: "active",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))

  render(<PatientProfile onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await screen.findByRole("heading", { name: "Paciente de Teste" })
  await user.click(screen.getByRole("tab", { name: "Acesso temporário" }))
  await user.click(await screen.findByRole("button", { name: "Revogar" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/access-codes/66666666-6666-4666-8666-666666666666",
    expect.objectContaining({
      method: "DELETE",
      headers: { "X-CSRF-Token": "session-csrf-token" },
    }),
  )
  expect(screen.getByText("Código revogado")).toBeInTheDocument()
})

test("patient grants a pending request with explicit scope and TOTP", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(patientProfileResponse())
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "77777777-7777-4777-8777-777777777777",
            status: "pending",
            created_at: "2026-08-14T05:00:00Z",
            justification: "Acompanhamento cardiológico solicitado.",
            professional: {
              name: "Dra. Profissional",
              specialty: "Cardiologia",
              institution: "Hospital Escola",
            },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "88888888-8888-4888-8888-888888888888" }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "77777777-7777-4777-8777-777777777777",
          status: "granted",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

  render(<PatientProfile onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await screen.findByRole("heading", { name: "Paciente de Teste" })
  await user.click(screen.getByRole("tab", { name: "Acesso temporário" }))
  expect(await screen.findByText("Dra. Profissional")).toBeInTheDocument()
  await user.type(screen.getByLabelText("TOTP para concessão"), "123456")
  await user.click(screen.getByRole("button", { name: "Conceder acesso" }))

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/access-requests/77777777-7777-4777-8777-777777777777/decisions",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        decision: "granted",
        categories: ["histórico"],
        operations: ["consultar"],
        duration_days: 30,
        step_up_confirmation_id: "88888888-8888-4888-8888-888888888888",
      }),
    }),
  )
  expect(await screen.findByText("Acesso concedido.")).toBeInTheDocument()
})

test("patient loads and ends an owned active session", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(patientProfileResponse())
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

  await screen.findByRole("heading", { name: "Paciente de Teste" })
  await user.click(screen.getByRole("tab", { name: "Segurança" }))
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
    .mockResolvedValueOnce(patientProfileResponse())
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

  await screen.findByRole("heading", { name: "Paciente de Teste" })
  await user.click(screen.getByRole("tab", { name: "Segurança" }))
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
    3,
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
    4,
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
