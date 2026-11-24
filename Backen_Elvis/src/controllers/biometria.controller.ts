import { Request, Response } from 'express';
import { Op } from 'sequelize';
import User from '../models/user.model';
import BiometriaLog from '../models/biometriaLog.model';

const sendResponse = (
    res: Response,
    statusCode: number,
    success: boolean,
    message: string,
    data: any = null,
    error: any = null
) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        error,
    });
};

/**
 * Helper para buscar un usuario por ID numérico o nombre de usuario/email
 */
const findUserByIdOrIdentifier = async (identifier: string | number) => {
    const idNum = Number(identifier);
    if (!isNaN(idNum) && idNum > 0) {
        const user = await User.findByPk(idNum);
        if (user) return user;
    }

    return await User.findOne({
        where: {
            [Op.or]: [
                { usuario: { [Op.iLike]: String(identifier).trim() } },
                { email: { [Op.iLike]: String(identifier).trim() } },
            ]
        }
    });
};

/**
 * 1. Endpoint / Consulta para registrar que el userId ya tiene su rostro indexado en Rekognition (Lambda 1 o Indexer)
 * Acepta: userId / user_id, faceId / face_id / rekognition_face_id, s3Key / s3_key, estado (opcional)
 */
export const registrarRostroIndexado = async (req: Request, res: Response) => {
    try {
        const userIdRaw = req.params.id || req.body.userId || req.body.user_id || req.body.id;
        const faceId = req.body.faceId || req.body.face_id || req.body.rekognition_face_id || req.body.rekognitionFaceId;
        const s3Key = req.body.s3Key || req.body.s3_key || req.body.s3_uri;
        const estado = req.body.estado || req.body.status || 'REGISTRADO';

        if (!userIdRaw) {
            return sendResponse(res, 400, false, 'El campo userId (o user_id) es obligatorio.', null, 'USER_ID_REQUIRED');
        }

        if (!faceId) {
            return sendResponse(res, 400, false, 'El campo faceId (o face_id / rekognition_face_id) es obligatorio.', null, 'FACE_ID_REQUIRED');
        }

        const user = await findUserByIdOrIdentifier(userIdRaw);
        if (!user) {
            return sendResponse(res, 404, false, `Usuario '${userIdRaw}' no encontrado en PostgreSQL.`, null, 'USER_NOT_FOUND');
        }

        // Actualizar datos biométricos del usuario en la tabla usuarios
        await user.update({
            faceId: String(faceId).trim(),
            ...(s3Key ? { s3Key: String(s3Key).trim() } : {}),
            estadoBiometria: String(estado).trim().toUpperCase(),
        });

        // Registrar auditoría en biometria_logs
        await BiometriaLog.create({
            userId: user.id,
            tipoEvento: 'INDEXACION',
            faceId: String(faceId).trim(),
            s3Key: s3Key ? String(s3Key).trim() : null,
            matched: true,
            estado: user.estadoBiometria || 'REGISTRADO',
            detalle: JSON.stringify(req.body),
        });

        return sendResponse(res, 200, true, 'Rostro indexado en Rekognition registrado exitosamente en la base de datos.', {
            userId: user.id,
            user_id: user.id,
            nombre: `${user.nombre} ${user.apellido}`,
            faceId: user.faceId,
            face_id: user.faceId,
            rekognition_face_id: user.faceId,
            s3Key: user.s3Key,
            s3_key: user.s3Key,
            estado: user.estadoBiometria,
            estado_biometria: user.estadoBiometria,
            updatedAt: user.updatedAt,
            updated_at: user.updatedAt,
        });
    } catch (error: any) {
        console.error('Error al registrar rostro indexado:', error);
        return sendResponse(res, 500, false, 'Error al registrar indexación de rostro', null, error.message);
    }
};

/**
 * 2. Endpoint / Consulta para registrar el resultado de verificación (Lambda 2)
 * Acepta: userId / user_id, matched / coincidencia, confidence / similitud, faceId (opcional), estado (opcional)
 */
