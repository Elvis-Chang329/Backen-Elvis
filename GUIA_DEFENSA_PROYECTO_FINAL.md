# 📋 DOCUMENTO TÉCNICO Y GUÍA DE DEFENSA PASO A PASO A NIVEL CERO
## Sistema Biométrico de Reconocimiento Facial y Face Liveness con AWS Rekognition

* **Estudiante:** Elvis Joel Chang
* **Repositorio GitHub:** [https://github.com/Elvis-Chang329/Backen-Elvis.git](https://github.com/Elvis-Chang329/Backen-Elvis.git)
* **Colaborador Invitado:** `rarizandieta`
* **APK Generado:** `nombre_V1.apk` / `Elvis_V1.apk`
* **Fecha de Entrega / Defensa:** Lunes 30 de noviembre de 2026 - 18:10 hrs (Defensa de ~8 minutos)

---

## 1. 🏗️ Arquitectura General del Sistema

El sistema implementa una arquitectura híbrida orientada a microservicios y biometría en la nube:

1. **Frontend Móvil (Ionic 9 + Angular Standalone + Capacitor 8):**
   * Captura en vivo y prueba de vida (*Face Liveness*) con óvalo facial, estimación de profundidad y secuencia de destellos de color (*Color Flashing*).
   * Comunicación asíncrona hacia AWS mediante Function URLs protegidas y hacia la API Backend en `http://api.aplicacionesweb2026.com:8080`.
2. **Capa Serverless (AWS Lambda):**
   * Tres funciones Lambda configuradas en la región `us-east-1` que interactúan directamente con **Amazon Rekognition** y **Amazon S3**.
3. **Capa de Almacenamiento e Indexación Biométrica:**
   * **Bucket S3:** `rekognition-rostros-elvis-2026` para resguardo seguro de imágenes.
   * **Colección Rekognition:** `rostros-proyecto-final` para indexación de vectores faciales y búsqueda 1:N o 1:1.
4. **Backend Relacional (Node.js/Express + PostgreSQL + Docker):**
   * Registro de auditoría, bitácora de accesos biométricos y sincronización con el censo.

---

## 2. ☁️ Configuración de Infraestructura en AWS (us-east-1)

### A. Parámetros Principales
| Parámetro | Valor Configurado |
|---|---|
| **Región de AWS** | `us-east-1` (N. Virginia) |
| **Bucket de Amazon S3** | `rekognition-rostros-elvis-2026` |
| **Colección Rekognition** | `rostros-proyecto-final` |
| **API Backend HTTP** | `http://api.aplicacionesweb2026.com:8080` |

### B. Rol IAM y Políticas de Permisos
Las Lambdas ejecutan bajo un rol IAM con la política administrada `AWSLambdaBasicExecutionRole` y una política en línea con permisos:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateFaceLivenessSession",
        "rekognition:GetFaceLivenessSessionResults",
        "rekognition:IndexFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:CompareFaces"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::rekognition-rostros-elvis-2026/*"
    }
  ]
}
```

### C. Function URLs y Configuración de CORS
Cada Lambda tiene habilitada su **Function URL** pública (Auth Type: `NONE`) con **CORS activo**:
* **Allow-Origin:** `*`
* **Allow-Methods:** `POST, GET, OPTIONS`
* **Allow-Headers:** `content-type, authorization`

| Servicio Lambda | Function URL |
|---|---|
| **Lambda 1: Registro & Liveness** | `https://mfu55zgo4p25nm3jvw4gnz2pti0foier.lambda-url.us-east-1.on.aws` |
| **Lambda 2: Verificación 1:1** | `https://sqryezg45q77s377tja62lkis40meqtf.lambda-url.us-east-1.on.aws` |
| **Lambda 3: Consulta de Estado** | `https://5chbngaiyxbdgwka72os6nneoa0pslmx.lambda-url.us-east-1.on.aws` |

---

## 3. 💻 Código de las Funciones AWS Lambda (Python / Node)

### Lambda 1: Creación de Sesión Liveness y Enrolamiento
```python
import json, boto3, os

rekognition = boto3.client('rekognition', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
BUCKET = 'rekognition-rostros-elvis-2026'
COLLECTION_ID = 'rostros-proyecto-final'

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
    }
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    
    # 1. Crear sesión de Face Liveness
    if action == 'create_session':
        response = rekognition.create_face_liveness_session()
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"ok": True, "sessionId": response['SessionId']})
        }
        
    # 2. Registrar usuario tras superar Liveness
    elif action == 'register_liveness':
        user_id = body.get('userId')
        session_id = body.get('sessionId')
        liveness_result = rekognition.get_face_liveness_session_results(SessionId=session_id)
        
        confidence = liveness_result.get('Confidence', 0)
        status = liveness_result.get('Status', 'EXPIRED')
        
        if confidence >= 85 and status == 'SUCCEEDED':
            # Indexar rostro en la colección
            ref_image = liveness_result['ReferenceImage']['Bytes']
            index_res = rekognition.index_faces(
                CollectionId=COLLECTION_ID,
                Image={'Bytes': ref_image},
                ExternalImageId=user_id,
                DetectionAttributes=['DEFAULT'],
                MaxFaces=1
            )
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "ok": True,
                    "message": "Usuario registrado exitosamente con Liveness",
                    "userId": user_id,
                    "confidence": confidence,
                    "faceId": index_res['FaceRecords'][0]['Face']['FaceId']
                })
            }
        else:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"ok": False, "message": "Prueba de vida no superada", "confidence": confidence})
            }
```

### Lambda 2: Verificación de Identidad 1:1 contra `rostros-proyecto-final`
```python
import json, boto3

rekognition = boto3.client('rekognition', region_name='us-east-1')
COLLECTION_ID = 'rostros-proyecto-final'

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
    }
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('userId')
    session_id = body.get('sessionId')
    
    # Obtener imagen capturada en la sesión
    liveness_res = rekognition.get_face_liveness_session_results(SessionId=session_id)
    ref_image = liveness_res.get('ReferenceImage', {}).get('Bytes')
    
    # Buscar coincidencia en la colección
    search_res = rekognition.search_faces_by_image(
        CollectionId=COLLECTION_ID,
        Image={'Bytes': ref_image},
        FaceMatchThreshold=80.0,
        MaxFaces=1
    )
    
    matches = search_res.get('FaceMatches', [])
    if matches and matches[0]['Face']['ExternalImageId'] == user_id:
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "ok": True,
                "matched": True,
                "similarity": matches[0]['Similarity'],
                "userId": user_id,
                "message": "Identidad confirmada exitosamente"
            })
        }
    else:
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "ok": True,
                "matched": False,
                "similarity": matches[0]['Similarity'] if matches else 0,
                "message": "Rostro no coincide con el usuario registrado"
            })
        }
```

---

## 4. 📱 Configuración en la App Móvil (Android + Capacitor)

### A. Permisos en `AndroidManifest.xml`
```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme"
    android:usesCleartextTraffic="true">
    ...
</application>

<!-- Permisos Biométricos y Red -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### B. Configuración de `capacitor.config.ts`
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'reconocimientoFacial',
  webDir: 'www',
  server: {
    cleartext: true
  }
};

export default config;
```

### C. Configuración de JDK 21 en `gradle.properties`
```properties
org.gradle.jvmargs=-Xmx1536m
org.gradle.java.home=C:/Users/chanj/.jdks/jbr-21.0.11
android.useAndroidX=true
```

---

## 5. 🛠️ Flujo de Compilación Paso a Paso (Nivel Cero)

Para compilar el proyecto desde cero en cualquier computadora:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Elvis-Chang329/Backen-Elvis.git
   cd Backen-Elvis/reconocimientoFacial
   ```
2. **Instalar dependencias:**
   ```bash
   npm install
   ```
3. **Compilar los componentes web:**
   ```bash
   npm run build
   ```
4. **Sincronizar activos con la plataforma Android:**
   ```bash
   npx cap sync android
   ```
5. **Generar el APK ejecutable con Gradle:**
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```
6. **El APK resultante:**
   Se ubica en `reconocimientoFacial/android/app/build/outputs/apk/debug/app-debug.apk` y se copia en la raíz como:
   * **`nombre_V1.apk`**
   * **`Elvis_V1.apk`**

---

## 6. ⏱️ Estructura Cronometrada para la Defensa (~8 Minutos)

| Minuto | Bloque | Contenido a Exponer |
|---|---|---|
| **00:00 - 01:30** | **Introducción y Arquitectura** | Presentación personal. Explicar el problema de seguridad de fotos estáticas y la solución de **AWS Face Liveness** con estimación de profundidad 3D y análisis de reflejos lumínicos (*Color Flashing*). Mostrar el repositorio GitHub y la estructura monorepo. |
| **01:30 - 03:30** | **Infraestructura Cloud en AWS** | Explicar la región `us-east-1`, el bucket `rekognition-rostros-elvis-2026`, la colección `rostros-proyecto-final`, las Function URLs con CORS y los roles IAM de mínimo privilegio. |
| **03:30 - 06:00** | **Demostración en Vivo (APK)** | Conectar el celular o emulador con `nombre_V1.apk`:<br>1. Ingresar ID de usuario (`joel`).<br>2. Iniciar **Registrar con Liveness** (mostrar cámara en vivo, alineación en el óvalo y destellos de color).<br>3. Observar confirmación de registro en AWS Rekognition.<br>4. Iniciar **Verificar con Liveness** y validar coincidencia 1:1 contra la colección.<br>5. Demostrar la consulta de estado en la Lambda y en la API Backend (`http://api.aplicacionesweb2026.com:8080`). |
| **06:00 - 07:15** | **Mitigación de Ataques (Spoofing)** | Explicar cómo el sistema rechaza una fotografía impresa o mostrada en otro teléfono gracias a la variación cromática dinámica del Liveness. |
| **07:15 - 08:00** | **Conclusiones y Preguntas** | Síntesis de resultados, tiempo de respuesta de las Function URLs y cierre formal.
