import * as telemetryService from "../services/telemetryService.js";
import { z } from "zod";

const telemetrySchema = z.record(
  z.string(),
  z.union([z.number(), z.boolean(), z.string().max(255), z.coerce.number()])
);

export async function postTelemetry(req, res) {
  const { token } = req.params;
  const cleanData = telemetrySchema.parse(req.body);

  await telemetryService.processTelemetry(token, cleanData);

  res.status(200).send("OK");
}
