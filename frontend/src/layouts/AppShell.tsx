import React, { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface AppShellProps {
  activeNav: string
  onSelectNav: (nav: string) => void
  children: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({
  activeNav,
  onSelectNav,
  children,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={onSelectNav}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <TopBar
          activeNav={activeNav}
          onOpenMobile={() => setIsMobileOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell
