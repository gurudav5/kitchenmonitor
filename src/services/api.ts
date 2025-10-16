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

  return groupItemsByOrder(filteredItems)
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
    .update({ kitchen_status: newStatus })
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
