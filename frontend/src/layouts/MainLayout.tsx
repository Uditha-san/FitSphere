import React from 'react'
import Header from './Header'
import Footer from './Footer'

interface MainLayoutProps {
  children: React.ReactNode
  loading?: boolean
  onRefresh?: () => void
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, loading, onRefresh }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header loading={loading} onRefresh={onRefresh} />
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default MainLayout
