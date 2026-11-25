import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

  constructor(private http: HttpClient) {}

  /**
   * 1. Crear sesión de Face Liveness en AWS
   */
  crearSesionLiveness(): Promise<{ ok: boolean; sessionId: string }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean; sessionId: string }>(this.registroUrl, {
        action: 'create_session',
      })
    );
  }

  /**
   * 2. Registrar usuario utilizando el Session ID de Face Liveness
   */
  registrarConLiveness(userId: string, sessionId: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(this.registroUrl, {
        action: 'register_liveness',
        userId,
        sessionId,
      })
    );
  }

  /**
   * 3. Verificar identidad del usuario utilizando el Session ID de Face Liveness
   */
  verificarConLiveness(userId: string, sessionId: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(this.verificarUrl, {
        action: 'verify_liveness',
        userId,
        sessionId,
      })
    );
  }

  /**
   * 4. Registro tradicional con foto Base64 (fallback directo)
   */
  registrarRostro(userId: string, imageBase64: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(this.registroUrl, {
        action: 'register_photo',
        userId,
        imageBase64,
      })
    );
  }

  /**
   * 5. Verificación tradicional con foto Base64 (fallback directo)
   */
  verificarRostro(userId: string, imageBase64: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(this.verificarUrl, {
        action: 'verify_photo',
        userId,
        imageBase64,
      })
    );
  }

  /**
   * 6. Consultar estado biométrico en AWS Lambda
   */
  consultarEstado(userId: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(this.estadoUrl, { userId })
    );
  }

  /**
   * 7. Consultar estado biométrico en API Backend HTTP
   */
  consultarEstadoBackend(userId: string): Promise<any> {
    return firstValueFrom(
      this.http.get<any>(`${this.backendApiUrl}/api/biometria/status/${encodeURIComponent(userId)}`)
    );
  }
}

// Exportar alias para compatibilidad con importaciones existentes
export { FaceRecognitionService as FaceRecognition };
