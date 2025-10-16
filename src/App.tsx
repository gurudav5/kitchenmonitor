import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Kitchen from './pages/Kitchen'
import Bar from './pages/Bar'
import AdminExcluded from './pages/AdminExcluded'
import AdminWarnings from './pages/AdminWarnings'
import Statistics from './pages/Statistics'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/bar" element={<Bar />} />
        <Route path="/admin/excluded" element={<AdminExcluded />} />
        <Route path="/admin/warnings" element={<AdminWarnings />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
