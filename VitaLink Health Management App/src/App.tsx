import { useEffect, useState } from "react"
import type { Page, UserType } from "@/data/mockData"
import LoginPage from "@/components/auth/LoginPage"
import RegisterPage from "@/components/auth/RegisterPage"
import ForgotPasswordPage from "@/components/auth/ForgotPasswordPage"
import PatientDashboard from "@/components/patient/PatientDashboard"
import PatientProfile from "@/components/patient/PatientProfile"
import DoctorDashboard from "@/components/doctor/DoctorDashboard"
import ImportExamPage from "@/components/exam/ImportExamPage"

export default function App() {
  const recoveryPath = ["/reset-password", "/recover-totp"].includes(
    window.location.pathname,
  )
  const [page, setPage] = useState<Page>(() =>
    recoveryPath ? "forgot-password" : "login",
  )
  const [userType, setUserType] = useState<UserType>("patient")
  const [checkingSession, setCheckingSession] = useState(
    () => !recoveryPath && Boolean(sessionStorage.getItem("vitallink.csrf")),
  )

  useEffect(() => {
    if (!checkingSession) return
    let active = true
    fetch("/api/v1/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) {
          sessionStorage.removeItem("vitallink.csrf")
          return null
        }
        if (!response.ok) throw new Error("session unavailable")
        return (await response.json()) as { role: "patient" | "professional" }
      })
      .then((account) => {
        if (!active || !account) return
        const restoredUserType =
          account.role === "professional" ? "doctor" : "patient"
        setUserType(restoredUserType)
        setPage(
          account.role === "professional"
            ? "doctor-dashboard"
            : "patient-dashboard",
        )
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCheckingSession(false)
      })
    return () => {
      active = false
    }
  }, [checkingSession])

  const navigate = (nextPage: Page, nextUserType?: UserType) => {
    if (nextUserType) setUserType(nextUserType)
    setPage(nextPage)
    window.scrollTo(0, 0)
  }

  const logout = async () => {
    const csrfToken = sessionStorage.getItem("vitallink.csrf")
    if (!csrfToken) {
      window.alert("Não foi possível validar a sessão. Recarregue a página.")
      return
    }
    try {
      const response = await fetch("/api/v1/sessions/current", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      })
      if (!response.ok) {
        window.alert("Não foi possível sair com segurança. Tente novamente.")
        return
      }
      sessionStorage.removeItem("vitallink.csrf")
      setPage("login")
    } catch {
      window.alert("Não foi possível sair com segurança. Tente novamente.")
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p role="status" className="text-sm text-gray-500">
          Verificando sessão...
        </p>
      </main>
    )
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

  if (page === "doctor-profile") {
    return (
      <PatientProfile
        userType="doctor"
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
    return (
      <PatientProfile
        userType="patient"
        onNavigate={navigate}
        onLogout={logout}
      />
    )
  }

  const patientTab =
    page === "patient-history"
      ? "observations"
      : page === "patient-charts"
        ? "charts"
        : page === "patient-recommendations"
          ? "recommendations"
          : "overview"
  return (
    <PatientDashboard
      onNavigate={navigate}
      onLogout={logout}
      initialTab={patientTab}
    />
  )
}
