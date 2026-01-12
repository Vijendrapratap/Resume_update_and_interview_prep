import { Outlet, Link, useLocation } from 'react-router-dom'
import { FileText, LayoutDashboard, Upload, LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analyze', label: 'Analyze Resume', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AI Interviewer</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-300">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm">{user?.full_name || user?.email || 'Recruiter'}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-sm text-gray-400">
            AI Interviewer Platform - Resume Analysis, Interviews & Hiring Intelligence
          </p>
        </div>
      </footer>
    </div>
  )
}
