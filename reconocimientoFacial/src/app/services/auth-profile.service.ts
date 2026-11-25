import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

export interface UserData {
  id: number | string;
  nombre?: string;
  apellido?: string;
  usuario?: string;
  email?: string;
  edad?: number;
  fechaNacimiento?: string;
  telefono?: string;
  foto?: string;
  rol?: string;
}

export interface LoginResponse {
  status?: string;
  ok?: boolean;
  success?: boolean;
  message?: string;
  token?: string;
  data?: UserData;
  user?: UserData;
}

@Injectable({
  providedIn: 'root',
})
export class AuthProfileService {
  private readonly baseUrl = 'http://api.aplicacionesweb2026.com:3000';
  private readonly storageKey = 'current_user_session';

  constructor(private http: HttpClient) {}

  async login(usuario: string, contrasena: string): Promise<UserData> {
    const resp = await firstValueFrom(
      this.http
        .post<LoginResponse>(`${this.baseUrl}/api/auth/login`, { usuario, contrasena })
        .pipe(timeout(25000))
    );

    const user = resp.data ?? resp.user;
    if (!user || user.id === undefined || user.id === null) {
      throw new Error(resp.message || 'Respuesta de login sin datos de usuario');
    }

    localStorage.setItem(this.storageKey, JSON.stringify(user));
    return user;
  }

  getCurrentUser(): UserData | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserData;
    } catch {
      return null;
    }
  }

  updateCurrentUser(partial: Partial<UserData>): void {
    const current = this.getCurrentUser();
    if (!current) return;
    localStorage.setItem(this.storageKey, JSON.stringify({ ...current, ...partial }));
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }

  async compressDataUrl(dataUrl: string, maxSize = 600, quality = 0.7): Promise<string> {
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
          reject(new Error('No se pudo inicializar el canvas para comprimir'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen para comprimir'));
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

  async uploadUserPhoto(userId: string | number, compressedDataUrl: string): Promise<string> {
    const cleanUserId = String(userId).trim().split('.')[0];
    const { rawBase64, byteArray } = this.dataUrlToByteArray(compressedDataUrl);

    const payload = {
      foto: compressedDataUrl,
      photo: rawBase64,
      byteArray,
    };

    const resp = await firstValueFrom(
      this.http
        .post<any>(`${this.baseUrl}/api/users/${cleanUserId}/foto`, payload)
        .pipe(timeout(25000))
    );

    const savedPhoto = resp?.data?.foto ?? resp?.foto ?? compressedDataUrl;
    this.updateCurrentUser({ foto: savedPhoto });
    return savedPhoto;
  }

  async getUserPhoto(userId: string | number): Promise<string | null> {
    const cleanUserId = String(userId).trim().split('.')[0];
    const resp = await firstValueFrom(
      this.http
        .get<any>(`${this.baseUrl}/api/users/${cleanUserId}/foto`)
        .pipe(timeout(25000))
    );
    return resp?.data?.foto ?? resp?.foto ?? null;
  }
}
