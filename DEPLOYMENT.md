# Deployment Guide

## Rychlý start

```bash
# 1. Instalace závislostí
npm install

# 2. Konfigurace environment variables
cp .env.example .env
# Vyplňte VITE_SUPABASE_URL a VITE_SUPABASE_SUPABASE_ANON_KEY

# 3. Spuštění vývojového serveru
npm run dev

# 4. Build pro produkci
npm run build
```

## Produkční deployment

### Vercel (Doporučeno)

1. Nainstalujte Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Nastavte environment variables v Vercel dashboardu:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_SUPABASE_ANON_KEY`

### Netlify

1. Vytvořte `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Deploy přes Netlify CLI nebo GitHub integration

### Vlastní server (Nginx/Apache)

1. Build:
```bash
npm run build
```

2. Zkopírujte obsah `dist/` na server

3. Nginx konfigurace:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # HTTPS redirect doporučen
    # return 301 https://$server_name$request_uri;
}
```

## Supabase konfigurace

### 1. Vytvoření projektu

1. Přihlaste se na [supabase.com](https://supabase.com)
2. Vytvořte nový projekt
3. Počkejte na dokončení setup (cca 2 minuty)

### 2. Migrace databáze

Všechny migrace jsou v `supabase/migrations/` složce.
Migrace se automaticky aplikovaly při prvním spuštění.

Pro manuální aplikaci:
1. Otevřete Supabase SQL Editor
2. Zkopírujte obsah migračního souboru
3. Spusťte SQL

### 3. Environment Variables

Získejte z Supabase dashboardu:
- Project URL → `VITE_SUPABASE_URL`
- Project anon key → `VITE_SUPABASE_SUPABASE_ANON_KEY`

## Integrace s Dotykačkou

Pro synchronizaci objednávek z Dotykačka API je potřeba vytvořit backend service.

### Možnost 1: Supabase Edge Function

1. Vytvořte Edge Function:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Logika z fetch_orders.php
  // Volání Dotykačka API
  // Uložení do Supabase

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

2. Deploy:
```bash
supabase functions deploy sync-orders
```

3. Nastavte cron job (např. každých 5 minut):
```bash
curl -X POST https://your-project.supabase.co/functions/v1/sync-orders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Možnost 2: Samostatný backend service

Vytvořte Node.js service, který:
1. Volá Dotykačka API každých 5 minut
2. Ukládá data do Supabase přes Supabase client

## Monitoring a logging

### Supabase Dashboard

- Sledujte databázové metriky v Supabase dashboardu
- Nastavte alerty pro vysoké využití

### Error tracking (doporučeno)

Integrace Sentry:
```bash
npm install @sentry/react
```

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

## Backup strategie

### Automatické backupy Supabase

Supabase dělá automatické backupy každých 24 hodin (na placených plánech).

### Manuální backup

```bash
# Export dat
npx supabase db dump > backup-$(date +%Y%m%d).sql
```

## Performance optimalizace

### 1. Caching

Pro statické assety nastavte cache headers:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Komprese

Zapněte gzip v Nginx:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### 3. CDN (volitelné)

Pro globální dostupnost použijte CDN jako Cloudflare nebo AWS CloudFront.

## Bezpečnostní checklist

- [ ] HTTPS je povinné v produkci
- [ ] Environment variables nejsou v git repository
- [ ] RLS je aktivní na všech tabulkách
- [ ] Supabase anon key je veřejný (je to OK, RLS chrání data)
- [ ] API rate limiting je nakonfigurován
- [ ] Monitoring a error tracking je aktivní
- [ ] Automatické backupy jsou nastavené

## Troubleshooting

### Build selhává

```bash
# Vyčistěte cache a node_modules
rm -rf node_modules dist
npm install
npm run build
```

### Supabase connection timeout

- Zkontrolujte environment variables
- Ověřte že Supabase projekt běží
- Zkontrolujte síťové připojení

### Data se nenačítají

- Otevřete browser console pro error messages
- Zkontrolujte RLS policies v Supabase dashboardu
- Ověřte že data existují v databázi

## Support

Pro problémy nebo otázky:
- Supabase: [docs.supabase.com](https://docs.supabase.com)
- React: [react.dev](https://react.dev)
- Vite: [vitejs.dev](https://vitejs.dev)
