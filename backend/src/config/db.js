const mongoose = require('mongoose');

const connectDB = async () => {
  // Prevent multiple connections in serverless environments (like Vercel)
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
