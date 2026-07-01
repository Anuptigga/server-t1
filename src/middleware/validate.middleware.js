const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return res.status(400).json({
      status: 'fail',
      message: 'Validation error',
      errors,
    });
  }

  // Replace req.body with parsed & sanitized data
  req.body = result.data;
  next();
};

export default validate;
