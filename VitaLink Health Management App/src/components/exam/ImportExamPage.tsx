import { useState } from "react"
import Layout from "@/components/shared/Layout"
import DocumentUploadModal from "@/components/shared/DocumentUploadModal"
import type { StoredDocument } from "@/components/shared/DocumentUploadModal"
import type { Page, UserType } from "@/data/mockData"

interface Props {
  userType: UserType
  onNavigate: (page: Page) => void
  onLogout: () => void
}

export default function ImportExamPage({
  userType,
  onNavigate,
  onLogout,
}: Props) {
  const [showUpload, setShowUpload] = useState(false)
  const [patientId, setPatientId] = useState("")
  const [saved, setSaved] = useState<StoredDocument | null>(null)
  const backPage =
    userType === "patient" ? "patient-dashboard" : "doctor-dashboard"

  return (
    <Layout
      currentPage={backPage}
      userType={userType}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Importar exame"
      subtitle="Envie um PDF, JPG ou PNG para verificação antes do armazenamento"
    >
      <section
        className="mx-auto max-w-xl rounded-2xl border bg-white p-8"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-bold text-gray-900">Upload seguro</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          O arquivo será validado e analisado pelo antivírus. Ele só poderá ser
          visualizado após aprovação.
        </p>

        {userType === "doctor" && (
          <div className="mt-5">
            <label
              htmlFor="document-patient-id"
              className="block text-sm font-semibold text-gray-700"
            >
              Identificador do paciente autorizado
            </label>
            <input
              id="document-patient-id"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              placeholder="UUID do paciente"
            />
          </div>
        )}

        {saved && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {saved.original_name} foi verificado e armazenado com segurança.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={userType === "doctor" && !patientId.trim()}
            onClick={() => setShowUpload(true)}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            Selecionar documento
          </button>
          <button
            type="button"
            onClick={() => onNavigate(backPage)}
            className="rounded-xl border px-5 py-2.5 text-sm font-medium text-gray-600"
            style={{ borderColor: "var(--border)" }}
          >
            Voltar
          </button>
        </div>
      </section>

      {showUpload && (
        <DocumentUploadModal
          patientId={userType === "doctor" ? patientId : undefined}
          onClose={() => setShowUpload(false)}
          onSave={(document) => {
            setSaved(document)
            setShowUpload(false)
          }}
        />
      )}
    </Layout>
  )
}
