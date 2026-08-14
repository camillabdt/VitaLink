import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import Sidebar from "./Sidebar"

test.each([
  ["patient", "patient-profile"],
  ["doctor", "doctor-profile"],
] as const)(
  "%s settings opens the existing profile destination",
  async (userType, destination) => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <Sidebar
        currentPage={
          userType === "patient" ? "patient-dashboard" : "doctor-dashboard"
        }
        userType={userType}
        onNavigate={onNavigate}
        onLogout={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Configurações" }))

    expect(onNavigate).toHaveBeenCalledWith(destination)
  },
)
