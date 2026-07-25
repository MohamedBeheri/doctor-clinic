import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppSelector } from './app/store'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Appointments from './pages/Appointments'
import Invoices from './pages/Invoices'
import Finance from './pages/Finance'
import Reception from './pages/Reception'
import WaitingRoom from './pages/WaitingRoom'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  const access = useAppSelector((s) => s.auth.access)
  const user = useAppSelector((s) => s.auth.user)

  if (!access) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Receptionists land on the front-desk view by default.
  const home = user?.role === 'receptionist' ? <Reception /> : <Dashboard />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={home} />
        <Route path="/reception" element={<Reception />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
