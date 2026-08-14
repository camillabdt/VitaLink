import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import ClinicalGoals from "./ClinicalGoals"

const goal = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  exam_name: "Glicemia em jejum",
  minimum: 80,
  maximum: 100,
  unit: "mg/dL",
  justification: "Meta sintética individual.",
  effective_at: "2026-08-14",
  author: { name: "Profissional Sintética", specialty: "Endocrinologia" },
  version: 1,
  created_at: "2026-08-14T12:00:00Z",
}

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("professional creates a goal after TOTP and sees an attributed visual range", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "proof-id" }), { status: 201 }),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify(goal), { status: 201 }))

  render(
    <ClinicalGoals
      patientId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      categories={["metas"]}
      operations={["consultar", "anexar", "atualizar"]}
    />,
  )
  await screen.findByText("Nenhuma meta clínica.")
  await user.type(screen.getByLabelText("Exame da meta"), goal.exam_name)
  await user.type(screen.getByLabelText("Limite mínimo"), "80")
  await user.type(screen.getByLabelText("Limite máximo"), "100")
  await user.type(screen.getByLabelText("Unidade"), goal.unit)
  await user.type(
    screen.getByLabelText("Justificativa da meta"),
    goal.justification,
  )
  await user.type(screen.getByLabelText("Data de vigência"), goal.effective_at)
  await user.type(screen.getByLabelText("TOTP da meta"), "123456")
  await user.click(screen.getByRole("button", { name: "Adicionar meta" }))

  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    3,
    "/api/v1/step-up-confirmations",
    expect.objectContaining({
      body: expect.stringContaining("clinical_goal_write"),
    }),
  )
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    4,
    "/api/v1/clinical-goals",
    expect.objectContaining({ body: expect.stringContaining('"minimum":80') }),
  )
  expect(
    await screen.findByRole("meter", { name: /Glicemia/ }),
  ).toHaveAttribute("aria-valuetext", "80 a 100 mg/dL")
  expect(screen.getByText(/Profissional Sintética/)).toBeInTheDocument()
})

test("professional records and corrects only a manual follow-up state", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  const followUp = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    status: "Em acompanhamento",
    justification: "Estado informado manualmente.",
    recorded_at: "2026-08-14",
    author: goal.author,
    version: 1,
    created_at: goal.created_at,
  }
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify([followUp]), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "proof-2" }), { status: 201 }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...followUp, status: "Estável", version: 2 }),
        { status: 200 },
      ),
    )

  render(
    <ClinicalGoals
      patientId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      categories={["metas"]}
      operations={["consultar", "atualizar"]}
    />,
  )
  await user.click(
    await screen.findByRole("button", { name: "Corrigir acompanhamento" }),
  )
  const status = screen.getByLabelText("Estado corrigido")
  await user.clear(status)
  await user.type(status, "Estável")
  await user.type(
    screen.getByLabelText("Motivo da correção"),
    "Revisão manual sintética.",
  )
  await user.type(screen.getByLabelText("TOTP da correção"), "123456")
  await user.click(
    screen.getByRole("button", { name: "Salvar acompanhamento" }),
  )

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    "/api/v1/follow-up-statuses/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"expected_version":1'),
    }),
  )
  expect(await screen.findByText("Estável")).toBeInTheDocument()
  expect(screen.queryByText(/calculad/i)).not.toBeInTheDocument()
})

test("patient sees goals and follow-up read only while an expired session returns to login", async () => {
  const onSessionExpired = vi.fn()
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify([goal]), { status: 200 }),
    )
    .mockResolvedValueOnce(new Response("{}", { status: 401 }))

  render(<ClinicalGoals onSessionExpired={onSessionExpired} />)

  expect(await screen.findByText("Glicemia em jejum")).toBeInTheDocument()
  expect(onSessionExpired).toHaveBeenCalledOnce()
  expect(
    screen.queryByRole("button", { name: /Adicionar|Corrigir/ }),
  ).not.toBeInTheDocument()
})
