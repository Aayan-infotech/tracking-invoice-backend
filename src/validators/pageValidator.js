import joi from 'joi';

const PageSchema = joi.object({
    pageName: joi.string().min(3).max(100).required().messages({
        'string.base': 'Page name must be a string',
        'string.empty': 'Page name cannot be empty',
        'string.min': 'Page name must be at least 3 characters long',
        'string.max': 'Page name must not exceed 100 characters',
        'any.required': 'Page name is required',
    }),
    // pageURL: joi.string().uri().required().messages({
    //     'string.base': 'Page URL must be a string',
    //     'string.empty': 'Page URL cannot be empty',
    //     'string.uri': 'Page URL must be a valid URI',
    //     'any.required': 'Page URL is required',
    // }),
    pageDescription: joi.string().min(10).max(50000).required().messages({
        'string.base': 'Description must be a string',
        'string.empty': 'Description cannot be empty',
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description must not exceed 50000 characters',
        'any.required': 'Description is required',
    }),
});

export { PageSchema };