import { useState, useEffect } from 'react'
import TopMenu from '../components/TopMenu'
import { getAllProducts, getExcludedProducts, updateExcludedProducts, syncProducts } from '../services/api'

export default function AdminExcluded() {
  const [products, setProducts] = useState<any[]>([])
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/kitchen', label: 'Kuchyň' },
    { path: '/bar', label: 'Bar' },
    { path: '/statistics', label: 'Statistiky' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [allProducts, excluded] = await Promise.all([
        getAllProducts(),
        getExcludedProducts()
      ])
      setProducts(allProducts)
      setExcludedIds(new Set(excluded.map(e => e.product_id)))
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setIsLoading(false)
    }
  }

  const handleSyncProducts = async () => {
    setIsSyncing(true)
    setMessage(null)
    try {
      const result = await syncProducts()
      if (result.success) {
        setMessage('Produkty úspěšně načteny z Dotykačky')
        await loadData()
      } else {
        setMessage(`Chyba: ${result.error}`)
      }
    } catch (error) {
      setMessage('Chyba při synchronizaci produktů')
    }
    setIsSyncing(false)
  }

  const toggleProduct = (productId: string) => {
    const newExcluded = new Set(excludedIds)
    if (newExcluded.has(productId)) {
      newExcluded.delete(productId)
    } else {
      newExcluded.add(productId)
    }
    setExcludedIds(newExcluded)
  }

  const handleSave = async () => {
    try {
      await updateExcludedProducts(Array.from(excludedIds))
      setMessage('Vyloučené položky byly úspěšně uloženy')
    } catch (error) {
      setMessage('Chyba při ukládání vyloučených položek')
    }
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

      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={handleSyncProducts}
          disabled={isSyncing}
          style={{
            padding: '10px 20px',
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSyncing ? 'not-allowed' : 'pointer',
            opacity: isSyncing ? 0.6 : 1
          }}
        >
          {isSyncing ? 'Synchronizuji...' : '🔄 Načíst produkty z Dotykačky'}
        </button>
      </div>

      {isLoading ? (
        <p>Načítám produkty...</p>
      ) : products.length === 0 ? (
        <div style={{
          background: '#fff',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <p style={{ color: '#64748b', marginBottom: '16px' }}>
            Zatím nebyly načteny žádné produkty.
          </p>
          <p style={{ color: '#64748b' }}>
            Klikněte na tlačítko výše pro načtení produktů z Dotykačky API.
          </p>
        </div>
      ) : (
        <>
          <div style={{
            background: '#fff',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            marginBottom: '16px'
          }}>
            <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }}>
              Vyberte produkty, které se nemají zobrazovat v kuchyni:
            </p>
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '8px'
            }}>
              {products.map(product => (
                <label
                  key={product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: excludedIds.has(product.id) ? '#fef2f2' : '#f8fafc',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: excludedIds.has(product.id) ? '1px solid #fecaca' : '1px solid #e2e8f0'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={excludedIds.has(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#0f172a' }}>
                    {product.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            💾 Uložit vyloučené položky
          </button>
        </>
      )}
    </div>
  )
}
