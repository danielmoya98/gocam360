import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { form, FormField, submit, required } from '@angular/forms/signals';
import { HlmButtonDirective } from '../../shared/ui/button/hlm-button.directive';
import { HlmInputDirective } from '../../shared/ui/input/hlm-input.directive';
import { DrawerComponent } from '../../shared/ui/drawer/drawer.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { SearchInputComponent } from '../../shared/ui/search-input/search-input.component';
import { ViewSwitcherComponent } from '../../shared/ui/view-switcher/view-switcher.component';
import { TablePaginationComponent } from '../../shared/ui/table-pagination/table-pagination.component';
import { ErrorBoundaryComponent } from '../../shared/ui/error-boundary/error-boundary.component';
import { ToastService } from '../../shared/services/toast.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PrintPhotoItem, PrintQueueModalComponent } from './print-queue-modal.component';
import { EventQrModalComponent } from './event-qr-modal.component';
import { EventReportModalComponent } from './event-report-modal.component';
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { EventsService, EventItemResponseDto, CreateEventDto, UpdateEventDto } from './services/events.service';
import { UsersService, AdminUserResponseDto } from '../users/services/users.service';
import { PreferencesService } from '../../shared/services/preferences.service';
import { PrintsService } from '../prints/services/prints.service';
import { FramesService, FrameItemDto, FrameOrientation } from '../../core/services/frames.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { AuthService } from '../../entities/session/auth.service';

export interface DisplayEventFrame {
  id: string;
  name: string;
  previewUrl: string;
  orientation: FrameOrientation;
  isCustom?: boolean;
}

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [
    FormField,
    HlmButtonDirective,
    HlmInputDirective,
    DrawerComponent,
    ConfirmDialogComponent,
    PrintQueueModalComponent,
    EventQrModalComponent,
    EventReportModalComponent,
    ClickOutsideDirective,
    PageHeaderComponent,
    KpiCardComponent,
    SearchInputComponent,
    ViewSwitcherComponent,
    TablePaginationComponent,
    ErrorBoundaryComponent,
    IconComponent,
    DatePipe
  ],
  templateUrl: './events.page.html',
  styleUrl: './events.page.css',
})
export class EventsPage implements OnInit {
  private readonly _eventsService = inject(EventsService);
  private readonly _usersService = inject(UsersService);
  private readonly _printsService = inject(PrintsService);
  private readonly _framesService = inject(FramesService);
  private readonly _cloudinary = inject(CloudinaryService);
  protected readonly _auth = inject(AuthService);
  private readonly _toastService = inject(ToastService);
  private readonly _router = inject(Router);
  private readonly _preferencesService = inject(PreferencesService);

  private readonly initialPref = this._preferencesService.getPageFilter('events');

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isUploadingMedia = signal(false);
  protected readonly viewMode = signal<'cards' | 'table'>(this.initialPref.viewMode ?? 'cards');
  protected readonly activeRowMenuId = signal<string | null>(null);
  protected readonly activeDrawerTab = signal<'general' | 'frames' | 'limits'>('general');

  protected readonly eventsList = signal<EventItemResponseDto[]>([]);
  protected readonly usersList = signal<AdminUserResponseDto[]>([]);
  protected readonly globalFramesList = signal<FrameItemDto[]>([]);
  protected readonly eventFramesList = signal<DisplayEventFrame[]>([]);

  protected readonly searchQuery = signal(this.initialPref.searchQuery ?? '');
  protected readonly selectedStatusFilter = signal<string>(this.initialPref.statusFilter ?? 'ALL');

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(6);

  protected readonly isFormDrawerOpen = signal(false);
  protected readonly isQrModalOpen = signal(false);
  protected readonly isPrintQueueModalOpen = signal(false);
  protected readonly isDeleteConfirmOpen = signal(false);
  protected readonly isReportModalOpen = signal(false);
  protected readonly selectedReportEventId = signal<string>('');
  protected readonly drawerMode = signal<'create' | 'edit' | 'view'>('create');
  protected readonly selectedEvent = signal<EventItemResponseDto | null>(null);
  protected readonly eventPrintPhotos = signal<PrintPhotoItem[]>([]);

