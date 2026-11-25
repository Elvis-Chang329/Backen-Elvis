import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

export interface UserProfile {
  id?: number | string;
  nombre: string;
  apellido: string;
  usuario: string;
  email: string;
  contrasena?: string;
  edad: number | string;
  fechaNacimiento: string;
  telefono?: string;
  foto?: string | null;
  rol?: string;
  estado_biometria?: string;
  confidence?: number;
  ultima_verificacion?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly baseUrl = 'http://api.aplicacionesweb2026.com:3000';
  private readonly TIMEOUT_MS = 25000;

  constructor(private http: HttpClient) {}

  /**
   * Obtener perfil de usuario por ID o username desde el backend
   */
  async getUser(identifier: string | number): Promise<UserProfile> {
    const cleanId = encodeURIComponent(String(identifier).trim());
    const resp = await firstValueFrom(
      this.http
        .get<any>(`${this.baseUrl}/api/users/${cleanId}`)
        .pipe(timeout(this.TIMEOUT_MS))
    );
    const data = resp?.data ?? resp;
    if (!data) {
      throw new Error('No se encontraron datos del usuario');
    }
    return data;
  }

  /**
   * Crear nuevo usuario en PostgreSQL
   */
  async createUser(user: UserProfile): Promise<UserProfile> {
    const payload = {
      nombre: user.nombre.trim(),
      apellido: user.apellido.trim(),
      usuario: user.usuario.trim(),
      email: user.email.trim(),
      contrasena: user.contrasena ? user.contrasena.trim() : '123456',
      edad: Number(user.edad) || 25,
      fechaNacimiento: user.fechaNacimiento || '2000-01-01',
      telefono: user.telefono ? user.telefono.trim() : '',
      rol: user.rol || 'censista',
      foto: user.foto || null,
    };

    const resp = await firstValueFrom(
      this.http
        .post<any>(`${this.baseUrl}/api/auth/register`, payload)
        .pipe(timeout(this.TIMEOUT_MS))
    );

    const created = resp?.data ?? resp;
    return created;
  }

  /**
   * Comprime una imagen en DataUrl a máximo 600px y calidad JPEG 70%
   */
  compressDataUrl(dataUrl: string, maxSize = 600, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = dataUrl;
    });
  }

  private dataUrlToByteArray(dataUrl: string): { rawBase64: string; byteArray: number[] } {
    const parts = dataUrl.split(',');
    const rawBase64 = parts.length > 1 ? parts[1] : dataUrl;
    const binary = atob(rawBase64);
    const byteArray = new Array<number>(binary.length);
    for (let i = 0; i < binary.length; i++) {
      byteArray[i] = binary.charCodeAt(i);
    }
    return { rawBase64, byteArray };
  }

  /**
   * Subir/actualizar foto de usuario existente (guarda en PostgreSQL)
   */
  async uploadUserPhoto(identifier: string | number, compressedDataUrl: string): Promise<string> {
    const cleanId = encodeURIComponent(String(identifier).trim());
    const { rawBase64, byteArray } = this.dataUrlToByteArray(compressedDataUrl);

    const payload = {
      foto: compressedDataUrl,
      photo: rawBase64,
      byteArray,
    };

    const resp = await firstValueFrom(
      this.http
        .post<any>(`${this.baseUrl}/api/users/${cleanId}/foto`, payload)
        .pipe(timeout(this.TIMEOUT_MS))
    );

    const saved = resp?.data?.foto ?? resp?.foto ?? compressedDataUrl;
    return saved;
  }
}
