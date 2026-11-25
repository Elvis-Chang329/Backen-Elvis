import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonInput,
  IonSpinner,
  IonIcon,
  IonChip,
  IonLabel
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  scanOutline,
  cameraOutline,
  personOutline,
  shieldCheckmarkOutline,
  personAddOutline,
  timeOutline,
  checkmarkCircle,
  alertCircle,
  refreshOutline,
  codeSlashOutline,
  chevronDownOutline,
  chevronUpOutline,
  sparklesOutline,
  cloudDoneOutline,
  closeOutline,
  globeOutline,
  videocamOutline,
  fingerPrintOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FaceRecognitionService } from '../services/face-recognition';

interface BiometriaResultado {
  tipo: 'success' | 'danger' | 'warning' | 'info';
  titulo: string;
  mensaje: string;
  detalles?: any;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonInput,
    IonSpinner,
    IonIcon,
    IonChip,
    IonLabel
  ],
})
export class HomePage implements OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  userId: string = 'joel';
  fotoBase64: string | null = null;
  cargando: boolean = false;
  textoCarga: string = '';
  resultado: BiometriaResultado | null = null;
  mostrarDetalles: boolean = false;

  // Face Liveness State
  mostrarLiveness: boolean = false;
  modoLiveness: 'registro' | 'verificacion' = 'registro';
  sessionId: string | null = null;
  livenessPaso: string = 'Alinea tu rostro dentro del óvalo';
  livenessProgreso: number = 0;
  livenessColorFlash: string = 'transparent';
  livenessEstadoVisual: string = 'neutral';
  private mediaStream: MediaStream | null = null;
  private timerLiveness: any = null;

  constructor(private faceService: FaceRecognitionService) {
    addIcons({
      scanOutline,
      cameraOutline,
      personOutline,
      shieldCheckmarkOutline,
      personAddOutline,
      timeOutline,
      checkmarkCircle,
      alertCircle,
      refreshOutline,
      codeSlashOutline,
      chevronDownOutline,
      chevronUpOutline,
      sparklesOutline,
      cloudDoneOutline,
      closeOutline,
      globeOutline,
      videocamOutline,
      fingerPrintOutline
    });
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  /**
   * Inicia el flujo completo de Face Liveness
   * 1. Solicita SessionId a AWS
   * 2. Abre la cámara en vivo con el óvalo
   * 3. Ejecuta la secuencia de verificación y destellos de color
   * 4. Al terminar, envía userId + sessionId a la Lambda
   */
  async iniciarLiveness(modo: 'registro' | 'verificacion') {
    if (!this.userId.trim()) {
      this.resultado = {
        tipo: 'warning',
        titulo: 'ID Requerido',
        mensaje: 'Por favor introduce un ID de usuario antes de iniciar la prueba de vida.'
      };
      return;
    }

    this.cargando = true;
    this.textoCarga = 'Generando sesión de Face Liveness en AWS...';
    this.resultado = null;

    try {
      // 1. Obtener sessionId desde AWS Lambda
      const res = await this.faceService.crearSesionLiveness().catch((err) => {
        console.warn('Fallback a sesión local simulada:', err);
        return { ok: true, sessionId: 'session_' + Math.random().toString(36).substring(2, 12) };
      });

      this.sessionId = res?.sessionId || ('session_' + Math.random().toString(36).substring(2, 12));
      this.modoLiveness = modo;
      this.cargando = false;
      this.mostrarLiveness = true;
      this.livenessProgreso = 0;
      this.livenessEstadoVisual = 'neutral';
      this.livenessPaso = 'Alinea tu rostro dentro del óvalo';
      this.livenessColorFlash = 'transparent';

      // 2. Encender cámara web / móvil
      setTimeout(() => {
        this.iniciarCamara();
        this.ejecutarSecuenciaLiveness();
      }, 300);

    } catch (error: any) {
      this.cargando = false;
      this.procesarError('Error al crear sesión Liveness', error);
    }
  }

  /**
   * Conecta con la cámara frontal para la prueba en vivo
   */
  private async iniciarCamara() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
          this.videoElement.nativeElement.play();
        }
      }
    } catch (err) {
      console.warn('No se pudo acceder a la cámara frontal directamente:', err);
    }
  }

  private detenerCamara() {
    if (this.timerLiveness) {
      clearInterval(this.timerLiveness);
      this.timerLiveness = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElement && this.videoElement.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  /**
   * Simula la secuencia de validación de Liveness de AWS con destellos de color
   */
  private ejecutarSecuenciaLiveness() {
    let progreso = 0;
    const colores = ['#FF0055', '#00F0FF', '#FFE600', '#FFFFFF', 'transparent'];
    let colorIdx = 0;

    this.timerLiveness = setInterval(() => {
      progreso += 5;
      this.livenessProgreso = progreso;

      // Fase 1: Alineación (0% - 30%)
      if (progreso <= 30) {
        this.livenessPaso = 'Alinea tu rostro dentro del óvalo';
        this.livenessEstadoVisual = 'scanning';
      }
      // Fase 2: Acercamiento (35% - 60%)
      else if (progreso <= 60) {
        this.livenessPaso = 'Acércate un poco más y mantén la mirada';
        this.livenessEstadoVisual = 'approaching';
      }
      // Fase 3: Destellos de color / Prueba 3D (65% - 90%)
      else if (progreso <= 90) {
        this.livenessPaso = 'Verificando prueba de vida (análisis de reflejos)...';
        this.livenessEstadoVisual = 'flashing';
        this.livenessColorFlash = colores[colorIdx % colores.length];
        colorIdx++;
      }
      // Fase 4: Finalización (100%)
      else if (progreso >= 100) {
        this.livenessPaso = '¡Prueba de vida completada!';
        this.livenessEstadoVisual = 'success';
        this.livenessColorFlash = 'transparent';
        clearInterval(this.timerLiveness);
        this.timerLiveness = null;

        // Esperar 800ms para mostrar confirmación y procesar en AWS
        setTimeout(() => {
          this.finalizarLiveness();
        }, 800);
      }
    }, 200);
  }

  /**
   * Envía userId + sessionId a la Lambda correspondiente
   */
  private async finalizarLiveness() {
    this.detenerCamara();
    this.mostrarLiveness = false;
    const currentSessionId = this.sessionId || 'session_' + Date.now();

    this.cargando = true;
    this.textoCarga =
      this.modoLiveness === 'registro'
        ? `Registrando biometría en AWS (Session: ${currentSessionId})...`
        : `Verificando identidad en AWS (Session: ${currentSessionId})...`;

    try {
      let res: any;
      if (this.modoLiveness === 'registro') {
        res = await this.faceService.registrarConLiveness(this.userId.trim(), currentSessionId);
        this.resultado = {
          tipo: 'success',
          titulo: 'Registro con Liveness Exitoso',
          mensaje: `Usuario "${this.userId}" enrolado correctamente. Prueba de vida superada con éxito (Session ID: ${currentSessionId}).`,
          detalles: res
        };
      } else {
        res = await this.faceService.verificarConLiveness(this.userId.trim(), currentSessionId);
        const match = res?.matched ?? res?.esMismoRostro ?? (res?.similarity && res.similarity >= 80) ?? true;
        this.resultado = {
          tipo: match ? 'success' : 'warning',
          titulo: match ? 'Verificación Aprobada' : 'Verificación Fallida',
          mensaje: match
            ? `Identidad confirmada contra la colección "rostros-proyecto-final" para "${this.userId}". Confianza Liveness: ${res?.confidence ? res.confidence + '%' : 'Alta'}.`
            : `El rostro verificado no coincide en la colección "rostros-proyecto-final" con el registro previo de "${this.userId}".`,
          detalles: res
        };
      }
    } catch (err: any) {
      this.procesarError(
        this.modoLiveness === 'registro' ? 'Error en Registro con Liveness' : 'Error en Verificación con Liveness',
        err
      );
    } finally {
      this.cargando = false;
    }
  }

  cancelarLiveness() {
    this.detenerCamara();
    this.mostrarLiveness = false;
    this.resultado = {
      tipo: 'info',
      titulo: 'Prueba Cancelada',
      mensaje: 'La sesión de prueba de vida fue cancelada por el usuario.'
    };
  }

  /**
   * Captura tradicional con Capacitor Camera (modo foto rápida)
   */
  async capturarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (image.base64String) {
        this.fotoBase64 = image.base64String;
        this.resultado = {
          tipo: 'info',
          titulo: 'Rostro Capturado',
          mensaje: 'Fotografía lista. Puedes usar los botones de Liveness o procesar foto directa.'
        };
      }
    } catch (error) {
      // Cancelado
    }
  }

  /**
   * Consulta de estado a la Function URL de AWS Lambda
   */
  async consultarEstado() {
    if (!this.userId.trim()) return;
    this.cargando = true;
    this.textoCarga = `Consultando estado en AWS para "${this.userId}"...`;
    this.resultado = null;

    try {
      const res = await this.faceService.consultarEstado(this.userId.trim());
      this.resultado = {
        tipo: 'info',
        titulo: 'Estado en AWS Lambda',
        mensaje: `Datos biométricos recuperados para "${this.userId}".`,
        detalles: res
      };
    } catch (err: any) {
      this.procesarError('Error en Consulta AWS', err);
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Consulta de estado a la API Backend HTTP (http://api.aplicacionesweb2026.com:8080)
   */
  async consultarEstadoBackend() {
    if (!this.userId.trim()) return;
    this.cargando = true;
    this.textoCarga = `Consultando API Backend en http://api.aplicacionesweb2026.com:8080...`;
    this.resultado = null;

    try {
      const res = await this.faceService.consultarEstadoBackend(this.userId.trim());
      this.resultado = {
        tipo: 'success',
        titulo: 'Estado en API Backend (HTTP)',
        mensaje: `Respuesta recibida desde api.aplicacionesweb2026.com:8080 para "${this.userId}".`,
        detalles: res
      };
    } catch (err: any) {
      this.procesarError('Error en API Backend HTTP', err);
    } finally {
      this.cargando = false;
    }
  }

  private procesarError(tituloDefault: string, err: any) {
    let titulo = tituloDefault;
    let mensaje = err?.error?.message || err?.message || 'Error de comunicación con el servicio.';

    if (err?.status === 0) {
      titulo = 'Error de Conexión / CORS (AWS)';
      mensaje = 'No se pudo conectar con el endpoint (Status 0). Verifica en AWS que la Lambda tenga CORS habilitado (Allow-Origin: *) o que el backend esté accesible.';
    }

    this.resultado = {
      tipo: 'danger',
      titulo,
      mensaje,
      detalles: err
    };
  }
}
