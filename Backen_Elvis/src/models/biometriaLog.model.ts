import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

export interface BiometriaLogAttributes {
    id: number;
    userId: number;
    tipoEvento: 'INDEXACION' | 'VERIFICACION' | 'ESTADO_CONSULTADO';
    faceId?: string | null;
    s3Key?: string | null;
    matched?: boolean | null;
    confidence?: number | null;
    estado: string;
    detalle?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BiometriaLogCreationAttributes extends Optional<
    BiometriaLogAttributes,
    'id' | 'faceId' | 's3Key' | 'matched' | 'confidence' | 'detalle' | 'createdAt' | 'updatedAt'
> { }

class BiometriaLog extends Model<BiometriaLogAttributes, BiometriaLogCreationAttributes> implements BiometriaLogAttributes {
    declare id: number;
    declare userId: number;
    declare tipoEvento: 'INDEXACION' | 'VERIFICACION' | 'ESTADO_CONSULTADO';
    declare faceId?: string | null;
    declare s3Key?: string | null;
    declare matched?: boolean | null;
    declare confidence?: number | null;
    declare estado: string;
    declare detalle?: string | null;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

BiometriaLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'usuarios',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        tipoEvento: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'tipo_evento',
        },
        faceId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'face_id',
        },
        s3Key: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 's3_key',
        },
        matched: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'matched',
        },
        confidence: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'confidence',
        },
        estado: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'estado',
        },
        detalle: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'detalle',
        },
    },
    {
        sequelize,
        tableName: 'biometria_logs',
        timestamps: true,
    }
);

// Asociaciones
User.hasMany(BiometriaLog, { foreignKey: 'userId', as: 'biometriaLogs' });
BiometriaLog.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });

export default BiometriaLog;
