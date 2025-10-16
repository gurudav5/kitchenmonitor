import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface DotykackaOrder {
  id: string
  created: string
  note?: string
  _tableId?: string
}

interface DotykackaOrderItem {
  id: string
  _orderId: string
  _productId?: string
  name: string
  quantity: number
  kitchenStatus?: string
  note?: string
  orderItemCustomizations?: Array<{
    name: string
    quantity: number
  }>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const cloudId = '343951305'
    const refreshToken = 'd4af932a9d1260132c7b3401f8232d7c'

    console.log('Getting access token...')
    const tokenResponse = await fetch('https://api.dotykacka.cz/v2/signin/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json; charset=UTF-8',
        'Authorization': `User ${refreshToken}`,
      },
      body: JSON.stringify({ _cloudId: cloudId }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.accessToken

    if (!accessToken) {
      throw new Error('No access token received')
    }

    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const todayMidnightISO = todayMidnight.toISOString()

    const tomorrow3am = new Date()
    tomorrow3am.setDate(tomorrow3am.getDate() + 1)
    tomorrow3am.setHours(3, 0, 0, 0)
    const tomorrow3amISO = tomorrow3am.toISOString()

    const filter = encodeURIComponent(
      `created|gteq|${todayMidnightISO};created|lt|${tomorrow3amISO}`
    )

    console.log('Fetching orders...')
    const allOrders = await fetchAllOrders(cloudId, accessToken, filter)
    console.log(`Fetched ${allOrders.length} orders`)

    let processedOrders = 0
    let processedItems = 0

    for (const order of allOrders) {
      const tableName = await getTableName(cloudId, accessToken, order._tableId)

      const rawNote = order.note || ''
      const lowerNote = rawNote.toLowerCase()
      let deliveryService = ''
      if (lowerNote.includes('foodora')) {
        deliveryService = 'foodora'
      } else if (lowerNote.includes('wolt')) {
        deliveryService = 'wolt'
      } else if (lowerNote.includes('bolt')) {
        deliveryService = 'bolt'
      }

      await saveOrder(supabase, order, tableName, deliveryService, rawNote)
      processedOrders++

      const orderItems = await fetchAllOrderItems(cloudId, accessToken, order.id)

      for (const item of orderItems) {
        await saveOrderItem(supabase, item, order.id)
        processedItems++

        if (item.orderItemCustomizations && item.orderItemCustomizations.length > 0) {
          await supabase
            .from('order_item_subitems')
            .delete()
            .eq('order_item_id', item.id)

          const subitems = item.orderItemCustomizations.map((cust) => ({
            order_item_id: item.id,
            name: cust.name,
            quantity: cust.quantity,
          }))

          if (subitems.length > 0) {
            await supabase.from('order_item_subitems').insert(subitems)
          }
        }
      }
    }

    console.log(`Processed ${processedOrders} orders, ${processedItems} items`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Orders synchronized successfully',
        ordersProcessed: processedOrders,
        itemsProcessed: processedItems,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error syncing orders:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})

async function fetchAllOrders(
  cloudId: string,
  accessToken: string,
  filter: string
): Promise<DotykackaOrder[]> {
  const allOrders: DotykackaOrder[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const url = `https://api.dotykacka.cz/v2/clouds/${cloudId}/orders?filter=${filter}&page=${page}&perPage=${perPage}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json; charset=UTF-8',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`)
    }

    const json = await response.json()
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      break
    }

    allOrders.push(...json.data)

    if (!json.nextPage) {
      break
    }

    page = json.nextPage
  }

  return allOrders
}

async function fetchAllOrderItems(
  cloudId: string,
  accessToken: string,
  orderId: string
): Promise<DotykackaOrderItem[]> {
  const allItems: DotykackaOrderItem[] = []
  let page = 1
  const perPage = 100
  const filter = encodeURIComponent(`_orderId|eq|${orderId}`)

  while (true) {
    const url = `https://api.dotykacka.cz/v2/clouds/${cloudId}/order-items?filter=${filter}&page=${page}&perPage=${perPage}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json; charset=UTF-8',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch order items: ${response.status}`)
    }

    const json = await response.json()
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      break
    }

    allItems.push(...json.data)

    if (!json.nextPage) {
      break
    }

    page = json.nextPage
  }

  return allItems
}

async function getTableName(
  cloudId: string,
  accessToken: string,
  tableId?: string
): Promise<string> {
  if (!tableId) {
    return ''
  }

  try {
    const url = `https://api.dotykacka.cz/v2/clouds/${cloudId}/tables/${tableId}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json; charset=UTF-8',
      },
    })

    if (!response.ok) {
      return ''
    }

    const tableData = await response.json()
    return tableData.name || ''
  } catch {
    return ''
  }
}

async function saveOrder(
  supabase: any,
  order: DotykackaOrder,
  tableName: string,
  deliveryService: string,
  deliveryNote: string
) {
  const { error } = await supabase.from('orders').upsert(
    {
      id: order.id,
      created: order.created,
      note: order.note || '',
      table_name: tableName,
      delivery_service: deliveryService,
      delivery_note: deliveryNote,
      last_updated: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  )

  if (error) {
    console.error('Error saving order:', error)
    throw error
  }
}

async function saveOrderItem(
  supabase: any,
  item: DotykackaOrderItem,
  orderId: string
) {
  const { error } = await supabase.from('order_items').upsert(
    {
      id: item.id,
      order_id: orderId,
      product_id: item._productId || null,
      name: item.name,
      quantity: item.quantity,
      kitchen_status: item.kitchenStatus || 'new',
      note: item.note || '',
      shown: false,
      last_updated: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  )

  if (error) {
    console.error('Error saving order item:', error)
    throw error
  }
}