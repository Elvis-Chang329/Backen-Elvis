import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  email: string;
  usuario: string;
  contrasena: string;
  edad: number;
  fechaNacimiento: string; // formato: 'YYYY-MM-DD'
  telefono: string;
  rol?: string;            // 'censista' | 'administrador'
  foto?: string;           // Base64 opcional
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 1. Guardar datos del usuario (con o sin foto en Base64)
  registrarUsuario(usuario: Usuario): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, usuario);
  }

  // 2. Guardar o actualizar únicamente la foto de un usuario ya existente
  subirFotoUsuario(userId: number | string, base64Foto: string): Observable<any> {
    // Tu backend acepta { foto: '...' } en formato Base64 directamente
    return this.http.post(`${this.baseUrl}/users/${userId}/foto`, {
      foto: base64Foto
    });
  }

  // 3. Consultar datos y foto del usuario en JSON
  obtenerUsuario(userId: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/${userId}`);
  }

  // 4. URL directa para cargar la foto en etiquetas <ion-img>
  obtenerUrlFotoRaw(userId: number | string): string {
    return `${this.baseUrl}/users/${userId}/foto/raw`;
  }

  // 5. Consultar estado biométrico (para Lambda 3 / validaciones)
  consultarEstadoBiometria(userId: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/biometria/status/${userId}`);
  }

  // 6. Registrar indexación de Rekognition (Lambda 1)
  registrarRostroIndexado(userId: number | string, faceId: string, s3Key: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/biometria/index`, {
      userId,
      faceId,
      s3Key,
      estado: 'REGISTRADO'
    });
  }
}
