# 📐 gocam360 UI / UX Design System & Dashboard Blueprint

> **Propósito**: Esta guía técnica y especificación de diseño sirve como **Manual de Arquitectura y Prompt Maestro** para recrear dashboards y plataformas SaaS idénticas a esta con **Angular v22+**, **Tailwind CSS v4**, **Signals**, **Obsidian Dark & Clean Light Theme** y micro-interacciones fluidas.

---

## 🎨 1. Filosofía Visual y Principios de Diseño

1. **Estética *Acme Dark Obsidian* & *Clean Titanium Light***:
   * **Modo Oscuro**: Fondo carbón profundo (`hsl(240 10% 3.9%)` $\approx$ `#09090b`), tarjetas opacas con borde fino (`hsl(240 3.7% 15.9%)`), acentos en blanco puro para botones primarios y toques sutiles de colores semánticos (Emerald, Amber, Rose, Indigo).
   * **Modo Claro**: Fondo blanco puro (`#ffffff`), tarjetas nítidas con bordes en gris suave (`hsl(240 5.9% 90%)`), tipografía de alto contraste.
   * **Opacidad y Solidez 100%**: Evitar paneles traslúcidos que dejen ver elementos detrás. Usar `bg-card` o `bg-popover-solid` con sombras de profundidad (`shadow-xl` / `shadow-2xl`).

2. **Micro-interacciones Fluidas**:
   * **Píldora Activa Móvil (`View Transitions API`)**: La píldora del menú lateral se desplaza suavemente usando `[view-transition-name:active-nav-pill]`.
   * **Diálogos y Drawers con curvas de aceleración física**: Animaciones cúbicas (`cubic-bezier(0.16, 1, 0.3, 1)`).
   * **Active Scale**: Todos los botones interactivos tienen `active:scale-95` o `active:scale-[0.99]`.

---

## 🗂️ 2. Estructura de Carpetas Recomendada (Angular v22+)

```text
src/app/
├── core/
│   ├── services/
│   │   ├── tour.service.ts          # Integración interactiva con Driver.js
│   │   └── settings.service.ts      # Parámetros globales
│   └── guards/                      # Role guards & auth guards
├── entities/
│   └── session/
│       └── auth.service.ts          # Gestión de sesión con Signals reactivos
├── pages/
│   ├── dashboard/
│   │   ├── dashboard.page.ts        # Layout principal (Sidebar + Topbar + Outlet + Mobile Drawer)
│   │   ├── superadmin-view/         # Vista ejecutiva con KPIs
│   │   └── admin-view/              # Vista de operador
│   ├── events/                      # Módulo de Eventos & Reporte de Cierre
│   ├── prints/                      # Cola de Impresión en tiempo real
│   ├── users/                       # Administración de cuentas y roles
│   ├── crm-leads/                   # Captación de prospectos comerciales
│   ├── audit-logs/                  # Bitácora inmutable de seguridad
│   └── setup/                       # Asistente de primera instalación (First-Run Wizard)
├── shared/
│   ├── models/                      # Interfaces TypeScript y DTOs
│   ├── services/
│   │   ├── theme.service.ts         # Señales de Dark/Light mode con persistencia
│   │   ├── toast.service.ts         # Sistema de notificaciones flotantes reactivas
│   │   ├── preferences.service.ts   # Colapso de sidebar y preferencias de usuario
│   │   └── notifications.service.ts # Campana de notificaciones Realtime
│   ├── ui/
│   │   ├── icon/                    # Componente SVG ligero sin librerías pesadas
│   │   ├── button/                  # Directiva HlmButton con CVA (Spartan UI)
│   │   ├── input/                   # Directiva HlmInput con CVA
│   │   ├── drawer/                  # Slide-over Drawer lateral (Slide-in derecha/izquierda)
│   │   ├── command-palette/         # Buscador global y atajos de teclado (Cmd + K)
│   │   └── toast/                   # Renderizador de toasts animados
└── widgets/
    ├── sidebar/                     # Barra lateral colapsable con grupos de navegación
    └── topbar/                      # Header superior con breadcrumbs, búsqueda y tour
```

---

## 🌈 3. Tokens de Color & Estilos Base (`styles.css` con Tailwind v4)

```css
@import "tailwindcss";
@import "driver.js/dist/driver.css";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 10% 4%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 5% 96%;
    --secondary-foreground: 240 10% 4%;
    --muted: 240 5% 96%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 5% 96%;
    --accent-foreground: 240 10% 4%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 10% 4%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 6.5%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 6.5%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 10% 4%;
    --secondary: 240 6% 12%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 6% 13%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 6% 14%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Ocultar barra de scroll pero mantener funcionalidad táctil */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Animación de Drawers (Entrada y Salida) */
@keyframes slide-drawer-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slide-drawer-out {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}
.animate-drawer-in { animation: slide-drawer-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both; }
.animate-drawer-out { animation: slide-drawer-out 260ms cubic-bezier(0.16, 1, 0.3, 1) both; }

/* Animación de Diálogos & Modales */
@keyframes smooth-dialog-in {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-dialog-in { animation: smooth-dialog-in 340ms cubic-bezier(0.16, 1, 0.3, 1) both; }
```

