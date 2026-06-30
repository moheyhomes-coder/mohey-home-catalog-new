# Mohey Home — Live Shareable Catalog — PRD

## Original Problem Statement
> Live shareable catalog that auto-updates when items/designs are added, auto-removes sold-out items, and supports easy product management.

## Personas
- **Admin (Mohey Home owner)** — manages inventory, uploads photos, sets WhatsApp order line, manages categories.
- **Public viewer / customer** — opens shared link, browses live catalog, orders directly via WhatsApp.

## Core Requirements
- Public catalog at `/` (no auth)
- Admin login at `/admin/login` (JWT)
- Admin dashboard at `/admin` (protected)
- Item CRUD with two photo uploads (main + lifestyle) plus color variants
- Categories CRUD (admin-managed taxonomy)
- Collections CRUD (groups of items)
- Settings (WhatsApp number, brand name)
- Hide items where stock=0 OR manual_sold_out=true from public list
- Real-time WebSocket + 3s polling fallback
- Indian rupee (₹) pricing with Indian number formatting
- Product detail page with WhatsApp order CTA

## Architecture
- **Backend** — FastAPI + Motor + MongoDB. All routes under `/api/`. JWT auth.
- **Frontend** — React + Tailwind + Shadcn UI + Sonner toasts.
- **Storage** — Emergent object storage for uploaded photos.
- **Design** — Light public catalog + Dark admin console + Dark filter bar.

## Implemented (latest)
- ✅ JWT auth, admin seed from .env (`moheyhomes@gmail.com / Neminath@108`)
- ✅ Items CRUD (admin + public filtered)
- ✅ Public catalog page (marquee, hero, live indicator, item grid)
- ✅ Item detail page (`/p/:id`)
- ✅ Admin dashboard (stats, table, drawer form, sold-out toggle, delete)
- ✅ Real-time WebSocket updates + 3s polling fallback
- ✅ Collections (group items) — admin CRUD + public filter
- ✅ Color variants per item with per-color stock + manual photo upload
- ✅ Two-photo upload per item (main + lifestyle) — no AI, just upload
- ✅ Pricing in ₹ with Indian formatting (e.g. ₹1,25,000)
- ✅ Dark filter bar on public catalog (category, collection, sort, search)
- ✅ **NEW**: Categories CRUD (admin-managed). Seeded with: bedsheet, carpet, doormat, sofa cover, quilt, pouffee
- ✅ **NEW**: Settings API + admin UI to set WhatsApp number (validated, normalized to +CC format)
- ✅ **NEW**: Product detail page shows green **Order on WhatsApp** button with pre-filled message (name, price, category, color, link, photo URL)
- ✅ **NEW**: Category dropdown in item form is now dark-themed + has inline "+" button to add new categories on the fly

## Removed
- ❌ AI image generation (Gemini Nano Banana / HF FLUX) — was failing due to budget/quota issues; replaced with manual uploads.

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog (P1)
- Bulk image upload (multiple files at once)
- Image cropping / resizing on upload
- Customer favorite/save feature (localStorage)
- WhatsApp Business catalog API integration for richer messages

## Backlog (P2)
- Analytics dashboard (most viewed items, WhatsApp button clicks)
- QR code per item (deep links to detail page)
- Watermark uploaded images
- Reservation / pre-order flow

## Status
- MVP ✅ live and tested
- AI removed, manual upload + categories + WhatsApp ordering ✅ working
