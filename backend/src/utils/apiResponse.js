export const sendSuccess = (
  res,
  {
    statusCode = 200,
    message = "Request successful.",
    data = {},
    meta = null,
  } = {},
) => {
  const payload = {
    success: true,
    message,
    ...data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const sendError = (
  res,
  { statusCode = 500, message = "Request failed.", details = null } = {},
) => {
  const payload = {
    success: false,
    message,
  };

  if (details) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};
