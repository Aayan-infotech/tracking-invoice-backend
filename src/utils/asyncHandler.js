// Desc: Async Handler for handling async functions
import fs from 'fs';
import logger from './logger.js';

function asyncHandler(fn) {
    return async (req, res, next) => {
        try {
            await fn(req, res, next)
        } catch (error) {
            // Log the error
            logger.error({
                message: error.message,
            });

            if (req.files) {
                const keyNames = Object.keys(req.files)[0];
                if (keyNames) {
                    req.files[keyNames].forEach(file => {
                        if (file.path) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
            }
            res.status(error.statusCode || 500).json({
                statusCode: error.statusCode || 500,
                data: null,
                message: error.message || 'Internal Server Error',
                success: false,
            });
        }
    }
}
export { asyncHandler }