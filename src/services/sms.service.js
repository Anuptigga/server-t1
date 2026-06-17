import env from '../config/env.js';
import logger from '../utils/logger.js';
import twilio from 'twilio';

/**
 * SMS Service
 * Uses Twilio to send OTPs
 */

/**
 * Send an OTP to the given phone number.
 * @param {string} phone - Phone number with country code
 * @param {string} otp - The OTP code
 * @returns {Promise<{ success: boolean, mock: boolean }>}
 */
export const sendOTP = async (phone, otp) => {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    logger.error('Twilio credentials are missing!');
    throw new Error('SMS service is currently unavailable.');
  }

  try {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Your Rajabhoj verification code is: ${otp}. Valid for 5 minutes.`,
      from: env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    logger.info(`SMS sent to ${phone}`);
    return { success: true, mock: false };
  } catch (error) {
    logger.error(`SMS send failed: ${error.message}`);
    throw error;
  }
};
