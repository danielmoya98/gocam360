# 🎥 gocam360 Enterprise — System Context & Architecture Guide

This document serves as the single source of truth for the **gocam360** platform. Any AI agent, developer, or assistant working in this repository must follow these rules, database schemas, and architectural guidelines.

---

## 📌 Executive Summary & Tech Stack

**gocam360** is a SaaS platform for managing interactive 360° photo booths, event galleries, real-time projection walls (Live Wall), and physical thermal print stations (DNP/Fuji 10x15 format).

### Core Stack (Post-Migration Target):
* **Frontend**: **Angular v22+** (Standalone Components, Signals reactives, Tailwind CSS v4, Lucide/Spartan UI).
* **Backend as a Service (BaaS)**: **Supabase** (PostgreSQL 17, Row Level Security, Supabase Auth, Supabase Realtime, `pgmq` queues, `pg_cron` jobs).
* **Media & CDN**: **Cloudinary** (Dynamic overlays, frame composition, `f_auto,q_auto` compression, thumbnail generation).
* **Hosting**: Render / Vercel (SPA Static Site).

---

## 🗄️ Supabase Configuration & Credentials

* **Organization**: `daniel` (`wagnriylesonhzdtmunw`)
* **Project Name**: `gocam360`
* **Project Reference ID**: `rbhkgldugjrkihajwjey`
* **Project URL**: `https://rbhkgldugjrkihajwjey.supabase.co`
* **Region**: `us-east-1`
* **Anon Key (Public Client)**:
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaGtnbGR1Z2pya2loYWp3amV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODcxNTcsImV4cCI6MjEwMzI2MzE1N30.35lBGbR6OwKhOCiURiE-vjq3MBOKxPPaMZGIuq9kmew`

---

## 👥 Role Matrix & Permissions

| Role | Target Persona | Views & Permissions |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Business Owner | • Full access to all modules and global executive dashboard.<br>• **Sole creator/deleter of events** and accounts.<br>• Assigns events to operators.<br>• Uploads Canva Frames (with orientation tagging).<br>• Access to `audit_logs` and global revenue/usage KPIs. |
| **`ADMIN` (Operator)** | Event Booth Staff | • **Only sees assigned events** (`admin_id = current_user_id`).<br>• Controls the **Print Queue** (`PENDING` $\rightarrow$ `PRINTING` $\rightarrow$ `PRINTED`).<br>• Sends **WhatsApp alerts** to guests when prints are ready.<br>• Projects the **Live Wall**.<br>• Downloads the full ZIP and shares the gallery link with the Host.<br>• Cannot create events, cannot create users, cannot view audit logs. |
| **`GUEST`** | Party Attendee | • No account needed. Scans QR on tables $\rightarrow$ registers with name + WhatsApp number.<br>• Takes photos; app detects **Vertical vs Horizontal** and filters Canva frames.<br>• Uploads photo to Live Wall & digital gallery.<br>• Requests paper print (controlled by `maxPrintsPerGuest`).<br>• Can request a business quote (CRM Lead). |
| **`HOST`** | Event Client | • Receives private gallery link & full event ZIP download via WhatsApp. |

---

## 🗃️ Database Schema & Active Policies

### Tables in PostgreSQL (`public`):
1. **`users`**: Admins & Super Admins.
2. **`events`**: Events config, dates, tokens (`qr_token`, `gallery_token`, `access_code`), quotas (`max_photos_per_guest`, `max_prints_per_guest`), retention (`gallery_retention_days`), branding.
3. **`frames`**: Canva frame designs with **`orientation`** (`'PORTRAIT'`, `'LANDSCAPE'`, `'SQUARE'`).
4. **`event_frames`**: Event-to-frame relations and display ordering.
5. **`guests`**: Guest registry (unique phone, full name).
6. **`event_guests`**: Quotas and activity tracking per event-guest pair.
7. **`photos`**: Cloudinary URLs, dimensions, likes, guest and frame links.
8. **`print_requests`**: Physical print queue (`PENDING`, `PRINTING`, `PRINTED`, `CANCELLED`).
9. **`crm_leads`**: Inbound commercial sales inquiries from party attendees.
10. **`audit_logs`**: System audit trail (Superadmin only).
11. **`notifications`**: System notifications for users.

### Security (RLS) Status:
* **All tables have RLS ENABLED** with security helper functions:
  * `public.is_super_admin()`
  * `public.is_admin_or_super()`
  * `public.is_event_operator(event_uuid)`
* Guests (`anon`) have restricted write access (only their photos/prints/leads) and read access to active public event data.

### Realtime Subscriptions Active:
* `supabase_realtime` publication includes: `photos`, `print_requests`, `events`, `notifications`.

---

## 🚀 Key Feature Workflows

### 1. Canva Frames by Orientation
When a guest captures/selects a photo:
```typescript
const isLandscape = img.width > img.height;
const requiredOrientation = isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
this.availableFrames = this.eventFrames().filter(f => f.orientation === requiredOrientation);
```

### 2. Print Queue & WhatsApp Notification
When print status changes to `PRINTED`:
* Operator clicks `💬 Notificar WhatsApp`:
```typescript
const message = `¡Hola ${guest.name}! 🎉 Tu fotografía del evento *${event.name}* ya está impresa y lista para retirar en la mesa de fotos.`;
window.open(`https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
```

### 3. Automated Rolling Storage Purge (Cron + Cloudinary)
* Supabase `pg_cron` runs nightly at 04:00 AM.
* Finds expired events based on `gallery_retention_days`.
* Invokes Edge Function to call Cloudinary Admin API (`delete_resources`) to free up free-tier space automatically.

---

## 🗺️ Migration Roadmap (NestJS $\rightarrow$ Pure Supabase BaaS)

See the full detailed guide in `docs/ARCHITECTURE_AND_MIGRATION_GUIDE.md`.
