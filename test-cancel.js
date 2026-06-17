import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/Order.js';
import User from './src/models/User.js';
import Kitchen from './src/models/Kitchen.js';
import { cancelOrder } from './src/services/order.service.js';

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // get any kitchen user
  const kitchenUser = await User.findOne({ role: 'kitchen' });
  const kitchen = await Kitchen.findOne({ owner: kitchenUser._id });
  
  // get an order for this kitchen that is pending or accepted
  const order = await Order.findOne({ kitchen: kitchen._id, status: { $in: ['pending', 'accepted'] } });
  
  if (!order) {
    console.log("No order to cancel");
    process.exit(0);
  }

  try {
    console.log(`Canceling order ${order._id} as kitchen ${kitchenUser._id}`);
    const res = await cancelOrder(order._id, kitchenUser._id, 'kitchen', 'No stock');
    console.log('Success:', res.status);
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  process.exit(0);
}

test();
