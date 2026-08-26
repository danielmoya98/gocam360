import { Injectable, inject } from '@angular/core';
import { driver, DriveStep } from 'driver.js';
import { Router } from '@angular/router';
import { AuthService } from '../../entities/session/auth.service';
import { UserRole } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly _auth = inject(AuthService);
  private readonly _router = inject(Router);

  startTour(role?: UserRole, force = true): void {
    const activeRole = role || this._auth.userRole();
    const isSuperAdmin = activeRole === 'SUPERADMIN';

    // Si ya completó el tour y no es forzado, no lanzar automáticamente
    if (!force && localStorage.getItem(`gocam360_tour_completed_${activeRole}`) === 'true') {
      return;
    }

    const steps: DriveStep[] = isSuperAdmin
      ? [
          {
            element: '#tour-brand-header',
            popover: {
              title: '🚀 Bienvenido a gocam360 Enterprise',
              description:
                'Esta es tu plataforma SaaS integral para photo booths 360°, galerías digitales, proyección en vivo y estaciones de impresión térmica.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-dashboard',
            popover: {
              title: '📊 Dashboard Global & KPIs',
              description:
                'Monitorea el uso de recursos en tiempo real, el estado de tu base de datos en Supabase, el consumo de Cloudinary y la tendencia semanal de actividad.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-events',
            popover: {
              title: '📅 Gestión Integral de Eventos',
              description:
                'Crea y administra bodas, XV años y fiestas corporativas. Asigna operadores, configura límites de fotos por invitado y reglas de retención automática.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-prints',
            popover: {
              title: '🖨️ Estación de Impresión Térmica',
              description:
                'Controla la cola de impresión física en formato 10x15. Recibe alertas sonoras en vivo y envía notificaciones por WhatsApp a los invitados cuando su foto esté lista.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-users',
            popover: {
              title: '👥 Operadores y Equipo',
              description:
                'Crea y administra cuentas para tus operadores de cabina. Cada operador solo tendrá acceso a los eventos que tú le asignes.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-crm',
            popover: {
              title: '📱 Prospectos Comerciales (CRM Leads)',
              description:
                'Convierte a los asistentes de las fiestas en clientes potenciales. Todos los que soliciten cotizaciones desde el QR aparecerán aquí listos para exportar a Excel.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-audit',
            popover: {
              title: '🛡️ Bitácora y Auditoría de Seguridad',
              description:
                'Registro cronológico inmutable de accesos, creación de eventos y operaciones administrativas para máxima transparencia y control.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-settings',
            popover: {
              title: '⚙️ Configuración Global & Purga',
              description:
                'Personaliza los mensajes de WhatsApp, cuotas por defecto para nuevos eventos y ejecuta la purga nocturna de almacenamiento para mantenerte siempre en el plan gratuito.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-user-footer',
            popover: {
              title: '👑 Tu Perfil y Avatar',
              description:
                'Actualiza tu foto de perfil almacenada en Supabase Storage, cambia tu contraseña y gestiona tu sesión.',
              side: 'top',
              align: 'start',
            },
          },
        ]
      : [
          {
            element: '#tour-brand-header',
            popover: {
              title: '🎪 Panel de Operador de Cabina',
              description:
                '¡Bienvenido a tu estación de trabajo en vivo! Desde aquí controlarás la experiencia 360° durante el evento.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-dashboard',
            popover: {
              title: '📊 Dashboard de Operaciones',
              description:
                'Visualiza el balance en tiempo real de fotos capturadas y órdenes de impresión de tus eventos asignados.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-events',
            popover: {
              title: '📅 Tus Eventos Asignados',
              description:
                'Accede a los códigos QR de mesa, abre el Muro en Vivo para proyectar en el salón y comparte el enlace de la galería final con el anfitrión.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-nav-prints',
            popover: {
              title: '🖨️ Cola de Impresión en Vivo',
              description:
                'Tu centro de operaciones principal: conecta la impresora DNP/Fuji 10x15, escucha las alertas sonoras y avisa a los invitados por WhatsApp con 1 clic.',
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '#tour-user-footer',
            popover: {
              title: '👤 Tu Perfil y Configuración',
              description:
                'Gestiona tus datos personales y cambia entre modo claro y oscuro.',
              side: 'top',
              align: 'start',
            },
          },
        ];

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Comenzar! 🎉',
      progressText: 'Paso {{current}} de {{total}}',
      steps,
      onDestroyStarted: () => {
        localStorage.setItem(`gocam360_tour_completed_${activeRole}`, 'true');
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }
}
