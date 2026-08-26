import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, tap } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface AdminMetricsCardsDto {
  eventsCount: number;
  activeEventsCount: number;
  photosCount: number;
  photosToday: number;
  printsCount: number;
  pendingPrintsCount: number;
  recentGuestsCount: number;
}

export interface AdminActiveEventDto {
  id: string;
  name: string;
  location?: string;
  eventDate: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  status: 'ACTIVE' | 'DRAFT' | 'FINISHED' | 'EXPIRED';
}

export interface AdminPrintQueueItemDto {
  id: string;
  photoUrl: string;
  fileName: string;
  eventName: string;
  status: 'PENDING' | 'PRINTING' | 'PRINTED' | 'CANCELLED';
}

export interface AdminMetricsResponseDto {
  cards: AdminMetricsCardsDto;
  activeEvents: AdminActiveEventDto[];
  printQueue: AdminPrintQueueItemDto[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  private readonly _supabase = inject(SupabaseService);

  private readonly _metrics = signal<AdminMetricsResponseDto | null>(null);
  private readonly _isLoading = signal(false);

  readonly metrics = this._metrics.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  getAdminMetrics(forceRefresh = false): Observable<AdminMetricsResponseDto> {
    if (this._metrics() && !forceRefresh) {
      return of(this._metrics()!);
    }

    this._isLoading.set(true);

    const fetchPromise = async (): Promise<AdminMetricsResponseDto> => {
      // 1. Obtener eventos activos
      const { data: eventsData, error: eventsError } = await this._supabase
        .from('events')
        .select('id, name, location, event_date, start_time, end_time, status')
        .order('created_at', { ascending: false });

      if (eventsError) {
        throw new Error(eventsError.message);
      }

      const allEvents = eventsData || [];
      const activeEventsList = allEvents.filter((e: any) => e.status === 'ACTIVE');

      // 2. Obtener cola de impresión en vivo
      const { data: printsData } = await this._supabase
        .from('print_requests')
        .select(`
          id,
          status,
          photo:photos(
            storage_path,
            event:events(name)
          )
        `)
        .order('requested_at', { ascending: false })
        .limit(10);

      const printQueue: AdminPrintQueueItemDto[] = (printsData || []).map((row: any) => {
        const photo = row.photo || {};
        const event = photo.event || {};
        return {
          id: row.id,
          photoUrl: photo.storage_path || '',
          fileName: `Foto_${row.id.substring(0, 6)}`,
          eventName: event.name || 'Evento 360°',
          status: row.status || 'PENDING',
        };
      });

      // 3. Totales de fotos
      const { count: totalPhotos } = await this._supabase
        .from('photos')
        .select('*', { count: 'exact', head: true });

      const todayIso = new Date();
      todayIso.setHours(0, 0, 0, 0);

      const { count: photosToday } = await this._supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .gte('uploaded_at', todayIso.toISOString());

      const { count: totalPrints } = await this._supabase
        .from('print_requests')
        .select('*', { count: 'exact', head: true });

      const { count: pendingPrints } = await this._supabase
        .from('print_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      const { count: totalGuests } = await this._supabase
        .from('guests')
        .select('*', { count: 'exact', head: true });

      const response: AdminMetricsResponseDto = {
        cards: {
          eventsCount: allEvents.length,
          activeEventsCount: activeEventsList.length,
          photosCount: totalPhotos || 0,
          photosToday: photosToday || 0,
          printsCount: totalPrints || 0,
          pendingPrintsCount: pendingPrints || 0,
          recentGuestsCount: totalGuests || 0,
        },
        activeEvents: activeEventsList.map((e: any) => ({
          id: e.id,
          name: e.name,
          location: e.location,
          eventDate: e.event_date || new Date(),
          startTime: e.start_time || new Date(),
          endTime: e.end_time || new Date(),
          status: e.status,
        })),
        printQueue,
      };

      return response;
    };

    return from(fetchPromise()).pipe(
      tap((data) => {
        this._metrics.set(data);
        this._isLoading.set(false);
      })
    );
  }
}
