import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Dashboard() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const menuItems = [
    { path: '/kitchen', label: 'Kuchyň', icon: '🍳' },
    { path: '/bar', label: 'Bar', icon: '🍺' },
    { path: '/admin/excluded', label: 'Vyloučené položky', icon: '⚙️' },
    { path: '/admin/warnings', label: 'Výstražné objednávky', icon: '⚠️' },
    { path: '/statistics', label: 'Statistiky', icon: '📊' }
  ]

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncMessage(null)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/sync-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        setSyncMessage({
          type: 'success',
          text: `✓ Synchronizováno ${data.ordersProcessed} objednávek a ${data.itemsProcessed} položek`
        })
      } else {
        setSyncMessage({
          type: 'error',
          text: `✗ Chyba: ${data.error}`
        })
      }
    } catch (error) {
      setSyncMessage({
        type: 'error',
        text: `✗ Chyba při synchronizaci: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>MacLaren's pub Monitor</h1>
      </div>

      {syncMessage && (
        <div style={{
          ...styles.message,
          ...(syncMessage.type === 'success' ? styles.messageSuccess : styles.messageError)
        }}>
          {syncMessage.text}
        </div>
      )}

      <div style={styles.syncSection}>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          style={{
            ...styles.syncButton,
            ...(isSyncing ? styles.syncButtonDisabled : {})
          }}
        >
          {isSyncing ? '🔄 Synchronizuji...' : '🔄 Synchronizovat objednávky z Dotykačky'}
        </button>
        <p style={styles.syncInfo}>
          Automatická synchronizace probíhá každých 5 minut
        </p>
      </div>

      <div style={styles.grid}>
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path} style={styles.card}>
            <div style={styles.icon}>{item.icon}</div>
            <h3 style={styles.cardTitle}>{item.label}</h3>
          </Link>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid'
  },
  messageSuccess: {
    background: '#f0fdf4',
    color: '#166534',
    borderColor: '#bbf7d0'
  },
  messageError: {
    background: '#fef2f2',
    color: '#dc2626',
    borderColor: '#fecaca'
  },
  syncSection: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    padding: '24px',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  syncButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    background: '#3b82f6',
    color: '#fff',
    transition: 'all 0.2s',
    marginBottom: '12px'
  },
  syncButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  syncInfo: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: '#333',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    border: '1px solid #e2e8f0'
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center' as const
  }
}
