const mongoose = require("mongoose");

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`Local MongoDB connection failed (${err.message}).`);
    console.log("⚡ Starting in-memory MongoDB database so the application can run immediately...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ In-memory MongoDB connected successfully at ${conn.connection.host}`);
    } catch (memErr) {
      console.error(`In-memory MongoDB failed to start: ${memErr.message}`);
      process.exit(1);
    }
  }
}

module.exports = connectDB;
