import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cloudId = '343951305';
    const refreshToken = 'd4af932a9d1260132c7b3401f8232d7c';

    const tokenResponse = await fetch('https://api.dotykacka.cz/v2/signin/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json; charset=UTF-8',
        'Authorization': `User ${refreshToken}`,
      },
      body: JSON.stringify({ _cloudId: cloudId }),
    });

    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to authenticate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.accessToken;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const tomorrow3am = new Date();
    tomorrow3am.setDate(tomorrow3am.getDate() + 1);
    tomorrow3am.setHours(3, 0, 0, 0);

    const filter = encodeURIComponent(
      `created|gteq|${todayMidnight.toISOString()};created|lt|${tomorrow3am.toISOString()}`
    );

    let ordersUrl = `https://api.dotykacka.cz/v2/clouds/${cloudId}/orders?page=1&perPage=50&sort=-created`;
    let ordersResponse = await fetch(ordersUrl, {
      signal: AbortSignal.timeout(45000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json; charset=UTF-8',
      },
    });

    if (!ordersResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch orders: ${ordersResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ordersJson = await ordersResponse.json();
    const orders = ordersJson.data || [];

    let processedOrders = 0;
    let processedItems = 0;

    const tableIds = [...new Set(orders.map((o: any) => o._tableId).filter(Boolean))];
    const tablesMap = new Map();

    if (tableIds.length > 0) {
      const tablePromises = tableIds.map(async (tableId) => {
        try {
          const tableResponse = await fetch(
            `https://api.dotykacka.cz/v2/clouds/${cloudId}/tables/${tableId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json; charset=UTF-8',
              },
            }
          );
          if (tableResponse.ok) {
            const tableData = await tableResponse.json();
            return { id: tableId, name: tableData.name || '' };
          }
        } catch (e) {
          console.log('Failed to fetch table:', tableId, e);
        }
        return null;
      });

      const tablesResults = await Promise.all(tablePromises);
      tablesResults.filter(Boolean).forEach((table: any) => {
        tablesMap.set(table.id, table.name);
      });
    }

    const ordersToInsert = orders.map((order: any) => {
      const rawNote = order.note || '';
      const lowerNote = rawNote.toLowerCase();
      let deliveryService = '';
      if (lowerNote.includes('foodora')) deliveryService = 'foodora';
      else if (lowerNote.includes('wolt')) deliveryService = 'wolt';
      else if (lowerNote.includes('bolt')) deliveryService = 'bolt';

      return {
        id: order.id,
        created: order.created,
        note: order.note || '',
        table_name: tablesMap.get(order._tableId) || '',
        delivery_service: deliveryService,
        delivery_note: rawNote,
        last_updated: new Date().toISOString(),
      };
    });

    if (ordersToInsert.length > 0) {
      await supabase.from('orders').upsert(ordersToInsert, { onConflict: 'id' });
      processedOrders = ordersToInsert.length;
    }

    const orderIds = orders.map((o: any) => o.id);
    if (orderIds.length > 0) {
      const itemsUrl = `https://api.dotykacka.cz/v2/clouds/${cloudId}/order-items?page=1&perPage=500&sort=-created`;

      try {
        const itemsResponse = await fetch(itemsUrl, {
          signal: AbortSignal.timeout(30000),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json; charset=UTF-8',
          },
        });

        console.log('Items response status:', itemsResponse.status);

        if (itemsResponse.ok) {
          const itemsJson = await itemsResponse.json();
          const items = itemsJson.data || [];
          console.log('Fetched items count:', items.length);

          const itemIds = items.map((item: any) => item.id);
          const { data: existingItems } = await supabase
            .from('order_items')
            .select('id, kitchen_status')
            .in('id', itemIds);

          const existingStatusMap = new Map();
          if (existingItems) {
            existingItems.forEach((item: any) => {
              if (item.kitchen_status === 'completed' || item.kitchen_status === 'passed') {
                existingStatusMap.set(item.id, item.kitchen_status);
              }
            });
          }

          const orderIdsSet = new Set(orderIds);
          const filteredItems = items.filter((item: any) => orderIdsSet.has(item._orderId));

          const itemsToInsert = filteredItems.map((item: any) => {
            const preservedStatus = existingStatusMap.get(item.id);

            let defaultStatus = 'new';
            if (!preservedStatus && item.completed) {
              defaultStatus = 'completed';
            }

            return {
              id: item.id,
              order_id: item._orderId,
              product_id: item._productId || null,
              name: item.name,
              quantity: item.quantity,
              kitchen_status: preservedStatus || defaultStatus,
              note: item.note || '',
              shown: false,
              last_updated: new Date().toISOString(),
            };
          });

          if (itemsToInsert.length > 0) {
            await supabase.from('order_items').upsert(itemsToInsert, { onConflict: 'id' });
            processedItems = itemsToInsert.length;
          }

          const itemsWithCustomizations = filteredItems.filter((item: any) => item.orderItemCustomizations?.length > 0);
          for (const item of itemsWithCustomizations) {
            await supabase.from('order_item_subitems').delete().eq('order_item_id', item.id);
            const subitems = item.orderItemCustomizations.map((c: any) => ({
              order_item_id: item.id,
              name: c.name,
              quantity: c.quantity,
            }));
            if (subitems.length > 0) {
              await supabase.from('order_item_subitems').insert(subitems);
            }
          }
        } else {
          console.log('Items response not OK, status:', itemsResponse.status, await itemsResponse.text());
        }
      } catch (e) {
        console.log('Failed to fetch items:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Synchronized successfully',
        ordersProcessed: processedOrders,
        itemsProcessed: processedItems,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});