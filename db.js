import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI || "mongodb://admin:123456@localhost:27017/greenparty?authSource=admin";

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose;
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
  return mongoose;
}

export default mongoose;
