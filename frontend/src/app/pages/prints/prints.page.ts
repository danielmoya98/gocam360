import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import JSZip from 'jszip';
import { ToastService } from '../../shared/services/toast.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { ViewSwitcherComponent } from '../../shared/ui/view-switcher/view-switcher.component';
import { TablePaginationComponent } from '../../shared/ui/table-pagination/table-pagination.component';
import { EventsService, EventItemResponseDto } from '../events/services/events.service';
import { PrintsService, PrintRequestItemDto, PrintStatus } from './services/prints.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Component({
  selector: 'app-prints-page',
  standalone: true,
  imports: [
    IconComponent,
    DatePipe,
    PageHeaderComponent,
    KpiCardComponent,
    ViewSwitcherComponent,
    TablePaginationComponent,
  ],
  templateUrl: './prints.page.html',
  styleUrl: './prints.page.css',
})
export class PrintsPage implements OnInit, OnDestroy {
  private readonly _eventsService = inject(EventsService);
  private readonly _printsService = inject(PrintsService);
  private readonly _toastService = inject(ToastService);

  private realtimeSubscription?: RealtimeChannel;

  protected readonly isLoading = signal(true);
  protected readonly viewMode = signal<'cards' | 'table'>('cards');
  protected readonly activeStatusTab = signal<'TODAS' | 'PENDING' | 'PRINTING' | 'PRINTED'>('TODAS');
  protected readonly selectedEventId = signal<string>('ALL');

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);

  protected readonly eventsList = signal<EventItemResponseDto[]>([]);
  protected readonly printRequests = signal<PrintRequestItemDto[]>([]);

  protected readonly previewState = signal<{ isOpen: boolean; url: string }>({
    isOpen: false,
    url: '',
  });

  // Estado Modal Descarga ZIP & Compartir con Anfitrión
  protected readonly isZipModalOpen = signal(false);
  protected readonly zipEventId = signal<string>('');
  protected readonly isGeneratingZip = signal(false);
  protected readonly zipProgressText = signal('');

  protected readonly selectedZipEvent = computed(() => {
    const id = this.zipEventId();
    return this.eventsList().find((e) => e.id === id) || null;
  });

  protected readonly selectedZipEventGalleryUrl = computed(() => {
    const ev = this.selectedZipEvent();
    if (!ev) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gocam360.com';
    const token = ev.galleryToken || ev.uniqueCode || ev.accessCode || '';
    return `${origin}/gallery/${token}`;
  });

  protected readonly isSoundEnabled = signal(true);

  ngOnInit(): void {
    this.loadAllData();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }
  }

  private playDingSound(): void {
    if (!this.isSoundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Ignorar restricciones de audio del navegador
    }
  }

  toggleSound(): void {
    this.isSoundEnabled.update((val) => !val);
    if (this.isSoundEnabled()) {
      this.playDingSound();
      this._toastService.info('Alertas Sonoras Activadas', 'Se emitirá un sonido al recibir nuevas impresiones.');
    } else {
      this._toastService.info('Alertas Sonoras Silenciadas', 'Se pausó el sonido de notificación.');
    }
  }

  setupRealtimeSubscription(): void {
    this.realtimeSubscription = this._printsService.subscribeToPrints(() => {
      this.playDingSound();
      this._toastService.info('Nueva Solicitud', '🔔 Se ha recibido una orden de impresión en vivo.');
      this.loadAllData(false);
    });
  }

  loadAllData(notify = false): void {
    if (this._eventsService.events() && this._printsService.prints() && !notify) {
      this.eventsList.set(this._eventsService.events()!);
      this.printRequests.set(this._printsService.prints()!);
      this.isLoading.set(false);
    } else {
      this.isLoading.set(true);
    }

    this._eventsService.findAll(notify).subscribe({
      next: (events) => {
        this.eventsList.set(events);

        const targetEventId = this.selectedEventId() !== 'ALL' ? this.selectedEventId() : undefined;
        this._printsService.findAll(targetEventId, notify).subscribe({
          next: (prints) => {
            this.printRequests.set(prints);
            this.isLoading.set(false);
            if (notify) {
              this._toastService.info('Sincronización Completa', 'Cola de impresión actualizada desde la base de datos');
            }
          },
          error: () => {
            this.isLoading.set(false);
            if (notify) {
              this._toastService.error('Error', 'No se pudo recuperar la cola de impresiones');
            }
          },
        });
      },
      error: () => {
        this.isLoading.set(false);
        if (notify) {
          this._toastService.error('Error', 'No se pudieron recuperar los eventos');
        }
      },
    });
  }

  onEventChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.selectedEventId.set(select.value);
    this.loadAllData(true);
  }

  getEventName(eventId: string): string {
    const ev = this.eventsList().find((e) => e.id === eventId);
    return ev ? (ev.title || ev.name) : 'Evento 360°';
  }

  protected readonly totalPhotosCount = computed(() =>
    this.eventsList().reduce((acc, ev) => acc + (ev.totalPhotos || 0), 0)
  );

  protected readonly totalRequestsCount = computed(() => this.printRequests().length);
  protected readonly pendingRequestsCount = computed(() => this.printRequests().filter((r) => r.status === 'PENDING').length);
  protected readonly printingRequestsCount = computed(() => this.printRequests().filter((r) => r.status === 'PRINTING').length);
  protected readonly deliveredRequestsCount = computed(() => this.printRequests().filter((r) => r.status === 'PRINTED').length);

  protected readonly filteredPrintItems = computed(() => {
    let list = this.printRequests();
    const tab = this.activeStatusTab();
    const eventId = this.selectedEventId();

    if (eventId !== 'ALL') {
      list = list.filter((r) => r.eventId === eventId || (r.photo as any)?.eventId === eventId);
    }
    if (tab !== 'TODAS') {
      list = list.filter((r) => r.status === tab);
    }
    return list;
  });

  protected readonly totalPages = computed(() =>
    Math.ceil(this.filteredPrintItems().length / this.pageSize()) || 1
  );

  protected readonly paginatedPrintItems = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPrintItems().slice(startIndex, startIndex + this.pageSize());
  });

  changeStatus(id: string, status: PrintStatus): void {
    this._printsService.updateStatus(id, status).subscribe({
      next: (updatedItem) => {
        this.printRequests.update((list) =>
          list.map((r) => (r.id === id ? updatedItem : r))
        );
        if (status === 'PRINTING') {
          this._toastService.success('Impresión Enviada', 'La orden fue enviada a la estación térmica.');
        } else if (status === 'PRINTED') {
          this._toastService.success('Foto Impresa', 'La fotografía fue marcada como impresa.');
        } else if (status === 'CANCELLED') {
          this._toastService.error('Solicitud Rechazada', 'La orden de impresión fue rechazada.');
        }
      },
      error: () => {
        this._toastService.error('Error', 'No se pudo actualizar el estado de impresión');
      },
    });
  }

  notifyGuestWhatsApp(item: PrintRequestItemDto): void {
    const guest = item.photo?.guest;
    if (!guest || !guest.phone) {
      this._toastService.info('Sin teléfono', 'El invitado no registró número de WhatsApp.');
      return;
    }
    const eventName = item.eventTitle || this.getEventName(item.eventId) || 'el evento';
    const message = `¡Hola ${guest.name}! 🎉 Tu fotografía del evento *${eventName}* ya está impresa y lista para retirar en la mesa de fotos. 📸✨`;
    const cleanPhone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    this._toastService.success('WhatsApp Abierto', `Mensaje listo para enviar a ${guest.name}`);
  }

  openPreviewModal(url: string): void {
    this.previewState.set({ isOpen: true, url });
  }

  closePreviewModal(): void {
    this.previewState.set({ isOpen: false, url: '' });
  }

  // Abrir Modal de Descarga de Fotos ZIP y Compartir con Anfitrión
  openZipModal(): void {
    if (this.eventsList().length > 0) {
      const currentSelected = this.selectedEventId();
      this.zipEventId.set(currentSelected !== 'ALL' ? currentSelected : this.eventsList()[0].id);
    }
    this.isZipModalOpen.set(true);
  }

  closeZipModal(): void {
    if (this.isGeneratingZip()) return;
    this.isZipModalOpen.set(false);
  }

  // Descargar ZIP con todas las fotos del evento seleccionado
  async downloadEventZip(): Promise<void> {
    const ev = this.selectedZipEvent();
    if (!ev) {
      this._toastService.info('Selecciona un evento', 'Por favor elige un evento para descargar.');
      return;
    }

    const eventPrints = this.printRequests().filter((r) => r.eventId === ev.id || (r.photo as any)?.eventId === ev.id);
    const photoUrls = eventPrints.map((r) => r.photo.storagePath).filter(Boolean);

    if (photoUrls.length === 0) {
      this._toastService.info('Evento sin fotos', `El evento "${ev.title}" aún no cuenta con fotografías disponibles.`);
      return;
    }

    this.isGeneratingZip.set(true);
    this.zipProgressText.set(`Descargando 0/${photoUrls.length} fotos...`);

    try {
      const zip = new JSZip();
      const folderName = (ev.title || ev.name).replace(/[^a-zA-Z0-9_-]/g, '_');
      const imgFolder = zip.folder(folderName) || zip;

      let downloadedCount = 0;
      for (let i = 0; i < photoUrls.length; i++) {
        const url = photoUrls[i];
        this.zipProgressText.set(`Procesando foto ${i + 1}/${photoUrls.length}...`);

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Error de red');
          const blob = await response.blob();
          const filename = `foto_${i + 1}_${Date.now()}.jpg`;
          imgFolder.file(filename, blob);
          downloadedCount++;
        } catch {
          // Continuar con las demás fotos si alguna falla
        }
      }

      if (downloadedCount === 0) {
        throw new Error('No se pudieron descargar imágenes');
      }

      this.zipProgressText.set('Comprimiendo archivo ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });

      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${folderName}_fotos_360.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      this.isGeneratingZip.set(false);
      this._toastService.success('ZIP Generado', `Se descargaron ${downloadedCount} fotos del evento "${ev.title}".`);
      this.closeZipModal();
    } catch {
      this.isGeneratingZip.set(false);
      this._toastService.error('Error al descargar', 'No se pudieron descargar las fotos. Verifica tu conexión.');
    }
  }

  copyHostLink(): void {
    const url = this.selectedZipEventGalleryUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this._toastService.success('Enlace Copiado', 'Link del álbum copiado al portapapeles.');
    });
  }

  shareHostWhatsApp(): void {
    const ev = this.selectedZipEvent();
    const url = this.selectedZipEventGalleryUrl();
    if (!ev || !url) return;

    const hostName = ev.hostName || 'Anfitrión';
    const message = `¡Hola ${hostName}! Te compartimos el enlace con todas las fotos de tu evento *${ev.title || ev.name}*: ${url}`;
    const waUrl = `https://wa.me/${ev.hostPhone ? ev.hostPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }
}
