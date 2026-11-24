import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class FaceRecognition {
    // Reemplaza estas 3 cadenas con las Function URLs de tus Lambdas en AWS
    private readonly urlRegistro = 'https://TU-LAMBDA-1.lambda-url.us-east-1.on.aws/';
    private readonly urlVerificacion = 'https://TU-LAMBDA-2.lambda-url.us-east-1.on.aws/';
    private readonly urlEstado = 'https://TU-LAMBDA-3.lambda-url.us-east-1.on.aws/';

    constructor(private http: HttpClient) { }

    // Lambda 1: Registrar rostro del usuario
    registrarRostro(userId: string, imageBase64: string): Observable<any> {
        return this.http.post(this.urlRegistro, { userId, imageBase64 });
    }

    // Lambda 2: Verificar / comparar rostro capturado contra el registrado
    verificarRostro(userId: string, imageBase64: string): Observable<any> {
        return this.http.post(this.urlVerificacion, { userId, imageBase64 });
    }

    // Lambda 3: Consultar estado o historial biométrico del usuario
    consultarEstado(userId: string): Observable<any> {
        return this.http.post(this.urlEstado, { userId });
    }
}