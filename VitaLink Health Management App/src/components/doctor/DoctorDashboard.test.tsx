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
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
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
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
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
