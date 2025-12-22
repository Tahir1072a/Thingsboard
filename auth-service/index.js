import "dotenv/config";

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/lib/db.js";
import { globalErrorHandler } from "./src/middleware/errorHandler.js";

import authRoutes from "./src/routes/auth-route.js";

dotenv.config();

connectDB();

const app = express();

// Gelen isteklerin api'ye erişebilmesi cors() politikalarını etkinleştiriyoruz.
app.use(cors());

// Gelen JSON body'lerini req.body parse edebilmek için
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Auth servisi çalışıyor.");
});

app.use("/api/auth", authRoutes);

app.use(globalErrorHandler);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Auth servisi http://localhost:${PORT} adresinde çalışıyor.`);
});
