import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cloudId = '343951305';
    const refreshToken = 'd4af932a9d1260132c7b3401f8232d7c';

    console.log('Getting access token...');
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
      const errorText = await tokenResponse.text();
      console.error('Token response error:', tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to get access token: ${tokenResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.accessToken;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No access token received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = encodeURIComponent(
      `created|gteq|${sevenDaysAgo.toISOString()};created|lt|${tomorrow.toISOString()}`
    );

    let page = 1;
    const allOrders: any[] = [];

    while (page <= 10) {
      const url = `https://api.dotykacka.cz/v2/clouds/${cloudId}/orders?filter=${filter}&page=${page}&perPage=100`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json; charset=UTF-8',
        },
      });

      if (!response.ok) break;
      const json = await response.json();
      if (!json.data || json.data.length === 0) break;
      allOrders.push(...json.data);
      if (!json.nextPage) break;
      page = json.nextPage;
    }

    let processedOrders = 0;
    let processedItems = 0;

    for (const order of allOrders) {
      const tableName = order._tableId ? await getTableName(cloudId, accessToken, order._tableId) : '';
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
      let itemsPage = 1;
      const orderItems: any[] = [];

      while (itemsPage <= 10) {
        const itemsUrl = `https://api.dotykacka.cz/v2/clouds/${cloudId}/order-items?filter=${itemsFilter}&page=${itemsPage}&perPage=100`;
        const itemsResponse = await fetch(itemsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json; charset=UTF-8',
          },
        });

        if (!itemsResponse.ok) break;
        const itemsJson = await itemsResponse.json();
        if (!itemsJson.data || itemsJson.data.length === 0) break;
        orderItems.push(...itemsJson.data);
        if (!itemsJson.nextPage) break;
        itemsPage = itemsJson.nextPage;
      }

      for (const item of orderItems) {
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
          await supabase.from('order_item_subitems').insert(subitems);
        }
      }
    }

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
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function getTableName(cloudId: string, accessToken: string, tableId: string): Promise<string> {
  try {
    const response = await fetch(`https://api.dotykacka.cz/v2/clouds/${cloudId}/tables/${tableId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json; charset=UTF-8',
      },
    });
    if (!response.ok) return '';
    const data = await response.json();
    return data.name || '';
  } catch {
    return '';
  }
}