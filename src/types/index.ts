export interface Order {
  id: string
  created: string
  note: string
  table_name: string
  delivery_service: string
  delivery_note: string
  last_updated: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  name: string
  quantity: number
  kitchen_status: 'new' | 'in-progress' | 'completed' | 'passed' | 'reordered'
  note: string
  shown: boolean
  last_updated: string
  order_item_subitems?: OrderItemSubitem[]
}

export interface OrderItemSubitem {
  id: string
  order_item_id: string
  name: string
  quantity: number
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
  subitems?: Record<string, OrderItemSubitem[]>
  timing?: OrderTiming
}

export interface ExcludedProduct {
  product_id: string
}

export interface OrderTiming {
  order_id: string
  table_name: string
  delivery_service: string
  created_at: string
  first_item_started: string | null
  all_items_completed: string | null
  passed_at: string | null
  total_items: number
  preparation_time: number | null
  total_time: number | null
  waiting_time: number | null
  status: 'active' | 'completed' | 'warning' | 'archived'
  warning_reason: string
}

export interface ItemStats {
  item_name: string
  product_id: string | null
  total_orders: number
  avg_preparation_time: number
  min_preparation_time: number | null
  max_preparation_time: number | null
}

export interface DailyStats {
  date: string
  total_orders: number
  completed_orders: number
  warning_orders: number
  avg_preparation_time: number
  avg_total_time: number
  max_preparation_time: number
  orders_under_15min: number
  orders_15_30min: number
  orders_over_30min: number
}

export interface StatsUser {
  id: string
  username: string
  role: 'admin' | 'viewer'
  last_login: string | null
  created_at: string
}
