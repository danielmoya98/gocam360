import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, tap } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  PrintRequestItemDto,
  PrintStatus,
  PrintRequestPhotoDto,
  PrintRequestGuestDto,
} from '../../../shared/models/print.model';
import { RealtimeChannel } from '@supabase/supabase-js';

export type { PrintRequestItemDto, PrintStatus, PrintRequestPhotoDto, PrintRequestGuestDto };

@Injectable({
  providedIn: 'root',
})
export class PrintsService {
  private readonly _supabase = inject(SupabaseService);

  private readonly _prints = signal<PrintRequestItemDto[] | null>(null);
  readonly prints = this._prints.asReadonly();

  /**
   * Mapea un registro relacional de public.print_requests a PrintRequestItemDto
   */
  private mapPrintRow(row: Record<string, any>): PrintRequestItemDto {
    const photo = row['photo'] || {};
    const guest = photo['guest'] || row['guest'] || {};
    const frame = photo['frame'] || {};
    const event = photo['event'] || row['event'] || {};

    return {
      id: row['id'],
      eventId: photo['event_id'] || event['id'] || row['event_id'] || '',
      photoId: row['photo_id'] || row['photoId'] || photo['id'],
      guestId: row['guest_id'] || row['guestId'] || guest['id'],
      status: row['status'] || 'PENDING',
      copies: row['quantity'] || row['copies'] || 1,
      quantity: row['quantity'] || row['copies'] || 1,
      createdAt: row['requested_at'] || row['created_at'] || new Date(),
      requestedAt: row['requested_at'] || row['created_at'],
      printedAt: row['printed_at'],
      eventTitle: event['name'] || 'Evento 360°',
      photo: {
        id: photo['id'] || row['photo_id'],
        storagePath: photo['storage_path'] || photo['storagePath'] || photo['original_path'] || '',
        originalPath: photo['storage_path'] || '',
        thumbnailPath: photo['thumbnail_path'] || photo['storage_path'] || '',
        width: photo['width'] || 1080,
        height: photo['height'] || 1920,
        guest: {
          id: guest['id'] || '',
          name: guest['name'] || 'Invitado',
          phone: guest['phone'] || '',
        },
        frame: frame['id']
          ? {
              id: frame['id'],
              name: frame['name'] || 'Marco 360',
            }
          : undefined,
      },
    };
  }

  /**
   * Obtiene la cola de impresiones global o filtrada por evento
   */
  findAll(eventId?: string, forceRefresh = false): Observable<PrintRequestItemDto[]> {
    if (this._prints() && !forceRefresh && !eventId) {
      return of(this._prints()!);
    }

    const fetchPromise = async (): Promise<PrintRequestItemDto[]> => {
      let query = this._supabase
        .from('print_requests')
        .select(`
          id,
          photo_id,
          guest_id,
          quantity,
          status,
          requested_at,
          printed_at,
          photo:photos(
            id,
            event_id,
            storage_path,
            thumbnail_path,
            uploaded_at,
            width,
            height,
            event:events(id, name),
            guest:guests(id, name, phone),
            frame:frames(id, name)
          )
        `)
        .order('requested_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message || 'Error al obtener la cola de impresiones');
      }

      let mapped = ((data as Record<string, any>[]) || []).map((row) => this.mapPrintRow(row));

      if (eventId && eventId !== 'ALL') {
        mapped = mapped.filter((r) => r.eventId === eventId);
      }

      return mapped;
    };

    return from(fetchPromise()).pipe(
      tap((data) => {
        if (!eventId || eventId === 'ALL') {
          this._prints.set(data);
        }
      })
    );
  }

  /**
   * Actualiza el estado de una solicitud de impresión (PENDING -> PRINTING -> PRINTED -> CANCELLED)
   */
  updateStatus(id: string, status: PrintStatus): Observable<PrintRequestItemDto> {
    const updatePromise = async (): Promise<PrintRequestItemDto> => {
      const updateData: Record<string, any> = { status };
      if (status === 'PRINTED') {
        updateData['printed_at'] = new Date().toISOString();
      }

      const { data, error } = await this._supabase
        .from('print_requests')
        .update(updateData)
        .eq('id', id)
        .select(`
          id,
          photo_id,
          guest_id,
          quantity,
          status,
          requested_at,
          printed_at,
          photo:photos(
            id,
            event_id,
            storage_path,
            thumbnail_path,
            uploaded_at,
            width,
            height,
            event:events(id, name),
            guest:guests(id, name, phone),
            frame:frames(id, name)
          )
        `)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Error al actualizar el estado de impresión');
      }

      return this.mapPrintRow(data as Record<string, any>);
    };

    return from(updatePromise()).pipe(
      tap((updated) => {
        if (this._prints()) {
          this._prints.update((list) =>
            (list || []).map((p) => (p.id === id ? updated : p))
          );
        }
      })
    );
  }

  /**
   * Completa la impresión marcándola como PRINTED
   */
  completePrint(id: string): Observable<PrintRequestItemDto> {
    return this.updateStatus(id, 'PRINTED');
  }

  /**
   * Se suscribe en tiempo real a cambios en public.print_requests
   */
  subscribeToPrints(
    onNewOrUpdatedPrint: () => void,
    eventId?: string
  ): RealtimeChannel {
    const channelName = `realtime-prints-${eventId || 'global'}-${Date.now()}`;

    return this._supabase.subscribeToChannel(
      channelName,
      'print_requests',
      () => {
        onNewOrUpdatedPrint();
      }
    );
  }
}
