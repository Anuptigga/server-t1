import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Twilio (optional in dev)
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),

  // Cloudinary (optional in dev)
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  // Razorpay (optional in dev)
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  // Google Maps (optional in dev)
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export default env;
