import { useState, useEffect } from 'react'
import TopMenu from '../components/TopMenu'
import { supabase } from '../lib/supabase'

export default function AdminWarnings() {
  const [warningOrders, setWarningOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/kitchen', label: 'Kuchyň' },
    { path: '/bar', label: 'Bar' },
    { path: '/admin/excluded', label: 'Vyloučené položky' },
    { path: '/statistics', label: 'Statistiky' }
  ]

  const loadWarnings = async () => {
    try {
      const { data, error } = await supabase
        .from('order_timing')
        .select('*')
        .eq('status', 'warning')
        .order('created_at', { ascending: true })

      if (error) throw error
      setWarningOrders(data || [])
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading warnings:', error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWarnings()

    const interval = setInterval(loadWarnings, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleResolve = async (orderId: string) => {
    if (!confirm('Označit objednávku jako vyřešenou? Tato akce je nevratná.')) return

    try {
      await supabase
        .from('order_timing')
        .update({
          status: 'archived',
          warning_reason: 'Vyřešeno administrátorem'
        })
        .eq('order_id', orderId)

      await supabase
        .from('order_items')
        .update({ kitchen_status: 'passed' })
        .eq('order_id', orderId)

      await loadWarnings()
    } catch (error) {
      console.error('Error resolving order:', error)
    }
  }

  const handleReturn = async (orderId: string) => {
    if (!confirm('Vrátit objednávku zpět do kuchyně?')) return

    try {
      await supabase
        .from('order_timing')
        .update({
          status: 'active',
          warning_reason: ''
        })
        .eq('order_id', orderId)

      await loadWarnings()
    } catch (error) {
      console.error('Error returning order:', error)
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '16px' }}>
        <TopMenu items={menuItems} />
        <p>Načítám výstražné objednávky...</p>
      </div>
    )
  }

  const calculateMinutesElapsed = (createdAt: string) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  }

  return (
    <div style={{ padding: '16px' }}>
      <TopMenu items={menuItems} />

      <h1 style={{
        margin: '0 0 24px 0',
        fontWeight: '600',
        fontSize: '24px',
        color: '#0f172a'
      }}>
        ⚠️ Výstražné objednávky (nad 30 minut)
      </h1>

      {warningOrders.length === 0 ? (
        <div style={{
          background: '#fff',
          padding: '60px 20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Žádné výstražné objednávky
          </div>
          <div style={{ color: '#6b7280' }}>
            Všechny objednávky jsou zpracovány v rozumném čase
          </div>
        </div>
      ) : (
        <>
          <div style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>
                  {warningOrders.length}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Výstražné objednávky
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '16px'
          }}>
            {warningOrders.map(order => (
              <div key={order.order_id} style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #fca5a5',
                borderLeft: '4px solid #dc2626'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#0f172a'
                  }}>
                    Objednávka #{order.order_id}
                  </div>
                  <div style={{
                    background: '#dc2626',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {calculateMinutesElapsed(order.created_at)} min
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#64748b'
                }}>
                  <div><strong>Stůl:</strong> {order.table_name || 'N/A'}</div>
                  <div><strong>Položek:</strong> {order.total_items}</div>
                  <div>
                    <strong>Vytvořeno:</strong>{' '}
                    {new Date(order.created_at).toLocaleTimeString('cs-CZ', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div><strong>Důvod:</strong> {order.warning_reason}</div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => handleReturn(order.order_id)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: '#059669',
                      color: '#fff'
                    }}
                  >
                    ↩️ Vrátit do kuchyně
                  </button>
                  <button
                    onClick={() => handleResolve(order.order_id)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: '#dc2626',
                      color: '#fff'
                    }}
                  >
                    ✓ Vyřešit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
