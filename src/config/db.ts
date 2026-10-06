import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Add the MongoDB Atlas connection string to the environment variables."
    );
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error(
      "MONGODB_URI must start with mongodb:// or mongodb+srv://."
    );
  }

  return uri;
}

export async function connectDatabase(): Promise<void> {
  const uri = getMongoUri();

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2 && connectionPromise) {
    await connectionPromise;
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 0,
        bufferCommands: false,
        retryReads: true,
        retryWrites: true
      })
      .then(() => mongoose)
      .catch((error) => {
        connectionPromise = null;
        if (mongoose.connection.readyState !== 0) {
          void mongoose.disconnect().catch(() => undefined);
        }
        throw error;
      });
  }

  await connectionPromise;

  console.log(
    `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`
  );
}
