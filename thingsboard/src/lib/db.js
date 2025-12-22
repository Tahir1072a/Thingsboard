import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Lütfen .env dosyası içerisinde mongoDB url adresini tanıtınız"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log("Mevcut veritabanı bağlantısı kullanılıyor.");
    return cached.conn;
  }

  if (!cached.promise) {
    // bufferCommands'ın false olması, veritabanı bağlantısı kapalı iken yeni komutların buffer toplanıp beklemesini engeller.
    // eğer false işe alınan komut, listeye alınıp bağlantı açılmasını beklemez!
    const opts = {
      bufferCommands: false,
    };

    console.log("Yeni bir veritabanı bağlantısı oluşturuluyor.");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
  }

  return cached.conn;
}

export default connectDB;
