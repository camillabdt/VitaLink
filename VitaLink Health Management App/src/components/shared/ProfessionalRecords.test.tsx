import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import ProfessionalRecords from "./ProfessionalRecords"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("professional publishes a consultation after real TOTP confirmation", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  const created = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    kind: "consultation",
    occurred_at: "2026-08-14T10:00:00Z",
    content: "Consulta sintética confirmada.",
    justification: "Continuidade do acompanhamento sintético.",
    origin: "professional_entry",
    author: { name: "Profissional Sintética", specialty: "Cardiologia" },
    version: 1,
    created_at: "2026-08-14T10:05:00Z",
  }
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "proof-id" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(created), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    )

  render(
    <ProfessionalRecords
      patientId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      categories={["consultas"]}
      operations={["consultar", "anexar", "atualizar"]}
    />,
  )
  await screen.findByText("Nenhum registro profissional.")
  await user.selectOptions(
    screen.getByLabelText("Tipo de registro"),
    "consultation",
  )
  await user.type(screen.getByLabelText("Data e hora"), "2026-08-14T10:00")
  await user.type(
    screen.getByLabelText("Conteúdo"),
    "Consulta sintética confirmada.",
  )
  await user.type(
    screen.getByLabelText("Justificativa"),
    "Continuidade do acompanhamento sintético.",
  )
  await user.type(screen.getByLabelText("Código do autenticador"), "123456")
  await user.click(screen.getByRole("button", { name: "Publicar registro" }))

  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    2,
    "/api/v1/step-up-confirmations",
    expect.objectContaining({
      body: expect.stringContaining("clinical_record_create"),
    }),
  )
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    3,
    "/api/v1/professional-records",
    expect.objectContaining({
      body: expect.stringContaining('"step_up_confirmation_id":"proof-id"'),
    }),
  )
  expect(
    await screen.findByText("Consulta sintética confirmada."),
  ).toBeInTheDocument()
})

test("professional corrects their record while patient view stays read only", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  const original = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    kind: "consultation",
    occurred_at: "2026-08-14T10:00:00Z",
    content: "Resumo original.",
    justification: "Continuidade do acompanhamento sintético.",
    origin: "professional_entry",
    author: { name: "Profissional Sintética", specialty: "Cardiologia" },
    version: 1,
    created_at: "2026-08-14T10:05:00Z",
  } as const
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify([original]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...original,
          content: "Resumo corrigido.",
          version: 2,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { ...original, content: "Resumo corrigido.", version: 2 },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

  const professionalView = render(
    <ProfessionalRecords
      patientId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      categories={["consultas"]}
      operations={["consultar", "atualizar"]}
    />,
  )
  await user.click(await screen.findByRole("button", { name: "Corrigir" }))
  const content = screen.getByLabelText("Conteúdo corrigido")
  await user.clear(content)
  await user.type(content, "Resumo corrigido.")
  await user.type(
    screen.getByLabelText("Motivo da correção"),
    "Complemento sintético necessário.",
  )
  await user.click(screen.getByRole("button", { name: "Salvar nova versão" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/professional-records/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"expected_version":1'),
    }),
  )
  expect(await screen.findByText("Resumo corrigido.")).toBeInTheDocument()

  professionalView.unmount()
  render(<ProfessionalRecords mode="history" />)
  expect(await screen.findByText("Resumo corrigido.")).toBeInTheDocument()
  expect(
    screen.queryByRole("button", { name: "Corrigir" }),
  ).not.toBeInTheDocument()
})

test("expired session reports failure and returns to login", async () => {
  const onSessionExpired = vi.fn()
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Entre novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  )

  render(
    <ProfessionalRecords
      mode="recommendations"
      onSessionExpired={onSessionExpired}
    />,
  )

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar",
  )
  expect(onSessionExpired).toHaveBeenCalledOnce()
})
