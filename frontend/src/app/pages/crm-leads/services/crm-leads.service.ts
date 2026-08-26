import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, tap } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CrmLeadDto, LeadStatus } from '../../../shared/models/crm-lead.model';

export type { CrmLeadDto, LeadStatus };

@Injectable({
  providedIn: 'root',
})
export class CrmLeadsService {
  private readonly _supabase = inject(SupabaseService);

  private readonly _leads = signal<CrmLeadDto[]>([]);
  private readonly _isLoading = signal(false);

  readonly leads = this._leads.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Carga todos los prospectos desde Supabase PostgreSQL
   */
  loadLeads(): Observable<CrmLeadDto[]> {
    this._isLoading.set(true);

    const fetchPromise = async (): Promise<CrmLeadDto[]> => {
      const { data, error } = await this._supabase
        .from('crm_leads')
        .select(`
          id,
          name,
          phone,
          event_id,
          event_type,
          estimated_date,
          notes,
          status,
          created_at,
          event:events(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Error al cargar prospectos comerciales');
      }

      const mapped: CrmLeadDto[] = (data || []).map((row: any) => {
        const ev = Array.isArray(row.event) ? row.event[0] : row.event;
        return {
          id: row.id,
          name: row.name || 'Prospecto sin nombre',
          phone: row.phone || '',
          eventId: row.event_id,
          eventType: row.event_type || 'Evento Social',
          estimatedDate: row.estimated_date,
          notes: row.notes || '',
          status: (row.status as LeadStatus) || 'NEW',
          createdAt: row.created_at || new Date(),
          event: ev ? { name: ev.name } : undefined,
        };
      });

      return mapped;
    };

    return from(fetchPromise()).pipe(
      tap((data) => {
        this._leads.set(data);
        this._isLoading.set(false);
      })
    );
  }

  /**
   * Actualiza el estado de un prospecto comercial (NEW -> CONTACTED -> CONVERTED -> DISCARDED)
   */
  updateLeadStatus(id: string, status: LeadStatus): Observable<CrmLeadDto> {
    const updatePromise = async (): Promise<CrmLeadDto> => {
      const { data, error } = await this._supabase
        .from('crm_leads')
        .update({ status })
        .eq('id', id)
        .select(`
          id,
          name,
          phone,
          event_id,
          event_type,
          estimated_date,
          notes,
          status,
          created_at,
          event:events(id, name)
        `)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Error al actualizar el estado del prospecto');
      }

      const row = data as any;
      const ev = Array.isArray(row.event) ? row.event[0] : row.event;

      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        eventId: row.event_id,
        eventType: row.event_type,
        estimatedDate: row.estimated_date,
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
        event: ev ? { name: ev.name } : undefined,
      };
    };

    return from(updatePromise()).pipe(
      tap(() => {
        this._leads.update((list) =>
          list.map((l) => (l.id === id ? { ...l, status } : l))
        );
      })
    );
  }

  /**
   * Elimina un prospecto comercial (Solo SuperAdmin)
   */
  deleteLead(id: string): Observable<void> {
    const deletePromise = async (): Promise<void> => {
      const { error } = await this._supabase
        .from('crm_leads')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message || 'Error al eliminar el prospecto');
      }
    };

    return from(deletePromise()).pipe(
      tap(() => {
        this._leads.update((list) => list.filter((l) => l.id !== id));
      })
    );
  }
}
