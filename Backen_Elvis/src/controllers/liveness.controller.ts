import { Request, Response } from 'express';
import { Op } from 'sequelize';
import {
    CompareFacesCommand,
    GetFaceLivenessSessionResultsCommand,
} from '@aws-sdk/client-rekognition';
import rekognitionClient from '../config/rekognition';
import User from '../models/user.model';

const MIN_LIVENESS_CONFIDENCE = 90;

const findUserByIdentifier = async (identifier: string) => {
    const id = Number(identifier);
    if (Number.isInteger(id) && id > 0) {
        const user = await User.findByPk(id);
        if (user) return user;
    }

    return User.findOne({
        where: {
            [Op.or]: [
                { usuario: { [Op.iLike]: identifier.trim() } },
                { email: { [Op.iLike]: identifier.trim() } },
            ],
        },
    });
};

export const verificarLivenessContraFotoPerfil = async (req: Request, res: Response) => {
    try {
        const userId = String(req.body.userId || '').trim();
        const sessionId = String(req.body.sessionId || '').trim();

        if (!userId || !sessionId) {
            return res.status(400).json({
                ok: false,
                message: 'Se requieren userId y sessionId.',
                error: 'USER_ID_AND_SESSION_ID_REQUIRED',
            });
        }

        const user = await findUserByIdentifier(userId);
        if (!user) {
            return res.status(404).json({
                ok: false,
                message: `No se encontró el perfil de "${userId}".`,
                error: 'USER_NOT_FOUND',
            });
        }

        const storedPhoto = String(user.foto || '').trim();
        if (!storedPhoto) {
            return res.status(404).json({
                ok: false,
                message: `El perfil de "${user.usuario}" no tiene una foto de referencia guardada.`,
                error: 'NO_REFERENCE_PHOTO',
            });
        }

        const referenceBase64 = storedPhoto.includes(',')
            ? storedPhoto.slice(storedPhoto.indexOf(',') + 1).trim()
            : storedPhoto;
        const referenceBytes = Buffer.from(referenceBase64, 'base64');
        if (referenceBytes.length === 0) {
            return res.status(422).json({
                ok: false,
                message: 'La foto guardada en el perfil no es una imagen Base64 válida.',
                error: 'INVALID_REFERENCE_PHOTO',
            });
        }

        const livenessResult = await rekognitionClient.send(
            new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId })
        );
        const liveBytes = livenessResult.ReferenceImage?.Bytes;
        const livenessConfidence = livenessResult.Confidence;

        if (
            livenessResult.Status !== 'SUCCEEDED' ||
            !liveBytes?.length ||
            livenessConfidence === undefined ||
            livenessConfidence < MIN_LIVENESS_CONFIDENCE
        ) {
            return res.status(422).json({
                ok: false,
                matched: false,
                livenessOk: false,
                livenessConfidence: livenessConfidence ?? null,
                status: livenessResult.Status ?? 'UNKNOWN',
                mensaje: 'La sesión no aprobó Face Liveness, no devolvió una imagen de referencia o su confianza fue menor al 90%.',
            });
        }

        const comparison = await rekognitionClient.send(
            new CompareFacesCommand({
                SourceImage: { Bytes: referenceBytes },
                TargetImage: { Bytes: liveBytes },
                SimilarityThreshold: 80,
            })
        );

        const bestMatch = comparison.FaceMatches
            ?.sort((a, b) => (b.Similarity ?? 0) - (a.Similarity ?? 0))[0];
        const matched = Boolean(bestMatch);
        const similarity = bestMatch?.Similarity;

        return res.json({
            ok: true,
            matched,
            livenessOk: true,
            livenessConfidence,
            similarity,
            status: livenessResult.Status,
            mensaje: matched
                ? `Prueba de vida aprobada e identidad confirmada contra la foto del perfil de "${user.usuario}".`
                : `La prueba de vida fue aprobada, pero el rostro no coincide con la foto del perfil de "${user.usuario}".`,
        });
    } catch (error: any) {
        console.error('Error al verificar liveness contra la foto del perfil:', error);
        return res.status(500).json({
            ok: false,
            message: 'No se pudo verificar la prueba de vida contra la foto del perfil.',
            error: error.message,
        });
    }
};
