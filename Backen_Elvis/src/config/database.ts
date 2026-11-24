import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const isSsl = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

/**
 * Instancia de Sequelize configurada para PostgreSQL.
 * Soporta conexión por URI completa (DATABASE_URL) o por variables individuales (DB_HOST, DB_USER, etc.),
 * además de SSL opcional para conexiones remotas a AWS RDS / Supabase / Neon / Render.
 */
const sequelize = dbUrl
    ? new Sequelize(dbUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: isSsl
            ? {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            }
            : {},
    })
    : new Sequelize(
        process.env.DB_NAME || 'app_db',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'postgres',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'postgres',
            port: Number(process.env.DB_PORT) || 5432,
            logging: false,
            dialectOptions: isSsl
                ? {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false,
                    },
                }
                : {},
        }
    );

export default sequelize;
