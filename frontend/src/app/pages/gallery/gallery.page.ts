import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import JSZip from 'jszip';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PublicGalleryPhotoDto {
  id: string;
  storagePath: string;
  thumbnailPath?: string;
  uploadedAt: string | Date;
  likesCount: number;
  guestName: string;
  width?: number;
  height?: number;
}

export interface PublicGalleryEventDto {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  logoUrl?: string;
  hostName?: string;
  location?: string;
  eventDate?: string | Date;
  accessCode?: string;
  galleryToken?: string;
}

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  imports: [IconComponent, DatePipe],
  templateUrl: './gallery.page.html',
  styleUrl: './gallery.page.css',
})
export class GalleryPage implements OnInit, OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _supabase = inject(SupabaseService);
  private readonly _toast = inject(ToastService);

  private realtimeChannel?: RealtimeChannel;

  protected readonly isLoading = signal(true);
  protected readonly eventData = signal<PublicGalleryEventDto | null>(null);
  protected readonly photos = signal<PublicGalleryPhotoDto[]>([]);

  // Estado del Lightbox / Visor Fullscreen
  protected readonly lightboxPhoto = signal<PublicGalleryPhotoDto | null>(null);
  protected readonly likedPhotoIds = signal<Set<string>>(new Set());

  // Estado de descarga ZIP
  protected readonly isGeneratingZip = signal(false);
  protected readonly zipProgressText = signal('');

  protected readonly totalLikes = computed(() =>
    this.photos().reduce((acc, p) => acc + (p.likesCount || 0), 0)
  );

  ngOnInit(): void {
    const token =
      this._route.snapshot.paramMap.get('token') ||
      this._route.snapshot.queryParamMap.get('code') ||
      this._route.snapshot.queryParamMap.get('event') ||
      '';

    this.loadLikedPhotosFromStorage();

    if (token) {
      this.loadGalleryData(token);
    } else {
      this.isLoading.set(false);
      this._toast.error('Enlace inválido', 'No se especificó un token de galería.');
    }
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }

  private loadLikedPhotosFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('gocam_liked_photos');
        if (stored) {
          this.likedPhotoIds.set(new Set(JSON.parse(stored)));
        }
      }
    } catch {
      // Ignorar error de storage
    }
  }

  private saveLikedPhotosToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'gocam_liked_photos',
          JSON.stringify(Array.from(this.likedPhotoIds()))
        );
      }
    } catch {
      // Ignorar error de storage
    }
  }

  private async loadGalleryData(tokenOrCode: string): Promise<void> {
    try {
      this.isLoading.set(true);
      const cleanToken = tokenOrCode.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanToken);

      let eventQuery = this._supabase
        .from('events')
        .select('id, name, description, cover_image, logo_url, host_name, event_date, location, access_code, gallery_token');

      if (isUuid) {
        eventQuery = eventQuery.or(`id.eq.${cleanToken},gallery_token.eq.${cleanToken}`);
      } else {
        eventQuery = eventQuery.or(
          `gallery_token.eq.${cleanToken},access_code.ilike.${cleanToken},qr_token.eq.${cleanToken}`
        );
      }

      const { data: eventRow, error: eventError } = await eventQuery.single();

      if (eventError || !eventRow) {
        throw new Error(eventError?.message || 'Galería no encontrada o código expirado');
      }

      const event: PublicGalleryEventDto = {
        id: eventRow.id,
        name: eventRow.name || 'Álbum del Evento',
        description: eventRow.description,
        coverImage: eventRow.cover_image,
        logoUrl: eventRow.logo_url,
        hostName: eventRow.host_name,
        location: eventRow.location,
        eventDate: eventRow.event_date,
        accessCode: eventRow.access_code,
        galleryToken: eventRow.gallery_token,
      };

      this.eventData.set(event);

      // Cargar fotografías aprobadas del evento
      const { data: photoRows, error: photosError } = await this._supabase
        .from('photos')
        .select(`
          id,
          storage_path,
          thumbnail_path,
          uploaded_at,
          likes_count,
          width,
          height,
          guest:guests(name)
        `)
        .eq('event_id', event.id)
        .order('uploaded_at', { ascending: false });

      if (photosError) {
        console.warn('Aviso fotos de galería:', photosError.message);
      }

      const photos: PublicGalleryPhotoDto[] = (photoRows || []).map((row: any) => ({
        id: row.id,
        storagePath: row.storage_path || row.thumbnail_path || '',
        thumbnailPath: row.thumbnail_path || row.storage_path || '',
        uploadedAt: row.uploaded_at || new Date(),
        likesCount: row.likes_count || 0,
        guestName: row.guest?.name || 'Invitado',
        width: row.width,
        height: row.height,
      }));

      this.photos.set(photos);
      this.isLoading.set(false);

      // Suscripción en tiempo real para likes o nuevas fotos
      this.setupRealtimeSubscription(event.id);
    } catch (err: any) {
      this.isLoading.set(false);
      this._toast.error('Error al cargar galería', err?.message || 'No se pudo abrir el álbum.');
    }
  }

  private setupRealtimeSubscription(eventId: string): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = this._supabase.subscribeToChannel(
      `public-gallery-${eventId}-${Date.now()}`,
      'photos',
      (payload) => this.handleRealtimeEvent(payload, eventId),
      `event_id=eq.${eventId}`
    );
  }

  private async handleRealtimeEvent(payload: any, eventId: string): Promise<void> {
    if (payload.eventType === 'INSERT') {
      const newRow = payload.new;
      let guestName = 'Invitado';
      if (newRow.guest_id) {
        const { data } = await this._supabase
          .from('guests')
          .select('name')
          .eq('id', newRow.guest_id)
          .single();
        if (data?.name) guestName = data.name;
      }

      const newPhoto: PublicGalleryPhotoDto = {
        id: newRow.id,
        storagePath: newRow.storage_path || newRow.thumbnail_path || '',
        thumbnailPath: newRow.thumbnail_path || newRow.storage_path || '',
        uploadedAt: newRow.uploaded_at || new Date(),
        likesCount: newRow.likes_count || 0,
        guestName,
        width: newRow.width,
        height: newRow.height,
      };

      this.photos.update((list) => [newPhoto, ...list.filter((p) => p.id !== newPhoto.id)]);
      this._toast.info('Nueva Foto', 'Se ha agregado una fotografía al álbum.');
    } else if (payload.eventType === 'UPDATE') {
      const updatedRow = payload.new;
      this.photos.update((list) =>
        list.map((p) =>
          p.id === updatedRow.id
            ? { ...p, likesCount: updatedRow.likes_count ?? p.likesCount }
            : p
        )
      );

      if (this.lightboxPhoto()?.id === updatedRow.id) {
        this.lightboxPhoto.update((p) =>
          p ? { ...p, likesCount: updatedRow.likes_count ?? p.likesCount } : null
        );
      }
    }
  }

  // Lightbox Navigation
  openLightbox(photo: PublicGalleryPhotoDto): void {
    this.lightboxPhoto.set(photo);
  }

  closeLightbox(): void {
    this.lightboxPhoto.set(null);
  }

  navigateLightbox(direction: 'prev' | 'next'): void {
    const current = this.lightboxPhoto();
    if (!current) return;

    const list = this.photos();
    const currentIndex = list.findIndex((p) => p.id === current.id);
    if (currentIndex === -1) return;

    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % list.length;
      this.lightboxPhoto.set(list[nextIndex]);
    } else {
      const prevIndex = (currentIndex - 1 + list.length) % list.length;
      this.lightboxPhoto.set(list[prevIndex]);
    }
  }

  // Like Interaction via RPC
  async toggleLike(photo: PublicGalleryPhotoDto, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const alreadyLiked = this.likedPhotoIds().has(photo.id);
    if (alreadyLiked) {
      this._toast.info('Ya diste Me Gusta', 'Ya has reaccionado a esta fotografía ❤️');
      return;
    }

    // Optimistic UI update
    this.likedPhotoIds.update((set) => {
      const copy = new Set(set);
      copy.add(photo.id);
      return copy;
    });
    this.saveLikedPhotosToStorage();

    this.photos.update((list) =>
      list.map((p) => (p.id === photo.id ? { ...p, likesCount: p.likesCount + 1 } : p))
    );
    if (this.lightboxPhoto()?.id === photo.id) {
      this.lightboxPhoto.update((p) => (p ? { ...p, likesCount: p.likesCount + 1 } : null));
    }

    try {
      await this._supabase.rpc('like_photo', { p_photo_id: photo.id });
      this._toast.success('¡Reacción enviada!', '❤️');
    } catch {
      // Revert in case of error
      this.photos.update((list) =>
        list.map((p) => (p.id === photo.id ? { ...p, likesCount: Math.max(0, p.likesCount - 1) } : p))
      );
    }
  }

  // Descarga individual HD
  async downloadPhoto(photo: PublicGalleryPhotoDto, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    try {
      this._toast.info('Descargando', 'Iniciando descarga en alta definición...');
      const response = await fetch(photo.storagePath);
      if (!response.ok) throw new Error('Error al obtener la imagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `gocam360_${photo.guestName.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this._toast.success('Descarga Lista', 'Fotografía guardada con éxito.');
    } catch {
      // Fallback: abrir en pestaña nueva
      window.open(photo.storagePath, '_blank');
    }
  }

  // Compartir en WhatsApp
  shareOnWhatsApp(photo: PublicGalleryPhotoDto, event?: Event): void {
    if (event) event.stopPropagation();
    const eventName = this.eventData()?.name || 'Evento 360°';
    const message = `¡Mira mi fotografía en el evento *${eventName}*! 📸✨\n${photo.storagePath}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }

  // Descarga masiva ZIP
  async downloadAllZip(): Promise<void> {
    const list = this.photos();
    const event = this.eventData();

    if (!list || list.length === 0) {
      this._toast.info('Sin fotos', 'No hay fotografías disponibles para descargar.');
      return;
    }

    this.isGeneratingZip.set(true);
    this.zipProgressText.set(`Descargando 0/${list.length} fotos...`);

    try {
      const zip = new JSZip();
      const folderName = (event?.name || 'Fotos_360').replace(/[^a-zA-Z0-9_-]/g, '_');
      const imgFolder = zip.folder(folderName) || zip;

      let downloadedCount = 0;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        this.zipProgressText.set(`Procesando foto ${i + 1}/${list.length}...`);

        try {
          const res = await fetch(p.storagePath);
          if (res.ok) {
            const blob = await res.blob();
            const filename = `foto_${i + 1}_${p.guestName.replace(/\s+/g, '_')}_${p.id.substring(0, 6)}.jpg`;
            imgFolder.file(filename, blob);
            downloadedCount++;
          }
        } catch {
          // Continuar con las siguientes
        }
      }

      if (downloadedCount === 0) {
        throw new Error('No se pudieron descargar las imágenes');
      }

      this.zipProgressText.set('Comprimiendo archivo ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });

      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${folderName}_Album_Completo.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      this.isGeneratingZip.set(false);
      this._toast.success('Álbum Descargado', `Se descargaron ${downloadedCount} fotos en alta resolución.`);
    } catch {
      this.isGeneratingZip.set(false);
      this._toast.error('Error de Descarga', 'No se pudo generar el archivo ZIP. Inténtalo nuevamente.');
    }
  }

  // Compartir álbum por WhatsApp
  shareGalleryWhatsApp(): void {
    const event = this.eventData();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const message = `¡Revive las mejores fotos 360° de *${event?.name || 'nuestro evento'}*! 📸✨ Mira el álbum completo aquí: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }

  // Copiar link de galería
  copyGalleryLink(): void {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url).then(() => {
      this._toast.success('Enlace Copiado', 'Link del álbum copiado al portapapeles.');
    });
  }
}
