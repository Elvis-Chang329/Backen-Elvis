# 🛡️ Sistema Biométrico de Reconocimiento Facial y Censo

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-22-red?logo=angular)](https://angular.dev/)
[![Ionic](https://img.shields.io/badge/Ionic-9-blue?logo=ionic)](https://ionicframework.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-lightblue?logo=capacitor)](https://capacitorjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Rekognition%20%7C%20Lambdas-FF9900?logo=amazon-aws)](https://aws.amazon.com/)

Proyecto integral que combina una **API Backend** escalable en Node.js/TypeScript y una **Aplicación Móvil** híbrida en Ionic/Angular con Capacitor, diseñada para la captura, registro y verificación de identidad mediante reconocimiento facial asistido por servicios de **AWS Rekognition**.

---

## 📁 Estructura del Proyecto

```text
├── Backen_Elvis/             # Servidor API REST, modelos de base de datos y lógica de negocio
│   ├── src/                  # Controladores, modelos, rutas, servicios y utilidades
│   │   ├── config/           # Configuración de base de datos y entorno
│   │   ├── controllers/      # Controladores (Autenticación, Biometría, Usuarios, Censo)
│   │   ├── models/           # Modelos de datos
│   │   ├── routes/           # Definición de endpoints REST
│   │   └── utils/            # Utilidades de imagen y siembra de datos
│   ├── scripts/              # Scripts SQL para esquemas, índices y carga masiva
│   ├── Dockerfile            # Configuración para contenedor Docker
│   ├── docker-compose.yml    # Orquestación de servicios (API + PostgreSQL)
│   └── package.json
│
├── reconocimientoFacial/     # Aplicación móvil híbrida con Ionic + Angular + Capacitor
│   ├── src/                  # Código fuente de la app móvil
│   │   └── app/
│   │       ├── home/         # Vista principal de captura y verificación facial
│   │       └── services/     # Servicio HTTP cliente para consumo de Lambdas/API
│   ├── android/              # Proyecto nativo para compilación en Android Studio
│   ├── capacitor.config.ts   # Configuración de Capacitor y plugins nativos
│   └── package.json
│
├── .gitignore                # Reglas de exclusión para dependencias, compilados y entornos
└── README.md                 # Documentación técnica general
```

---

## 🚀 1. Módulo Backend (`Backen_Elvis`)

Servidor REST robusto con autenticación segura, persistencia relacional y endpoints especializados para auditoría biométrica.

### Características Principales
* **Autenticación y Seguridad:** JWT (JSON Web Tokens), hash de contraseñas con bcrypt y control de acceso basado en roles.
* **Integración Biométrica:** Registro de historial biométrico, similitud facial, estado de verificación y sesiones de Liveness de AWS Rekognition.
* **Persistencia:** Base de datos relacional con scripts de inicialización optimizados (`scripts/biometria_schema_y_consultas.sql`).
* **Contenedorización:** Listo para desplegar con Docker y Docker Compose en producción o entornos locales.

### Puesta en Marcha (Backend)

1. **Ingresar al directorio:**
   ```bash
   cd Backen_Elvis
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus credenciales de base de datos y claves secretas
   ```

3. **Ejecutar con Docker (Recomendado):**
   ```bash
   docker-compose up --build
   ```

4. **O ejecutar localmente con Node:**
   ```bash
   npm install
   npm run build
   npm start
   ```

---

## 📱 2. Módulo Móvil (`reconocimientoFacial`)

Aplicación móvil moderna desarrollada con **Ionic Framework** y **Angular** (Componentes Standalone), empaquetada para dispositivos nativos mediante **Capacitor**.

### Características Principales
* **Captura Fotográfica de Rostro:** Integración directa con `@capacitor/camera` para captura en alta resolución codificada en Base64.
* **Acciones Biométricas:**
  * **Registro:** Envío de rostro y metadatos para enrolamiento biométrico.
  * **Verificación:** Comparación en tiempo real contra registros existentes.
  * **Consulta de Estado:** Visualización del historial biométrico del usuario.
* **Soporte Nativo Android:** Proyecto listo en `reconocimientoFacial/android/` con permisos de cámara e internet declarados en `AndroidManifest.xml`.

### Puesta en Marcha (Frontend)

1. **Ingresar al directorio:**
   ```bash
   cd reconocimientoFacial
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Servir en el navegador:**
   ```bash
   npm start
   ```

4. **Compilar y sincronizar con Android:**
   ```bash
   npm run build
   npx cap sync android
   ```

5. **Abrir en Android Studio:**
   ```bash
   npx cap open android
   ```

---

## 🔐 Configuración de Lambdas de AWS

El servicio de reconocimiento facial en `reconocimientoFacial/src/app/services/face-recognition.ts` interactúa mediante Function URLs seguras con tus funciones Lambda:

```typescript
private readonly urlRegistro     = 'https://<TU-LAMBDA-REGISTRO>.lambda-url.us-east-1.on.aws/';
private readonly urlVerificacion = 'https://<TU-LAMBDA-VERIFICACION>.lambda-url.us-east-1.on.aws/';
private readonly urlEstado       = 'https://<TU-LAMBDA-ESTADO>.lambda-url.us-east-1.on.aws/';
```

---

## 👤 Autor

Desarrollado por **Elvis Chang** ([@Elvis-Chang329](https://github.com/Elvis-Chang329)).
