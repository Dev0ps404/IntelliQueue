import AppError from "../utils/appError.js";

export const validateRequest = (schema = {}) => {
  return (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      next();
    } catch (error) {
      next(
        new AppError("Request validation failed.", 400, error.issues ?? null),
      );
    }
  };
};
