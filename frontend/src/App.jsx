import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/common/Layout'
import HomePage from './pages/HomePage'
import AnalysisPage from './pages/AnalysisPage'
import InterviewPage from './pages/InterviewPage'
import ReportPage from './pages/ReportPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { AuthProvider, useAuth } from './context/AuthContext'

import VerificationPage from './pages/VerificationPage'

import RecruiterDashboard from './pages/RecruiterDashboard'

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-400">Loading...</p>
    </div>
  </div>
);

// Protected Route Component - Requires authentication
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!token) return <Navigate to="/login" replace />;

  return children;
};

// Public Route Component - Redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (token) return <Navigate to="/dashboard" replace />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public routes - redirect to dashboard if already logged in */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected routes - require authentication */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RecruiterDashboard />} />
          <Route path="analyze" element={<HomePage />} />
          <Route path="analysis/:resumeId" element={<AnalysisPage />} />
          <Route path="verification/:resumeId" element={<VerificationPage />} />
          <Route path="interview/:resumeId" element={<InterviewPage />} />
          <Route path="report/:sessionId" element={<ReportPage />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
