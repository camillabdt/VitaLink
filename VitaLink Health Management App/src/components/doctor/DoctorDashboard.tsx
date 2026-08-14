import type { Page } from "@/data/mockData"
import AuthorizedPatientsDashboard from "./AuthorizedPatientsDashboard"

interface Props {
  currentPage?: Page
  onNavigate: (page: Page) => void
  onLogout: () => void
}

export default function DoctorDashboard({ currentPage, ...props }: Props) {
  return (
    <AuthorizedPatientsDashboard
      {...props}
      messagesOnly={currentPage === "doctor-messages"}
    />
  )
}
