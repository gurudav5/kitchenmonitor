import { useState } from 'react'
import TopMenu from '../components/TopMenu'

export default function AdminExcluded() {
  const [message] = useState<string | null>(null)

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/kitchen', label: 'Kuchyň' },
    { path: '/bar', label: 'Bar' },
    { path: '/statistics', label: 'Statistiky' }
  ]

  return (
    <div style={{ padding: '16px' }}>
      <TopMenu items={menuItems} />

      <h1 style={{
        margin: '0 0 24px 0',
        fontWeight: '600',
        fontSize: '24px',
        color: '#0f172a'
      }}>
        Administrace vyloučených položek
      </h1>

      {message && (
        <div style={{
          background: '#f0fdf4',
          color: '#166534',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #bbf7d0'
        }}>
          {message}
        </div>
      )}

      <div style={{
        background: '#fff',
        padding: '32px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          Pro správu vyloučených položek je potřeba nejprve naimportovat produkty z Dotykačky API.
        </p>
        <p style={{ color: '#64748b' }}>
          Tato funkcionalita bude dostupná po implementaci synchronizace s Dotykačkou.
        </p>
      </div>
    </div>
  )
}
