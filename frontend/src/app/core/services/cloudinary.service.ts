import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private readonly cloudName = environment.cloudinary?.cloudName || 'gocam360';
  private readonly uploadPreset = environment.cloudinary?.uploadPreset || 'gocam360_preset';

  /**
   * Sube una imagen (File, Blob o Base64 Data URL) directamente a Cloudinary
   */
  uploadImage(
    fileOrBase64: File | Blob | string,
    folder = 'gocam360/media',
    tags: string[] = ['gocam360']
  ): Observable<CloudinaryUploadResult> {
    const uploadPromise = async (): Promise<CloudinaryUploadResult> => {
      const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
      const formData = new FormData();

      if (typeof fileOrBase64 === 'string') {
        formData.append('file', fileOrBase64);
      } else {
        formData.append('file', fileOrBase64);
      }

      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', folder);
      if (tags.length > 0) {
        formData.append('tags', tags.join(','));
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          // Si Cloudinary preset no está configurado, podemos usar un fallback seguro
          const errorMessage = data?.error?.message || 'Error en la subida a Cloudinary';
          console.warn('Cloudinary upload warning:', errorMessage);
          
          // Si era una cadena base64 o Data URL, retornamos fallback
          if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
            return {
              secureUrl: fileOrBase64,
              publicId: `local_${Date.now()}`,
              width: 1080,
              height: 1920,
              format: 'png',
              bytes: fileOrBase64.length,
            };
          }
          throw new Error(errorMessage);
        }

        return {
          secureUrl: data.secure_url,
          publicId: data.public_id,
          width: data.width,
          height: data.height,
          format: data.format,
          bytes: data.bytes,
        };
      } catch (err: any) {
        // Fallback para desarrollo offline si es base64
        if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
          return {
            secureUrl: fileOrBase64,
            publicId: `offline_${Date.now()}`,
            width: 1080,
            height: 1920,
            format: 'png',
            bytes: fileOrBase64.length,
          };
        }
        throw new Error(err?.message || 'No se pudo conectar con el servidor de medios.');
      }
    };

    return from(uploadPromise());
  }

  /**
   * Genera una URL optimizada con auto-formato y auto-calidad
   */
  getOptimizedUrl(urlOrPublicId: string, options: { width?: number; height?: number; crop?: string } = {}): string {
    if (!urlOrPublicId) return '';
    if (urlOrPublicId.startsWith('data:')) return urlOrPublicId;

    if (!urlOrPublicId.includes('res.cloudinary.com')) {
      return urlOrPublicId;
    }

    const transformations: string[] = ['f_auto', 'q_auto'];
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.crop) transformations.push(`c_${options.crop}`);

    const transformStr = transformations.join(',');
    return urlOrPublicId.replace('/upload/', `/upload/${transformStr}/`);
  }

  /**
   * Genera la URL compuesta con overlay del marco de Canva
   */
  buildOverlayUrl(photoPublicId: string, framePublicId: string): string {
    if (!photoPublicId || !framePublicId) return '';
    const safeFrameId = framePublicId.replace(/\//g, ':');
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/f_auto,q_auto/l_${safeFrameId},fl_layer_apply,w_1.0,h_1.0,fl_relative/${photoPublicId}.jpg`;
  }
}
