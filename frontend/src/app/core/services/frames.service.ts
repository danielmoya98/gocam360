import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, tap, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { CloudinaryService } from './cloudinary.service';
import { AuthService } from '../../entities/session/auth.service';

export type FrameOrientation = 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE';

export interface FrameItemDto {
  id: string;
  name: string;
  previewImage: string;
  overlayImage: string;
  orientation: FrameOrientation;
  active: boolean;
  createdBy?: string;
  createdAt: string | Date;
}

export interface CreateFrameDto {
  name: string;
  fileOrBase64: File | Blob | string;
  orientation?: FrameOrientation;
  active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FramesService {
  private readonly _supabase = inject(SupabaseService);
  private readonly _cloudinary = inject(CloudinaryService);
  private readonly _auth = inject(AuthService);

  private readonly _frames = signal<FrameItemDto[] | null>(null);
  readonly frames = this._frames.asReadonly();

  /**
   * Detecta la orientación según ancho y alto en píxeles
   */
  detectOrientation(width: number, height: number): FrameOrientation {
    if (Math.abs(width - height) < 50) {
      return 'SQUARE';
    }
    return width > height ? 'LANDSCAPE' : 'PORTRAIT';
  }

  /**
   * Mapea un registro de PostgreSQL a FrameItemDto
   */
  private mapFrameRow(row: Record<string, any>): FrameItemDto {
    return {
      id: row['id'],
      name: row['name'] || 'Marco 360',
      previewImage: row['preview_image'] || row['previewImage'] || '',
      overlayImage: row['overlay_image'] || row['overlayImage'] || '',
      orientation: (row['orientation'] as FrameOrientation) || 'PORTRAIT',
      active: row['active'] ?? true,
      createdBy: row['created_by'] || row['createdBy'],
      createdAt: row['created_at'] || row['createdAt'] || new Date(),
    };
  }

  /**
   * Obtiene todos los marcos disponibles en el catálogo global
   */
  findAll(activeOnly = true, forceRefresh = false): Observable<FrameItemDto[]> {
    if (this._frames() && !forceRefresh) {
      return of(this._frames()!);
    }

    const fetchPromise = async (): Promise<FrameItemDto[]> => {
      let query = this._supabase
        .from('frames')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || 'Error al obtener marcos');
      }

      return ((data as Record<string, any>[]) || []).map((row) => this.mapFrameRow(row));
    };

    return from(fetchPromise()).pipe(
      tap((frames) => this._frames.set(frames))
    );
  }

  /**
   * Obtiene los marcos asignados a un evento específico
   */
  findByEvent(eventId: string): Observable<FrameItemDto[]> {
    const fetchPromise = async (): Promise<FrameItemDto[]> => {
      const { data, error } = await this._supabase
        .from('event_frames')
        .select('display_order, frame:frames(*)')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Error al obtener los marcos del evento');
      }

      const list = (data || [])
        .map((item: any) => item.frame)
        .filter((f: any) => !!f)
        .map((f: any) => this.mapFrameRow(f));

      return list;
    };

    return from(fetchPromise());
  }

  /**
   * Crea un nuevo marco: sube la imagen a Cloudinary y guarda el registro en Supabase
   */
  createFrame(dto: CreateFrameDto): Observable<FrameItemDto> {
    const createPromise = async (): Promise<FrameItemDto> => {
      // 1. Subir a Cloudinary en la carpeta gocam360/frames
      const uploadResult = await new Promise<any>((resolve, reject) => {
        this._cloudinary.uploadImage(dto.fileOrBase64, 'gocam360/frames', ['frame', 'canva']).subscribe({
          next: (res) => resolve(res),
          error: (err) => reject(err),
        });
      });

      const detectedOrientation = dto.orientation || this.detectOrientation(uploadResult.width, uploadResult.height);
      const currentUserId = this._auth.currentUser()?.id;

      // 2. Insertar en public.frames
      const { data, error } = await this._supabase
        .from('frames')
        .insert({
          name: dto.name.trim(),
          preview_image: uploadResult.secureUrl,
          overlay_image: uploadResult.secureUrl,
          orientation: detectedOrientation,
          created_by: currentUserId || null,
          active: dto.active ?? true,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Error al guardar el marco en la base de datos');
      }

      return this.mapFrameRow(data as Record<string, any>);
    };

    return from(createPromise()).pipe(
      tap((newFrame) => {
        if (this._frames()) {
          this._frames.update((list) => [newFrame, ...(list || [])]);
        }
      })
    );
  }

  /**
   * Asocia una lista de IDs de marcos a un evento en public.event_frames
   */
  assignFramesToEvent(eventId: string, frameIds: string[]): Observable<void> {
    const assignPromise = async (): Promise<void> => {
      // 1. Eliminar asociaciones existentes
      const { error: deleteError } = await this._supabase
        .from('event_frames')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) {
        throw new Error(deleteError.message || 'Error al actualizar marcos del evento');
      }

      if (!frameIds.length) return;

      // 2. Insertar las nuevas asociaciones con display_order
      const rows = frameIds.map((frameId, index) => ({
        event_id: eventId,
        frame_id: frameId,
        display_order: index + 1,
      }));

      const { error: insertError } = await this._supabase
        .from('event_frames')
        .insert(rows);

      if (insertError) {
        throw new Error(insertError.message || 'Error al asignar marcos al evento');
      }
    };

    return from(assignPromise());
  }

  /**
   * Elimina un marco del catálogo global
   */
  removeFrame(frameId: string): Observable<void> {
    const deletePromise = async (): Promise<void> => {
      const { error } = await this._supabase
        .from('frames')
        .delete()
        .eq('id', frameId);

      if (error) {
        throw new Error(error.message || 'Error al eliminar el marco');
      }
    };

    return from(deletePromise()).pipe(
      tap(() => {
        if (this._frames()) {
          this._frames.update((list) => (list || []).filter((f) => f.id !== frameId));
        }
      })
    );
  }
}
