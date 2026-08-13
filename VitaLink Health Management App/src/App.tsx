import { useState } from "react"
import type { Page, UserType } from "@/data/mockData"
import LoginPage from "@/components/auth/LoginPage"
import RegisterPage from "@/components/auth/RegisterPage"
import ForgotPasswordPage from "@/components/auth/ForgotPasswordPage"
import PatientDashboard from "@/components/patient/PatientDashboard"
import PatientProfile from "@/components/patient/PatientProfile"
import DoctorDashboard from "@/components/doctor/DoctorDashboard"
import ImportExamPage from "@/components/exam/ImportExamPage"

export default function App() {
  const [page, setPage] = useState<Page>("login")
  const [userType, setUserType] = useState<UserType>("patient")

  const navigate = (nextPage: Page, nextUserType?: UserType) => {
    if (nextUserType) setUserType(nextUserType)
    setPage(nextPage)
    window.scrollTo(0, 0)
  }

  const logout = () => {
    setPage("login")
  }

  if (page === "login") return <LoginPage onNavigate={navigate} />
  if (page === "register") return <RegisterPage onNavigate={navigate} />
  if (page === "forgot-password")
    return <ForgotPasswordPage onNavigate={navigate} />

  if (page === "import-exam") {
    return (
      <ImportExamPage
        userType={userType}
        onNavigate={navigate}
        onLogout={logout}
      />
    )
  }

  if (userType === "doctor") {
    return <DoctorDashboard onNavigate={navigate} onLogout={logout} />
  }

  // Patient views
  if (page === "patient-profile") {
    return <PatientProfile onNavigate={navigate} onLogout={logout} />
  }

  return <PatientDashboard onNavigate={navigate} onLogout={logout} />
}
