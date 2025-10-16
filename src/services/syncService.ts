const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minut

let syncIntervalId: number | null = null

export async function syncOrders(): Promise<{ success: boolean; error?: string }> {
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
    return data
  } catch (error) {
    console.error('Error syncing orders:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export function startAutoSync() {
  if (syncIntervalId !== null) {
    return // Already running
  }

  // První synchronizace okamžitě
  syncOrders().then(result => {
    if (result.success) {
      console.log('Initial sync completed successfully')
    } else {
      console.error('Initial sync failed:', result.error)
    }
  })

  // Opakovaná synchronizace každých 5 minut
  syncIntervalId = window.setInterval(() => {
    syncOrders().then(result => {
      if (result.success) {
        console.log('Auto-sync completed successfully')
      } else {
        console.error('Auto-sync failed:', result.error)
      }
    })
  }, SYNC_INTERVAL)

  console.log('Auto-sync started (every 5 minutes)')
}

export function stopAutoSync() {
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId)
    syncIntervalId = null
    console.log('Auto-sync stopped')
  }
}
