# 📘 Guía Maestra de Arquitectura y Migración: gocam360 Enterprise

Esta guía documenta exhaustivamente la arquitectura del sistema, el nuevo esquema de base de datos en **Supabase**, las políticas de seguridad **RLS**, la integración con **Cloudinary**, el motor de **Tiempo Real**, el sistema de **Colas (`pgmq`)**, las tareas programadas **Cron (`pg_cron`)** y la hoja de ruta para migrar el frontend de **Angular 22+** hacia una arquitectura 100% BaaS / Serverless.

---

## 📑 Tabla de Contenidos
1. [Visión General y Credenciales del Proyecto](#1-visión-general-y-credenciales)
2. [Matriz de Roles y Reglas de Negocio](#2-matriz-de-roles-y-reglas-de-negocio)
3. [Esquema de Base de Datos y Políticas RLS en Supabase](#3-esquema-de-base-de-datos-y-políticas-rls)
4. [Flujos Críticos del Sistema](#4-flujos-críticos-del-sistema)
   - [4.1 Marcos de Canva y Detección de Orientación](#41-marcos-de-canva-y-detección-de-orientación)
   - [4.2 Cola de Impresión Térmica y Alertas por WhatsApp](#42-cola-de-impresión-térmica-y-alertas-por-whatsapp)
   - [4.3 Muro en Vivo (Live Wall) con Supabase Realtime](#43-muro-en-vivo-live-wall-con-supabase-realtime)
   - [4.4 Auto-Purga de Almacenamiento en Cloudinary con pg_cron](#44-auto-purga-de-almacenamiento-en-cloudinary-con-pg_cron)
   - [4.5 Manejo de Concurrencia de Impresión con Colas pgmq](#45-manejo-de-concurrencia-de-impresión-con-colas-pgmq)
5. [Plan de Migración Módulo a Módulo (NestJS $\rightarrow$ Supabase BaaS)](#5-plan-de-migración-módulo-a-módulo)
   - [Fase 1: Cliente Supabase y Autenticación en Angular](#fase-1-cliente-supabase-y-autenticación)
   - [Fase 2: Módulo de Eventos y Asignación de Operadores](#fase-2-módulo-de-eventos-y-asignación)
   - [Fase 3: Módulo de Marcos (Frames) y Subida a Cloudinary](#fase-3-módulo-de-marcos-y-cloudinary)
   - [Fase 4: Experiencia del Invitado (Guest Experience)](#fase-4-experiencia-del-invitado)
   - [Fase 5: Muro en Vivo (Live Wall)](#fase-5-muro-en-vivo-live-wall)
   - [Fase 6: Estación de Impresión (Print Station) y WhatsApp](#fase-6-estación-de-impresión-y-whatsapp)
   - [Fase 7: CRM Leads, Auditoría y Dashboard](#fase-7-crm-leads-auditoría-y-dashboard)

---

## 1. Visión General y Credenciales

* **Organización Supabase**: `daniel` (`wagnriylesonhzdtmunw`)
* **Nombre del Proyecto**: `gocam360`
* **Project Reference ID**: `rbhkgldugjrkihajwjey`
* **Project URL**: `https://rbhkgldugjrkihajwjey.supabase.co`
* **Región**: `us-east-1`
* **Anon Key (Pública para Frontend)**:
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaGtnbGR1Z2pya2loYWp3amV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODcxNTcsImV4cCI6MjEwMzI2MzE1N30.35lBGbR6OwKhOCiURiE-vjq3MBOKxPPaMZGIuq9kmew`

---

## 2. Matriz de Roles y Reglas de Negocio

### 👑 SUPER_ADMIN (Dueño / Administrador Maestro)
* **Creación Exclusiva de Eventos**: Es el único que puede crear o eliminar eventos en la plataforma.
* **Asignación de Operadores**: Asigna cada evento a un `ADMIN` (Operador) responsable.
* **Gestión de Marcos de Canva**: Sube marcos PNG transparentes y define su orientación (`PORTRAIT`, `LANDSCAPE`, `SQUARE`).
* **Control de Cuentas**: Crea, edita y revoca accesos de operadores.
* **Auditoría & Métricas**: Acceso exclusivo a la bitácora (`audit_logs`) e ingresos globales.

### 💼 ADMIN / OPERADOR (Personal de Campo en el Salón)
* **Alcance Restringido**: Solo ve y acciona sobre los eventos que tiene asignados (`admin_id = auth.uid()`).
* **Operación de Impresoras**: Control de la cola de impresión física DNP/Fuji (`PENDING` $\rightarrow$ `PRINTING` $\rightarrow$ `PRINTED`).
* **Notificación al Invitado**: Botón para enviar mensaje pre-redactado de WhatsApp al invitado cuando su foto está lista.
* **Proyección Live Wall**: Lanza la pantalla interactiva al proyector.
* **Entrega al Anfitrión**: Descarga el archivo ZIP completo de fotos y comparte el enlace de la galería.

### 🎉 INVITADO / GUEST (Asistente en el Evento)
* **Acceso Rápido**: Escanea el QR impreso en su mesa e ingresa Nombre + WhatsApp.
* **Captura Inteligente**: La cámara detecta orientación y filtra solo los marcos de Canva correspondientes.
* **Impresión Controlada**: Envía a imprimir respetando el cupo (`max_prints_per_guest`).
* **Solicitud de Cotización**: Puede solicitar presupuesto para su propio evento (genera un Lead en CRM).

### 🥂 ANFITRIÓN / HOST (Cliente del Evento)
* Recibe un enlace privado vía WhatsApp para revivir su álbum y descargar el ZIP completo.

---

## 3. Esquema de Base de Datos y Políticas RLS

Todas las tablas cuentan con **Row Level Security (RLS) ACTIVO**:

```sql
-- Resumen de Tablas en Supabase:
-- 1. users (id, full_name, email, password_hash, role, status, last_login_at)
-- 2. events (id, admin_id, name, description, host_name, host_phone, host_email, location, cover_image, event_date, start_time, end_time, access_code, qr_token, gallery_token, max_photos_per_guest, max_prints_per_guest, gallery_retention_days, primary_color, logo_url, status)
-- 3. frames (id, name, preview_image, overlay_image, orientation, created_by, active)
-- 4. guests (id, phone, name)
-- 5. event_frames (event_id, frame_id, display_order)
-- 6. event_guests (id, event_id, guest_id, photos_uploaded, prints_requested, joined_at, last_activity)
-- 7. photos (id, event_id, guest_id, frame_id, storage_path, thumbnail_path, file_size, mime_type, width, height, likes_count, uploaded_at)
-- 8. print_requests (id, photo_id, guest_id, quantity, status, requested_at, printed_at, printed_by, notified_at)
-- 9. crm_leads (id, phone, name, event_id, event_type, estimated_date, notes, status, created_at)
-- 10. audit_logs (id, user_id, user_email, action, entity, details, ip_address, created_at)
-- 11. notifications (id, user_id, title, message, type, read, link_url, created_at)
```

### Publicación Realtime:
`ALTER PUBLICATION supabase_realtime ADD TABLE photos, print_requests, events, notifications;`

---

## 4. Flujos Críticos del Sistema

### 4.1 Marcos de Canva y Detección de Orientación
```typescript
// En guest-event-join.page.ts
onPhotoCaptured(imageFile: File) {
  const img = new Image();
  img.src = URL.createObjectURL(imageFile);
  img.onload = () => {
    const isLandscape = img.width > img.height;
    const orientation = isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
    // Filtrar marcos de Canva compatibles
    this.filteredFrames = this.eventFrames().filter(f => f.orientation === orientation);
  };
}
```

### 4.2 Cola de Impresión Térmica y Alertas por WhatsApp
En `/dashboard/prints`, al marcar `PRINTED`:
```typescript
notifyGuestWhatsApp(item: PrintRequestItem) {
  const message = `¡Hola ${item.guestName}! 🎉 Tu foto del evento *${item.eventName}* ya está impresa. Puedes pasar a retirarla en la estación de fotos.`;
  const cleanPhone = item.guestPhone.replace(/\D/g, '');
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
}
```

### 4.3 Muro en Vivo (Live Wall) con Supabase Realtime
```typescript
// En live-wall.page.ts
this.supabase
  .channel(`live-wall-${eventId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'photos',
    filter: `event_id=eq.${eventId}`
  }, (payload) => {
    this.photos.update(list => [payload.new, ...list]);
    this.showNewPhotoPopupAnimation(payload.new);
  })
  .subscribe();
```

### 4.4 Auto-Purga de Almacenamiento en Cloudinary con pg_cron
* Programado diariamente a las 04:00 AM vía `pg_cron`.
* Invoca una Edge Function que busca fotos de eventos donde `event_date + gallery_retention_days < NOW()`.
* Ejecuta `cloudinary.api.delete_resources(publicIds)` y limpia las filas de la base de datos para mantener el plan gratuito perpetuo.

---

## 5. Plan de Migración Módulo a Módulo (NestJS $\rightarrow$ Supabase BaaS)

### 📦 Fase 1: Cliente Supabase y Autenticación en Angular
1. Instalar `@supabase/supabase-js` en el frontend:
   ```bash
   npm install @supabase/supabase-js
   ```
2. Crear el servicio central `SupabaseService`:
   ```typescript
   // src/app/core/services/supabase.service.ts
   import { Injectable } from '@angular/core';
   import { createClient, SupabaseClient } from '@supabase/supabase-js';

   @Injectable({ providedIn: 'root' })
   export class SupabaseService {
     public readonly client: SupabaseClient;

     constructor() {
       this.client = createClient(
         'https://rbhkgldugjrkihajwjey.supabase.co',
         'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
       );
     }
   }
   ```
3. Reemplazar `AuthService` para usar `supabase.auth.signInWithPassword()`.

### 📦 Fase 2: Módulo de Eventos (`EventsService`)
* Reemplazar llamadas HTTP por:
  ```typescript
  // Para Superadmin (todos los eventos)
  supabase.from('events').select('*, admin:users(full_name)');
  
  // Para Operador (solo sus eventos asignados)
  supabase.from('events').select('*').eq('admin_id', currentUserId);
  ```

### 📦 Fase 3: Módulo de Marcos (`FramesService`)
* Guardar marcos con su campo `orientation` (`PORTRAIT` / `LANDSCAPE`).
* Asociar marcos al evento mediante la tabla intermedia `event_frames`.

### 📦 Fase 4: Experiencia del Invitado (`GuestExperienceService`)
* `joinEvent()`: Consulta el evento por `access_code` / `qr_token`, inserta o actualiza el registro en `guests` y `event_guests`.
* `uploadPhoto()`: Sube directamente a Cloudinary vía preset firmado y luego hace `supabase.from('photos').insert(...)`.
* `requestPrint()`: Inserta registro en `print_requests`.

### 📦 Fase 5: Muro en Vivo (`LiveWallPage`)
* Eliminar el `setInterval` de 12 segundos.
* Conectar a `supabase.channel('live-wall').on('postgres_changes', ...)`.

### 📦 Fase 6: Estación de Impresión (`PrintsPage`)
* Reemplazar polling/SSE con canal Realtime en `print_requests`.
* Añadir el botón `💬 Avisar por WhatsApp` en cada tarjeta de impresión.

### 📦 Fase 7: CRM Leads, Auditoría y Dashboard
* `CrmLeadsService`: Conexión directa a la tabla `crm_leads`.
* `AuditLogsService`: Lectura exclusiva para Superadmin desde `audit_logs`.
* `DashboardService`: Consultas agrupadas con conteos de PostgreSQL.
