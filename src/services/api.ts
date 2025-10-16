import { supabase } from '../lib/supabase'
import type { OrderWithItems, ExcludedProduct } from '../types'

export async function getActiveOrders(): Promise<Record<string, OrderWithItems>> {
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      *,
      orders (*)
    `)
    .in('kitchen_status', ['new', 'in-progress', 'reordered'])
    .order('created', { foreignTable: 'orders', ascending: true })

  if (itemsError) throw itemsError

  const excludedProducts = await getExcludedProducts()
  const excludedIds = new Set(excludedProducts.map(p => p.product_id))

  const filteredItems = (items as any[])?.filter(item =>
    !item.product_id || !excludedIds.has(item.product_id)
  ) || []

  const orders = groupItemsByOrder(filteredItems)

  const orderIds = Object.keys(orders)
  if (orderIds.length > 0) {
    const { data: timings } = await supabase
      .from('order_timing')
      .select('*')
      .in('order_id', orderIds)

    if (timings) {
      for (const timing of timings) {
        if (orders[timing.order_id]) {
          orders[timing.order_id].timing = timing
        }
      }
    }
  }

  return orders
}

export async function getCompletedOrders(): Promise<Record<string, OrderWithItems>> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      *,
      orders (*)
    `)
    .eq('kitchen_status', 'completed')
    .gte('last_updated', thirtyMinutesAgo)
    .order('created', { foreignTable: 'orders', ascending: true })

  if (error) throw error

  const excludedProducts = await getExcludedProducts()
  const excludedIds = new Set(excludedProducts.map(p => p.product_id))

  const filteredItems = (items as any[])?.filter(item =>
    !item.product_id || !excludedIds.has(item.product_id)
  ) || []

  return groupItemsByOrder(filteredItems)
}

export async function getBarCompletedOrders(): Promise<Record<string, OrderWithItems>> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      *,
      orders (*)
    `)
    .eq('kitchen_status', 'completed')
    .gte('last_updated', twoHoursAgo)
    .order('created', { foreignTable: 'orders', ascending: true })

  if (error) throw error

  const excludedProducts = await getExcludedProducts()
  const excludedIds = new Set(excludedProducts.map(p => p.product_id))

  const filteredItems = (items as any[])?.filter(item =>
    !item.product_id || !excludedIds.has(item.product_id)
  ) || []

  return groupItemsByOrder(filteredItems)
}

function groupItemsByOrder(items: any[]): Record<string, OrderWithItems> {
  const orders: Record<string, OrderWithItems> = {}

  for (const item of items) {
    const order = item.orders
    if (!order) continue

    if (!orders[order.id]) {
      orders[order.id] = {
        ...order,
        items: []
      }
    }

    orders[order.id].items.push({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      kitchen_status: item.kitchen_status,
      note: item.note,
      shown: item.shown,
      last_updated: item.last_updated
    })
  }

  return orders
}

export async function updateItemStatus(
  itemIds: string[],
  newStatus: string
): Promise<void> {
  const { error } = await supabase
    .from('order_items')
    .update({
      kitchen_status: newStatus,
      last_updated: new Date().toISOString()
    })
    .in('id', itemIds)

  if (error) throw error
}

export async function passOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('order_items')
    .update({ kitchen_status: 'passed' })
    .eq('order_id', orderId)
    .eq('kitchen_status', 'completed')

  if (error) throw error
}

export async function getExcludedProducts(): Promise<ExcludedProduct[]> {
  const { data, error } = await supabase
    .from('excluded_products')
    .select('*')

  if (error) throw error
  return data || []
}

export async function updateExcludedProducts(productIds: string[]): Promise<void> {
  await supabase.from('excluded_products').delete().neq('product_id', '')

  if (productIds.length > 0) {
    const { error } = await supabase
      .from('excluded_products')
      .insert(productIds.map(id => ({ product_id: id })))

    if (error) throw error
  }
}

export async function autoRemoveExcludedFromKitchen(): Promise<void> {
  const excludedProducts = await getExcludedProducts()
  const excludedIds = excludedProducts.map(p => p.product_id)

  if (excludedIds.length === 0) return

  const { error } = await supabase
    .from('order_items')
    .update({
      kitchen_status: 'passed',
      last_updated: new Date().toISOString()
    })
    .in('kitchen_status', ['new', 'in-progress', 'reordered', 'completed'])
    .in('product_id', excludedIds)

  if (error) throw error
}

export async function getAllProducts(): Promise<any[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function syncProducts(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY

    const response = await fetch(`${supabaseUrl}/functions/v1/sync-products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error syncing products:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function startOrderPreparation(orderId: string): Promise<void> {
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('order_timing')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()

  if (existing) {
    if (!existing.first_item_started) {
      const waitingTime = Math.floor((new Date(now).getTime() - new Date(existing.created_at).getTime()) / 1000)

      const { error } = await supabase
        .from('order_timing')
        .update({
          first_item_started: now,
          waiting_time: waitingTime
        })
        .eq('order_id', orderId)

      if (error) throw error
    }
  } else {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (order) {
      const waitingTime = Math.floor((new Date(now).getTime() - new Date(order.created).getTime()) / 1000)

      const { error } = await supabase
        .from('order_timing')
        .insert({
          order_id: orderId,
          table_name: order.table_name || '',
          delivery_service: order.delivery_service || '',
          created_at: order.created,
          first_item_started: now,
          waiting_time: waitingTime,
          status: 'active'
        })

      if (error) throw error
    }
  }
}

export async function completeOrder(orderId: string): Promise<void> {
  const now = new Date().toISOString()

  const { data: timing } = await supabase
    .from('order_timing')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()

  if (timing && timing.first_item_started) {
    const preparationTime = Math.floor((new Date(now).getTime() - new Date(timing.first_item_started).getTime()) / 1000)
    const totalTime = Math.floor((new Date(now).getTime() - new Date(timing.created_at).getTime()) / 1000)

    const { error } = await supabase
      .from('order_timing')
      .update({
        all_items_completed: now,
        preparation_time: preparationTime,
        total_time: totalTime
      })
      .eq('order_id', orderId)

    if (error) throw error
  }
}
