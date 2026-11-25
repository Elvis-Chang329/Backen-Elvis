import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FaceRecognitionService {
  // URLs de AWS Lambda Function URLs
  private readonly registroUrl =
    'https://mfu55zgo4p25nm3jvw4gnz2pti0foier.lambda-url.us-east-1.on.aws';
  private readonly verificarUrl =
    'https://sqryezg45q77s377tja62lkis40meqtf.lambda-url.us-east-1.on.aws';
  private readonly estadoUrl =
    'https://5chbngaiyxbdgwka72os6nneoa0pslmx.lambda-url.us-east-1.on.aws';

  // API Backend HTTP
  private readonly backendApiUrl = 'http://api.aplicacionesweb2026.com:8080';

  // Timeout para evitar que la app se congele (7 segundos máximo)
  private readonly TIMEOUT_MS = 7000;

  constructor(private http: HttpClient) {}

  /**
   * 1. Crear sesión de Face Liveness en AWS
   */
  async crearSesionLiveness(): Promise<{ ok: boolean; sessionId: string }> {
    try {
      return await firstValueFrom(
        this.http
          .post<{ ok: boolean; sessionId: string }>(this.registroUrl, {
            action: 'create_session',
          })
          .pipe(timeout(this.TIMEOUT_MS))
      );
    } catch (err) {
      console.warn('Lambda create_session timeout o CORS, usando sesión local:', err);
      return {
        ok: true,
        sessionId: 'session_' + Math.random().toString(36).substring(2, 10),
      };
    }
  }

  /**
   * 2. Registrar usuario utilizando el Session ID de Face Liveness
   */
  registrarConLiveness(userId: string, sessionId: string): Promise<any> {
    return firstValueFrom(
      this.http
        .post<any>(this.registroUrl, {
          action: 'register_liveness',
          userId,
          sessionId,
        })
        .pipe(timeout(this.TIMEOUT_MS))
    );
  }

  /**
   * 3. Verificar identidad del usuario utilizando el Session ID de Face Liveness
   */
  verificarConLiveness(userId: string, sessionId: string): Promise<any> {
    return firstValueFrom(
      this.http
        .post<any>(this.verificarUrl, {
          action: 'verify_liveness',
          userId,
          sessionId,
        })
        .pipe(timeout(this.TIMEOUT_MS))
    );
  }

  /**
   * 4. Registro tradicional con foto Base64 (fallback directo)
   */
  registrarRostro(userId: string, imageBase64: string): Promise<any> {
    return firstValueFrom(
      this.http
        .post<any>(this.registroUrl, {
          action: 'register_photo',
          userId,
          imageBase64,
        })
        .pipe(timeout(this.TIMEOUT_MS))
    );
  }

  /**
   * 5. Verificación tradicional con foto Base64 (fallback directo)
   */
  verificarRostro(userId: string, imageBase64: string): Promise<any> {
    return firstValueFrom(
      this.http
        .post<any>(this.verificarUrl, {
          action: 'verify_photo',
          userId,
          imageBase64,
        })
        .pipe(timeout(this.TIMEOUT_MS))
    );
  }

  /**
   * 6. Consultar estado biométrico en AWS Lambda con fallback a Backend HTTP
   */
  async consultarEstado(userId: string): Promise<any> {
    const url = `${this.estadoUrl.replace(/\/+$/, '')}/`;
    try {
      return await firstValueFrom(
        this.http
          .post<any>(url, { userId })
          .pipe(timeout(this.TIMEOUT_MS))
      );
    } catch (err: any) {
      console.warn('Lambda estado falló o status 0. Intentando backend HTTP alternativo...', err);
      try {
        const resBackend = await this.consultarEstadoBackend(userId);
        return {
          ...resBackend,
          fuente: 'Servidor Backend HTTP (api.aplicacionesweb2026.com:8080)'
        };
      } catch (errBackend) {
        if (err?.status === 0) {
          throw new Error(
            'Error de conexión (Status 0): El dispositivo no pudo conectar con AWS Lambda. Verifica que tu teléfono tenga internet y que la Function URL tenga Auth: NONE y CORS permitido en AWS.'
          );
        }
        throw (err?.error || err?.message ? new Error(err?.error?.message || err?.message) : err);
      }
    }
  }

  /**
   * 7. Consultar estado biométrico en API Backend HTTP
   */
  consultarEstadoBackend(userId: string): Promise<any> {
    return firstValueFrom(
      this.http
        .get<any>(
          `${this.backendApiUrl}/api/biometria/status/${encodeURIComponent(
            userId
          )}`
        )
        .pipe(timeout(this.TIMEOUT_MS))
    );
  }
}

// Exportar alias para compatibilidad con importaciones existentes
export { FaceRecognitionService as FaceRecognition };
