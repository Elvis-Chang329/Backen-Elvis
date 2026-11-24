import { Router } from 'express';
import {
    registrarRostroIndexado,
    registrarResultadoVerificacion,
    consultarEstadoBiometria,
    obtenerHistorialBiometria,
} from '../controllers/biometria.controller';

const router = Router();

/**
 * 1. Endpoint para registrar que el userId ya tiene su rostro indexado en Rekognition (Lambda 1)
 * POST /api/biometria/index
 * Body: { userId: 1, faceId: "abc-123", s3Key: "faces/1.jpg", estado: "REGISTRADO" }
 */
router.post('/index', registrarRostroIndexado);
router.post('/indexar', registrarRostroIndexado);

/**
 * 2. Endpoint para registrar el resultado de verificación (Lambda 2)
 * POST /api/biometria/verify-result o POST /api/biometria/verify
 * Body: { userId: 1, matched: true, confidence: 98.4, estado: "VERIFICADO" }
 */
router.post('/verify-result', registrarResultadoVerificacion);
router.post('/verify', registrarResultadoVerificacion);
router.post('/verificacion', registrarResultadoVerificacion);

/**
 * 3. Endpoint para consultar el estado del userId (Lambda 3 / App móvil)
 * GET /api/biometria/status/:id (o ?userId=1)
 */
router.get('/status', consultarEstadoBiometria);
router.get('/status/:id', consultarEstadoBiometria);
router.get('/:id/status', consultarEstadoBiometria);

/**
 * Endpoint de historial y auditoría de eventos biométricos
 * GET /api/biometria/history/:id
 */
router.get('/history/:id', obtenerHistorialBiometria);

export default router;
