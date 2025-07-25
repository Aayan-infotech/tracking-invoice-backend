class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went Wrong",
        error = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode,
        this.data = null,
        this.message = message,
        this.success = false,
        this.errors = error
        console.error("Error: ", message)

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
export {ApiError}