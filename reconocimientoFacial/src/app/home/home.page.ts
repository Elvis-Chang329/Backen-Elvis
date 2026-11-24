import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonItem,
  IonInput,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FaceRecognition } from '../services/face-recognition';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonItem,
    IonInput,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent
  ],
})
export class HomePage {
  userId: string = 'usr_001';
  fotoBase64: string | null = null;
  mensajeResultado: string = '';
  cargando: boolean = false;

  constructor(private faceService: FaceRecognition) { }

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
        this.mensajeResultado = 'Foto capturada. Lista para enviar a AWS.';
      }
    } catch (error) {
      this.mensajeResultado = 'No se pudo capturar la foto o se canceló la acción.';
    }
  }

  registrar() {
    if (!this.fotoBase64) return;
    this.cargando = true;
    this.faceService.registrarRostro(this.userId, this.fotoBase64).subscribe({
      next: (res) => {
        this.cargando = false;
        this.mensajeResultado = 'Registro: ' + JSON.stringify(res);
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeResultado = 'Error en registro: ' + (err.message || 'Error de conexión');
      },
    });
  }

  verificar() {
    if (!this.fotoBase64) return;
    this.cargando = true;
    this.faceService.verificarRostro(this.userId, this.fotoBase64).subscribe({
      next: (res) => {
        this.cargando = false;
        this.mensajeResultado = 'Verificación: ' + JSON.stringify(res);
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeResultado = 'Error en verificación: ' + (err.message || 'Error de conexión');
      },
    });
  }

  consultarEstado() {
    this.cargando = true;
    this.faceService.consultarEstado(this.userId).subscribe({
      next: (res) => {
        this.cargando = false;
        this.mensajeResultado = 'Estado: ' + JSON.stringify(res);
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeResultado = 'Error al consultar estado: ' + (err.message || 'Error de conexión');
      },
    });
  }
}