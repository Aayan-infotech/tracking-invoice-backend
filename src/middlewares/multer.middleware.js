import multer from "multer";
import { extname } from "path";
import { ApiError } from "../utils/ApiError.js";

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf','.mp4'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/temp');
    },
    filename: (req, file, cb) => {
        const fileExtension = extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
    }
});

const fileFilter = (req, file, cb) => {
    const fileExtension = extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        return cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`,400), false);
    }
};

export const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
});
