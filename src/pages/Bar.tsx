import { useState, useEffect } from 'react'
import TopMenu from '../components/TopMenu'
import { getBarCompletedOrders, passOrder } from '../services/api'
import type { OrderWithItems } from '../types'
import { format } from 'date-fns'

export default function Bar() {
  const [completedOrders, setCompletedOrders] = useState<Record<string, OrderWithItems>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [countdown, setCountdown] = useState(10)

  const loadOrders = async () => {
    try {
      const completed = await getBarCompletedOrders()
      setCompletedOrders(completed)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  useEffect(() => {
    loadOrders()

    const interval = setInterval(() => {
      loadOrders()
      setCountdown(10)
    }, 10000)

    const countdownInterval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 10)
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(countdownInterval)
    }
  }, [])

  const handlePassOrder = async (orderId: string) => {
    try {
      await passOrder(orderId)
      await loadOrders()
    } catch (error) {
      console.error('Error passing order:', error)
    }
  }

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/kitchen', label: 'Kuchyň' },
    { path: '/admin/excluded', label: 'Vyloučené položky' },
    { path: '/statistics', label: 'Statistiky' }
  ]

  if (isLoading) {
    return (
      <div style={{ padding: '16px' }}>
        <TopMenu items={menuItems} />
        <p>Načítám objednávky...</p>
      </div>
    )
  }

  const renderOrder = (order: OrderWithItems) => {
    const unifiedItems: Record<string, any> = {}
    order.items.forEach(item => {
      const key = `${item.name}|${item.note}`
      if (unifiedItems[key]) {
        unifiedItems[key].quantity += item.quantity
      } else {
        unifiedItems[key] = { ...item }
      }
    })

    return (
      <div key={order.id} style={styles.orderBox}>
        <div style={styles.orderHeader}>
          <h3 style={styles.orderTitle}>Objednávka č. {order.id}</h3>
          <span style={styles.orderTime}>
            {format(new Date(order.created), 'HH:mm')}
          </span>
        </div>

        <div style={styles.orderBody}>
          <div style={styles.orderMeta}>
            {order.table_name && (
              <span style={styles.tableInfo}>Stůl: {order.table_name}</span>
            )}
            {order.delivery_service && (
              <span style={styles.deliveryService}>
                {order.delivery_service.charAt(0).toUpperCase() + order.delivery_service.slice(1)}
              </span>
            )}
          </div>

          <div style={styles.orderItems}>
            {Object.values(unifiedItems).map((item: any, idx) => (
              <div key={idx} style={styles.orderItem}>
                <div style={styles.itemTitle}>
                  {item.quantity} × {item.name}
                </div>
                {item.note && (
                  <div style={styles.itemNote}>{item.note}</div>
                )}
              </div>
            ))}
          </div>

          <div style={styles.orderActions}>
            <button
              style={styles.btnPass}
              onClick={() => handlePassOrder(order.id)}
            >
              Předat objednávku
            </button>
          </div>

          {order.delivery_note && (
            <div style={styles.deliveryNote}>{order.delivery_note}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.autoRefreshInfo}>
        <span style={{
          ...styles.statusIndicator,
          background: '#0ea5e9'
        }} />
        <span>Aktualizace za {countdown}s</span>
      </div>

      <TopMenu items={menuItems} />

      <h2 style={styles.sectionTitle}>Bar - Dokončené objednávky</h2>
      <div style={styles.ordersContainer}>
        {Object.values(completedOrders).length === 0 ? (
          <p style={styles.emptyMessage}>Žádné dokončené objednávky</p>
        ) : (
          Object.values(completedOrders).map(order => renderOrder(order))
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '16px' },
  autoRefreshInfo: {
    position: 'fixed' as const,
    top: '16px',
    right: '16px',
    background: '#fff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#64748b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 1000
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  sectionTitle: {
    fontWeight: '600',
    margin: '0 0 16px 0',
    fontSize: '18px',
    color: '#0f172a'
  },
  ordersContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    alignItems: 'start'
  },
  orderBox: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  orderHeader: {
    padding: '12px 16px',
    background: '#0ea5e9',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600'
  },
  orderTime: {
    fontSize: '12px',
    opacity: 0.8
  },
  orderBody: { padding: '16px' },
  orderMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    fontSize: '12px',
    color: '#64748b'
  },
  tableInfo: {
    background: '#0ea5e9',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  deliveryService: {
    fontSize: '12px',
    color: '#64748b'
  },
  orderItems: {
    marginBottom: '12px'
  },
  orderItem: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    borderLeft: '3px solid #10b981'
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#0f172a'
  },
  itemNote: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: '500',
    marginTop: '4px'
  },
  orderActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px'
  },
  btnPass: {
    padding: '8px 16px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center' as const,
    background: '#0ea5e9',
    color: '#fff'
  },
  deliveryNote: {
    marginTop: '12px',
    padding: '8px',
    background: '#f1f5f9',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#475569',
    borderLeft: '3px solid #3b82f6'
  },
  emptyMessage: {
    textAlign: 'center' as const,
    color: '#64748b',
    padding: '32px',
    gridColumn: '1 / -1'
  }
}
