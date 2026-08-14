import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import ClinicalDictation from "./ClinicalDictation"

class FakeMediaRecorder {
  static isTypeSupported = () => true
  state = "inactive"
  mimeType = "audio/webm"
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  start() {
    this.state = "recording"
  }

  stop() {
    this.state = "inactive"
    this.ondataavailable?.({
      data: new Blob(["synthetic"], { type: this.mimeType }),
    })
    this.onstop?.()
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

test("transcribes into an editable draft without persisting it", async () => {
  const user = userEvent.setup()
  const stopTrack = vi.fn()
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  })
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder)
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  })
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  const onDraft = vi.fn()
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        draft: "Rascunho clínico sintético.",
        language: "pt",
        requires_confirmation: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  )

  render(
    <ClinicalDictation
      patientId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      category="consultas"
      operation="anexar"
      onDraft={onDraft}
    />,
  )
  await user.click(screen.getByRole("button", { name: "Iniciar ditado" }))
  await user.click(screen.getByRole("button", { name: "Concluir ditado" }))

  expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
  expect(stopTrack).toHaveBeenCalledOnce()
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/transcriptions",
    expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
  )
  expect(onDraft).toHaveBeenCalledWith("Rascunho clínico sintético.")
  expect(screen.getByRole("status")).toHaveTextContent(
    "Revise o rascunho antes de salvar.",
  )
})

test("permission denial keeps typing available and cancel uploads nothing", async () => {
  const user = userEvent.setup()
  const getUserMedia = vi
    .fn()
    .mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"))
    .mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] })
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder)
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  })
  const fetchSpy = vi.spyOn(globalThis, "fetch")
  render(
    <ClinicalDictation
      patientId="patient-id"
      category="mensagens"
      operation="anexar"
      onDraft={vi.fn()}
    />,
  )

  await user.click(screen.getByRole("button", { name: "Iniciar ditado" }))
  expect(screen.getByRole("alert")).toHaveTextContent("Permissão")
  await user.click(screen.getByRole("button", { name: "Iniciar ditado" }))
  await user.click(screen.getByRole("button", { name: "Cancelar ditado" }))

  expect(fetchSpy).not.toHaveBeenCalled()
  expect(
    screen.getByText("Você ainda pode digitar normalmente."),
  ).toBeInTheDocument()
})

test("expired session returns control to authentication", async () => {
  const user = userEvent.setup()
  const onSessionExpired = vi.fn()
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder)
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  })
  sessionStorage.setItem("vitallink.csrf", "csrf-token")
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Entre novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  )
  render(
    <ClinicalDictation
      patientId="patient-id"
      category="metas"
      operation="atualizar"
      onDraft={vi.fn()}
      onSessionExpired={onSessionExpired}
    />,
  )

  await user.click(screen.getByRole("button", { name: "Iniciar ditado" }))
  await user.click(screen.getByRole("button", { name: "Concluir ditado" }))

  expect(onSessionExpired).toHaveBeenCalledOnce()
  expect(await screen.findByRole("alert")).toHaveTextContent("Entre novamente.")
})