export const registrarResultadoVerificacion = async (req: Request, res: Response) => {
    try {
        const userIdRaw = req.params.id || req.body.userId || req.body.user_id || req.body.id;
        const matched = req.body.matched !== undefined
            ? Boolean(req.body.matched)
            : req.body.coincidencia !== undefined
                ? Boolean(req.body.coincidencia)
                : req.body.isMatch !== undefined
                    ? Boolean(req.body.isMatch)
                    : null;

        const confidenceRaw = req.body.confidence !== undefined
            ? req.body.confidence
            : req.body.similitud !== undefined
                ? req.body.similitud
                : req.body.similarity;

        const confidence = confidenceRaw !== undefined && confidenceRaw !== null ? Number(confidenceRaw) : null;
        const faceId = req.body.faceId || req.body.face_id || null;
        const s3Key = req.body.s3Key || req.body.s3_key || null;

        if (!userIdRaw) {
            return sendResponse(res, 400, false, 'El campo userId (o user_id) es obligatorio.', null, 'USER_ID_REQUIRED');
        }

        const user = await findUserByIdOrIdentifier(userIdRaw);
        if (!user) {
            return sendResponse(res, 404, false, `Usuario '${userIdRaw}' no encontrado en PostgreSQL.`, null, 'USER_NOT_FOUND');
        }

        // Determinar el nuevo estado biométrico
        let estadoCalculado = req.body.estado || req.body.status;
        if (!estadoCalculado) {
            if (matched === true) {
                estadoCalculado = 'VERIFICADO';
            } else if (matched === false) {
                estadoCalculado = 'NO_COINCIDE';
            } else {
                estadoCalculado = user.estadoBiometria || 'PENDIENTE';
            }
        }

        const now = new Date();

        // Actualizar usuario
        await user.update({
            ...(faceId ? { faceId: String(faceId).trim() } : {}),
            ...(s3Key ? { s3Key: String(s3Key).trim() } : {}),
            estadoBiometria: String(estadoCalculado).trim().toUpperCase(),
            confidence: confidence !== null && !isNaN(confidence) ? confidence : user.confidence,
            ultimaVerificacion: now,
        });

        // Registrar auditoría en biometria_logs
        await BiometriaLog.create({
            userId: user.id,
            tipoEvento: 'VERIFICACION',
            faceId: faceId ? String(faceId).trim() : user.faceId,
            s3Key: s3Key ? String(s3Key).trim() : user.s3Key,
            matched,
            confidence: confidence !== null && !isNaN(confidence) ? confidence : undefined,
            estado: user.estadoBiometria || 'VERIFICADO',
            detalle: JSON.stringify(req.body),
        });

        return sendResponse(res, 200, true, 'Resultado de verificación biométrica registrado exitosamente.', {
            userId: user.id,
            user_id: user.id,
            nombre: `${user.nombre} ${user.apellido}`,
            matched,
            confidence: user.confidence,
            similitud: user.confidence,
            estado: user.estadoBiometria,
            estado_biometria: user.estadoBiometria,
            ultimaVerificacion: user.ultimaVerificacion,
            ultima_verificacion: user.ultimaVerificacion,
            updatedAt: user.updatedAt,
            updated_at: user.updatedAt,
        });
    } catch (error: any) {
        console.error('Error al registrar resultado de verificación:', error);
        return sendResponse(res, 500, false, 'Error al registrar resultado de verificación', null, error.message);
    }
};

/**
 * 3. Endpoint / Consulta para consultar el estado del userId (Lambda 3 o Aplicación Móvil)
 * Acepta: :id o query ?userId=...
 */
export const consultarEstadoBiometria = async (req: Request, res: Response) => {
    try {
        const identifier = req.params.id || req.params.userId || req.query.userId || req.query.id;

        if (!identifier) {
            return sendResponse(res, 400, false, 'Debe especificar el userId o identificador.', null, 'USER_ID_REQUIRED');
        }

        const user = await findUserByIdOrIdentifier(String(identifier));
        if (!user) {
            return sendResponse(res, 404, false, `Usuario '${identifier}' no encontrado en PostgreSQL.`, null, 'USER_NOT_FOUND');
        }

        const isRegistered = Boolean(user.faceId && user.faceId.trim().length > 0);
        const isVerified = user.estadoBiometria === 'VERIFICADO';

        return sendResponse(res, 200, true, 'Estado biométrico obtenido exitosamente.', {
            userId: user.id,
            user_id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            nombreCompleto: `${user.nombre} ${user.apellido}`,
            usuario: user.usuario,
            email: user.email,
            faceId: user.faceId,
            face_id: user.faceId,
            rekognition_face_id: user.faceId,
            s3Key: user.s3Key,
            s3_key: user.s3Key,
            estado: user.estadoBiometria || 'NO_REGISTRADO',
            estado_biometria: user.estadoBiometria || 'NO_REGISTRADO',
            confidence: user.confidence,
            similitud: user.confidence,
            ultimaVerificacion: user.ultimaVerificacion,
            ultima_verificacion: user.ultimaVerificacion,
            isRegistered,
            isVerified,
            hasFoto: Boolean(user.foto && user.foto.trim().length > 0),
            updatedAt: user.updatedAt,
            updated_at: user.updatedAt,
        });
    } catch (error: any) {
        console.error('Error al consultar estado biométrico:', error);
        return sendResponse(res, 500, false, 'Error al consultar estado biométrico', null, error.message);
    }
};

/**
 * Obtener historial de logs biométricos de un usuario
 */
export const obtenerHistorialBiometria = async (req: Request, res: Response) => {
    try {
        const identifier = req.params.id || req.params.userId || req.query.userId;
        if (!identifier) {
            return sendResponse(res, 400, false, 'Debe especificar el userId.', null, 'USER_ID_REQUIRED');
        }

        const user = await findUserByIdOrIdentifier(String(identifier));
        if (!user) {
            return sendResponse(res, 404, false, `Usuario '${identifier}' no encontrado.`, null, 'USER_NOT_FOUND');
        }

        const logs = await BiometriaLog.findAll({
            where: { userId: user.id },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });

        return sendResponse(res, 200, true, 'Historial de registros biométricos obtenido con éxito.', {
            userId: user.id,
            usuario: user.usuario,
            estadoActual: user.estadoBiometria,
            totalLogs: logs.length,
            logs,
        });
    } catch (error: any) {
        console.error('Error al obtener historial biométrico:', error);
        return sendResponse(res, 500, false, 'Error al obtener historial', null, error.message);
    }
};
