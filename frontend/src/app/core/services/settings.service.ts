import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, tap } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface SystemSettingsDto {
  defaultMaxPhotosPerGuest: number;
  defaultMaxPrintsPerGuest: number;
  defaultGalleryRetentionDays: number;
  autoPurgeEnabled: boolean;
  whatsappGuestMessage: string;
  whatsappHostMessage: string;
}

export interface PurgeResultDto {
  expiredEventsCount: number;
  deletedPhotosCount: number;
  executedAt: string | Date;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly _supabase = inject(SupabaseService);

  private readonly _settings = signal<SystemSettingsDto>({
    defaultMaxPhotosPerGuest: 15,
    defaultMaxPrintsPerGuest: 2,
    defaultGalleryRetentionDays: 7,
    autoPurgeEnabled: true,
    whatsappGuestMessage:
      '¡Hola {guest_name}! 🎉 Tu fotografía del evento *{event_name}* ya está impresa y lista para retirar en la mesa de fotos. 📸✨',
    whatsappHostMessage:
      '¡Hola {host_name}! Te compartimos el enlace con todas las fotos de tu evento *{event_name}*: {gallery_url}',
  });

  readonly settings = this._settings.asReadonly();

  /**
   * Carga los ajustes globales desde Supabase
   */
  loadSettings(): Observable<SystemSettingsDto> {
    const fetchPromise = async (): Promise<SystemSettingsDto> => {
      const { data, error } = await this._supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'global_config')
        .single();

      if (error || !data) {
        return this._settings();
      }

      return {
        defaultMaxPhotosPerGuest: data.default_max_photos_per_guest ?? 15,
        defaultMaxPrintsPerGuest: data.default_max_prints_per_guest ?? 2,
        defaultGalleryRetentionDays: data.default_gallery_retention_days ?? 7,
        autoPurgeEnabled: data.auto_purge_enabled ?? true,
        whatsappGuestMessage: data.whatsapp_guest_message || this._settings().whatsappGuestMessage,
        whatsappHostMessage: data.whatsapp_host_message || this._settings().whatsappHostMessage,
      };
    };

    return from(fetchPromise()).pipe(
      tap((loaded) => this._settings.set(loaded))
    );
  }

  /**
   * Guarda los ajustes globales en Supabase
   */
  updateSettings(settings: SystemSettingsDto): Observable<SystemSettingsDto> {
    const updatePromise = async (): Promise<SystemSettingsDto> => {
      const { data, error } = await this._supabase
        .from('system_settings')
        .upsert({
          id: 'global_config',
          default_max_photos_per_guest: settings.defaultMaxPhotosPerGuest,
          default_max_prints_per_guest: settings.defaultMaxPrintsPerGuest,
          default_gallery_retention_days: settings.defaultGalleryRetentionDays,
          auto_purge_enabled: settings.autoPurgeEnabled,
          whatsapp_guest_message: settings.whatsappGuestMessage,
          whatsapp_host_message: settings.whatsappHostMessage,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Error al guardar configuración global');
      }

      return settings;
    };

    return from(updatePromise()).pipe(
      tap((saved) => this._settings.set(saved))
    );
  }

  /**
   * Ejecuta la purga de almacenamiento bajo demanda
   */
  runManualPurge(): Observable<PurgeResultDto> {
    const purgePromise = async (): Promise<PurgeResultDto> => {
      const { data, error } = await this._supabase.rpc('purge_expired_storage');

      if (error) {
        throw new Error(error.message || 'Error al ejecutar la purga de almacenamiento');
      }

      return data as PurgeResultDto;
    };

    return from(purgePromise());
  }
}
