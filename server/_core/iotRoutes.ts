import type { Express } from "express";
import { ENV } from "./env";
import { getCommunityById, updateCommunity, createCriticalNotification } from "../db";
import { broadcastEvent } from "./sse";

export function registerIotRoutes(app: Express) {
  app.post("/api/iot/sensor", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token !== ENV.iotApiToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { communityId, reservoirLevel, temperature, sensorId } = req.body as {
      communityId: unknown;
      reservoirLevel: unknown;
      temperature?: unknown;
      sensorId?: unknown;
    };

    if (typeof communityId !== "number" || typeof reservoirLevel !== "number") {
      res.status(400).json({ error: "communityId (number) and reservoirLevel (number) are required" });
      return;
    }

    const community = getCommunityById(communityId);
    if (!community) {
      res.status(404).json({ error: "Community not found" });
      return;
    }

    const updateData: { reservoirLevel: number; temperature?: number } = { reservoirLevel };
    if (typeof temperature === "number") updateData.temperature = temperature;
    updateCommunity(communityId, updateData);

    if (reservoirLevel < 20) {
      createCriticalNotification({
        communityId,
        type: "low_reservoir",
        message: `Sensor ${sensorId ?? communityId}: nível crítico ${reservoirLevel}% em ${community.name}`,
      });
    }

    broadcastEvent("sensor_update", { communityId, communityName: community.name, reservoirLevel, temperature, sensorId });

    res.json({ success: true, communityId, reservoirLevel });
  });
}
