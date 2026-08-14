import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import DocumentUploadModal from "./DocumentUploadModal"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

test("uploads only the selected real file through multipart form data", async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  sessionStorage.setItem("vitallink.csrf", "session-csrf-token")
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        category: "exames",
        original_name: "resultado.png",
        content_type: "image/png",
        size: 12,
        status: "approved",
        created_at: "2026-08-14T06:00:00Z",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ),
  )
  render(<DocumentUploadModal onSave={onSave} onClose={vi.fn()} />)

  const file = new File(["safe content"], "resultado.png", {
    type: "image/png",
  })
  await user.upload(
    screen.getByLabelText("Selecionar arquivo", { selector: "input" }),
    file,
  )
  await user.click(screen.getByRole("button", { name: "Enviar documento" }))

  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/v1/documents",
    expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
  )
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ original_name: "resultado.png" }),
  )
  expect(screen.queryByText(/DICOM|OCR|compartilhar/i)).not.toBeInTheDocument()
})

test("rejects a file larger than 20 MB before any request", async () => {
  const user = userEvent.setup()
  const fetchSpy = vi.spyOn(globalThis, "fetch")
  render(<DocumentUploadModal onSave={vi.fn()} onClose={vi.fn()} />)

  const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.pdf", {
    type: "application/pdf",
  })
  await user.upload(
    screen.getByLabelText("Selecionar arquivo", { selector: "input" }),
    file,
  )

  expect(screen.getByRole("alert")).toHaveTextContent("no máximo 20 MB")
  expect(fetchSpy).not.toHaveBeenCalled()
})
