import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, tap, catchError, of, throwError } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuditLogDto, AuditLogMeta, PaginatedAuditLogsResponse } from '../../../shared/models/audit.model';

export interface LoadLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  forceRefresh?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogsService {
  private readonly _supabase = inject(SupabaseService);

  private readonly _logs = signal<AuditLogDto[]>([]);
  private readonly _meta = signal<AuditLogMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  private readonly _isLoading = signal(false);

  public readonly logs = this._logs.asReadonly();
  public readonly meta = this._meta.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();

  /**
   * Carga registros de auditoría con paginación y búsqueda real en Supabase PostgreSQL
   */
  loadLogs(params: LoadLogsParams = {}): Observable<PaginatedAuditLogsResponse> {
    const { page = 1, limit = 10, search = '' } = params;

    this._isLoading.set(true);

    const fetchPromise = async (): Promise<PaginatedAuditLogsResponse> => {
      let query = this._supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      const cleanSearch = search.trim();
      if (cleanSearch) {
        query = query.or(
          `action.ilike.%${cleanSearch}%,entity.ilike.%${cleanSearch}%,details.ilike.%${cleanSearch}%,user_email.ilike.%${cleanSearch}%`
        );
      }

      const fromIndex = (page - 1) * limit;
      const toIndex = fromIndex + limit - 1;
      query = query.range(fromIndex, toIndex);

      const { data, count, error } = await query;

      if (error) {
        throw new Error(error.message || 'Error al obtener registros de auditoría');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const logs: AuditLogDto[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email || 'sistema@gocam360.com',
        action: row.action || 'SISTEMA',
        entity: row.entity || 'GLOBAL',
        details: row.details || '',
        ipAddress: row.ip_address,
        createdAt: row.created_at || new Date(),
      }));

      return {
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    };

    return from(fetchPromise()).pipe(
      tap((paginated) => {
        this._logs.set(paginated.data);
        this._meta.set(paginated.meta);
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._logs.set([]);
        this._meta.set({ total: 0, page: 1, limit: 10, totalPages: 1 });
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }
}
