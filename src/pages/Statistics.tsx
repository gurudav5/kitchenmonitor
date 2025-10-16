import { useState, useEffect } from 'react'
import TopMenu from '../components/TopMenu'
import { supabase } from '../lib/supabase'

export default function Statistics() {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/kitchen', label: 'Kuchyň' },
    { path: '/bar', label: 'Bar' },
    { path: '/admin/excluded', label: 'Vyloučené položky' },
    { path: '/admin/warnings', label: 'Výstražné objednávky' }
  ]

  useEffect(() => {
    loadStats()

    const interval = setInterval(() => {
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      await supabase.rpc('calculate_daily_stats')

      const today = new Date().toISOString().split('T')[0]

      const { data: dailyStats, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('date', today)
        .maybeSingle()

      if (error) throw error

      const { count: warningCount } = await supabase
        .from('order_timing')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'warning')

      setStats({
        daily: dailyStats || {
          total_orders: 0,
          avg_preparation_time: 0,
          orders_under_15min: 0,
          orders_over_30min: 0
        },
        warningCount: warningCount || 0
      })

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading stats:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '16px' }}>
        <TopMenu items={menuItems} />
        <p>Načítám statistiky...</p>
      </div>
    )
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
        📊 Statistiky výkonu kuchyně
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#64748b',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Objednávky dnes
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#0f172a' }}>
            {stats?.daily?.total_orders || 0}
          </div>
        </div>

        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#64748b',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Průměrný čas přípravy
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#0f172a' }}>
            {Math.round((stats?.daily?.avg_preparation_time || 0) / 60)}
            <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '4px' }}>
              min
            </span>
          </div>
        </div>

        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#64748b',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Objednávky do 15 min
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#0f172a' }}>
            {stats?.daily?.orders_under_15min || 0}
            <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '4px' }}>
              / {stats?.daily?.total_orders || 0}
            </span>
          </div>
        </div>

        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#64748b',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Objednávky nad 30 min
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '600',
            color: '#dc2626'
          }}>
            {stats?.daily?.orders_over_30min || 0}
            <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '4px' }}>
              / {stats?.daily?.total_orders || 0}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        background: '#fff',
        padding: '32px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <p style={{ color: '#64748b', marginBottom: '8px' }}>
          Detailnější statistiky a grafy budou dostupné po delším sběru dat.
        </p>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Systém automaticky sleduje časování objednávek a generuje statistiky.
        </p>
      </div>
    </div>
  )
}
