import { useRef, useState } from "react"

interface Props {
  patientId: string
  category: "consultas" | "recomendações" | "metas" | "mensagens"
  operation: "anexar" | "atualizar"
  onDraft: (draft: string) => void
  onSessionExpired?: () => void
}

export default function ClinicalDictation({
  patientId,
  category,
  operation,
  onDraft,
  onSessionExpired,
}: Props) {
  const [state, setState] =
    useState<"idle" | "recording" | "processing" | "ready">("idle")
  const [error, setError] = useState("")
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number | null>(null)
  const canceled = useRef(false)

  const release = () => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const upload = async (audio: Blob) => {
    const csrf = sessionStorage.getItem("vitallink.csrf")
    if (!csrf) {
      setError("Recarregue a página para validar esta ação.")
      setState("idle")
      return
    }
    setState("processing")
    try {
      const form = new FormData()
      form.append("patient_id", patientId)
      form.append("category", category)
      form.append("operation", operation)
      form.append(
        "audio",
        audio,
        `dictation.${audio.type.includes("ogg") ? "ogg" : "webm"}`,
      )
      const response = await fetch("/api/v1/transcriptions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrf },
        body: form,
      })
      if (response.status === 401) onSessionExpired?.()
      const body = (await response.json()) as {
        draft?: string
        message?: string
      }
      if (!response.ok || !body.draft)
        throw new Error(body.message ?? "Não foi possível transcrever o áudio.")
      onDraft(body.draft)
      setState("ready")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível transcrever o áudio.",
      )
      setState("idle")
    }
  }

  const start = async () => {
    setError("")
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
      setError("Este navegador não oferece gravação de áudio.")
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      canceled.current = false
      chunks.current = []
      const preferredType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg"
      const current = new MediaRecorder(stream.current, {
        mimeType: preferredType,
      })
      recorder.current = current
      current.ondataavailable = (event) => {
        if (!canceled.current && event.data.size)
          chunks.current.push(event.data)
      }
      current.onstop = () => {
        release()
        const audio = new Blob(chunks.current, { type: current.mimeType })
        chunks.current = []
        if (!canceled.current) void upload(audio)
      }
      current.start()
      setState("recording")
      timer.current = window.setTimeout(() => current.stop(), 120_000)
    } catch {
      release()
      setError("Permissão para o microfone não concedida.")
    }
  }

  const stop = () => recorder.current?.stop()
  const cancel = () => {
    canceled.current = true
    chunks.current = []
    recorder.current?.stop()
    release()
    setState("idle")
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
      {state === "recording" ? (
        <>
          <button
            type="button"
            onClick={stop}
            className="font-semibold text-teal-700"
          >
            Concluir ditado
          </button>
          <button type="button" onClick={cancel} className="text-gray-600">
            Cancelar ditado
          </button>
          <span role="status">Gravando por até 2 minutos…</span>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={state === "processing"}
          className="font-semibold text-teal-700 disabled:opacity-50"
        >
          {state === "processing" ? "Transcrevendo…" : "Iniciar ditado"}
        </button>
      )}
      {state === "ready" && (
        <span role="status">Revise o rascunho antes de salvar.</span>
      )}
      {error && <span role="alert">{error}</span>}
      <span className="text-gray-500">
        Você ainda pode digitar normalmente.
      </span>
    </div>
  )
}
