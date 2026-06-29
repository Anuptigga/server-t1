import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      default: 'razorpay',
    },
    eventId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

webhookEventSchema.index(
  { provider: 1, eventId: 1 },
  { unique: true }
);

export default mongoose.model('WebhookEvent', webhookEventSchema);
