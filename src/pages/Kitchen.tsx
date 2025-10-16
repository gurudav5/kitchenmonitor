import { useState, useEffect } from 'react'
import TopMenu from '../components/TopMenu'
import { getActiveOrders, getCompletedOrders, updateItemStatus, passOrder, autoRemoveExcludedFromKitchen, startOrderPreparation, completeOrder } from '../services/api'
import type { OrderWithItems } from '../types'
import { format } from 'date-fns'

export default function Kitchen() {
  const [activeOrders, setActiveOrders] = useState<Record<string, OrderWithItems>>({})
  const [completedOrders, setCompletedOrders] = useState<Record<string, OrderWithItems>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [countdown, setCountdown] = useState(10)

  const loadOrders = async () => {
    try {
      await autoRemoveExcludedFromKitchen()
      const [active, completed] = await Promise.all([
        getActiveOrders(),
        getCompletedOrders()
      ])
      setActiveOrders(active)
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

  const handlePrepareOrder = async (orderId: string) => {
    const order = activeOrders[orderId]
    if (!order) return

    const itemIds = order.items.map(item => item.id)
    try {
      await Promise.all([
        updateItemStatus(itemIds, 'in-progress'),
        startOrderPreparation(orderId)
      ])
      await loadOrders()
    } catch (error) {
      console.error('Error preparing order:', error)
    }
  }

  const handleCompleteOrder = async (orderId: string) => {
    const order = activeOrders[orderId]
    if (!order) return

    const itemIds = order.items.map(item => item.id)
    try {
      await Promise.all([
        updateItemStatus(itemIds, 'completed'),
        completeOrder(orderId)
      ])
      await loadOrders()
      setTimeout(async () => {
        await passOrder(orderId)
        await loadOrders()
      }, 5000)
    } catch (error) {
      console.error('Error completing order:', error)
    }
  }

  const handleReturnOrder = async (orderId: string) => {
    const order = completedOrders[orderId]
    if (!order) return

    const itemIds = order.items.map(item => item.id)
    try {
      await updateItemStatus(itemIds, 'in-progress')
      await loadOrders()
    } catch (error) {
      console.error('Error returning order:', error)
    }
  }

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/bar', label: 'Bar' },
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

  const calculateTime = (order: OrderWithItems) => {
    const now = Date.now()
    const createdTime = new Date(order.created).getTime()
    const totalMinutes = Math.floor((now - createdTime) / 60000)

    if (order.timing?.first_item_started) {
      const startedTime = new Date(order.timing.first_item_started).getTime()
      const preparationMinutes = Math.floor((now - startedTime) / 60000)
      return {
        total: totalMinutes,
        waiting: order.timing.waiting_time ? Math.floor(order.timing.waiting_time / 60) : null,
        preparation: preparationMinutes
      }
    }

    return {
      total: totalMinutes,
      waiting: null,
      preparation: null
    }
  }

  const renderOrder = (order: OrderWithItems, isCompleted: boolean = false) => {
    const allCompleted = order.items.every(item => item.kitchen_status === 'completed')
    const allInProgress = order.items.every(item => item.kitchen_status === 'in-progress')
    const timeInfo = calculateTime(order)

    const unifiedItems: Record<string, any> = {}
    order.items.forEach(item => {
      const key = `${item.name}|${item.note}|${item.kitchen_status}`
      if (unifiedItems[key]) {
        unifiedItems[key].quantity += item.quantity
        unifiedItems[key].ids.push(item.id)
      } else {
        unifiedItems[key] = { ...item, ids: [item.id] }
      }
    })

    return (
      <div key={order.id} style={{
        ...styles.orderBox,
        ...(isCompleted ? styles.orderBoxCompleted : {})
      }}>
        <div style={styles.orderHeader}>
          <h3 style={styles.orderTitle}>Objednávka č. {order.id}</h3>
          <span style={styles.orderTime}>
            {format(new Date(order.created), 'HH:mm')}
          </span>
        </div>

        <div style={styles.orderBody}>
          <div style={styles.timeInfo}>
            <div style={styles.timeBlock}>
              <span style={styles.timeLabel}>Celkem:</span>
              <span style={{
                ...styles.timeValue,
                color: timeInfo.total > 15 ? '#dc2626' : timeInfo.total > 10 ? '#f59e0b' : '#10b981'
              }}>
                {timeInfo.total} min
              </span>
            </div>
            {timeInfo.preparation !== null && (
              <div style={styles.timeBlock}>
                <span style={styles.timeLabel}>Příprava:</span>
                <span style={styles.timeValue}>{timeInfo.preparation} min</span>
              </div>
            )}
          </div>

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
              <div key={idx} style={{
                ...styles.orderItem,
                ...(item.kitchen_status === 'new' ? styles.statusNew : {}),
                ...(item.kitchen_status === 'in-progress' ? styles.statusInProgress : {}),
                ...(item.kitchen_status === 'completed' ? styles.statusCompleted : {})
              }}>
                <div style={styles.itemTitle}>
                  {item.quantity} × {item.name}
                </div>
                {item.note && (
                  <div style={styles.itemNote}>{item.note}</div>
                )}
              </div>
            ))}
          </div>

          {!isCompleted && (
            <div style={styles.orderActions}>
              {allCompleted ? (
                <div style={styles.completionInfo}>
                  ✅ Objednávka dokončena - bude automaticky předána do baru
                </div>
              ) : allInProgress ? (
                <button
                  style={styles.btnComplete}
                  onClick={() => handleCompleteOrder(order.id)}
                >
                  Dokončit vše
                </button>
              ) : (
                <button
                  style={styles.btnPreparing}
                  onClick={() => handlePrepareOrder(order.id)}
                >
                  Připravit vše
                </button>
              )}
            </div>
          )}

          {isCompleted && (
            <div style={styles.orderActions}>
              <button
                style={styles.btnSecondary}
                onClick={() => handleReturnOrder(order.id)}
              >
                Vrátit do přípravy
              </button>
            </div>
          )}

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
          background: '#10b981'
        }} />
        <span>Aktualizace za {countdown}s</span>
      </div>

      <TopMenu items={menuItems} />

      <h2 style={styles.sectionTitle}>Kuchyň - Aktivní</h2>
      <div style={styles.ordersContainer}>
        {Object.values(activeOrders).length === 0 ? (
          <p style={styles.emptyMessage}>Žádné aktivní objednávky</p>
        ) : (
          Object.values(activeOrders)
            .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
            .map(order => renderOrder(order, false))
        )}
      </div>

      <hr style={styles.divider} />

      <h2 style={styles.sectionTitle}>Kuchyň - Dokončené</h2>
      <div style={styles.ordersContainer}>
        {Object.values(completedOrders).length === 0 ? (
          <p style={styles.emptyMessage}>Žádné dokončené objednávky</p>
        ) : (
          Object.values(completedOrders)
            .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
            .map(order => renderOrder(order, true))
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
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  orderBoxCompleted: {
    opacity: 0.6,
    background: '#f8fafc'
  },
  orderHeader: {
    padding: '12px 16px',
    background: '#0f172a',
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
  timeInfo: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  },
  timeBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  timeLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500'
  },
  timeValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a'
  },
  orderMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    fontSize: '12px',
    color: '#64748b'
  },
  tableInfo: {
    background: '#0f172a',
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
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    borderLeft: '3px solid #e2e8f0'
  },
  statusNew: {
    borderLeftColor: '#ef4444',
    background: '#fef2f2'
  },
  statusInProgress: {
    borderLeftColor: '#f59e0b',
    background: '#fffbeb'
  },
  statusCompleted: {
    borderLeftColor: '#10b981',
    background: '#f0fdf4'
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
  btnPreparing: {
    padding: '8px 16px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center' as const,
    background: '#f59e0b',
    color: '#fff'
  },
  btnComplete: {
    padding: '8px 16px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center' as const,
    background: '#10b981',
    color: '#fff'
  },
  btnSecondary: {
    padding: '8px 16px',
    fontSize: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center' as const,
    background: '#f1f5f9',
    color: '#475569'
  },
  completionInfo: {
    background: '#f0fdf4',
    color: '#166534',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'center' as const,
    border: '1px solid #bbf7d0',
    flex: 1
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
  divider: {
    margin: '32px 0',
    border: '0',
    borderTop: '1px solid #e2e8f0'
  },
  emptyMessage: {
    textAlign: 'center' as const,
    color: '#64748b',
    padding: '32px',
    gridColumn: '1 / -1'
  }
}
