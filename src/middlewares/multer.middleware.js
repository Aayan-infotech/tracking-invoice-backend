import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { extname } from 'path';
import { loadConfig } from '../config/loadConfig.js';

const config = await loadConfig();

const s3 = new S3Client({
    region: config.AWS_REGION,
});

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.mp4'];

const storage = multerS3({
    s3,
    bucket: config.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
        const fileExtension = extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const uniqueName = `${file.fieldname}-${uniqueSuffix}${fileExtension}`;
        cb(null, `uploads/${uniqueName}`);
    },
});


const fileFilter = (req, file, cb) => {
    const fileExtension = extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        return cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`, 400), false);
    }
};


export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
});
