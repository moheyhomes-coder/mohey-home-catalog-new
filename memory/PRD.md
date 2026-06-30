# Mohey Home — Live Shareable Catalog — PRD

## Original Problem Statement
> Live shareable catalog that auto-updates when items/designs are added, auto-removes sold-out items, and supports easy product management.

## Personas
- **Admin (Mohey Home owner)** — manages inventory, uploads photos, toggles sold-out.
- **Public viewer** — opens shared link, browses live catalog.

## Core Requirements
- Public catalog at `/` (no auth, polls every 3s)
- Admin login at `/admin/login` (JWT)
- Admin dashboard at `/admin` (protected)
- Item CRUD with TWO photo uploads per item (main + lifestyle) plus optional color variants (manual upload per color)
- Hide items where stock=0 OR manual_sold_out=true from public list
- Live polling / WebSocket reflects changes within ~3s

## Architecture
- **Backend** — FastAPI + Motor + MongoDB. All routes under `/api/`. JWT auth.
- **Frontend** — React + Tailwind + Shadcn UI + Sonner toasts.
- **Storage** — Emergent object storage for uploaded photos.
- **Design** — Light public catalog + Dark admin console.

## Implemented (2026-06)
- ✅ JWT auth, admin seed from .env (moheyhomes@gmail.com / Neminath@108)
- ✅ Items CRUD (admin + public filtered)
- ✅ Public catalog with marquee, live indicator, item grid, item detail
- ✅ Admin dashboard with stats, table, add/edit drawer, sold-out toggle, delete
- ✅ Real-time WebSocket updates + 3s polling fallback
- ✅ Collections (group items)
- ✅ Color variants with per-color stock + manual photo upload
- ✅ **NEW (2026-06-30)**: Removed AI image generation tool entirely; replaced with 2 manual image upload slots per item (main + lifestyle photo). Color variants also use manual upload.

## Removed
- ❌ AI image generation (Gemini Nano Banana / HF FLUX) — was failing due to budget/quota issues on user's keys; user opted for manual upload-only flow.

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog (P1)
- Bulk image upload / drag-multiple-files
- Image cropping / resizing on upload
- Public catalog filters (search, sort, by collection)

## Backlog (P2)
- Analytics dashboard (most viewed items)
- "Reserve item" flow for buyers + WhatsApp contact
- QR code for catalog share
- Watermark uploaded images automatically

## Status
- MVP ✅ live and tested
- AI removed, manual 2-photo upload ✅ working
