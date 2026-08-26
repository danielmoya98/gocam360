import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, tap, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../entities/session/auth.service';
import {
  EventItemResponseDto,
  CreateEventDto,
  UpdateEventDto,
  EventStatus,
} from '../../../shared/models/event.model';

export type { EventItemResponseDto, CreateEventDto, UpdateEventDto, EventStatus };

export interface EventReportHourlyActivityDto {
  hour_label: string;
  count: number;
}

export interface EventReportTopFrameDto {
  name: string;
  orientation: 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE';
  preview_url: string;
  usage_count: number;
}

export interface EventReportDto {
  eventId: string;
  eventName: string;
  hostName: string;
  hostPhone: string;
  eventDate: string;
  status: string;
  accessCode: string;
  galleryToken: string;
  totalPhotos: number;
  totalPrints: number;
  totalGuests: number;
  totalLikes: number;
  avgPhotosPerGuest: number;
  printRatePct: number;
  topFrame?: EventReportTopFrameDto | null;
  hourlyActivity: EventReportHourlyActivityDto[];
}

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly _supabase = inject(SupabaseService);
  private readonly _auth = inject(AuthService);

  private readonly _events = signal<EventItemResponseDto[] | null>(null);
  readonly events = this._events.asReadonly();

  /**
   * Genera un código de acceso alfanumérico único de 6 caracteres (ej. BODA26)
   */
  private generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Genera un token UUID v4 seguro
   */
  private generateToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Helper para normalizar contratos entre la fila de Supabase (snake_case)
   * y el DTO camelCase consumido por la interfaz de Angular
   */
  private normalizeEvent(event: Record<string, any>): EventItemResponseDto {
    if (!event) return {} as EventItemResponseDto;

    const nameVal = event['name'] || event['title'] || 'Evento sin nombre';
    const codeVal = event['access_code'] || event['accessCode'] || event['uniqueCode'] || '';
    const dateVal = event['event_date'] || event['eventDate'] || event['date'] || new Date().toISOString().substring(0, 10);

    const adminObj = event['admin'] || {};
    const photosArr = event['photos'];
    const photosCount = Array.isArray(photosArr) && photosArr.length > 0
      ? (photosArr[0]?.count ?? 0)
      : (event['_count']?.photos ?? 0);

    return {
      id: event['id'],
      adminId: event['admin_id'] || event['adminId'],
      adminName: adminObj['full_name'] || event['admin_name'] || event['adminName'] || 'Operador',
      adminEmail: adminObj['email'] || event['admin_email'] || event['adminEmail'] || '',
      name: nameVal,
      title: nameVal,
      status: event['status'] || 'DRAFT',
      description: event['description'] || '',
      hostName: event['host_name'] || event['hostName'] || 'Anfitrión',
      hostPhone: event['host_phone'] || event['hostPhone'] || '',
      hostEmail: event['host_email'] || event['hostEmail'] || '',
      location: event['location'] || 'Sin ubicación',
      coverImage: event['cover_image'] || event['coverImage'] || null,
      eventDate: dateVal,
      date: dateVal,
      startTime: event['start_time'] || event['startTime'] || '18:00',
      endTime: event['end_time'] || event['endTime'] || '23:00',
      accessCode: codeVal,
      uniqueCode: codeVal,
      qrToken: event['qr_token'] || event['qrToken'] || '',
      galleryToken: event['gallery_token'] || event['galleryToken'] || '',
      maxPhotosPerGuest: event['max_photos_per_guest'] ?? event['maxPhotosPerGuest'] ?? 10,
      maxPrintsPerGuest: event['max_prints_per_guest'] ?? event['maxPrintsPerGuest'] ?? 1,
      galleryRetentionDays: event['gallery_retention_days'] ?? event['galleryRetentionDays'] ?? 7,
      primaryColor: event['primary_color'] || event['primaryColor'] || '#6366f1',
      logoUrl: event['logo_url'] || event['logoUrl'] || null,
      createdAt: event['created_at'] || event['createdAt'],
      updatedAt: event['updated_at'] || event['updatedAt'],
      totalPhotos: typeof event['totalPhotos'] === 'number' ? event['totalPhotos'] : photosCount,
      totalPrints: typeof event['totalPrints'] === 'number' ? event['totalPrints'] : 0,
      coverGradient: event['coverGradient'] || 'from-indigo-600 to-violet-500',
      eventFrames: event['event_frames'] || event['eventFrames'] || [],
    };
  }

  /**
   * Obtiene todos los eventos visibles para el rol actual desde public.events
   */
  findAll(forceRefresh = false): Observable<EventItemResponseDto[]> {
    if (this._events() && !forceRefresh) {
      return of(this._events()!);
    }

    const fetchPromise = async (): Promise<EventItemResponseDto[]> => {
      const { data, error } = await this._supabase
        .from('events')
        .select('*, admin:users(id, full_name, email), photos(count)')
        .order('event_date', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Error al obtener la lista de eventos');
      }

      return ((data as Record<string, any>[]) || []).map((row) => this.normalizeEvent(row));
    };

    return from(fetchPromise()).pipe(
      tap((data) => this._events.set(data))
    );
  }

  /**
   * Obtener detalle de 1 evento por ID
   */
  findOne(id: string): Observable<EventItemResponseDto> {
    const fetchPromise = async (): Promise<EventItemResponseDto> => {
      const { data, error } = await this._supabase
        .from('events')
        .select('*, admin:users(id, full_name, email), event_frames(*, frame:frames(*)), photos(count)')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Evento no encontrado');
      }

      return this.normalizeEvent(data as Record<string, any>);
    };

    return from(fetchPromise());
  }

  /**
   * Crear un nuevo evento en public.events
   */
  create(data: CreateEventDto): Observable<EventItemResponseDto> {
    const createPromise = async (): Promise<EventItemResponseDto> => {
      const currentUserId = this._auth.currentUser()?.id;
      const targetAdminId = data.adminId || currentUserId;

      if (!targetAdminId) {
        throw new Error('Debe asignarse un operador responsable para el evento');
      }

      const accessCode = this.generateAccessCode();
      const qrToken = this.generateToken();
      const galleryToken = this.generateToken();

      const insertPayload = {
        admin_id: targetAdminId,
        name: data.name.trim(),
        description: data.description || '',
        host_name: data.hostName.trim(),
        host_phone: data.hostPhone || null,
        host_email: data.hostEmail || null,
        location: data.location || null,
        cover_image: data.coverImage || null,
        event_date: data.eventDate,
        start_time: data.startTime || '18:00',
        end_time: data.endTime || '23:00',
        access_code: accessCode,
        qr_token: qrToken,
        gallery_token: galleryToken,
        max_photos_per_guest: data.maxPhotosPerGuest ?? 10,
        max_prints_per_guest: data.maxPrintsPerGuest ?? 1,
        gallery_retention_days: data.galleryRetentionDays ?? 7,
        primary_color: data.primaryColor || '#6366f1',
        logo_url: data.logoUrl || null,
        status: 'DRAFT',
      };

      const { data: createdRow, error } = await this._supabase
        .from('events')
        .insert(insertPayload)
        .select('*, admin:users(id, full_name, email)')
        .single();

      if (error || !createdRow) {
        throw new Error(error?.message || 'No se pudo crear el evento');
      }

      return this.normalizeEvent(createdRow as Record<string, any>);
    };

    return from(createPromise()).pipe(
      tap((newEvent) => {
        if (this._events()) {
          this._events.update((list) => [newEvent, ...(list || [])]);
        }
      })
    );
  }

  /**
   * Actualizar evento existente
   */
  update(id: string, data: UpdateEventDto): Observable<EventItemResponseDto> {
    const updatePromise = async (): Promise<EventItemResponseDto> => {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (data.adminId) updatePayload['admin_id'] = data.adminId;
      if (data.name) updatePayload['name'] = data.name.trim();
      if (typeof data.description === 'string') updatePayload['description'] = data.description;
      if (data.hostName) updatePayload['host_name'] = data.hostName.trim();
      if (typeof data.hostPhone === 'string') updatePayload['host_phone'] = data.hostPhone;
      if (typeof data.hostEmail === 'string') updatePayload['host_email'] = data.hostEmail;
      if (typeof data.location === 'string') updatePayload['location'] = data.location;
      if (typeof data.coverImage === 'string') updatePayload['cover_image'] = data.coverImage;
      if (data.eventDate) updatePayload['event_date'] = data.eventDate;
      if (data.startTime) updatePayload['start_time'] = data.startTime;
      if (data.endTime) updatePayload['end_time'] = data.endTime;
      if (typeof data.maxPhotosPerGuest === 'number') updatePayload['max_photos_per_guest'] = data.maxPhotosPerGuest;
      if (typeof data.maxPrintsPerGuest === 'number') updatePayload['max_prints_per_guest'] = data.maxPrintsPerGuest;
      if (typeof data.galleryRetentionDays === 'number') updatePayload['gallery_retention_days'] = data.galleryRetentionDays;
      if (typeof data.primaryColor === 'string') updatePayload['primary_color'] = data.primaryColor;
      if (typeof data.logoUrl === 'string') updatePayload['logo_url'] = data.logoUrl;
      if (data.status) updatePayload['status'] = data.status;

      const { data: updatedRow, error } = await this._supabase
        .from('events')
        .update(updatePayload)
        .eq('id', id)
        .select('*, admin:users(id, full_name, email)')
        .single();

      if (error || !updatedRow) {
        throw new Error(error?.message || 'Error al actualizar el evento');
      }

      return this.normalizeEvent(updatedRow as Record<string, any>);
    };

    return from(updatePromise()).pipe(
      tap((updated) => {
        if (this._events()) {
          this._events.update((list) =>
            (list || []).map((e) => (e.id === id ? updated : e))
          );
        }
      })
    );
  }

  /**
   * Eliminar evento
   */
  remove(id: string): Observable<{ message: string }> {
    const deletePromise = async (): Promise<{ message: string }> => {
      const { error } = await this._supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message || 'Error al eliminar el evento');
      }

      return { message: 'Evento eliminado correctamente' };
    };

    return from(deletePromise()).pipe(
      tap(() => {
        if (this._events()) {
          this._events.update((list) => (list || []).filter((e) => e.id !== id));
        }
      })
    );
  }

  /**
   * Obtiene el reporte ejecutivo y analítica de cierre de un evento
   */
  getEventReport(eventId: string): Observable<EventReportDto> {
    const reportPromise = async (): Promise<EventReportDto> => {
      const { data, error } = await this._supabase.rpc('get_event_report', {
        p_event_id: eventId,
      });

      if (error) {
        throw new Error(error.message || 'Error al obtener el reporte del evento');
      }

      return data as EventReportDto;
    };

    return from(reportPromise());
  }
}
