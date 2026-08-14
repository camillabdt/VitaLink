import { useState } from "react"
import Sidebar from "./Sidebar"
import type { Page, UserType } from "@/data/mockData"

interface Props {
  children: React.ReactNode
  currentPage: Page
  userType: UserType
  onNavigate: (page: Page) => void
  onLogout: () => void
  title?: string
  subtitle?: string
  action?: React.ReactNode
  userName?: string
  userSubtitle?: string
}

export default function Layout({
  children,
  currentPage,
  userType,
  onNavigate,
  onLogout,
  title,
  subtitle,
  action,
  userName,
  userSubtitle,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Desktop sidebar */}
      <div
        className="hidden lg:block flex-shrink-0"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="h-full">
          <Sidebar
            currentPage={currentPage}
            userType={userType}
            onNavigate={onNavigate}
            onLogout={onLogout}
            patientName={userType === "patient" ? userName : undefined}
            doctorName={userType === "doctor" ? userName : undefined}
            userSubtitle={userSubtitle}
          />
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 w-64 h-full">
            <Sidebar
              currentPage={currentPage}
              userType={userType}
              onNavigate={onNavigate}
              onLogout={onLogout}
              patientName={userType === "patient" ? userName : undefined}
              doctorName={userType === "doctor" ? userName : undefined}
              userSubtitle={userSubtitle}
              mobile
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-5 lg:px-7 py-4 border-b bg-white flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-4">
            {/* Hamburger */}
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              {title && (
                <h1 className="text-base font-semibold text-gray-900">
                  {title}
                </h1>
              )}
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {action}
            {/* Notification bell */}
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Date */}
            <div
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Seg, 3 ago 2026</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">{children}</main>
      </div>
    </div>
  )
}
