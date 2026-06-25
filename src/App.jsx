import { useEffect } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import ProtectedRoute from './components/ProtectedRoute'
import Landing        from './pages/Landing'
import Auth           from './pages/Auth'
import Dashboard      from './pages/Dashboard'
import Practice       from './pages/Practice'
import PracticeSession from './pages/PracticeSession'
import MeetingPrep    from './pages/MeetingPrep'
import AuthCallback   from './pages/AuthCallback'
import Pricing        from './pages/Pricing'
import ScriptReading  from './pages/ScriptReading'
import DailyChallenge from './pages/DailyChallenge'
import MicroDrill     from './pages/MicroDrill'
import Progress       from './pages/Progress'
import BodyLanguage   from './pages/BodyLanguage'
import Assessment     from './pages/Assessment'
import CallAnalyzer   from './pages/CallAnalyzer'
import Reminders      from './pages/Reminders'
import HowItWorks     from './pages/HowItWorks'
import ReminderScheduler from './components/ReminderScheduler'

// In the native Android/iOS shell there is no SPA server fallback, so deep
// links and hard refreshes on a path route would 404. HashRouter keeps all
// routing client-side there. The web build keeps clean BrowserRouter URLs.
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter

export default function App() {
  // Android hardware back button: go back through history, or exit at the root.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handle = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else CapApp.exitApp()
    })
    return () => { handle.then(h => h.remove()) }
  }, [])

  return (
    <Router>
      <ReminderScheduler />
      <Routes>
        {/* Public */}
        <Route path="/"              element={<Landing />} />
        <Route path="/auth"          element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pricing"       element={<Pricing />} />
        <Route path="/how-it-works"  element={<HowItWorks />} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/practice"  element={<ProtectedRoute><Practice /></ProtectedRoute>} />
        <Route path="/practice/:scenarioId" element={<ProtectedRoute><PracticeSession /></ProtectedRoute>} />
        <Route path="/meeting-prep"    element={<ProtectedRoute><MeetingPrep /></ProtectedRoute>} />
        <Route path="/script-reading"  element={<ProtectedRoute><ScriptReading /></ProtectedRoute>} />
        <Route path="/daily-challenge" element={<ProtectedRoute><DailyChallenge /></ProtectedRoute>} />
        <Route path="/micro-drill"     element={<ProtectedRoute><MicroDrill /></ProtectedRoute>} />
        <Route path="/progress"        element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/body-language"   element={<ProtectedRoute><BodyLanguage /></ProtectedRoute>} />
        <Route path="/assessment"      element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
        <Route path="/call-analyzer"   element={<ProtectedRoute><CallAnalyzer /></ProtectedRoute>} />
        <Route path="/reminders"       element={<ProtectedRoute><Reminders /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
