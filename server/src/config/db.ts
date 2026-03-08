import mongoose from 'mongoose';

const getMongoUri = (): string => {
  const env = (process.env.MONGODB_ENV || 'dev').toUpperCase();
  const uri = process.env[`MONGODB_URI_${env}`];
  if (!uri) {
    throw new Error(
      `MONGODB_URI_${env} is not defined. Set MONGODB_ENV and the corresponding MONGODB_URI_${env} in your .env file.`
    );
  }
  return uri;
};

export const connectDB = async (): Promise<void> => {
  const uri = getMongoUri();
  try {
    await mongoose.connect(uri);
    const dbName = mongoose.connection.name;
    console.log(`[MongoDB] Connected | db: ${dbName} | env: ${process.env.MONGODB_ENV}`);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Error:', err);
});
