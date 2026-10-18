import { useEffect } from "react";
import { toast } from "sonner";

export function useServerEvents() {
  useEffect(() => {
    const es = new EventSource("/api/events");

    es.addEventListener("geofence", (e) => {
      const data = JSON.parse(e.data) as {
        driverName: string;
        communityName: string;
        distanceKm: number;
      };
      toast.warning(`Motorista próximo à comunidade`, {
        description: `${data.driverName} está a ${Math.round(data.distanceKm * 1000)}m de ${data.communityName}`,
        duration: 10000,
      });
    });

    es.addEventListener("sensor_update", (e) => {
      const data = JSON.parse(e.data) as {
        communityName: string;
        reservoirLevel: number;
      };
      if (data.reservoirLevel < 20) {
        toast.error(`Nível crítico em ${data.communityName}`, {
          description: `Reservatório em ${data.reservoirLevel}% — atenção imediata necessária`,
          duration: 12000,
        });
      }
    });

    es.onerror = () => {
      // SSE auto-reconnects; suppress console noise
    };

    return () => es.close();
  }, []);
}
