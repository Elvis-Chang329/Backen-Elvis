import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonInput,
  IonSpinner,
  IonIcon,
  IonBadge,
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
  cloudDoneOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FaceRecognition } from '../services/face-recognition';

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
    IonButton,
    IonInput,
    IonSpinner,
    IonIcon,
    IonBadge,
    IonChip,
    IonLabel
  ],
})
export class HomePage {
  userId: string = 'usr_001';
  fotoBase64: string | null = null;
  cargando: boolean = false;
  textoCarga: string = '';
  resultado: BiometriaResultado | null = null;
  mostrarDetalles: boolean = false;

  constructor(private faceService: FaceRecognition) {
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
      cloudDoneOutline
    });
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
          mensaje: 'Fotografía lista en memoria. Selecciona "Registrar" o "Verificar" para procesar con AWS.'
        };
      }
    } catch (error) {
      // Captura cancelada por el usuario
    }
  }

  limpiarFoto() {
    this.fotoBase64 = null;
    this.resultado = null;
  }

  registrar() {
    if (!this.fotoBase64 || !this.userId.trim()) return;
    this.cargando = true;
    this.textoCarga = 'Registrando rostro en AWS Rekognition...';
    this.resultado = null;

    this.faceService.registrarRostro(this.userId.trim(), this.fotoBase64).subscribe({
      next: (res) => {
        this.cargando = false;
        this.resultado = {
          tipo: 'success',
          titulo: 'Registro Exitoso',
          mensaje: `El usuario "${this.userId}" fue registrado en la colección biométrica.`,
          detalles: res
        };
      },
      error: (err) => {
        this.cargando = false;
        this.procesarError('Error en Registro', err);
      },
    });
  }

  verificar() {
    if (!this.fotoBase64 || !this.userId.trim()) return;
    this.cargando = true;
    this.textoCarga = 'Comparando rostro con AWS Rekognition...';
    this.resultado = null;

    this.faceService.verificarRostro(this.userId.trim(), this.fotoBase64).subscribe({
      next: (res) => {
        this.cargando = false;
        const coincidencia = res?.matched ?? res?.esMismoRostro ?? (res?.similarity && res.similarity >= 80);
        this.resultado = {
          tipo: coincidencia ? 'success' : 'warning',
          titulo: coincidencia ? 'Identidad Verificada' : 'Sin Coincidencia',
          mensaje: coincidencia
            ? `Rostro válido para "${this.userId}". Similitud: ${res?.similarity ? res.similarity + '%' : 'Aprobada'}.`
            : `El rostro capturado no coincide suficientemente con el registro de "${this.userId}".`,
          detalles: res
        };
      },
      error: (err) => {
        this.cargando = false;
        this.procesarError('Error en Verificación', err);
      },
    });
  }

  consultarEstado() {
    if (!this.userId.trim()) return;
    this.cargando = true;
    this.textoCarga = 'Consultando estado biométrico en AWS...';
    this.resultado = null;

    this.faceService.consultarEstado(this.userId.trim()).subscribe({
      next: (res) => {
        this.cargando = false;
        this.resultado = {
          tipo: 'info',
          titulo: 'Estado del Usuario',
          mensaje: `Información recuperada exitosamente para "${this.userId}".`,
          detalles: res
        };
      },
      error: (err) => {
        this.cargando = false;
        this.procesarError('Error en Consulta', err);
      },
    });
  }

  private procesarError(tituloDefault: string, err: any) {
    let titulo = tituloDefault;
    let mensaje = err?.error?.message || err?.message || 'Error de conexión con el servidor.';

    if (err?.status === 0) {
      titulo = 'Error de Conexión / CORS (AWS)';
      mensaje = 'No se pudo conectar con la Function URL de AWS Lambda (Status 0). Verifica en AWS que la Lambda tenga CORS activado (Allow-Origin: *).';
    }

    this.resultado = {
      tipo: 'danger',
      titulo,
      mensaje,
      detalles: err
    };
  }
}
