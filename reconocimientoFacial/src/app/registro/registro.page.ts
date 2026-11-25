import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonAvatar,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButtons,
  IonBackButton,
  LoadingController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, saveOutline, arrowBackOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { UsuarioService, Usuario } from '../services/usuario.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonAvatar,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButtons,
    IonBackButton
  ]
})
export class RegistroPage {

  // Modelo del formulario
  usuario: Usuario = {
    nombre: '',
    apellido: '',
    email: '',
    usuario: '',
    contrasena: '',
    edad: 25,
    fechaNacimiento: '1999-01-01',
    telefono: '',
    rol: 'censista'
  };

  // Almacena el Base64 de la foto capturada
  fotoPreview: string | null = null;
  fotoBase64Pura: string | null = null;

  constructor(
    private usuarioService: UsuarioService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ cameraOutline, saveOutline, arrowBackOutline });
  }

  // 1. Abrir la cámara con Capacitor
  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64, // Devuelve el Base64 directamente
        source: CameraSource.Camera         // Abre la cámara (o CameraSource.Prompt para dar opción a galería)
      });

      if (image.base64String) {
        this.fotoBase64Pura = image.base64String;
        // Para mostrar la vista previa en el HTML de Angular
        this.fotoPreview = `data:image/jpeg;base64,${image.base64String}`;
      }
    } catch (error) {
      console.log('Usuario canceló o error en cámara:', error);
    }
  }

  // 2. Enviar los datos y la foto a tu API
  async guardar() {
    if (!this.usuario.nombre || !this.usuario.usuario || !this.usuario.contrasena) {
      this.mostrarMensaje('Por favor completa los campos requeridos');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Guardando usuario...' });
    await loading.present();

    // Adjuntamos la foto en Base64 si fue tomada
    const datosAEnviar: Usuario = {
      ...this.usuario,
      foto: this.fotoBase64Pura || undefined
    };

    this.usuarioService.registrarUsuario(datosAEnviar).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.mostrarMensaje('¡Usuario y foto guardados con éxito!');
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Error al guardar:', err);
        this.mostrarMensaje(err.error?.message || 'Error al comunicarse con el servidor');
      }
    });
  }

  async mostrarMensaje(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}
