import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { PublicEventDto, PublicFrameDto } from '../../../shared/models/event.model';

export interface JoinEventPayload {
  eventCode: string;
  guestName: string;
  guestPhone: string;
}

export interface UploadPhotoPayload {
  eventId: string;
  guestId: string;
  frameId?: string | null;
  photoBase64: string;
}

export interface CrmQuotePayload {
  name: string;
  phone: string;
  eventId?: string;
  notes?: string;
}

export interface MyPhotoDto {
  id: string;
  storagePath: string;
  uploadedAt: string | Date;
  isPrinted: boolean;
  isPendingPrint: boolean;
  hasPrintRequest: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class GuestExperienceService {
  private readonly _supabase = inject(SupabaseService);
  private readonly _cloudinary = inject(CloudinaryService);

  /**
   * Obtiene la información pública de un evento activo por código o token QR
   */
  getPublicEvent(code: string): Observable<PublicEventDto> {
    const fetchPromise = async (): Promise<PublicEventDto> => {
      const cleanCode = code.trim();

      const { data, error } = await this._supabase
        .from('events')
        .select('*, event_frames(display_order, frame:frames(*))')
        .or(`access_code.ilike.${cleanCode},qr_token.eq.${cleanCode},gallery_token.eq.${cleanCode}`)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Evento no encontrado o código inválido');
      }

      const eventRow = data as Record<string, any>;
      const eventFramesRaw = eventRow['event_frames'] || [];

      const frames: PublicFrameDto[] = eventFramesRaw
        .map((ef: any) => ef.frame)
        .filter((f: any) => !!f && f.active !== false)
        .map((f: any) => ({
          id: f.id,
          name: f.name || 'Marco 360',
          previewUrl: f.preview_image || f.previewImage || '',
          overlayUrl: f.overlay_image || f.overlayImage || '',
          orientation: f.orientation || 'PORTRAIT',
          thumbnailColor: '#6366f1',
        }));

      return {
        id: eventRow['id'],
        name: eventRow['name'] || 'Evento 360°',
        description: eventRow['description'] || '',
        coverImage: eventRow['cover_image'] || eventRow['coverImage'] || undefined,
        logoUrl: eventRow['logo_url'] || eventRow['logoUrl'] || undefined,
        primaryColor: eventRow['primary_color'] || eventRow['primaryColor'] || '#6366f1',
        hostName: eventRow['host_name'] || eventRow['hostName'] || 'Anfitrión',
        location: eventRow['location'] || '',
        qrToken: eventRow['qr_token'] || eventRow['qrToken'] || undefined,
        galleryToken: eventRow['gallery_token'] || eventRow['galleryToken'] || undefined,
        accessCode: eventRow['access_code'] || eventRow['accessCode'] || undefined,
        maxPhotosPerGuest: eventRow['max_photos_per_guest'] ?? 10,
        maxPrintsPerGuest: eventRow['max_prints_per_guest'] ?? 1,
        status: eventRow['status'] || 'ACTIVE',
        frames,
      };
    };

    return from(fetchPromise());
  }

  /**
   * Registra o conecta al invitado al evento usando la RPC segura en Supabase
   */
  joinEvent(payload: JoinEventPayload): Observable<any> {
    const joinPromise = async () => {
      const { data, error } = await this._supabase.rpc('join_event', {
        p_event_code: payload.eventCode.trim(),
        p_guest_name: payload.guestName.trim(),
        p_guest_phone: payload.guestPhone.trim(),
      });

      if (error) {
        throw new Error(error.message || 'No se pudo registrar al invitado en el evento');
      }

      return data;
    };

    return from(joinPromise());
  }

  /**
   * Sube foto capturada a Cloudinary y la registra en public.photos + public.print_requests
   */
  uploadPhoto(payload: UploadPhotoPayload): Observable<any> {
    const uploadPromise = async () => {
      // 1. Subir a Cloudinary
      const uploadRes = await new Promise<any>((resolve, reject) => {
        this._cloudinary.uploadImage(payload.photoBase64, 'gocam360/photos', ['guest_photo', payload.eventId]).subscribe({
          next: (res) => resolve(res),
          error: (err) => reject(err),
        });
      });

      const frameIdParam = payload.frameId && payload.frameId.length > 10 ? payload.frameId : null;

      // 2. Guardar en public.photos
      const { data: photoRow, error: photoError } = await this._supabase
        .from('photos')
        .insert({
          event_id: payload.eventId,
          guest_id: payload.guestId,
          frame_id: frameIdParam,
          storage_path: uploadRes.secureUrl,
          thumbnail_path: uploadRes.secureUrl,
          original_path: uploadRes.secureUrl,
          width: uploadRes.width || 1080,
          height: uploadRes.height || 1920,
          file_size: uploadRes.bytes || 0,
          likes_count: 0,
        })
        .select('*')
        .single();

      if (photoError || !photoRow) {
        throw new Error(photoError?.message || 'Error al guardar la fotografía en la base de datos');
      }

      // 3. Crear solicitud en public.print_requests
      const { error: printError } = await this._supabase
        .from('print_requests')
        .insert({
          photo_id: photoRow.id,
          guest_id: payload.guestId,
          status: 'PENDING',
          quantity: 1,
        });

      if (printError) {
        console.warn('Aviso al registrar orden de impresión:', printError.message);
      }

      // 4. Incrementar contadores en event_guests
      await this.incrementEventGuestCounters(payload.eventId, payload.guestId, true, true);

      return photoRow;
    };

    return from(uploadPromise());
  }

