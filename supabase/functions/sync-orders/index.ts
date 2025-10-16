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

    const ordersUrl = `https://api.dotykacka.cz/v2/clouds/${cloudId}/orders?filter=${filter}&page=1&perPage=100`;
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json; charset=UTF-8',
      },
    });

    if (!ordersResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ordersJson = await ordersResponse.json();
    const orders = ordersJson.data || [];

    let processedOrders = 0;
    let processedItems = 0;

    for (const order of orders) {
      let tableName = '';
      if (order._tableId) {
        try {
          const tableResponse = await fetch(
            `https://api.dotykacka.cz/v2/clouds/${cloudId}/tables/${order._tableId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json; charset=UTF-8',
              },
            }
          );
          if (tableResponse.ok) {
            const tableData = await tableResponse.json();
            tableName = tableData.name || '';
          }
        } catch (e) {
          console.log('Failed to fetch table:', e);
        }
      }

      const rawNote = order.note || '';
      const lowerNote = rawNote.toLowerCase();
      let deliveryService = '';
      if (lowerNote.includes('foodora')) deliveryService = 'foodora';
      else if (lowerNote.includes('wolt')) deliveryService = 'wolt';
      else if (lowerNote.includes('bolt')) deliveryService = 'bolt';

      await supabase.from('orders').upsert({
        id: order.id,
        created: order.created,
        note: order.note || '',
        table_name: tableName,
        delivery_service: deliveryService,
        delivery_note: rawNote,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'id' });

      processedOrders++;

      const itemsFilter = encodeURIComponent(`_orderId|eq|${order.id}`);
      const itemsUrl = `https://api.dotykacka.cz/v2/clouds/${cloudId}/order-items?filter=${itemsFilter}&page=1&perPage=100`;
      
      try {
        const itemsResponse = await fetch(itemsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json; charset=UTF-8',
          },
        });

        if (itemsResponse.ok) {
          const itemsJson = await itemsResponse.json();
          const items = itemsJson.data || [];

          for (const item of items) {
            await supabase.from('order_items').upsert({
              id: item.id,
              order_id: order.id,
              product_id: item._productId || null,
              name: item.name,
              quantity: item.quantity,
              kitchen_status: item.kitchenStatus || 'new',
              note: item.note || '',
              shown: false,
              last_updated: new Date().toISOString(),
            }, { onConflict: 'id' });

            processedItems++;

            if (item.orderItemCustomizations?.length > 0) {
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
          }
        }
      } catch (e) {
        console.log('Failed to fetch items for order:', order.id, e);
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