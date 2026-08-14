import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import DoctorDashboard from "./DoctorDashboard"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("professional requests access using only code and justification", async () => {
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
          id: "55555555-5555-4555-8555-555555555555",
          status: "pending",
          patient: "Paciente Sintética",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    )

  render(<DoctorDashboard onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await user.click(screen.getByRole("button", { name: "+ Novo paciente" }))
  await user.type(
    screen.getByLabelText("Código temporário"),
    "synthetic-temporary-code-with-32-chars",
  )
  await user.type(
    screen.getByLabelText("Justificativa clínica"),
    "Acompanhamento clínico sintético solicitado pelo paciente.",
  )
  await user.click(screen.getByRole("button", { name: "Enviar solicitação" }))

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/access-requests",
    expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": "session-csrf-token",
      },
      body: JSON.stringify({
        code: "synthetic-temporary-code-with-32-chars",
        justification:
          "Acompanhamento clínico sintético solicitado pelo paciente.",
      }),
    }),
  )
  expect(await screen.findByText(/Paciente Sintética/)).toBeInTheDocument()
  expect(
    screen.queryByPlaceholderText("Nome ou CPF do paciente..."),
  ).not.toBeInTheDocument()
})

test("invalid code does not reveal patient data", async () => {
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
          code: "access_code_invalid",
          message: "O código informado não é válido.",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    )

  render(<DoctorDashboard onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await user.type(screen.getByLabelText("Código temporário"), "x".repeat(32))
  await user.type(
    screen.getByLabelText("Justificativa clínica"),
    "Solicitação sintética com código inválido.",
  )
  await user.click(screen.getByRole("button", { name: "Enviar solicitação" }))

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "O código informado não é válido.",
  )
  expect(screen.queryByText(/CPF/)).not.toBeInTheDocument()
})

test("professional sees only authorized patients and revalidates detail", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "99999999-9999-4999-8999-999999999999",
            name: "Paciente Autorizada",
            categories: ["histórico"],
            operations: ["consultar"],
            expires_at: "2026-09-13T05:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "99999999-9999-4999-8999-999999999999",
          name: "Paciente Autorizada",
          birthdate: "1992-08-13",
          phone: "+5553999999999",
          blood_type: "O+",
          categories: ["histórico"],
          operations: ["consultar"],
          expires_at: "2026-09-13T05:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

  render(<DoctorDashboard onNavigate={vi.fn()} onLogout={vi.fn()} />)

  expect(await screen.findByText("Paciente Autorizada")).toBeInTheDocument()
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/patients",
    expect.objectContaining({ credentials: "same-origin" }),
  )
  await user.click(screen.getByRole("button", { name: "Ver detalhes" }))
  expect(await screen.findByText("+5553999999999")).toBeInTheDocument()
  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/patients/99999999-9999-4999-8999-999999999999",
    expect.objectContaining({ credentials: "same-origin" }),
  )
})

test("professional clears loaded detail when focus revalidation loses access", async () => {
  const user = userEvent.setup()
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "99999999-9999-4999-8999-999999999999",
            name: "Paciente Autorizada",
            categories: ["histórico"],
            operations: ["consultar"],
            expires_at: "2026-09-13T05:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "99999999-9999-4999-8999-999999999999",
          name: "Paciente Autorizada",
          birthdate: "1992-08-13",
          phone: "+5553999999999",
          blood_type: "O+",
          categories: ["histórico"],
          operations: ["consultar"],
          expires_at: "2026-09-13T05:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))

  render(<DoctorDashboard onNavigate={vi.fn()} onLogout={vi.fn()} />)

  await user.click(await screen.findByRole("button", { name: "Ver detalhes" }))
  expect(await screen.findByText("+5553999999999")).toBeInTheDocument()
  window.dispatchEvent(new Event("focus"))

  expect(
    await screen.findByText("Nenhum paciente autorizado encontrado."),
  ).toBeInTheDocument()
  expect(screen.queryByText("+5553999999999")).not.toBeInTheDocument()
})