---

## 🧩 4. Componentes Clave del Sistema

### A. Slide-Over Drawer (`drawer.component.ts`)
* **Propiedades**: `@Input() title`, `@Input() subtitle`, `@Input() isOpen`, `@Output() isOpenChange`.
* **Cierre Inteligente**: Soporte nativo para tecla `Escape`, click fuera (backdrop con `backdrop-blur-md`), y animación de salida sincronizada con `setTimeout(..., 260)`.
* **Accesibilidad**: Focus Trap (`cdkTrapFocus`) y `aria-modal="true"`.

### B. Command Palette Modal (`command-palette.component.ts`)
* **Atajo**: `window:keydown.meta.k` / `Ctrl + K`.
* **Búsqueda Instantánea**: Filtrado en memoria por categorías, navegación con flechas del teclado y escape.

### C. Sistema Reactivo de Toasts (`toast.service.ts` & `toast.component.ts`)
* **Señales**: `protected readonly toasts = signal<ToastItem[]>([])`.
* **Métodos**: `success(title, msg)`, `error(title, msg)`, `warning(title, msg)`, `info(title, msg)`.
* **Auto-Dismiss**: Temporizador automático de 4.5 segundos con botón de cierre manual y barra de progreso.

### D. Componente de Iconos Zero-Dependency (`icon.component.ts`)
* Iconos SVG directos optimizados (`dashboard`, `users`, `events`, `prints`, `settings`, `search`, `download`, `plus`, `refresh`, `trash`, `shield`, `building`, `info`, `bell`, `sun`, `moon`, etc.) con `currentColor` y clases dinámicas.

---

## ⚡ 5. Master AI Prompt (Para copiar y pegar en otra IA)

> **Copia y pega el siguiente bloque a cualquier IA (Claude, ChatGPT, Gemini, Antigravity) para que construya un Dashboard idéntico a este en segundos:**

```markdown
Actúa como un Arquitecto Frontend Senior especializado en Angular v22+, Tailwind CSS v4 y Spartan UI / Shadcn.
Quiero que construyas un Dashboard SaaS profesional con el diseño visual exacto "Acme Dark Obsidian & Clean Titanium Light" basado en las siguientes especificaciones obligatorias:

1. ARQUITECTURA ANGULAR:
- Angular v22+ con componentes 100% Standalone.
- Reactividad moderna obligatoria con Signals (signal, computed, toSignal) y function-based dependency injection (inject()).
- Cero NgModules.
- Estructura limpia modular: core/, entities/, pages/, shared/ui/, widgets/.

2. DISEÑO & PALETA (TAILWIND CSS v4):
- Usa variables HSL en styles.css con soporte dinámico para modo claro (.light) y oscuro (.dark).
- Modo Oscuro: Fondo #09090b, bordes hsl(240 3.7% 15.9%), tarjetas sólidas opacas (bg-card), botones primarios en blanco brillante con texto negro.
- Modo Claro: Fondo #ffffff, bordes hsl(240 5.9% 90%), tarjetas limpias con alto contraste.
- Curvas y sombras: Bordes redondeados rounded-xl / rounded-2xl, sombras suaves shadow-sm y shadow-2xl para modales y drawers.
- Active states: Todos los elementos clickeables deben tener transition-all active:scale-95 o active:scale-[0.99] y cursor-pointer.

3. LAYOUT & WIDGETS:
- Sidebar colapsable (w-60 a w-16) con píldora activa flotante animada con View Transitions API ([view-transition-name:active-nav-pill]).
- Topbar con Breadcrumbs dinámicos basados en Router events, buscador global Cmd+K, botón de cambio de tema (Sol/Luna) y campana de notificaciones.
- Menú móvil: Drawer lateral desplegable de derecha a izquierda con categorías agrupadas y perfil de usuario.

4. COMPONENTES UI REQUERIDOS:
- Slide-over Drawer lateral (drawer.component) con backdrop blur, tecla Escape y animación cubic-bezier.
- Command Palette modal (Cmd + K) con búsqueda instantánea.
- Servicio y componente reactivo de Toast (toast.service) con señales y auto-dismiss.
- Tour interactivo animado integrado con Driver.js (tour.service) para guiar al usuario por los módulos.
- Componente de iconos SVG liviano (icon.component) con currentColor.

Por favor genera el código TypeScript, HTML y CSS completo, limpio y listo para producción sin omitir detalles.
```
