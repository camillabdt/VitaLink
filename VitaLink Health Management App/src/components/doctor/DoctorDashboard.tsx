import type { Page } from "@/data/mockData"
import AuthorizedPatientsDashboard from "./AuthorizedPatientsDashboard"

interface Props {
  onNavigate: (page: Page) => void
  onLogout: () => void
}

export default function DoctorDashboard(props: Props) {
  return <AuthorizedPatientsDashboard {...props} />
}
