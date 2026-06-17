/**
 * Set JWT token as HTTP-only cookie on the response.
 */
export const setTokenCookie = (res, token, maxAgeDays = 7) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
  });
};

/**
 * Clear the JWT cookie.
 */
export const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
  });
};

/**
 * Generate a random numeric OTP of given length.
 */
export const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

/**
 * Strip sensitive fields from a user document before sending to client.
 */
export const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.otp;
  delete obj.__v;
  return obj;
};
