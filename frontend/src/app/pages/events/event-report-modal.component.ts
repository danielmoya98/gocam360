import { Component, input, model, inject, signal, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ToastService } from '../../shared/services/toast.service';
import { EventsService, EventReportDto, EventItemResponseDto } from './services/events.service';

@Component({
  selector: 'app-event-report-modal',
  standalone: true,
  imports: [IconComponent, DatePipe],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none print:p-0 print:static print:z-auto">
        <!-- Backdrop (hidden on print) -->
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity print:hidden" (click)="close()"></div>

        <!-- Main Modal Container -->
        <div
          class="relative z-10 w-full max-w-3xl rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none animate-in fade-in zoom-in-95 duration-200"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black">
                <app-icon name="dashboard" class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-foreground leading-tight">
                  Reporte Ejecutivo de Cierre
                </h3>
                <p class="text-xs text-muted-foreground font-mono">
                  gocam360 Enterprise • Balance Analítico del Evento
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 print:hidden">
              <button
                type="button"
                (click)="printReport()"
                class="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-bold text-xs flex items-center gap-1.5 cursor-pointer text-foreground shadow-xs transition-all active:scale-95"
                title="Imprimir / Guardar en PDF"
              >
                <app-icon name="file-text" class="w-3.5 h-3.5 text-primary" />
                <span>PDF / Imprimir</span>
              </button>

              <button
                type="button"
                (click)="close()"
                class="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-sm cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Body Content -->
          <div class="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            @if (isLoading()) {
              <div class="py-16 text-center space-y-3">
                <app-icon name="refresh" class="w-8 h-8 animate-spin text-primary mx-auto" />
                <p class="font-bold text-foreground">Generando analíticas del evento...</p>
              </div>
            } @else if (report(); as rep) {
              <!-- Banner del Evento -->
              <div class="p-4 rounded-xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-black text-foreground">{{ rep.eventName }}</h4>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {{ rep.status }}
                    </span>
                  </div>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    👤 Anfitrión: <strong class="text-foreground">{{ rep.hostName || 'Cliente' }}</strong>
                    • 📅 Fecha: <strong class="text-foreground">{{ rep.eventDate | date:'fullDate' }}</strong>
                  </p>
                </div>

                <div class="text-right sm:text-right font-mono text-[11px] text-muted-foreground">
                  <span>Código: <strong class="text-foreground">{{ rep.accessCode }}</strong></span>
                </div>
              </div>

              <!-- 4 KPI Cards de Alto Impacto -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Fotos 360°</span>
                  <div class="flex items-center gap-1.5 text-primary">
                    <app-icon name="camera" class="w-4 h-4" />
                    <span class="text-xl font-black font-mono text-foreground">{{ rep.totalPhotos }}</span>
                  </div>
                  <span class="text-[10px] text-muted-foreground">Capturas totales</span>
                </div>

                <div class="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Impresiones</span>
                  <div class="flex items-center gap-1.5 text-amber-500">
                    <app-icon name="printer" class="w-4 h-4" />
                    <span class="text-xl font-black font-mono text-foreground">{{ rep.totalPrints }}</span>
                  </div>
                  <span class="text-[10px] text-muted-foreground">Papel térmico 10x15</span>
                </div>

                <div class="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Invitados</span>
                  <div class="flex items-center gap-1.5 text-indigo-400">
                    <app-icon name="users" class="w-4 h-4" />
                    <span class="text-xl font-black font-mono text-foreground">{{ rep.totalGuests }}</span>
                  </div>
                  <span class="text-[10px] text-muted-foreground">Contactos registrados</span>
                </div>

                <div class="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Engagement</span>
                  <div class="flex items-center gap-1.5 text-rose-500">
                    <span>❤️</span>
                    <span class="text-xl font-black font-mono text-foreground">{{ rep.totalLikes }}</span>
                  </div>
                  <span class="text-[10px] text-muted-foreground">Me gusta en galería</span>
                </div>
              </div>

              <!-- Indicadores de Rendimiento & Marco Favorito -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Ratios de Desempeño -->
                <div class="p-4 rounded-xl bg-card border border-border/80 space-y-3">
                  <h5 class="font-bold text-foreground border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <app-icon name="info" class="w-3.5 h-3.5 text-primary" />
                    <span>Métricas de Desempeño</span>
                  </h5>

                  <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                      <span class="text-muted-foreground">Promedio de fotos por invitado:</span>
                      <span class="font-bold font-mono text-foreground">{{ rep.avgPhotosPerGuest }} fotos / pers.</span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-muted-foreground">Tasa de fotos impresas en papel:</span>
                      <span class="font-bold font-mono text-emerald-400">{{ rep.printRatePct }}%</span>
                    </div>

                    <div class="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div class="bg-emerald-500 h-full rounded-full" [style.width.%]="rep.printRatePct"></div>
                    </div>
                  </div>
                </div>

                <!-- Marco Canva Más Popular -->
                <div class="p-4 rounded-xl bg-card border border-border/80 space-y-3">
                  <h5 class="font-bold text-foreground border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <app-icon name="palette" class="w-3.5 h-3.5 text-purple-400" />
                    <span>Marco Canva Preferido</span>
                  </h5>

                  @if (rep.topFrame; as frame) {
                    <div class="flex items-center gap-3">
                      @if (frame.preview_url) {
                        <img [src]="frame.preview_url" [alt]="frame.name" class="w-12 h-12 rounded-lg object-cover border border-border shrink-0 shadow-xs" />
                      }
                      <div class="min-w-0 flex-1">
                        <p class="font-bold text-foreground truncate">{{ frame.name }}</p>
                        <p class="text-[10px] text-muted-foreground font-mono">Orientación: {{ frame.orientation }}</p>
                        <span class="text-[11px] font-black text-primary font-mono mt-0.5 block">
                          {{ frame.usage_count }} fotos capturadas
                        </span>
                      </div>
                    </div>
                  } @else {
                    <p class="text-muted-foreground italic py-2">Sin información de marcos específicos.</p>
                  }
                </div>
              </div>

              <!-- Actividad Horaria (Horas Pico de la Fiesta) -->
              @if (rep.hourlyActivity && rep.hourlyActivity.length > 0) {
                <div class="p-4 rounded-xl bg-card border border-border/80 space-y-3">
                  <h5 class="font-bold text-foreground border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <app-icon name="clock" class="w-3.5 h-3.5 text-amber-500" />
                    <span>Curva de Actividad Horaria (Horas Pico)</span>
                  </h5>

                  <div class="flex items-end gap-2 h-24 pt-4 px-2">
                    @for (hour of rep.hourlyActivity; track hour.hour_label) {
                      <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span class="text-[9px] font-mono font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          {{ hour.count }}
                        </span>
                        <div
                          class="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary transition-all duration-300 group-hover:brightness-125"
                          [style.height.%]="getHourBarHeight(hour.count)"
                        ></div>
                        <span class="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                          {{ hour.hour_label }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer con Acciones de Envío -->
          <div class="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
            <button
              type="button"
              (click)="sendReportWhatsApp()"
              class="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <app-icon name="phone" class="w-4 h-4 text-emerald-400" />
              <span>Enviar Balance al Anfitrión (WhatsApp)</span>
            </button>

            <button
              type="button"
              (click)="close()"
              class="w-full sm:w-auto px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted font-bold text-xs text-foreground cursor-pointer transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class EventReportModalComponent {
  private readonly _eventsService = inject(EventsService);
  private readonly _toast = inject(ToastService);

  readonly isOpen = model<boolean>(false);
  readonly eventId = input<string>('');
  readonly event = input<EventItemResponseDto | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly report = signal<EventReportDto | null>(null);

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const id = this.eventId();
      if (open && id) {
        this.loadReport(id);
      }
    });
  }

  loadReport(id: string): void {
    this.isLoading.set(true);
    this._eventsService.getEventReport(id).subscribe({
      next: (rep) => {
        this.report.set(rep);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this._toast.error('Error', err?.message || 'No se pudo cargar el reporte del evento');
      },
    });
  }

  getHourBarHeight(count: number): number {
    const rep = this.report();
    if (!rep || !rep.hourlyActivity) return 10;
    const max = Math.max(...rep.hourlyActivity.map((h) => h.count), 1);
    return Math.max(12, Math.round((count / max) * 100));
  }

  printReport(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  sendReportWhatsApp(): void {
    const rep = this.report();
    if (!rep) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gocam360.com';
    const galleryUrl = `${origin}/gallery/${rep.galleryToken || rep.accessCode || rep.eventId}`;
    const hostName = rep.hostName || 'Estimado/a';

    const message =
      `*BALANCE EJECUTIVO • ${rep.eventName.toUpperCase()}* 📸🎉\n\n` +
      `¡Hola ${hostName}! Queremos compartirte el balance oficial de tu experiencia 360°:\n\n` +
      `• 📸 *Fotos capturadas:* ${rep.totalPhotos}\n` +
      `• 🖨️ *Fotos impresas en papel:* ${rep.totalPrints}\n` +
      `• 👥 *Invitados que participaron:* ${rep.totalGuests}\n` +
      `• ❤️ *Me gusta en la galería:* ${rep.totalLikes}\n` +
      (rep.topFrame ? `• 🎨 *Marco preferido:* ${rep.topFrame.name}\n\n` : '\n') +
      `🔗 *Enlace de la Galería Oficial:* ${galleryUrl}\n\n` +
      `¡Muchas gracias por confiar en *gocam360 Enterprise* para tu evento! ✨`;

    const phone = (rep.hostPhone || '').replace(/\D/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    this._toast.success('WhatsApp Preparado', 'Reporte listo para enviar al anfitrión.');
  }

  close(): void {
    this.isOpen.set(false);
  }
}
