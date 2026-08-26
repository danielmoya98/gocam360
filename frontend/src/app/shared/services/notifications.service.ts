import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Observable, from, tap, catchError, of } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../entities/session/auth.service';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface NotificationItemDto {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  linkUrl?: string;
  createdAt: string | Date;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService implements OnDestroy {
  private readonly _supabase = inject(SupabaseService);
  private readonly _authService = inject(AuthService);

  private readonly _notifications = signal<NotificationItemDto[]>([]);
  private readonly _isLoading = signal(false);
  private _subscriptionChannel: any = null;

  readonly notifications = this._notifications.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    this.initRealtimeSubscription();
  }

  ngOnDestroy(): void {
    if (this._subscriptionChannel) {
      this._supabase.removeChannel(this._subscriptionChannel);
    }
  }

  /**
   * Inicializa la suscripción en tiempo real a la tabla public.notifications
   */
  private initRealtimeSubscription(): void {
    this._subscriptionChannel = this._supabase.subscribeToChannel(
      'realtime:notifications',
      'notifications',
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const row = payload.new;
          const newNotif: NotificationItemDto = {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            message: row.message,
            type: row.type || 'INFO',
            read: row.read ?? false,
            linkUrl: row.link_url,
            createdAt: row.created_at || new Date(),
          };

          this._notifications.update((list) => [newNotif, ...list]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = payload.new;
          this._notifications.update((list) =>
            list.map((n) => (n.id === updated.id ? { ...n, read: updated.read } : n))
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const deleted = payload.old;
          this._notifications.update((list) => list.filter((n) => n.id !== deleted.id));
        }
      }
    );
  }

  /**
   * Carga notificaciones reales desde Supabase PostgreSQL
   */
  loadMyNotifications(): Observable<NotificationItemDto[]> {
    this._isLoading.set(true);

    const fetchPromise = async (): Promise<NotificationItemDto[]> => {
      const { data, error } = await this._supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(error.message || 'Error al cargar notificaciones');
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title || 'Notificación',
        message: row.message || '',
        type: (row.type as NotificationType) || 'INFO',
        read: row.read ?? false,
        linkUrl: row.link_url,
        createdAt: row.created_at || new Date(),
      }));
    };

    return from(fetchPromise()).pipe(
      tap((data) => {
        this._notifications.set(data);
        this._isLoading.set(false);
      }),
      catchError(() => {
        this._isLoading.set(false);
        return of(this._notifications());
      })
    );
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(id: string): Observable<void> {
    const updatePromise = async (): Promise<void> => {
      const { error } = await this._supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    };

    return from(updatePromise()).pipe(
      tap(() => {
        this._notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      })
    );
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): Observable<void> {
    const updatePromise = async (): Promise<void> => {
      const { error } = await this._supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) {
        throw new Error(error.message);
      }
    };

    return from(updatePromise()).pipe(
      tap(() => {
        this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
      })
    );
  }
}
