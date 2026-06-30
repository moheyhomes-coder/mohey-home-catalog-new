# Live Shareable Catalog — PRD

## Original Problem Statement
> WANT TO BUILD A LIVE SHAREABLE CATALOG THAT AUTO UPDATES WHEN ITEMS OR DESIGNS ARE ADDED TO IT AND AUTO DELETES ITEMS THAT ARE SOLD OUT FOR EVERYONE WHO ACCESS THE CATALOG

## User Choices Captured
- Single admin (one owner / password protected)
- Basic item details: name, price, image, stock
- Sold-out: BOTH auto (stock=0) + manual toggle
- Public shareable link, no viewer login
- Real-time updates via polling

## Personas
- **Admin** — manages inventory, adds/edits/deletes items, toggles sold-out.
- **Public viewer** — opens shared link, browses live catalog, sees auto-updates.

## Core Requirements
- Public catalog at `/` (no auth, polls every 3s)
- Admin login at `/admin/login` (JWT)
- Admin dashboard at `/admin` (protected)
- Item CRUD with image URL, price, stock, manual_sold_out flag
- Hide items where stock=0 OR manual_sold_out=true from public list
- Live polling reflects changes within ~3s

## Architecture
- **Backend** — FastAPI + Motor + MongoDB. All routes under `/api/`. JWT in httpOnly cookie + Authorization header.
- **Frontend** — React + Tailwind + Shadcn UI + Sonner toasts. Polling every 3s (public) / 5s (admin).
- **Design** — Hybrid: Light "Art Gallery" public catalog with strict black grid; Dark operational admin console. Cabinet Grotesk + IBM Plex Sans. Red `#FF2A2A` accent.

## Implemented (2026-02)
- ✅ JWT auth with seeded admin (admin@catalog.com / admin123)
- ✅ Items CRUD endpoints, public-only filter, admin-only filter
- ✅ Public catalog page with marquee, live indicator, "Available Now" hero, item grid
- ✅ Admin dashboard with stats, table, add/edit drawer, sold-out toggle, delete
- ✅ Toast notifications for new items added / sold-out removals
- ✅ Share button with clipboard copy

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog (P1)
- WebSocket / SSE upgrade for instant push (vs polling)
- Image upload via object storage (currently URL-only)
- Multiple catalogs per admin / collections
- Public catalog filters (search, sort by price, by date)
- "Reserve item" flow for buyers + WhatsApp/email contact

## Backlog (P2)
- Analytics dashboard (most viewed items)
- Item variants (size, color)
- Discount codes
- QR code for catalog share

## Status
- MVP ✅ live and tested
