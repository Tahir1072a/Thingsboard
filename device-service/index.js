import "dotenv/config";

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/lib/db.js";

import deviceRouter from "./src/routes/device.router.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors());
// Json verilerini req.body içerisine parse et.
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Device Servisi Çalışıyor.");
});

app.use("/api/device", deviceRouter);
// app.use()

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`DEvice servisi http://localhost:${PORT} adresinde çalışıyor.`);
});
