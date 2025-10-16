import { Link } from 'react-router-dom'

export default function Dashboard() {
  const menuItems = [
    { path: '/kitchen', label: 'Kuchyň', icon: '🍳' },
    { path: '/bar', label: 'Bar', icon: '🍺' },
    { path: '/admin/excluded', label: 'Vyloučené položky', icon: '⚙️' },
    { path: '/admin/warnings', label: 'Výstražné objednávky', icon: '⚠️' },
    { path: '/statistics', label: 'Statistiky', icon: '📊' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>MacLaren's pub Monitor</h1>
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
    marginBottom: '40px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
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
