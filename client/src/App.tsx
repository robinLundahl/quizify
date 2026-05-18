import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from './components/ui/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QuizEditor from './pages/QuizEditor'
import HostView from './pages/HostView'
import JoinView from './pages/JoinView'
import ResultsView from './pages/ResultsView'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<JoinView />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quiz/:id" element={<QuizEditor />} />
            <Route path="/host/:sessionId" element={<HostView />} />
            <Route path="/results/:sessionId" element={<ResultsView />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