  protected readonly isSuperAdmin = computed(() => this._auth.isSuperAdmin());

  protected readonly eventModel = signal({
    adminId: '',
    name: '',
    description: '',
    hostName: '',
    hostPhone: '',
    hostEmail: '',
    location: '',
    primaryColor: '#6366f1',
    coverImage: '',
    logoUrl: '',
    eventDate: new Date().toISOString().substring(0, 10),
    startTime: '18:00',
    endTime: '23:00',
    maxPhotosPerGuest: 10,
    maxPrintsPerGuest: 1,
    galleryRetentionDays: 7,
  });

  protected readonly eventForm = form(this.eventModel, (s) => {
    required(s.name, { message: 'El nombre del evento es obligatorio' });
    required(s.hostName, { message: 'El nombre del anfitrión es obligatorio' });
  });

  ngOnInit(): void {
    this.loadEvents();
    this.loadUsers();
    this.loadGlobalFrames();
  }

  loadUsers(): void {
    this._usersService.findAll().subscribe({
      next: (users) => this.usersList.set(users),
      error: () => {},
    });
  }

  loadGlobalFrames(): void {
    this._framesService.findAll().subscribe({
      next: (frames) => this.globalFramesList.set(frames),
      error: () => {},
    });
  }

  loadEvents(notify = false): void {
    this.hasError.set(false);

    if (this._eventsService.events() && !notify) {
      this.eventsList.set(this._eventsService.events()!);
      this.isLoading.set(false);
    } else {
      this.isLoading.set(true);
    }

    this._eventsService.findAll(notify).subscribe({
      next: (data) => {
        this.eventsList.set(data);
        this.isLoading.set(false);
        this.hasError.set(false);
        if (notify) {
          this._toastService.info('Sincronización Completa', 'Lista de eventos actualizada desde la base de datos');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
        if (notify) {
          this._toastService.error('Error de Sincronización', 'No se pudieron recuperar los eventos');
        }
      },
    });
  }

  // Métricas calculadas
  protected readonly totalEventsCount = computed(() => this.eventsList().length);
  protected readonly activeEventsCount = computed(() => this.eventsList().filter((e) => e.status === 'ACTIVE').length);
  protected readonly totalPhotosCount = computed(() => this.eventsList().reduce((acc, e) => acc + (e.totalPhotos || 0), 0));
  protected readonly totalPrintsCount = computed(() => this.eventsList().reduce((acc, e) => acc + (e.totalPrints || 0), 0));

  protected readonly filteredEvents = computed(() => {
    let list = this.eventsList();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatusFilter();

    if (query) {
      list = list.filter(
        (e) =>
          (e.title || e.name || '').toLowerCase().includes(query) ||
          (e.location || '').toLowerCase().includes(query) ||
          (e.hostName || '').toLowerCase().includes(query)
      );
    }

    if (status !== 'ALL') {
      list = list.filter((e) => e.status === status);
    }

    return list;
  });

  protected readonly paginatedEvents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredEvents().slice(start, start + this.pageSize());
  });

  protected readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredEvents().length / this.pageSize()));
  });

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
    this._preferencesService.savePageFilter('events', { searchQuery: input.value });
  }

  setStatusFilter(status: string): void {
    this.selectedStatusFilter.set(status);
    this.currentPage.set(1);
    this._preferencesService.savePageFilter('events', { statusFilter: status });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatusFilter.set('ALL');
    this.currentPage.set(1);
    this._preferencesService.savePageFilter('events', { searchQuery: '', statusFilter: 'ALL' });
  }

  toggleRowMenu(id: string, event?: Event): void {
    event?.stopPropagation();
    this.activeRowMenuId.update((curr) => (curr === id ? null : id));
  }

  closeRowMenu(): void {
    this.activeRowMenuId.set(null);
  }

  goToPrintQueue(ev?: EventItemResponseDto): void {
    this.activeRowMenuId.set(null);
    if (ev) {
      this.selectedEvent.set(ev);
    }
    const targetEventId = ev?.id || this.selectedEvent()?.id;
    this.isPrintQueueModalOpen.set(true);

    if (targetEventId) {
      this._printsService.findAll(targetEventId, true).subscribe({
        next: (prints) => {
          const mapped: PrintPhotoItem[] = prints.map((p) => ({
            id: p.id,
            guestName: p.photo?.guest?.name || 'Invitado',
            guestPhone: p.photo?.guest?.phone || '',
            photoUrl: p.photo?.storagePath || p.photo?.thumbnailPath || p.photo?.originalPath || '',
            frameName: p.photo?.frame?.name || 'Sin Marco',
            requestedAt: (p.createdAt || p.requestedAt)
              ? new Date(p.createdAt || p.requestedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            status: p.status === 'PRINTED' ? 'Printed' : 'Pending',
          }));
          this.eventPrintPhotos.set(mapped);
        },
        error: () => {
          this._toastService.error('Error', 'No se pudieron recuperar las fotos del evento');
        },
      });
    }
  }

  onNotifyWhatsApp(photo: PrintPhotoItem): void {
    const message = encodeURIComponent(`¡Hola ${photo.guestName}! Tu foto 360° en ${this.selectedEvent()?.title ?? 'el evento'} está lista. 📸✨`);
    const cleanPhone = photo.guestPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    this._toastService.success('WhatsApp Abierto', `Notificación lista para enviar a ${photo.guestName}`);
  }

  onMarkAsPrinted(photoId: string): void {
    this._printsService.updateStatus(photoId, 'PRINTING').subscribe({
      next: () => {
        this.eventPrintPhotos.update((photos) =>
          photos.map((p) => (p.id === photoId ? { ...p, status: 'Printed' as const } : p))
        );
        this._toastService.success('Impresión Procesada', 'Se envió la orden a la estación térmica.');
      },
      error: () => {
        this._toastService.error('Error', 'No se pudo procesar la solicitud de impresión');
      },
    });
  }

  private formatTimeToHHMM(val: any): string {
    if (!val) return '18:00';
    const str = String(val);
    if (/^\d{2}:\d{2}$/.test(str)) return str;
    if (/^\d{2}:\d{2}:\d{2}/.test(str)) return str.substring(0, 5);

    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      const h = String(parsed.getUTCHours()).padStart(2, '0');
      const m = String(parsed.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    return '18:00';
  }

  private formatDateToYYYYMMDD(val: any): string {
    if (!val) return new Date().toISOString().substring(0, 10);
    const str = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().substring(0, 10);
    }
    return new Date().toISOString().substring(0, 10);
  }

  onFrameFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const orientation = this._framesService.detectOrientation(img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(objectUrl);

        this.isUploadingMedia.set(true);
        this._toastService.info('Subiendo Marco', `Procesando "${file.name}" en Cloudinary CDN...`);

        this._framesService.createFrame({
          name: file.name.replace(/\.[^/.]+$/, ''),
          fileOrBase64: file,
          orientation,
          active: true,
        }).subscribe({
          next: (createdFrame) => {
            this.isUploadingMedia.set(false);
            const newDisplayFrame: DisplayEventFrame = {
              id: createdFrame.id,
              name: createdFrame.name,
              previewUrl: createdFrame.previewImage,
              orientation: createdFrame.orientation,
              isCustom: true,
            };
            this.eventFramesList.update((frames) => [newDisplayFrame, ...frames]);
            this.globalFramesList.update((gf) => [createdFrame, ...gf]);
            this._toastService.success('Marco Subido', `Marco ${orientation} agregado exitosamente.`);
          },
          error: (err) => {
            this.isUploadingMedia.set(false);
            const msg = err?.message || 'No se pudo subir el marco';
            this._toastService.error('Error de Subida', msg);
          },
        });
      };

      img.src = objectUrl;
    }
  }

  addGlobalFrameToEvent(frame: FrameItemDto): void {
    if (this.eventFramesList().some((f) => f.id === frame.id)) {
      this._toastService.info('Ya Asignado', 'Este marco ya está en la lista del evento.');
      return;
    }

    const displayFrame: DisplayEventFrame = {
      id: frame.id,
      name: frame.name,
      previewUrl: frame.previewImage,
      orientation: frame.orientation,
    };
    this.eventFramesList.update((frames) => [...frames, displayFrame]);
    this._toastService.success('Marco Añadido', `"${frame.name}" asociado al evento.`);
  }

  removeFrame(frameId: string): void {
    this.eventFramesList.update((frames) => frames.filter((f) => f.id !== frameId));
    this._toastService.info('Marco Removido', 'Se removió el marco del evento.');
  }

  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingMedia.set(true);
      this._toastService.info('Subiendo Portada', 'Optimizando en Cloudinary CDN...');

      this._cloudinary.uploadImage(file, 'gocam360/covers', ['cover', 'event']).subscribe({
        next: (result) => {
          this.isUploadingMedia.set(false);
          this.eventModel.update((m) => ({ ...m, coverImage: result.secureUrl }));
          this._toastService.success('Portada Subida', 'Imagen de portada actualizada en Cloudinary.');
        },
        error: (err) => {
          this.isUploadingMedia.set(false);
          this._toastService.error('Error', err?.message || 'Error al subir la portada');
        },
      });
    }
  }

  onLogoUrlSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingMedia.set(true);
      this._toastService.info('Subiendo Logo', 'Optimizando en Cloudinary CDN...');

      this._cloudinary.uploadImage(file, 'gocam360/logos', ['logo', 'branding']).subscribe({
        next: (result) => {
          this.isUploadingMedia.set(false);
          this.eventModel.update((m) => ({ ...m, logoUrl: result.secureUrl }));
          this._toastService.success('Logo Subido', 'Logo de marca actualizado en Cloudinary.');
        },
        error: (err) => {
          this.isUploadingMedia.set(false);
          this._toastService.error('Error', err?.message || 'Error al subir el logo');
        },
      });
    }
  }

  openLiveWall(ev: EventItemResponseDto): void {
    this.activeRowMenuId.set(null);
    const token = ev.qrToken || ev.id;
    window.open(`/live-wall/${token}`, '_blank');
  }

  openReportModal(ev: EventItemResponseDto): void {
    this.activeRowMenuId.set(null);
    this.selectedEvent.set(ev);
    this.selectedReportEventId.set(ev.id);
    this.isReportModalOpen.set(true);
  }

  openHostGallery(ev: EventItemResponseDto): void {
    this.activeRowMenuId.set(null);
    const token = ev.galleryToken || ev.qrToken || ev.id;
    window.open(`/gallery/${token}`, '_blank');
  }

  sendHostWhatsApp(ev: EventItemResponseDto): void {
    this.activeRowMenuId.set(null);
    const token = ev.galleryToken || ev.qrToken || ev.id;
    const galleryUrl = `${window.location.origin}/gallery/${token}`;
    const hostName = ev.hostName || 'Estimado/a';
    const message = `¡Hola ${hostName}! 🎉 Te compartimos el enlace oficial con todas las fotografías de tu evento *${ev.name}*: ${galleryUrl} 📸✨`;

    const phone = (ev.hostPhone || '').replace(/\D/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    this._toastService.success('WhatsApp Abierto', 'Enlace de la galería listo para enviar.');
  }

  goToPrintStation(ev: EventItemResponseDto): void {
    this.activeRowMenuId.set(null);
    this._router.navigate(['/dashboard/prints'], { queryParams: { eventId: ev.id } });
  }

  getRetentionDaysRemaining(ev: EventItemResponseDto): { days: number; status: 'ok' | 'warning' | 'expired'; label: string } {
    const eventDate = new Date(ev.eventDate || new Date()).getTime();
    const retentionDays = ev.galleryRetentionDays || 7;
    const expireTime = eventDate + retentionDays * 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((expireTime - Date.now()) / (24 * 60 * 60 * 1000));

    if (diffDays <= 0 || ev.status === 'EXPIRED') {
      return { days: 0, status: 'expired', label: '🔴 Expirado' };
    }
    if (diffDays <= 2) {
      return { days: diffDays, status: 'warning', label: `⚠️ Expira en ${diffDays}d` };
    }
    return { days: diffDays, status: 'ok', label: `⏳ ${diffDays} días de vigencia` };
  }

  openCreateDrawer(): void {
    this.activeDrawerTab.set('general');
    this.eventFramesList.set([]);
    const firstAdminId = this.usersList().length > 0 ? this.usersList()[0].id : '';
    this.eventModel.set({
      adminId: firstAdminId,
      name: '',
      description: '',
      hostName: '',
      hostPhone: '',
      hostEmail: '',
      location: '',
      primaryColor: '#6366f1',
      coverImage: '',
      logoUrl: '',
      eventDate: new Date().toISOString().substring(0, 10),
      startTime: '18:00',
      endTime: '23:00',
      maxPhotosPerGuest: 10,
      maxPrintsPerGuest: 1,
      galleryRetentionDays: 7,
    });
    this.drawerMode.set('create');
    this.isFormDrawerOpen.set(true);
  }

  openViewDrawer(ev: EventItemResponseDto): void {
    this.selectedEvent.set(ev);
    this.activeRowMenuId.set(null);
    this.drawerMode.set('view');
    this.isFormDrawerOpen.set(true);
  }

  openEditDrawer(ev: EventItemResponseDto): void {
    this.selectedEvent.set(ev);
    this.activeRowMenuId.set(null);
    this.activeDrawerTab.set('general');

    this._framesService.findByEvent(ev.id).subscribe({
      next: (frames) => {
        const mapped: DisplayEventFrame[] = frames.map((f) => ({
          id: f.id,
          name: f.name,
          previewUrl: f.previewImage,
          orientation: f.orientation,
        }));
        this.eventFramesList.set(mapped);
      },
      error: () => {
        this.eventFramesList.set([]);
      },
    });

    this.eventModel.set({
      adminId: ev.adminId || '',
      name: ev.name || ev.title,
      description: ev.description || '',
      hostName: ev.hostName,
      hostPhone: ev.hostPhone || '',
      hostEmail: ev.hostEmail || '',
      location: ev.location || '',
      primaryColor: ev.primaryColor || '#6366f1',
      coverImage: ev.coverImage || '',
      logoUrl: ev.logoUrl || '',
      eventDate: this.formatDateToYYYYMMDD(ev.eventDate || ev.date),
      startTime: this.formatTimeToHHMM(ev.startTime),
      endTime: this.formatTimeToHHMM(ev.endTime),
      maxPhotosPerGuest: ev.maxPhotosPerGuest || 10,
      maxPrintsPerGuest: ev.maxPrintsPerGuest || 1,
      galleryRetentionDays: ev.galleryRetentionDays || 7,
    });
    this.drawerMode.set('edit');
    this.isFormDrawerOpen.set(true);
  }

  openQrModal(ev: EventItemResponseDto): void {
    this.selectedEvent.set(ev);
    this.activeRowMenuId.set(null);
    this.isQrModalOpen.set(true);
  }

  openGuestViewLocal(ev: EventItemResponseDto): void {
    this.isQrModalOpen.set(false);
    this._router.navigate(['/guest/event-join'], {
      queryParams: { code: ev.accessCode || ev.uniqueCode },
    });
  }

  copyQrLink(ev: EventItemResponseDto): void {
    const code = ev.accessCode || ev.uniqueCode;
    navigator.clipboard.writeText(`${window.location.origin}/guest/event-join?code=${code}`);
    this._toastService.success('Enlace Copiado', 'Link directo del evento copiado al portapapeles');
    this.isQrModalOpen.set(false);
  }

  onFormSubmit(): void {
    submit(this.eventForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);

      const formVal = this.eventModel();
      const dateStr = formVal.eventDate || new Date().toISOString().substring(0, 10);
      const startTimeVal = formVal.startTime || '18:00';
      const endTimeVal = formVal.endTime || '23:00';
      const frameIds = this.eventFramesList().map((f) => f.id);

      if (this.drawerMode() === 'create') {
        const payload: CreateEventDto = {
          name: formVal.name,
          hostName: formVal.hostName,
          eventDate: dateStr,
          startTime: startTimeVal,
          endTime: endTimeVal,
          maxPhotosPerGuest: Number(formVal.maxPhotosPerGuest),
          maxPrintsPerGuest: Number(formVal.maxPrintsPerGuest),
          galleryRetentionDays: Number(formVal.galleryRetentionDays),
        };

        if (formVal.adminId) payload.adminId = formVal.adminId;
        if (formVal.description?.trim()) payload.description = formVal.description.trim();
        if (formVal.hostPhone?.trim()) payload.hostPhone = formVal.hostPhone.trim();
        if (formVal.hostEmail?.trim()) payload.hostEmail = formVal.hostEmail.trim();
        if (formVal.location?.trim()) payload.location = formVal.location.trim();
        if (formVal.primaryColor?.trim()) payload.primaryColor = formVal.primaryColor.trim();
        if (formVal.coverImage?.trim()) payload.coverImage = formVal.coverImage.trim();
        if (formVal.logoUrl?.trim()) payload.logoUrl = formVal.logoUrl.trim();

        this._eventsService.create(payload).subscribe({
          next: (newEv) => {
            // Asignar marcos en Supabase
            if (frameIds.length > 0) {
              this._framesService.assignFramesToEvent(newEv.id, frameIds).subscribe();
            }

            this.isSubmitting.set(false);
            this.eventsList.update((list) => [newEv, ...list]);
            this._toastService.success('Evento Creado', `Se creó el evento "${newEv.title}".`);
            this.isFormDrawerOpen.set(false);
          },
          error: (err) => {
            this.isSubmitting.set(false);
            const msg = err?.message || err?.error?.message || 'No se pudo crear el evento';
            this._toastService.error('Error al crear', msg);
          },
        });

      } else if (this.drawerMode() === 'edit' && this.selectedEvent()) {
        const targetId = this.selectedEvent()!.id;

        const payload: UpdateEventDto = {
          name: formVal.name,
          hostName: formVal.hostName,
          eventDate: dateStr,
          startTime: startTimeVal,
          endTime: endTimeVal,
          maxPhotosPerGuest: Number(formVal.maxPhotosPerGuest),
          maxPrintsPerGuest: Number(formVal.maxPrintsPerGuest),
          galleryRetentionDays: Number(formVal.galleryRetentionDays),
        };

        if (formVal.adminId) payload.adminId = formVal.adminId;
        if (formVal.description?.trim()) payload.description = formVal.description.trim();
        if (formVal.hostPhone?.trim()) payload.hostPhone = formVal.hostPhone.trim();
        if (formVal.hostEmail?.trim()) payload.hostEmail = formVal.hostEmail.trim();
        if (formVal.location?.trim()) payload.location = formVal.location.trim();
        if (formVal.primaryColor?.trim()) payload.primaryColor = formVal.primaryColor.trim();
        if (formVal.coverImage?.trim()) payload.coverImage = formVal.coverImage.trim();
        if (formVal.logoUrl?.trim()) payload.logoUrl = formVal.logoUrl.trim();

        this._eventsService.update(targetId, payload).subscribe({
          next: (updatedEv) => {
            // Sincronizar marcos en Supabase
            this._framesService.assignFramesToEvent(targetId, frameIds).subscribe();

            this.isSubmitting.set(false);
            this.eventsList.update((list) =>
              list.map((e) => (e.id === targetId ? updatedEv : e))
            );
            this._toastService.info('Evento Actualizado', 'Los cambios se guardaron.');
            this.isFormDrawerOpen.set(false);
          },
          error: (err) => {
            this.isSubmitting.set(false);
            const msg = err?.message || err?.error?.message || 'Error al actualizar evento';
            this._toastService.error('Error', msg);
          },
        });
      }
    });
  }

  confirmDelete(ev: EventItemResponseDto): void {
    this.selectedEvent.set(ev);
    this.activeRowMenuId.set(null);
    this.isDeleteConfirmOpen.set(true);
  }

  executeDelete(): void {
    if (this.selectedEvent()) {
      const id = this.selectedEvent()!.id;
      this._eventsService.remove(id).subscribe({
        next: () => {
          this.eventsList.update((list) => list.filter((e) => e.id !== id));
          this._toastService.error('Evento Eliminado', 'El evento ha sido eliminado.');
        },
        error: (err) => {
          const msg = err?.message || 'No se pudo eliminar el evento.';
          this._toastService.error('Error', msg);
        },
      });
    }
  }
}
