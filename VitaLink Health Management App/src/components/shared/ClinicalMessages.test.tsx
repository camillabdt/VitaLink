import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import ClinicalMessages from "./ClinicalMessages"

const peer = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Dra. Destinatária",
  specialty: "Cardiologia",
  unread_count: 2,
}

const original = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  content: "Mensagem clínica original.",
  mention_professional_ids: [],
  sender: {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Dr. Remetente",
    specialty: "Clínica médica",
  },
  recipient: peer,
  corrects_id: null,
  correction_reason: null,
  created_at: "2026-08-14T12:00:00Z",
}

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("professional searches the eligible team and sends a mentioned message after TOTP", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify([peer]), { status: 200 }),
    )
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "proof-id" }), { status: 201 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(original), { status: 201 }),
    )

  render(
    <ClinicalMessages
      patientId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
      categories={["mensagens"]}
      operations={["consultar", "anexar", "atualizar"]}
    />,
  )
  expect(await screen.findByText("2 não lidas")).toBeInTheDocument()
  await user.type(
    screen.getByLabelText("Buscar profissional elegível"),
    "Destinatária",
  )
  await user.click(screen.getByRole("button", { name: /Dra. Destinatária/ }))
  expect(
    await screen.findByText("Nenhuma mensagem nesta conversa."),
  ).toBeInTheDocument()
  await user.type(
    screen.getByLabelText("Mensagem clínica"),
    "Mensagem para @Dra. Destinatária",
  )
  await user.type(screen.getByLabelText("TOTP da mensagem"), "123456")
  await user.click(screen.getByRole("button", { name: "Enviar mensagem" }))

  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    3,
    "/api/v1/step-up-confirmations",
    expect.objectContaining({
      body: expect.stringContaining("clinical_message_write"),
    }),
  )
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    4,
    "/api/v1/clinical-messages",
    expect.objectContaining({
      body: expect.stringContaining(
        `"mention_professional_ids":["${peer.id}"]`,
      ),
    }),
  )
  expect(
    await screen.findByText("Mensagem clínica original."),
  ).toBeInTheDocument()
})

test("sender corrects by appending a linked message while history remains visible", async () => {
  const user = userEvent.setup()
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  const correction = {
    ...original,
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    content: "Mensagem clínica corrigida.",
    corrects_id: original.id,
    correction_reason: "Texto original incompleto.",
  }
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify([peer]), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([original]), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "proof-2" }), { status: 201 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(correction), { status: 201 }),
    )

  render(
    <ClinicalMessages
      patientId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
      categories={["mensagens"]}
      operations={["consultar", "anexar", "atualizar"]}
    />,
  )
  await user.click(
    await screen.findByRole("button", { name: /Dra. Destinatária/ }),
  )
  await user.click(
    await screen.findByRole("button", { name: "Corrigir mensagem" }),
  )
  await user.type(
    screen.getByLabelText("Texto corrigido"),
    "Mensagem clínica corrigida.",
  )
  await user.type(
    screen.getByLabelText("Motivo da correção"),
    "Texto original incompleto.",
  )
  await user.type(screen.getByLabelText("TOTP da correção"), "123456")
  await user.click(screen.getByRole("button", { name: "Enviar correção" }))

  expect(globalThis.fetch).toHaveBeenLastCalledWith(
    `/api/v1/clinical-messages/${original.id}/corrections`,
    expect.objectContaining({ method: "POST" }),
  )
  expect(screen.getByText("Mensagem clínica original.")).toBeInTheDocument()
  expect(
    await screen.findByText("Mensagem clínica corrigida."),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole("button", { name: /Excluir|Editar/ }),
  ).not.toBeInTheDocument()
})

test("empty team and expired session have explicit states", async () => {
  const onSessionExpired = vi.fn()
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(new Response("{}", { status: 401 }))

  const view = render(
    <ClinicalMessages
      patientId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
      categories={["mensagens"]}
      operations={["consultar"]}
      onSessionExpired={onSessionExpired}
    />,
  )
  expect(
    await screen.findByText("Nenhum profissional elegível."),
  ).toBeInTheDocument()
  view.unmount()
  render(
    <ClinicalMessages
      patientId="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
      categories={["mensagens"]}
      operations={["consultar"]}
      onSessionExpired={onSessionExpired}
    />,
  )
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar",
  )
  expect(onSessionExpired).toHaveBeenCalledOnce()
})
