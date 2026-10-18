import { useEffect, useState } from "react";

export interface PendingCall {
  routeId: number;
  truckId: number;
  communityCount: number;
  estimatedTime: number;
  estimatedDistance: number;
  driverName: string;
}

export function useDriverCall(driverId: number | null) {
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);

  useEffect(() => {
    if (!driverId) return;

    const es = new EventSource("/api/events");

    es.addEventListener("driver_call", (e) => {
      const data = JSON.parse(e.data) as { driverId: number } & PendingCall;
      if (data.driverId === driverId) setPendingCall(data);
    });

    es.addEventListener("call_accepted", (e) => {
      const data = JSON.parse(e.data) as { driverId: number };
      if (data.driverId === driverId) setPendingCall(null);
    });

    es.onerror = () => {};

    return () => es.close();
  }, [driverId]);

  return { pendingCall, dismissCall: () => setPendingCall(null) };
}
