import { Link, useLocation } from 'react-router-dom'

interface TopMenuProps {
  items: Array<{ path: string; label: string }>
}

export default function TopMenu({ items }: TopMenuProps) {
  const location = useLocation()

  return (
    <div style={styles.container}>
      {items.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          style={{
            ...styles.link,
            ...(location.pathname === item.path ? styles.linkActive : {})
          }}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: '#fff',
    padding: '12px 16px',
    borderRadius: '12px',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  link: {
    textDecoration: 'none',
    padding: '6px 12px',
    background: '#f1f5f9',
    borderRadius: '6px',
    color: '#475569',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  linkActive: {
    background: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6'
  }
}
