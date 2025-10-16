# Kitchen Monitor System

Moderní systém pro monitorování kuchyňských objednávek postavený na React, Vite a Supabase.

## Hlavní funkce

- **Kuchyň** - Zobrazení aktivních a dokončených objednávek s možností změny stavu
- **Bar** - Přehled dokončených objednávek připravených k výdeji
- **Administrace vyloučených položek** - Správa produktů, které se nemají zobrazovat v kuchyni (např. nápoje)
- **Výstražné objednávky** - Přehled objednávek trvajících déle než 30 minut
- **Statistiky** - Výkonnostní metriky kuchyně (časy přípravy, počty objednávek, atd.)

## Technologie

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL databáze, real-time subscriptions)
- **Styling**: Inline CSS pro maximální jednoduchost
- **Date formatting**: date-fns
- **Router**: React Router v6

## Instalace

```bash
# Instalace závislostí
npm install

# Spuštění vývojového serveru
npm run dev

# Build pro produkci
npm run build
```

## Konfigurace

Vytvořte soubor `.env` s následujícími hodnotami:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your-anon-key
```

## Databázové schéma

Systém používá následující tabulky:

- `orders` - Objednávky
- `order_items` - Položky objednávek
- `order_item_subitems` - Podpoložky (přizpůsobení)
- `excluded_products` - Vyloučené produkty
- `order_timing` - Sledování časů objednávek
- `item_timing` - Sledování časů jednotlivých položek
- `item_stats` - Statistiky položek
- `daily_stats` - Denní statistiky
- `stats_users` - Uživatelé pro přístup ke statistikám

## Struktura projektu

```
src/
├── components/     # Znovupoužitelné komponenty
├── pages/         # Stránky aplikace
├── services/      # API služby
├── lib/           # Supabase klient
└── types/         # TypeScript typy
```

## Opravené chyby z původního PHP systému

1. **Hardcoded databázové credentials** - Přesunuto do `.env`
2. **Chybějící error handling** - Přidáno správné zachycení chyb
3. **Neoptimalizované SQL dotazy** - Použití Supabase s indexy
4. **Chybějící security** - Implementováno RLS (Row Level Security)
5. **Mixed responsibility** - Oddělení API logiky od UI
6. **Inline SQL** - Použití Supabase query builderu
7. **Nekonzistentní stavové řízení** - React state management
8. **Chybějící TypeScript typy** - Plná typová bezpečnost

## API integrace s Dotykačkou

Pro synchronizaci objednávek z Dotykačky je potřeba vytvořit Edge Function nebo backend service, který bude volat Dotykačka API a ukládat data do Supabase.

Původní PHP kód (`fetch_orders.php`) obsahoval logiku pro:
- Získání access tokenu
- Načtení objednávek s filtrováním podle času
- Uložení do databáze

Tato funkcionalita bude implementována jako samostatný service.

## Poznámky

- Systém je optimalizován pro real-time aktualizace (každých 10 sekund)
- Automatické odstranění vyloučených položek z kuchyně
- Automatické předání dokončených objednávek po 5 sekundách
- Výstražné objednávky nad 30 minut
- Responsive design pro tablety a mobilní zařízení

## Licence

Proprietární software pro MacLaren's pub
