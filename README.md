# Multi Location Marker

A fully responsive React + Vite + TypeScript web app for planning multi-stop
routes with markers on Google Maps. Backed by Supabase (auth + Postgres + realtime).

Works on desktop, tablet, and mobile browsers. Installable as a PWA.

## Tech Stack

- React 18, Vite, TypeScript
- `@vis.gl/react-google-maps` for Google Maps
- Supabase (auth, Postgres, RLS, realtime)
- TanStack Query, Zustand
- Tailwind CSS, Framer Motion, Radix UI, lucide-react
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-to-reorder
- `vite-plugin-pwa`

## Project Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
VITE_GOOGLE_MAPS_MAP_ID=...   # optional, enables AdvancedMarker styling
```

### 3. Supabase setup

Create a project at [supabase.com](https://supabase.com), then link locally:

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push       # applies migrations from supabase/migrations
```

Optionally seed with a sample map (after registering a dev user):

```bash
pnpm dlx supabase db reset --linked   # WARNING: destructive on linked DB; only for fresh setup
# or just apply seed.sql manually in the Supabase SQL editor
```

**Enable in Supabase dashboard:**

- Authentication → Providers → Email (toggle on; disable email confirmation
  for local dev if desired)
- Database → Replication → ensure `markers` and `route_legs` are in the
  `supabase_realtime` publication (migration `006_realtime.sql` handles this)

### 4. Google Cloud Console setup

Enable these APIs for your Google Cloud project (the API key you put in
`VITE_GOOGLE_MAPS_API_KEY` must have access):

- **Maps JavaScript API**
- **Directions API** (legacy — used by `DirectionsService`)
- **Geocoding API**
- **Places API** (legacy — used by `Autocomplete` widget)

> Note: enable the **legacy** "Places API" and "Directions API", **not** "Places API (New)" or "Routes API". This app uses the legacy JS SDK. The legacy APIs are fully supported.

Recommendations:
- Restrict the API key by HTTP referrer to your dev (`localhost:5173`) and
  production domains.
- Create a Map ID in the Maps section (Map Management → Map Styles → New Style),
  put it in `VITE_GOOGLE_MAPS_MAP_ID` to enable `AdvancedMarker` styling.

### 5. Run locally

```bash
pnpm dev
```

App boots at <http://localhost:5173>.

## Production

```bash
pnpm build
pnpm preview
```

### Deploy to Vercel

1. Import the repo in Vercel.
2. Framework: **Vite**. Build: `pnpm build`. Output: `dist`.
3. Add env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`).
4. After deploy, update your Google Maps API key referrer restrictions and the
   Supabase Auth → URL Configuration to include your Vercel URL.

## Folder Structure

```
src/
├── app/                  # Routed pages
│   ├── auth/             # Login, Register, ForgotPassword
│   ├── dashboard/        # Maps list
│   ├── map/              # MapPage editor (responsive: sidebar / sheet)
│   ├── saved-places/
│   └── profile/
├── components/
│   ├── map/              # Map view, markers, polylines, FABs
│   ├── sidebar/          # Desktop sidebar (search, list, summary)
│   ├── bottom-sheet/     # Mobile draggable sheet + mini marker card
│   ├── search/           # Places autocomplete + saved-places picker
│   ├── marker/           # Marker edit dialog
│   └── ui/               # Button, Input, Modal, Skeleton, ColorPicker, …
├── hooks/                # useAuth, useMaps, useMarkers, useRoute, useGeolocation, useMediaQuery
├── lib/
│   ├── supabase.ts
│   ├── utils.ts
│   └── api/              # maps, markers, routeLegs, savedPlaces, directions, geocoding
├── stores/               # Zustand: mapStore, uiStore
├── types/                # Database + app types
├── constants/            # config, mapStyles
├── App.tsx
└── main.tsx
supabase/
├── migrations/           # 001–006 SQL
├── seed.sql
└── config.toml
```

## Features

- Email/password auth with protected routes
- Dashboard with responsive grid of maps
- Map editor with:
  - Google Places search bar
  - Click (desktop) / long-press (mobile) to drop markers
  - Drag markers on map → reverse geocode + recompute route
  - Drag-to-reorder marker list (touch-friendly)
  - Per-marker color, label, notes
  - Travel mode toggle (Drive / Walk / Transit / Cycle) — recomputes routes
  - Decoded Google Directions polylines per leg
  - Animated dashed polyline while route is loading
  - Auto fit bounds to all markers
  - Realtime subscription to marker changes
- Mobile-first UX:
  - Map fills viewport (`100dvh`)
  - Floating translucent search bar with safe-area-aware padding
  - Draggable bottom sheet with 3 snap points (collapsed / half / full)
  - FABs floating over map: add, fit, locate, travel mode
  - Mini marker card on selection
- Saved places (Home / Work / Favorite / Other) with quick add modal
- PWA: installable, offline shell

## Notes

- The `MapPage` debounces route recompute by 400ms after marker or mode changes.
- Polylines are drawn using Google's overview polyline; loading state shows a
  dashed animated line.
- Sidebar/bottom-sheet split is driven by `useMediaQuery` breakpoints
  (`< 768px` → mobile sheet, `768–1023px` → collapsible tablet drawer,
  `≥ 1024px` → fixed sidebar).
- RLS policies restrict reads/writes to the owning user — see `supabase/migrations/`.
