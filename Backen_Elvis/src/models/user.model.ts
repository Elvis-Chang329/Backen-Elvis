import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UserAttributes {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    usuario: string;
    contrasena: string;
    edad: number;
    fechaNacimiento: string;
    telefono: string;
    rol: string; // 'censista' o 'administrador'
    foto?: string | null;
    faceId?: string | null;
    s3Key?: string | null;
    estadoBiometria?: string; // 'NO_REGISTRADO', 'REGISTRADO', 'VERIFICADO', 'FALLIDO'
    confidence?: number | null;
    ultimaVerificacion?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<
    UserAttributes,
    'id' | 'rol' | 'foto' | 'faceId' | 's3Key' | 'estadoBiometria' | 'confidence' | 'ultimaVerificacion' | 'createdAt' | 'updatedAt'
> { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    declare id: number;
    declare nombre: string;
    declare apellido: string;
    declare email: string;
    declare usuario: string;
    declare contrasena: string;
    declare edad: number;
    declare fechaNacimiento: string;
    declare telefono: string;
    declare rol: string;
    declare foto?: string | null;
    declare faceId?: string | null;
    declare s3Key?: string | null;
    declare estadoBiometria?: string;
    declare confidence?: number | null;
    declare ultimaVerificacion?: Date | null;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        apellido: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        usuario: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        contrasena: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        edad: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fechaNacimiento: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        telefono: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        rol: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'censista',
            validate: {
                isIn: [['censista', 'administrador']]
            }
        },
        foto: {
            type: DataTypes.TEXT, // Soporta Base64 para la foto de la cámara/galería
            allowNull: true,
        },
        faceId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'face_id', // Nombre de columna en PostgreSQL
        },
        s3Key: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 's3_key', // Nombre de columna en PostgreSQL
        },
        estadoBiometria: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'NO_REGISTRADO',
            field: 'estado_biometria', // Nombre de columna en PostgreSQL: NO_REGISTRADO, REGISTRADO, VERIFICADO, FALLIDO
        },
        confidence: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'confidence', // Similitud / confianza de la última verificación
        },
        ultimaVerificacion: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'ultima_verificacion',
        },
    },
    {
        sequelize,
        tableName: 'usuarios',
        timestamps: true,
    }
);

export default User;
