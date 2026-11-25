import dotenv from 'dotenv';
import { RekognitionClient } from '@aws-sdk/client-rekognition';

dotenv.config();

const rekognitionClient = new RekognitionClient({
    region: (process.env.AWS_REGION || 'us-east-1').trim(),
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
        }
    } : {})
});

export default rekognitionClient;
