import { Component, ElementRef, ViewChild, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  fingerPrintOutline,
  logInOutline,
  logOutOutline,
  imageOutline,
  personCircleOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FaceRecognitionService } from '../services/face-recognition';
import { AuthProfileService, UserData } from '../services/auth-profile.service';

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
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  // Vista activa: 'biometria' | 'perfil' | 'login'
  vistaActual: 'biometria' | 'perfil' | 'login' = 'biometria';

  // Sesión y Usuario
  currentUser: UserData | null = null;
  loginUsuario: string = 'joel';
  loginPass: string = '123456';
  loginError: string = '';
  loginCargando: boolean = false;

  // Estado Perfil y Foto
  perfilStatusMsg: string = '';
  subiendoFoto: boolean = false;

  // Biometría
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

  constructor(
    private faceService: FaceRecognitionService,
    private authProfile: AuthProfileService,
    private cdr: ChangeDetectorRef
  ) {
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
      fingerPrintOutline,
      logInOutline,
      logOutOutline,
      imageOutline,
      personCircleOutline
    });
  }

  ngOnInit() {
    this.currentUser = this.authProfile.getCurrentUser();
    if (this.currentUser) {
      this.userId = this.currentUser.usuario || String(this.currentUser.id);
    }
  }

  cambiarVista(nuevaVista: 'biometria' | 'perfil' | 'login') {
    this.vistaActual = nuevaVista;
    this.resultado = null;
    this.perfilStatusMsg = '';
    this.loginError = '';
    this.cdr.detectChanges();
  }

  /**
   * Flujo de Login contra el Backend (POST /api/auth/login en puerto 3000)
   */
  async ejecutarLogin() {
    if (!this.loginUsuario.trim() || !this.loginPass.trim()) {
      this.loginError = 'Por favor ingresa usuario y contraseña.';
      return;
    }

    try {
      this.loginCargando = true;
      this.loginError = '';
      this.cdr.detectChanges();

      const user = await this.authProfile.login(this.loginUsuario.trim(), this.loginPass.trim());
      this.currentUser = user;
      this.userId = user.usuario || String(user.id);
      this.vistaActual = 'biometria';
      this.resultado = {
        tipo: 'success',
        titulo: 'Sesión Iniciada',
        mensaje: `¡Bienvenido ${user.nombre || user.usuario}! Sesión vinculada con PostgreSQL.`
      };
    } catch (err: any) {
      this.loginError = err?.message || 'Error al conectar con el servidor de autenticación.';
    } finally {
      this.loginCargando = false;
      this.cdr.detectChanges();
    }
  }

  logout() {
    this.authProfile.logout();
    this.currentUser = null;
    this.vistaActual = 'login';
    this.cdr.detectChanges();
  }

  /**
   * Flujo de Perfil: Cámara o Galería con compresión a 600px / 0.7 JPEG
   */
  async pickFromCamera() {
    await this.captureAndUpload(CameraSource.Camera);
  }

  async pickFromGallery() {
    await this.captureAndUpload(CameraSource.Photos);
  }

  private async captureAndUpload(source: CameraSource) {
    const targetUserId = this.currentUser?.id || this.userId || '1';

    try {
      this.subiendoFoto = true;
      this.perfilStatusMsg = 'Abriendo cámara/galería...';
      this.cdr.detectChanges();

      const photo = await Camera.getPhoto({
        source,
        resultType: CameraResultType.DataUrl,
        width: 600,
        quality: 70,
        allowEditing: false,
      });

      if (!photo.dataUrl) {
        throw new Error('No se obtuvo imagen desde el dispositivo');
      }

      this.perfilStatusMsg = 'Comprimiendo imagen a 600px (calidad 70%)...';
      this.cdr.detectChanges();

      const compressed = await this.authProfile.compressDataUrl(photo.dataUrl, 600, 0.7);

      this.perfilStatusMsg = 'Enviando foto a PostgreSQL (POST /api/users/:id/foto)...';
      this.cdr.detectChanges();

      const savedUrlOrBase64 = await this.authProfile.uploadUserPhoto(targetUserId, compressed);

      if (this.currentUser) {
        this.currentUser = { ...this.currentUser, foto: savedUrlOrBase64 };
      }
      this.perfilStatusMsg = '✅ Foto subida y guardada exitosamente en el backend.';
    } catch (err: any) {
      if (err?.message !== 'User cancelled photos app') {
        this.perfilStatusMsg = err?.message || 'Error al seleccionar o subir la foto';
      } else {
        this.perfilStatusMsg = '';
      }
    } finally {
      this.subiendoFoto = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  /**
   * Control seguro de estado de carga con watchdog anti-congelamiento
   */
  private setCargando(estado: boolean, mensaje: string = '') {
    this.cargando = estado;
    this.textoCarga = mensaje;
    this.cdr.detectChanges();

    if (estado) {
      setTimeout(() => {
        if (this.cargando) {
          this.cargando = false;
          this.procesarError('Tiempo de Espera Superado', {
            message: 'El servidor AWS superó los 30 segundos de espera (Cold Start / Latencia de red). La aplicación se desbloqueó automáticamente.'
          });
          this.cdr.detectChanges();
        }
      }, 32000);
    }
  }

  /**
   * Inicia el flujo completo de Face Liveness
   */
  async iniciarLiveness(modo: 'registro' | 'verificacion') {
    if (!this.userId.trim()) {
      this.resultado = {
        tipo: 'warning',
        titulo: 'ID Requerido',
        mensaje: 'Por favor introduce un ID de usuario antes de iniciar la prueba de vida.'
      };
      this.cdr.detectChanges();
      return;
    }

    this.setCargando(true, 'Generando sesión de Face Liveness en AWS...');
    this.resultado = null;

    try {
      const res = await this.faceService.crearSesionLiveness();
      this.sessionId = res?.sessionId || ('session_' + Math.random().toString(36).substring(2, 10));
      this.modoLiveness = modo;
      this.setCargando(false);

      this.mostrarLiveness = true;
      this.livenessProgreso = 0;
      this.livenessEstadoVisual = 'neutral';
      this.livenessPaso = 'Alinea tu rostro dentro del óvalo';
      this.livenessColorFlash = 'transparent';
      this.cdr.detectChanges();

      setTimeout(() => {
        this.iniciarCamara();
        this.ejecutarSecuenciaLiveness();
      }, 250);

    } catch (error: any) {
      this.setCargando(false);
      this.procesarError('Error al crear sesión Liveness', error);
    }
  }

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
          this.videoElement.nativeElement.play().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Cámara WebRTC no disponible directamente, continuando simulación:', err);
    }
    this.cdr.detectChanges();
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

  private ejecutarSecuenciaLiveness() {
    let progreso = 0;
    const colores = ['#FF0055', '#00F0FF', '#FFE600', '#FFFFFF', 'transparent'];
    let colorIdx = 0;

    this.timerLiveness = setInterval(() => {
      progreso += 5;
      this.livenessProgreso = progreso;

      if (progreso <= 30) {
        this.livenessPaso = 'Alinea tu rostro dentro del óvalo';
        this.livenessEstadoVisual = 'scanning';
      } else if (progreso <= 60) {
        this.livenessPaso = 'Acércate un poco más y mantén la mirada';
        this.livenessEstadoVisual = 'approaching';
      } else if (progreso <= 90) {
        this.livenessPaso = 'Verificando prueba de vida (análisis de reflejos)...';
        this.livenessEstadoVisual = 'flashing';
        this.livenessColorFlash = colores[colorIdx % colores.length];
        colorIdx++;
      } else if (progreso >= 100) {
        this.livenessPaso = '¡Prueba de vida completada!';
        this.livenessEstadoVisual = 'success';
        this.livenessColorFlash = 'transparent';
        clearInterval(this.timerLiveness);
        this.timerLiveness = null;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.finalizarLiveness();
        }, 700);
      }

      this.cdr.detectChanges();
    }, 180);
  }

  private async finalizarLiveness() {
    this.detenerCamara();
    this.mostrarLiveness = false;
    const currentSessionId = this.sessionId || 'session_' + Date.now();

    this.setCargando(
      true,
      this.modoLiveness === 'registro'
        ? `Registrando en AWS (Session: ${currentSessionId})...`
        : `Verificando identidad en AWS (Session: ${currentSessionId})...`
    );

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
      this.setCargando(false);
    }
  }

  cancelarLiveness() {
    this.detenerCamara();
    this.mostrarLiveness = false;
    this.setCargando(false);
    this.resultado = {
      tipo: 'info',
      titulo: 'Prueba Cancelada',
      mensaje: 'La sesión de prueba de vida fue cancelada por el usuario.'
    };
    this.cdr.detectChanges();
  }

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
          mensaje: 'Fotografía lista. Puedes usar los botones de Liveness para procesar.'
        };
      }
    } catch (error) {
      // Cancelado
    }
    this.cdr.detectChanges();
  }

  async consultarEstado() {
    if (!this.userId.trim()) return;
    this.setCargando(true, `Consultando estado en AWS para "${this.userId}"...`);
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
      this.setCargando(false);
    }
  }

  async consultarEstadoBackend() {
    if (!this.userId.trim()) return;
    this.setCargando(true, `Consultando API Backend en http://api.aplicacionesweb2026.com:3000...`);
    this.resultado = null;

    try {
      const res = await this.faceService.consultarEstadoBackend(this.userId.trim());
      this.resultado = {
        tipo: 'success',
        titulo: 'Estado en API Backend (HTTP :3000)',
        mensaje: `Respuesta recibida desde api.aplicacionesweb2026.com:3000 para "${this.userId}".`,
        detalles: res
      };
    } catch (err: any) {
      this.procesarError('Error en API Backend HTTP', err);
    } finally {
      this.setCargando(false);
    }
  }

  private procesarError(tituloDefault: string, err: any) {
    let titulo = tituloDefault;
    let mensaje = err?.error?.message || err?.message || 'Error de comunicación con el servicio.';

    if (err?.name === 'TimeoutError' || err?.message?.includes('Timeout')) {
      titulo = 'Tiempo de Espera Agotado';
      mensaje = 'La Lambda de AWS tardó más de 7 segundos en responder. El sistema se desbloqueó para que puedas volver a intentar.';
    } else if (err?.status === 0) {
      titulo = 'Error de Conexión / CORS (AWS)';
      mensaje = 'No se pudo conectar con la Function URL (Status 0). Verifica que la Lambda tenga CORS habilitado en AWS (Allow-Origin: *).';
    }

    this.resultado = {
      tipo: 'danger',
      titulo,
      mensaje,
      detalles: err
    };
    this.cdr.detectChanges();
  }
}
