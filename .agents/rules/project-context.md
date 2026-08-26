---
trigger: always_on
---

# gocam360 Enterprise — Context & Architecture Rules

- **Platform Overview**: SaaS platform for 360° photo booths, Live Wall projections, and physical thermal print stations (10x15 DNP/Fuji).
- **Stack**: Angular v22+ (Signals, Standalone), Supabase (PostgreSQL 17, RLS, Realtime, pgmq, pg_cron), Cloudinary (media & overlays).
- **Supabase Project**: `gocam360` (Ref: `rbhkgldugjrkihajwjey`, URL: `https://rbhkgldugjrkihajwjey.supabase.co`).
- **Roles**:
  - `SUPER_ADMIN`: Only one who creates/deletes events and manages operators. Assigns events to operators. Manages Canva frames (with orientation tagging).
  - `ADMIN` (Operator): Only views and operates assigned events (`admin_id = current_user_id`). Operates Print Station, sends WhatsApp alerts, projects Live Wall, downloads ZIP for host.
  - `GUEST`: Scans table QR, registers with name + WhatsApp (+591), takes photo (app filters Canva frames by PORTRAIT vs LANDSCAPE), uploads to Live Wall, requests paper print.
  - `HOST`: Receives private album link and ZIP download.
- **Orientation Handling**: Canva frames have `orientation: 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE'`. App must dynamically filter frames matching camera capture orientation.
- **Reference Docs**: See `AGENTS.md` and `docs/ARCHITECTURE_AND_MIGRATION_GUIDE.md` for complete technical details.
