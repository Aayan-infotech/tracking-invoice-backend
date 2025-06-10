const validateSchema = async (schema, data) => {
    try {
      await schema.validateAsync(data, { abortEarly: true }); 
      return null;
    } catch (error) {
      // console.log(error);
      if (error.isJoi) {
        return error.details[0].message; 
      }
      throw error;
    }
  };
  
  export { validateSchema };
  