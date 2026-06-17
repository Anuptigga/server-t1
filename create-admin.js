import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not set in .env file');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@rajabhoj.com';
    const adminPassword = 'adminpassword123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️ Admin account already exists:', adminEmail);
      process.exit(0);
    }

    // Since we are creating directly in DB, we need to hash the password or let pre-save hook do it
    // The pre-save hook in User model hashes the password automatically.
    const admin = new User({
      name: 'Super Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      isActive: true,
    });

    await admin.save();
    console.log('🎉 Admin account created successfully!');
    console.log('-----------------------------------');
    console.log('Email:   ', adminEmail);
    console.log('Password:', adminPassword);
    console.log('-----------------------------------');
    console.log('You can now log in at http://localhost:5173/login');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
