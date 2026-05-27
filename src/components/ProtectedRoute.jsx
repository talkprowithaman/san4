import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/auth" replace />
  return children
}
