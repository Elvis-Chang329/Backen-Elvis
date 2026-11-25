import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CreateFaceLivenessSessionCommand, GetFaceLivenessSessionResultsCommand } from '@aws-sdk/client-rekognition';
import sequelize from './config/database';
import rekognitionClient from './config/rekognition';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import censoRoutes from './routes/censo.routes';
import biometriaRoutes from './routes/biometria.routes';
import { verificarLivenessContraFotoPerfil } from './controllers/liveness.controller';
import './models/biometriaLog.model'; // Asegura registro del modelo para sync de Sequelize
import { seedAdminUser } from './utils/seedAdmin';

dotenv.config();

const app = express();

// Configuración de CORS para navegadores, Android y Lambdas
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : '*';

app.use(cors({
    origin: corsOrigins === '*' ? '*' : corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-api-key'],
    credentials: true,
}));

// Parseo de bodies con soporte de hasta 50MB para fotos de alta resolución en Base64, byteArray o binario
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: ['image/*', 'application/octet-stream'], limit: '50mb' }));

// Ruta raíz de prueba y healthcheck
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor Backend activo y funcionando',
        service: 'Backen_Elvis',
        publicUrl: process.env.BACKEND_PUBLIC_URL || null,
        data: null,
        error: null,
    });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/censos', censoRoutes);
app.use('/api/biometria', biometriaRoutes);

// Endpoint que llamará tu app de Android (soporta POST y GET)
const handleCreateLivenessSession = async (req: express.Request, res: express.Response) => {
    try {
        console.log(`[Liveness] Creando nueva sesión (${req.method} ${req.originalUrl})...`);
        // Comando para crear la sesión de Liveness en AWS
        const command = new CreateFaceLivenessSessionCommand({});
        const response = await rekognitionClient.send(command);
        console.log(`[Liveness] Sesión creada con éxito: ${response.SessionId}`);
        
        // Devolvemos el SessionId en formato JSON hacia tu app Android
        res.json({
            sessionId: response.SessionId,
            SessionId: response.SessionId
        });
    } catch (error: any) {
        console.error("Error al crear la sesión de liveness:", error);
        res.status(500).json({ error: error.message });
    }
};

app.post("/api/liveness/create-session", handleCreateLivenessSession);
app.get("/api/liveness/create-session", handleCreateLivenessSession);

// Endpoint para verificar los resultados finales de la sesión de Liveness
app.get("/api/liveness/session-results/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        console.log(`[Liveness] Consultando resultados para sessionId: ${sessionId}`);

        const command = new GetFaceLivenessSessionResultsCommand({
            SessionId: sessionId,
        });

        const response = await rekognitionClient.send(command);
        console.log(`[Liveness] Resultado sessionId ${sessionId}: status=${response.Status}, confidence=${response.Confidence}`);

        const referenceImageBase64 = response.ReferenceImage?.Bytes
            ? Buffer.from(response.ReferenceImage.Bytes).toString('base64')
            : null;

        // Devolvemos el estado de la verificación a tu app Android en formato JSON puro
        res.json({
            status: response.Status, // Ej: SUCCEEDED, FAILED, CREATED, IN_PROGRESS
            confidence: response.Confidence, // Nivel de confianza
            referenceImage: response.ReferenceImage, // Imagen de referencia capturada
            referenceImageBase64
        });
    } catch (error: any) {
        console.error("Error al obtener los resultados de liveness:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/liveness/verify', verificarLivenessContraFotoPerfil);

const PORT = process.env.PORT || 3000;

const startServer = async (retries = 5, delayMs = 3000) => {
    while (retries > 0) {
        try {
            await sequelize.sync({ alter: true });
            console.log('Base de datos sincronizada correctamente');
            
            // Garantizar la existencia del usuario administrador en la base de datos
            await seedAdminUser();

            app.listen(PORT, () => {
                console.log(`Servidor TypeScript corriendo en el puerto ${PORT}`);
            });
            return;
        } catch (err) {
            retries -= 1;
            console.error(`Error al conectar con la base de datos. Reintentos restantes: ${retries}`);
            if (retries === 0) {
                console.error('No se pudo conectar a la base de datos tras múltiples intentos.');
                process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
};

startServer();
