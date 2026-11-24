-- ==============================================================================
-- ESQUEMA Y CONSULTAS SQL DE BIOMETRÍA PARA POSTGRESQL Y AWS LAMBDAS
-- Proyecto: Backen_Elvis
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ALTER TABLE EN CASO DE TABLA EXISTENTE:
-- (Sequelize ejecuta `sequelize.sync({ alter: true })` automáticamente, pero 
-- puedes ejecutar esto manualmente en PostgreSQL si lo necesitas).
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS usuarios 
  ADD COLUMN IF NOT EXISTS face_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
  ADD COLUMN IF NOT EXISTS estado_biometria VARCHAR(50) DEFAULT 'NO_REGISTRADO',
  ADD COLUMN IF NOT EXISTS confidence REAL,
  ADD COLUMN IF NOT EXISTS ultima_verificacion TIMESTAMP WITH TIME ZONE;

-- Tabla de historial y auditoría de eventos biométricos:
CREATE TABLE IF NOT EXISTS biometria_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL, -- 'INDEXACION', 'VERIFICACION', 'ESTADO_CONSULTADO'
    face_id VARCHAR(255),
    s3_key VARCHAR(500),
    matched BOOLEAN,
    confidence REAL,
    estado VARCHAR(50) NOT NULL,
    detalle TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. CONSULTAS DIRECTAS PARA TUS AWS LAMBDAS (Si se conectan directo a PostgreSQL)
-- ------------------------------------------------------------------------------

-- [LAMBDA 1]: Registrar que el userId ya tiene su rostro indexado en Rekognition
-- Parámetros: $1 = faceId, $2 = s3Key, $3 = userId
UPDATE usuarios 
SET 
    face_id = $1,
    s3_key = $2,
    estado_biometria = 'REGISTRADO',
    updated_at = NOW()
WHERE id = $3
RETURNING id, nombre, usuario, face_id, s3_key, estado_biometria, updated_at;

-- Insertar auditoría de indexación:
INSERT INTO biometria_logs (user_id, tipo_evento, face_id, s3_key, matched, estado, detalle, created_at, updated_at)
VALUES ($3, 'INDEXACION', $1, $2, TRUE, 'REGISTRADO', 'Indexado desde Lambda 1', NOW(), NOW());


-- [LAMBDA 2]: Registrar resultado de verificación (coincidencia y porcentaje)
-- Parámetros: $1 = confidence (porcentaje), $2 = estado ('VERIFICADO' o 'NO_COINCIDE'), $3 = userId
UPDATE usuarios 
SET 
    confidence = $1,
    estado_biometria = $2,
    ultima_verificacion = NOW(),
    updated_at = NOW()
WHERE id = $3
RETURNING id, nombre, usuario, face_id, estado_biometria, confidence, ultima_verificacion, updated_at;

-- Insertar auditoría de verificación:
INSERT INTO biometria_logs (user_id, tipo_evento, matched, confidence, estado, detalle, created_at, updated_at)
VALUES ($3, 'VERIFICACION', ($2 = 'VERIFICADO'), $1, $2, 'Verificado desde Lambda 2', NOW(), NOW());


-- [LAMBDA 3]: Consultar estado del userId
-- Parámetros: $1 = userId
SELECT 
    id AS user_id,
    nombre,
    apellido,
    usuario,
    email,
    face_id,
    s3_key,
    estado_biometria AS estado,
    confidence,
    ultima_verificacion,
    created_at,
    updated_at,
    CASE 
        WHEN face_id IS NOT NULL AND TRIM(face_id) <> '' THEN TRUE 
        ELSE FALSE 
    END AS is_registered,
    CASE 
        WHEN estado_biometria = 'VERIFICADO' THEN TRUE 
        ELSE FALSE 
    END AS is_verified
FROM usuarios
WHERE id = $1;
