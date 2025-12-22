import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Lütfen .env dosyası içerisinde mongoDB url adresini tanıtınız"
  );
}

// Daha önce cache'lenmiş bir bağlantı var mı?
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log("Mevcut veri tabanı bağlantısı kullanılıyor");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };

    console.log("Yeni bir veritabanı bağlantısı oluşturuluyor.");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
}

export default connectDB;
