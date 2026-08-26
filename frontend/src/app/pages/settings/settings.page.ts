import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { ToastService } from '../../shared/services/toast.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { HlmInputDirective } from '../../shared/ui/input/hlm-input.directive';
import { EventsService, EventItemResponseDto } from '../events/services/events.service';
import { SettingsService, SystemSettingsDto } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormField, IconComponent, HlmInputDirective],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
})
export class SettingsPage implements OnInit {
  private readonly _settingsService = inject(SettingsService);
  private readonly _eventsService = inject(EventsService);
  private readonly _toastService = inject(ToastService);

  protected readonly isSaving = signal(false);
  protected readonly isPurging = signal(false);
  protected readonly eventsList = signal<EventItemResponseDto[]>([]);

  protected readonly settingsModel = signal<SystemSettingsDto>({
    defaultMaxPhotosPerGuest: 15,
    defaultMaxPrintsPerGuest: 2,
    defaultGalleryRetentionDays: 7,
    autoPurgeEnabled: true,
    whatsappGuestMessage:
      '¡Hola {guest_name}! 🎉 Tu fotografía del evento *{event_name}* ya está impresa y lista para retirar en la mesa de fotos. 📸✨',
    whatsappHostMessage:
      '¡Hola {host_name}! Te compartimos el enlace con todas las fotos de tu evento *{event_name}*: {gallery_url}',
  });

  protected readonly settingsForm = form(this.settingsModel);

  ngOnInit(): void {
    this._settingsService.loadSettings().subscribe({
      next: (settings) => {
        this.settingsModel.set(settings);
      },
    });

    this._eventsService.findAll().subscribe({
      next: (events) => {
        this.eventsList.set(events);
      },
    });
  }

  onSaveSettings(): void {
    submit(this.settingsForm, async () => {
      this.isSaving.set(true);
      const currentValues = this.settingsModel();

      this._settingsService.updateSettings(currentValues).subscribe({
        next: () => {
          this.isSaving.set(false);
          this._toastService.success(
            'Configuración Guardada',
            'Los parámetros globales y reglas de retención han sido actualizados en Supabase.'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this._toastService.error('Error al guardar', err?.message || 'No se pudo guardar la configuración.');
        },
      });
    });
  }

  onRunManualPurge(): void {
    this.isPurging.set(true);
    this._toastService.info('Ejecutando Purga', 'Analizando eventos expirados en Supabase y Cloudinary...');

    this._settingsService.runManualPurge().subscribe({
      next: (res) => {
        this.isPurging.set(false);
        this._toastService.success(
          'Purga Completada',
          `Se procesaron ${res.expiredEventsCount} eventos expirados y se liberaron ${res.deletedPhotosCount} fotos.`
        );
      },
      error: (err) => {
        this.isPurging.set(false);
        this._toastService.error('Error de Purga', err?.message || 'No se pudo completar la purga.');
      },
    });
  }
}
