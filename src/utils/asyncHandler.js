// Desc: Async Handler for handling async functions
function asyncHandler(fn) {
    return async (req, res, next) => {
        try {
            await fn(req, res, next)
        } catch (error) {
            res.status(error.statusCode || 500).json({
                statusCode: error.statusCode || 500,
                data : null,
                message: error.message || 'Internal Server Error',
                success: false,
            });
        }
    }
}
export {asyncHandler}