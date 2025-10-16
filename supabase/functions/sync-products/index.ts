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

    let page = 1;
    const allProducts: any[] = [];

    while (page <= 20) {
      const url = `https://api.dotykacka.cz/v2/clouds/${cloudId}/products?page=${page}&perPage=100`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json; charset=UTF-8',
        },
      });

      if (!response.ok) break;
      const json = await response.json();
      if (!json.data || json.data.length === 0) break;
      allProducts.push(...json.data);
      if (!json.nextPage) break;
      page = json.nextPage;
    }

    for (const product of allProducts) {
      await supabase.from('products').upsert({
        id: product.id,
        name: product.name || '',
        category: product._categoryId || '',
        last_updated: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Products synchronized successfully',
        productsProcessed: allProducts.length,
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