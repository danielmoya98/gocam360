import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveWallPhotoDto {
  id: string;
  storagePath: string;
  guestName: string;
  uploadedAt: string | Date;
  likesCount: number;
}

export interface LiveWallDataDto {
  id: string;
  name: string;
  accessCode: string;
  qrToken: string;
  primaryColor?: string;
  logoUrl?: string;
  photos: LiveWallPhotoDto[];
}

@Component({
  selector: 'app-live-wall-page',
  standalone: true,
  imports: [IconComponent, DatePipe, RouterLink],
  templateUrl: './live-wall.page.html',
  styleUrl: './live-wall.page.css',
})
export class LiveWallPage implements OnInit, OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _supabase = inject(SupabaseService);
  private readonly _toast = inject(ToastService);

  private realtimeChannel?: RealtimeChannel;
  private rotationInterval: any;

  protected readonly isLoading = signal(true);
  protected readonly eventData = signal<LiveWallDataDto | null>(null);
  protected readonly activePhotoIndex = signal(0);
  protected readonly currentPhoto = signal<LiveWallPhotoDto | null>(null);
  protected readonly isSpotlightNew = signal(false);

  ngOnInit(): void {
    const param =
      this._route.snapshot.paramMap.get('id') ||
      this._route.snapshot.queryParamMap.get('code') ||
      this._route.snapshot.queryParamMap.get('event') ||
      '';

    if (!param) {
      this.isLoading.set(false);
      this._toast.error('Parámetro requerido', 'No se proporcionó código ni ID de evento.');
      return;
    }

    // 1. Carga inicial de datos desde Supabase
    this.loadWallData(param);

    // 2. Timer de rotación local cada 6 segundos
    this.startRotationTimer();
  }

  ngOnDestroy(): void {
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }

  private startRotationTimer(): void {
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    this.rotationInterval = setInterval(() => this.rotatePhoto(), 6000);
  }

  private async loadWallData(idOrCode: string): Promise<void> {
    try {
      this.isLoading.set(true);

      const cleanParam = idOrCode.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam);

      let eventQuery = this._supabase
        .from('events')
        .select('id, name, access_code, qr_token, primary_color, logo_url');

      if (isUuid) {
        eventQuery = eventQuery.eq('id', cleanParam);
      } else {
        eventQuery = eventQuery.or(
          `access_code.ilike.${cleanParam},qr_token.eq.${cleanParam},gallery_token.eq.${cleanParam}`
        );
      }

      const { data: eventRow, error: eventError } = await eventQuery.single();

      if (eventError || !eventRow) {
        throw new Error(eventError?.message || 'Evento no encontrado');
      }

      // 2. Cargar fotografías existentes en orden cronológico inverso
      const { data: photoRows, error: photosError } = await this._supabase
        .from('photos')
        .select(`
          id,
          storage_path,
          thumbnail_path,
          uploaded_at,
          likes_count,
          guest:guests(name)
        `)
        .eq('event_id', eventRow.id)
        .order('uploaded_at', { ascending: false })
        .limit(100);

      if (photosError) {
        console.warn('Aviso al recuperar fotos del Muro:', photosError.message);
      }

      const photos: LiveWallPhotoDto[] = (photoRows || []).map((row: any) => ({
        id: row.id,
        storagePath: row.storage_path || row.thumbnail_path || '',
        guestName: row.guest?.name || 'Invitado',
        uploadedAt: row.uploaded_at || new Date(),
        likesCount: row.likes_count || 0,
      }));

      const wallData: LiveWallDataDto = {
        id: eventRow.id,
        name: eventRow.name || 'Muro 360° En Vivo',
        accessCode: eventRow.access_code || 'GOCAM360',
        qrToken: eventRow.qr_token || eventRow.access_code || '',
        primaryColor: eventRow.primary_color || '#10b981',
        logoUrl: eventRow.logo_url,
        photos,
      };

      this.eventData.set(wallData);
      this.isLoading.set(false);

      if (photos.length > 0) {
        this.activePhotoIndex.set(0);
        this.currentPhoto.set(photos[0]);
      }

      // 3. Suscripción en Tiempo Real con Supabase Realtime
      this.setupRealtimeSubscription(eventRow.id);
    } catch (err: any) {
      this.isLoading.set(false);
      this._toast.error('Error de Conexión', err?.message || 'No se pudo conectar con el proyector.');
    }
  }

  private setupRealtimeSubscription(eventId: string): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = this._supabase.subscribeToChannel(
      `live-wall-events-${eventId}-${Date.now()}`,
      'photos',
      (payload) => this.handleIncomingRealtimePhoto(payload, eventId),
      `event_id=eq.${eventId}`
    );
  }

  private async handleIncomingRealtimePhoto(payload: any, eventId: string): Promise<void> {
    if (payload.eventType === 'INSERT') {
      const newRow = payload.new;

      // Obtener el nombre del invitado si viene guest_id
      let guestName = 'Invitado';
      if (newRow.guest_id) {
        const { data: guestRow } = await this._supabase
          .from('guests')
          .select('name')
          .eq('id', newRow.guest_id)
          .single();
        if (guestRow?.name) {
          guestName = guestRow.name;
        }
      }

      const newPhoto: LiveWallPhotoDto = {
        id: newRow.id,
        storagePath: newRow.storage_path || newRow.thumbnail_path || '',
        guestName,
        uploadedAt: newRow.uploaded_at || new Date(),
        likesCount: newRow.likes_count || 0,
      };

      // 1. Anteponer la nueva foto al muro
      const currentWall = this.eventData();
      if (currentWall) {
        const updatedPhotos = [newPhoto, ...currentWall.photos.filter((p) => p.id !== newPhoto.id)];
        this.eventData.set({
          ...currentWall,
          photos: updatedPhotos,
        });
      }

      // 2. Iluminar inmediatamente la foto recién capturada
      this.activePhotoIndex.set(0);
      this.currentPhoto.set(newPhoto);
      this.isSpotlightNew.set(true);

      setTimeout(() => {
        this.isSpotlightNew.set(false);
      }, 3500);

      // 3. Reiniciar el timer para darle tiempo completo de visualización
      this.startRotationTimer();
    } else if (payload.eventType === 'UPDATE') {
      const updatedRow = payload.new;
      const currentWall = this.eventData();
      if (currentWall) {
        const updatedPhotos = currentWall.photos.map((p) =>
          p.id === updatedRow.id
            ? { ...p, likesCount: updatedRow.likes_count ?? p.likesCount }
            : p
        );
        this.eventData.set({ ...currentWall, photos: updatedPhotos });

        if (this.currentPhoto()?.id === updatedRow.id) {
          this.currentPhoto.update((p) =>
            p ? { ...p, likesCount: updatedRow.likes_count ?? p.likesCount } : null
          );
        }
      }
    }
  }

  private rotatePhoto(): void {
    const photos = this.eventData()?.photos;
    if (!photos || photos.length === 0) return;

    const nextIndex = (this.activePhotoIndex() + 1) % photos.length;
    this.activePhotoIndex.set(nextIndex);
    this.currentPhoto.set(photos[nextIndex]);
  }

  selectPhotoIndex(idx: number): void {
    const photos = this.eventData()?.photos;
    if (!photos || !photos[idx]) return;

    this.activePhotoIndex.set(idx);
    this.currentPhoto.set(photos[idx]);
    this.startRotationTimer();
  }

  // Generador dinámico de URL del código QR para ser escaneado desde la proyección
  getQrCodeUrl(): string {
    const code = this.eventData()?.accessCode;
    if (!code) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gocam360.com';
    const joinUrl = `${origin}/guest/event-join?code=${encodeURIComponent(code)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}`;
  }
}