  /**
   * Sube foto a Cloudinary y la registra en public.photos (Sólo Galería Digital)
   */
  uploadPhotoOnly(payload: UploadPhotoPayload): Observable<any> {
    const uploadPromise = async () => {
      // 1. Subir a Cloudinary
      const uploadRes = await new Promise<any>((resolve, reject) => {
        this._cloudinary.uploadImage(payload.photoBase64, 'gocam360/photos', ['guest_photo', payload.eventId]).subscribe({
          next: (res) => resolve(res),
          error: (err) => reject(err),
        });
      });

      const frameIdParam = payload.frameId && payload.frameId.length > 10 ? payload.frameId : null;

      // 2. Guardar en public.photos
      const { data: photoRow, error: photoError } = await this._supabase
        .from('photos')
        .insert({
          event_id: payload.eventId,
          guest_id: payload.guestId,
          frame_id: frameIdParam,
          storage_path: uploadRes.secureUrl,
          thumbnail_path: uploadRes.secureUrl,
          width: uploadRes.width || 1080,
          height: uploadRes.height || 1920,
          file_size: uploadRes.bytes || 0,
          likes_count: 0,
        })
        .select('*')
        .single();

      if (photoError || !photoRow) {
        throw new Error(photoError?.message || 'Error al guardar la fotografía');
      }

      // 3. Incrementar contador de fotos en event_guests
      await this.incrementEventGuestCounters(payload.eventId, payload.guestId, true, false);

      return photoRow;
    };

    return from(uploadPromise());
  }

  /**
   * Obtiene todas las fotos tomadas por un invitado en este evento
   */
  getMyPhotos(eventId: string, guestId: string): Observable<MyPhotoDto[]> {
    const fetchPromise = async (): Promise<MyPhotoDto[]> => {
      const { data, error } = await this._supabase
        .from('photos')
        .select('id, storage_path, uploaded_at, print_requests(id, status)')
        .eq('event_id', eventId)
        .eq('guest_id', guestId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Error al obtener tus fotos');
      }

      return (data || []).map((row: any) => {
        const prints = row.print_requests || [];
        const isPrinted = prints.some((p: any) => p.status === 'PRINTED');
        const isPendingPrint = prints.some((p: any) => p.status === 'PENDING' || p.status === 'PRINTING');
        const hasPrintRequest = prints.length > 0;

        return {
          id: row.id,
          storagePath: row.storage_path,
          uploadedAt: row.uploaded_at,
          isPrinted,
          isPendingPrint,
          hasPrintRequest,
        };
      });
    };

    return from(fetchPromise());
  }

  /**
   * Solicita impresión física de una foto existente
   */
  requestPrintForPhoto(payload: { photoId: string; guestId: string; eventId: string }): Observable<any> {
    const requestPromise = async () => {
      const { data, error } = await this._supabase
        .from('print_requests')
        .insert({
          photo_id: payload.photoId,
          guest_id: payload.guestId,
          status: 'PENDING',
          quantity: 1,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'No se pudo enviar la solicitud de impresión');
      }

      await this.incrementEventGuestCounters(payload.eventId, payload.guestId, false, true);

      return data;
    };

    return from(requestPromise());
  }

  /**
   * Registra un lead / prospecto de cotización de eventos
   */
  sendCrmQuote(payload: CrmQuotePayload): Observable<any> {
    const quotePromise = async () => {
      const { data, error } = await this._supabase
        .from('crm_leads')
        .insert({
          event_id: payload.eventId || null,
          name: payload.name.trim(),
          phone: payload.phone.trim(),
          notes: payload.notes || 'Solicitud de cotización desde la app 360°',
          status: 'NEW',
        })
        .select('*')
        .single();

      if (error) {
        console.warn('Aviso CRM:', error.message);
      }

      return data || { success: true };
    };

    return from(quotePromise());
  }

  /**
   * Helper para incrementar contadores en event_guests
   */
  private async incrementEventGuestCounters(
    eventId: string,
    guestId: string,
    photoIncrement: boolean,
    printIncrement: boolean
  ): Promise<void> {
    try {
      const { data: current } = await this._supabase
        .from('event_guests')
        .select('photos_uploaded, prints_requested')
        .eq('event_id', eventId)
        .eq('guest_id', guestId)
        .single();

      if (current) {
        const updateObj: Record<string, number> = {};
        if (photoIncrement) {
          updateObj['photos_uploaded'] = (current.photos_uploaded || 0) + 1;
        }
        if (printIncrement) {
          updateObj['prints_requested'] = (current.prints_requested || 0) + 1;
        }

        await this._supabase
          .from('event_guests')
          .update(updateObj)
          .eq('event_id', eventId)
          .eq('guest_id', guestId);
      }
    } catch (e) {
      console.warn('No se pudieron actualizar los contadores del invitado:', e);
    }
  }
}
