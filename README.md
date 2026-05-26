# HikeSphere

A fully responsive web app for planning multi-stop trips, treks, and routes.
Drop markers, drag to reorder, switch travel modes, see actual road-following
polylines, and save trips by category — works beautifully on desktop, tablet,
and mobile.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind |
| Map base | Google Maps JS (`@vis.gl/react-google-maps`) |
| Place search | **Mapbox Search Box** + **Photon** (OSM) hybrid |
| Reverse geocoding | Mapbox Geocoding v6 |
| Routing | **OSRM** (free, no key) — per-profile road routes |
| Backend | Supabase (Postgres + Auth + Realtime + RLS) |
| Data fetching | TanStack Query |
| State | Zustand |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| UI primitives | Radix UI, Framer Motion, lucide-react |
| PWA | `vite-plugin-pwa` |

## Why this combination

- **Google Maps base only** — billing not required for the base map (you may
  see a "for development" watermark, that's normal).
- **Search routed to Mapbox + Photon** instead of Google Places — much better
  POI coverage in South Asia *without* needing Google billing, and Photon picks
  up cultural/religious sites that Mapbox misses (Swayambhunath, etc.).
- **Routes from OSRM** instead of Google Directions — real road-following
  polylines, free, no key.
- Net effect: you can run the entire app without enabling Google Cloud billing.

## Features

### Map editor
- **Search** — debounced autocomplete across India, Nepal, Bhutan (configurable).
  Query is split per country and interleaved so each country gets fair
  representation. Re-ranked by relevance score with POI-type boosts and
  locality penalties.
- **Long-press / click on the map** to drop a marker (reverse-geocoded
  automatically).
- **Drag markers** on the map to relocate — address updates and route recomputes.
- **Drag-to-reorder** markers in the sidebar (touch-friendly).
- **4 travel modes** with separate routing profiles:
  - 🚗 **Drive** — car road network (~40 km/h)
  - 🏍️ **Bike** — motorbike: car network with ~50 km/h estimate for lane-filtering
  - 🚴 **Cycle** — bicycle: dedicated bike network (~15 km/h)
  - 🚶 **Walk** — pedestrian paths (~5 km/h)
- **Color-coded route legs** — each leg uses its origin marker's color.
- **Show place names** toggle — persistent per browser via `localStorage`.
- **Animated dashed polyline** while routes are recalculating.
- **Auto fit-to-bounds** when markers are added.

### Trip management
- **Dashboard** — responsive grid of saved maps with travel mode + category badges.
- **Save trip** dialog with title, description, and category picker:
  - 🪄 Trip · ⛰️ Trekking · 📍 Sightseeing · 👣 Commute · 📦 Delivery · 💼 Other
- **Marker editor** with label, notes, and per-pin color.
- **Saved places** (Home, Work, Favorite, Other) for quick reuse.

### Auth & data
- Email/password auth via Supabase.
- Protected routes; profile auto-created on signup via a trigger.
- All maps, markers, route legs, and saved places are user-scoped via RLS.
- Realtime subscription on markers (multi-tab sync).

### UX
- **Desktop** (≥ 1024px): fixed left sidebar, full-screen map.
- **Tablet** (768–1023px): collapsible sidebar drawer.
- **Mobile** (< 768px): full-screen map, floating search bar with safe-area
  insets, draggable bottom sheet with 3 snap points, mini marker card.
- **PWA** installable; offline shell cached.

---

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
VITE_GOOGLE_MAPS_MAP_ID=...        # optional — enables AdvancedMarker styling
VITE_MAPBOX_TOKEN=pk....
```

### 3. Supabase

Create a project at [supabase.com](https://supabase.com), then either:

**Option A — Link CLI and push migrations:**

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push
```

**Option B — Paste migrations manually:** open the **SQL Editor** in Supabase
dashboard and run each file from `supabase/migrations/` in order (001 → 006).

In Supabase dashboard:
- **Authentication → Providers** → enable Email
- **Authentication → URL Configuration** → set Site URL to your dev URL
  (`http://localhost:5173`) and add your production URL once deployed

### 4. Google Cloud

Enable **only** the **Maps JavaScript API** for the base map. You do **not**
need to enable Directions, Geocoding, Places, or Routes APIs (this app routes
those through Mapbox / OSRM / Photon).

In **APIs & Services → Credentials** for your API key:
- **Application restrictions** → HTTP referrers
  - Add `http://localhost:5173/*` for dev
  - Add `https://*.vercel.app/*` and your custom domain for production
- **API restrictions** → "Maps JavaScript API" only

Optional: in [Map Management](https://console.cloud.google.com/google/maps-apis/studio/maps),
create a Map ID for the AdvancedMarker styling, and put it in
`VITE_GOOGLE_MAPS_MAP_ID`.

### 5. Mapbox

1. Sign up at [account.mapbox.com](https://account.mapbox.com/auth/signup).
2. Copy your default public token from [access tokens](https://account.mapbox.com/access-tokens) (starts with `pk.`).
3. Put it in `VITE_MAPBOX_TOKEN`.
4. **Important**: under URL restrictions on the token, add your dev + production
   URLs. Vite inlines this token into the bundle, so anyone can read it from
   deployed JS. URL restriction is your only protection against quota abuse.

Free tier: 100K geocoding requests / month. Each keystroke fires up to 3
country-scoped queries; with the 300ms debounce, typical use stays comfortably
in the free tier.

### 6. Run

```bash
pnpm dev
```

App boots at <http://localhost:5173>.

---

## Configuration

### Search country bounding

Edit [`src/constants/config.ts`](src/constants/config.ts):

```ts
export const SEARCH_COUNTRY_CODES = 'in,np,bt'; // ISO 3166-1 alpha-2, comma-separated
```

Set to `''` to search globally. Common additions: `lk` (Sri Lanka), `bd`
(Bangladesh), `pk` (Pakistan), `mm` (Myanmar).

### Default map center

```ts
export const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India
export const DEFAULT_ZOOM = 5;
```

### Travel-mode speeds

Edit [`src/lib/api/directions.ts`](src/lib/api/directions.ts) → `SPEED_MPS`:

```ts
const SPEED_MPS: Record<TravelMode, number> = {
  WALKING: 1.4,    // ~5 km/h
  BICYCLING: 4.2,  // ~15 km/h
  DRIVING: 11.1,   // ~40 km/h
  MOTORBIKE: 13.9, // ~50 km/h
};
```

OSRM's reported duration is used for Walk / Cycle / Drive; Motorbike uses
distance ÷ `MOTORBIKE` speed since it shares the car road network but is faster
through traffic.

---

## Production deploy (Vercel)

The repo already contains a [`vercel.json`](vercel.json) with the SPA rewrite
(critical — without it, direct hits like `/map/<id>` would 404).

1. Push the repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Framework auto-detects as **Vite**. Build command: `pnpm build`. Output: `dist`.
4. Add all five `VITE_*` env vars in **Settings → Environment Variables**.
5. **Deploy**.

After deploy:
- Add the production URL to Supabase Auth → URL Configuration.
- Add it to the Google Maps API key referrer restrictions.
- Add it to the Mapbox token URL restrictions.

---

## Folder structure

```
src/
├── app/                         # Routed pages
│   ├── auth/                    # Login, Register, ForgotPassword
│   ├── dashboard/               # Maps list
│   ├── map/MapPage.tsx          # Responsive editor (sidebar / sheet)
│   ├── saved-places/
│   └── profile/
├── components/
│   ├── map/
│   │   ├── MapView.tsx          # Google Map container, marker layer
│   │   ├── MarkerPin.tsx        # Custom SVG pin with letter + optional label
│   │   ├── MarkerInfoWindow.tsx # Color-accented popup
│   │   ├── RoutePolyline.tsx    # Decoded leg polyline, color-aware
│   │   ├── MapFABs.tsx          # Floating action buttons
│   │   └── SaveTripDialog.tsx   # Title + category picker
│   ├── marker/
│   │   └── MarkerEditDialog.tsx # Label / notes / color editor
│   ├── sidebar/                 # Desktop: search, list, summary
│   ├── bottom-sheet/            # Mobile: draggable sheet, mini card
│   ├── search/PlacesSearch.tsx  # Mapbox + Photon hybrid autocomplete
│   └── ui/                      # Button, Input, Modal, Skeleton, Badge…
├── hooks/                       # useAuth, useMaps, useMarkers, useRoute…
├── lib/
│   ├── supabase.ts
│   ├── utils.ts
│   └── api/
│       ├── maps.ts
│       ├── markers.ts
│       ├── routeLegs.ts
│       ├── savedPlaces.ts
│       ├── mapbox.ts            # Search Box + reverse geocode
│       ├── photon.ts            # OSM-based POI fallback
│       └── directions.ts        # OSRM client + polyline codec
├── stores/                      # Zustand: mapStore, uiStore
├── types/                       # Database + app types
├── constants/                   # config, map styles
├── App.tsx
└── main.tsx
supabase/
├── migrations/                  # 001–006 SQL
├── seed.sql
└── config.toml
```

---

## Notable architecture decisions

- **Place search is hybrid** ([src/lib/api/mapbox.ts](src/lib/api/mapbox.ts)).
  We fire 3 country-scoped Mapbox queries + 1 Photon (OSM) query in parallel,
  then merge with a relevance scorer that weights name token overlap, applies
  POI-type boosts, and penalizes overly broad matches (countries, postcodes).
  This catches POIs Mapbox misses (often religious / heritage sites in OSM)
  while keeping Mapbox's better business coverage.
- **Route recompute is debounced** (400ms) on marker/order/mode change. Each
  leg is fetched separately so a single OSRM failure doesn't block the whole
  trip.
- **Routes are color-coded** by origin marker. Each leg's polyline uses the
  `from` marker's color so direction is visually obvious.
- **Marker labels** are rendered as part of a custom SVG pin component instead
  of Google's built-in `Pin`, so we can toggle them on/off without re-mount
  flicker (mostly — the toggle force-remounts via key for AdvancedMarker
  reactivity).
- **RLS everywhere**. Every table has policies scoping reads/writes to the
  owning user. The signup trigger uses `security definer` + an explicit
  `search_path` so profile creation doesn't fail under restricted auth context.

---

## Costs

| Service | Free tier | What we use |
|---|---|---|
| Supabase | 500 MB DB, 50K monthly active users | Auth + DB + Realtime |
| Google Maps | Maps JS — free without billing (with watermark) | Base map tiles |
| Mapbox | 100K geocoding / month | Search Box + reverse geocode |
| OSRM | community-run, no SLA, gentle rate limits | All routing |
| Photon | unlimited, no key | POI fallback |
| Vercel | Hobby plan, 100 GB bandwidth | Hosting |

A single personal user will not approach any free-tier limit.

---

## Common SQL fixes

### After cloning, if the signup trigger fails

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### To allow the `category` column on an existing DB

```sql
alter table maps add column if not exists category text default 'other';
alter table maps drop constraint if exists maps_category_check;
alter table maps add constraint maps_category_check
  check (category in ('trip','trekking','sightseeing','commute','delivery','other'));
```

### To remove the legacy `TRANSIT` travel mode

```sql
alter table maps drop constraint if exists maps_travel_mode_check;
alter table maps add constraint maps_travel_mode_check
  check (travel_mode in ('DRIVING','MOTORBIKE','WALKING','BICYCLING'));
```
