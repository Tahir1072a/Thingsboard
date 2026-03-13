import { getDeviceByToken } from "../../device-management/services/device.service.js";
import Telemetry from "../models/Telemetry.js";

export function checkAlarms(device, data) {
  // Cihaz profilinden gelen kuralları burada işleyeceğiz
  // Şimdilik boş bırakıyorum, bir sonraki adımda dolduracağız.
  console.log(`Alarm kontrolü yapılıyor: ${device.name}`);
}

export async function processTelemetry(token, rawData) {
  const device = await getDeviceByToken(token);
  if (!device) {
    throw new AppError("Bu tokena ait cihaz bulunamadı", 404);
  }

  // 2. Gelen veri Tekil mi Çoğul mu? (Normalize Etme)
  // { temp: 20 }  --> [{ temp: 20 }]
  // [{ temp: 20 }] --> [{ temp: 20 }]
  const dataArray = Array.isArray(rawData) ? rawData : [rawData];

  const recordsToInsert = [];

  for (const item of dataArray) {
    const { ts: incomingTs, ...telemetryValues } = item;

    const finalTs = incomingTs ? new Date(incomingTs) : new Date();

    // Key-Value çiftlerini oluştur
    Object.entries(telemetryValues).forEach(([key, value]) => {
      recordsToInsert.push({
        deviceId: device._id,
        tenantId: device.tenantId,
        ts: finalTs,
        key: key,
        value: value,
      });
    });

    checkAlarms(device, telemetryValues);
  }

  // 4. Veritabanına Toplu Yaz
  if (recordsToInsert.length > 0) {
    await Telemetry.insertMany(recordsToInsert);
  }

  return true;
}
