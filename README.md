 Autor

Desarrollado por **Elvis Chang** ([@Elvis-Chang329](https://github.com/Elvis-Chang329)).

## Configurar Amazon Face Liveness

La app usa el detector oficial de Amplify para transmitir el video a Amazon Rekognition. Para habilitarlo:

1. Crea un **Cognito Identity Pool** en la misma región que Face Liveness (`us-east-1`) y permite identidades no autenticadas.
2. En el rol IAM no autenticado asociado al Identity Pool, permite `rekognition:StartFaceLivenessSession`.
3. Copia el ID del Identity Pool en `faceLiveness.cognitoIdentityPoolId` de `reconocimientoFacial/src/environments/environment.ts` y `environment.prod.ts`.
4. Verifica que el rol de la Lambda tenga los permisos de servidor para crear y consultar sesiones; para registrar/verificar rostros también necesita los permisos de Rekognition correspondientes.

No agregues claves de acceso de AWS a la aplicación. La región configurada en `faceLiveness.region` debe coincidir con la región usada por la Lambda.
En Android, Capacitor solicitará permiso de cámara al abrir el detector; para una app iOS también debe declararse `NSCameraUsageDescription` en `Info.plist`.
