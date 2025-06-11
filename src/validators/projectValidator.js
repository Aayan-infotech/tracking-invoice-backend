import joi from 'joi';

const projectSchema = joi.object({
    projectName: joi.string().min(3).max(50).required().messages({
        'string.base': 'Project name must be a string',
        'string.empty': 'Project name cannot be empty',
        'string.min': 'Project name must be at least 3 characters long',
        'string.max': 'Project name must not exceed 50 characters',
        'any.required': 'Project name is required',
    }),
    description: joi.string().min(10).max(500).required().messages({
        'string.base': 'Description must be a string',
        'string.empty': 'Description cannot be empty',
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description must not exceed 500 characters',
        'any.required': 'Description is required',
    }),
    startDate: joi.date().required().messages({
        'date.base': 'Start date must be a valid date',
        'any.required': 'Start date is required',
    }),
    endDate: joi.date().greater(joi.ref('startDate')).optional().messages({
        'date.base': 'End date must be a valid date',
        'date.greater': 'End date must be greater than start date',
    }),
    status: joi.string().valid('active', 'completed', 'on hold', 'cancelled').default('active').messages({
        'string.base': 'Status must be a string',
        'any.only': 'Status must be one of the following: active, completed, on hold, cancelled',
    }),
});


const taskSchema = joi.object({
    taskName: joi.string().min(3).max(100).required().messages({
        'string.base': 'Task name must be a string',
        'string.empty': 'Task name cannot be empty',
        'string.min': 'Task name must be at least 3 characters long',
        'string.max': 'Task name must not exceed 100 characters',
        'any.required': 'Task name is required',
    }),
    description: joi.string().min(10).max(500).required().messages({
        'string.base': 'Description must be a string',
        'string.empty': 'Description cannot be empty',
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description must not exceed 500 characters',
        'any.required': 'Description is required',
    }),
    status: joi.string().valid('pending', 'in progress', 'completed').default('pending').messages({
        'string.base': 'Status must be a string',
        'any.only': 'Status must be one of the following: pending, in progress, completed',
    }),
    amount: joi.number().min(0).required().messages({
        'number.base': 'Amount must be a number',
        'number.min': 'Amount must be at least 0',
        'any.required': 'Amount is required',
    }),
    projectId: joi.string().required().messages({
        'string.base': 'Project ID must be a string',
        'string.empty': 'Project ID cannot be empty',
        'any.required': 'Project ID is required',
    }),
    taskUpdateDescription: joi.string().max(1000).optional().messages({
        'string.base': 'Task update description must be a string',
        'string.max': 'Task update description must not exceed 1000 characters',
    }),
});

const assignTaskSchema = joi.object({
    taskId: joi.string().required().messages({
        'string.base': 'Task ID must be a string',
        'string.empty': 'Task ID cannot be empty',
        'any.required': 'Task ID is required',
    }),
    projectId: joi.string().required().messages({
        'string.base': 'Project ID must be a string',
        'string.empty': 'Project ID cannot be empty',
        'any.required': 'Project ID is required',
    }),
    userId: joi.string().required().messages({
        'string.base': 'User ID must be a string',
        'string.empty': 'User ID cannot be empty',
        'any.required': 'User ID is required',
    }),
});

const qualityAssuranceSchema = joi.object({
    projectId: joi.string().required().messages({
        'string.base': 'Project ID must be a string',
        'string.empty': 'Project ID cannot be empty',
        'any.required': 'Project ID is required',
    }),
    documentName: joi.string().min(3).max(100).required().messages({
        'string.base': 'Document name must be a string',
        'string.empty': 'Document name cannot be empty',
        'string.min': 'Document name must be at least 3 characters long',
        'string.max': 'Document name must not exceed 100 characters',
        'any.required': 'Document name is required',
    }),
    documentDescription: joi.string().optional().messages({
        'string.base': 'Document description must be a string',
    }),
});

const clockInSchema = joi.object({
    latitude: joi.number().required().messages({
        'number.base': 'Latitude must be a number',
        'any.required': 'Latitude is required',
    }),
    longitude: joi.number().required().messages({
        'number.base': 'Longitude must be a number',
        'any.required': 'Longitude is required',
    }),
});

const taskUpdateSchema = joi.object({
    taskId: joi.string().required().messages({
        'string.base': 'Task ID must be a string',
        'string.empty': 'Task ID cannot be empty',
        'any.required': 'Task ID is required',
    }),
    status: joi.string().valid('pending', 'in progress', 'completed').required().messages({
        'string.base': 'Status must be a string',
        'any.only': 'Status must be one of the following: pending, in progress, completed',
        'any.required': 'Status is required',
    }),
    taskUpdateDescription: joi.string().max(1000).optional().messages({
        'string.base': 'Task update description must be a string',
        'string.max': 'Task update description must not exceed 1000 characters',
    }),
});
export { projectSchema, taskSchema, assignTaskSchema, qualityAssuranceSchema, clockInSchema, taskUpdateSchema };