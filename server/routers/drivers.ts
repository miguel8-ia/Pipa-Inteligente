import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createDriver,
  getDriverById,
  getAllDrivers,
  updateDriver,
  updateDriverLocation,
  createDelivery,
  getDeliveriesByRoute,
  getDeliveriesByDriver,
  getDeliveryById,
  updateDelivery,
  createDeliveryConfirmation,
  getDeliveryConfirmation,
  getRoutesByTruck,
  getCommunityById,
  getTruckById,
  getAllCommunities,
  createRoute,
  updateRoute,
  updateTruck,
} from "../db";
import type { Delivery } from "../../drizzle/schema";
import { haversineDistance, optimizeRouteWithCapacity, routeToJSON } from "../ai/routeOptimization";
import { broadcastEvent } from "../_core/sse";

const GEOFENCE_RADIUS_KM = 0.5;

async function enrichDelivery(delivery: Delivery) {
  const [community, confirmation] = await Promise.all([
    getCommunityById(delivery.communityId),
    getDeliveryConfirmation(delivery.id),
  ]);
  return { ...delivery, community, confirmation };
}

const driverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  truckId: z.number().int().optional(),
  status: z.enum(["available", "on_route", "offline"]).optional(),
});

const deliverySchema = z.object({
  routeId: z.number().int(),
  communityId: z.number().int(),
  driverId: z.number().int(),
  sequenceOrder: z.number().int(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  waterVolume: z.number().optional(),
  notes: z.string().optional(),
});

const deliveryConfirmationSchema = z.object({
  deliveryId: z.number().int(),
  photoUrl: z.string().optional(),
  signatureUrl: z.string().optional(),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
});

export const driversRouter = router({
  // Listar todos os motoristas
  list: publicProcedure.query(async () => {
    return getAllDrivers();
  }),

  // Obter detalhes de um motorista
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getDriverById(input);
  }),

  // Criar novo motorista
  create: protectedProcedure
    .input(driverSchema)
    .mutation(async ({ input }) => {
      const result = await createDriver(input);
      return result;
    }),

  // Atualizar motorista
  update: protectedProcedure
    .input(z.object({ id: z.number(), data: driverSchema }))
    .mutation(async ({ input }) => {
      await updateDriver(input.id, input.data);
      return getDriverById(input.id);
    }),

  // Obter rota atual do motorista
  getCurrentRoute: publicProcedure
    .input(z.number())
    .query(async ({ input: driverId }) => {
      const driver = await getDriverById(driverId);
      if (!driver || !driver.truckId) return null;

      const routes = await getRoutesByTruck(driver.truckId);
      const activeRoute = routes.find((r) => r.status === "in_progress" || r.status === "planned");

      if (!activeRoute) return null;

      // Obter entregas da rota
      const deliveriesData = await getDeliveriesByRoute(activeRoute.id);

      // Enriquecer com dados de comunidades
      const enrichedDeliveries = await Promise.all(
        deliveriesData.map(async (delivery) => {
          const community = await getCommunityById(delivery.communityId);
          return {
            ...delivery,
            community,
          };
        })
      );

      return {
        ...activeRoute,
        deliveries: enrichedDeliveries,
        driver,
      };
    }),

  // Atualizar localização do motorista e checar geofencing
  updateLocation: protectedProcedure
    .input(z.object({ driverId: z.number(), latitude: z.number(), longitude: z.number() }))
    .mutation(async ({ input }) => {
      updateDriverLocation(input.driverId, input.latitude, input.longitude);

      const driver = getDriverById(input.driverId);
      if (!driver || !driver.truckId) return { nearbyDelivery: null };

      const routes = getRoutesByTruck(driver.truckId);
      const activeRoute = routes.find((r) => r.status === "in_progress" || r.status === "planned");
      if (!activeRoute) return { nearbyDelivery: null };

      const deliveriesData = getDeliveriesByRoute(activeRoute.id);
      const pending = deliveriesData.filter((d) => d.status === "pending");

      const driverCoord = { lat: input.latitude, lng: input.longitude };
      for (const delivery of pending) {
        const community = getCommunityById(delivery.communityId);
        if (!community) continue;
        const dist = haversineDistance(driverCoord, { lat: community.latitude, lng: community.longitude });
        if (dist <= GEOFENCE_RADIUS_KM) {
          broadcastEvent("geofence", {
            driverId: input.driverId,
            driverName: driver.name,
            communityId: community.id,
            communityName: community.name,
            distanceKm: Math.round(dist * 1000) / 1000,
          });
          return { nearbyDelivery: { id: community.id, name: community.name, distanceKm: dist } };
        }
      }

      return { nearbyDelivery: null };
    }),

  // Métricas de eficiência do motorista
  efficiency: publicProcedure
    .input(z.object({ driverId: z.number(), since: z.string().optional() }))
    .query(({ input }) => {
      let all = getDeliveriesByDriver(input.driverId);
      if (input.since) {
        const since = new Date(input.since).getTime();
        all = all.filter((d) => new Date(d.createdAt).getTime() >= since);
      }

      const completed = all.filter((d) => d.status === "completed");
      const failed = all.filter((d) => d.status === "failed");
      const decidedCount = completed.length + failed.length;

      const totalLitersDistributed = completed.reduce((sum, d) => sum + (d.waterVolume ?? 0), 0);

      const deliveryTimes = completed
        .filter((d) => d.arrivalTime && d.completionTime)
        .map((d) => (new Date(d.completionTime!).getTime() - new Date(d.arrivalTime!).getTime()) / 60000);
      const avgDeliveryTimeMinutes = deliveryTimes.length > 0
        ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
        : 0;

      return {
        totalDeliveries: all.length,
        completedDeliveries: completed.length,
        failedDeliveries: failed.length,
        successRate: decidedCount > 0 ? Math.round((completed.length / decidedCount) * 100) : 0,
        totalLitersDistributed: Math.round(totalLitersDistributed * 10) / 10,
        avgDeliveryTimeMinutes: Math.round(avgDeliveryTimeMinutes * 10) / 10,
      };
    }),

  // Entregas
  deliveries: router({
    // Obter entregas de uma rota
    byRoute: publicProcedure
      .input(z.number())
      .query(async ({ input: routeId }) => {
        const deliveriesData = await getDeliveriesByRoute(routeId);

        // Enriquecer com dados de comunidades
        const enriched = await Promise.all(deliveriesData.map(enrichDelivery));
        return enriched.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      }),

    // Obter entregas de um motorista
    byDriver: publicProcedure
      .input(z.number())
      .query(async ({ input: driverId }) => {
        const deliveriesData = await getDeliveriesByDriver(driverId);
        const enriched = await Promise.all(deliveriesData.map(enrichDelivery));
        return enriched.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      }),

    // Criar entrega
    create: protectedProcedure
      .input(deliverySchema)
      .mutation(async ({ input }) => {
        const result = await createDelivery(input);
        return result;
      }),

    // Atualizar status de entrega
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "in_progress", "completed", "failed"]),
          waterVolume: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updateData: any = {
          status: input.status,
        };

        if (input.waterVolume !== undefined) {
          updateData.waterVolume = input.waterVolume;
        }

        if (input.notes !== undefined) {
          updateData.notes = input.notes;
        }

        if (input.status === "in_progress") {
          updateData.arrivalTime = new Date().toISOString();
        }

        if (input.status === "completed") {
          updateData.completionTime = new Date().toISOString();
        }

        updateDelivery(input.id, updateData);
        const delivery = getDeliveryById(input.id);
        if (!delivery) return null;
        return enrichDelivery(delivery);
      }),

    // Confirmar entrega com foto/assinatura
    confirm: protectedProcedure
      .input(deliveryConfirmationSchema)
      .mutation(async ({ input }) => {
        const confirmation = createDeliveryConfirmation(input);
        updateDelivery(input.deliveryId, {
          status: "completed",
          completionTime: new Date().toISOString(),
        });
        const delivery = getDeliveryById(input.deliveryId);
        if (!delivery) return { delivery: null, confirmation };
        return { delivery: await enrichDelivery(delivery), confirmation };
      }),
  }),

  // Enviar chamado para motorista (despachante)
  sendCall: publicProcedure
    .input(z.object({ driverId: z.number(), truckId: z.number().optional() }))
    .mutation(({ input }) => {
      const driver = getDriverById(input.driverId);
      const truckId = input.truckId ?? driver?.truckId ?? undefined;
      if (!driver) throw new Error("Motorista não encontrado");
      if (!truckId) throw new Error("Motorista sem caminhão associado");

      const truck = getTruckById(truckId);
      if (!truck) throw new Error("Caminhão não encontrado");

      const allCommunities = getAllCommunities();
      const targets = allCommunities.filter(
        (c) => c.reservoirLevel < 80 || c.daysWithoutWater > 0
      );
      if (targets.length === 0) throw new Error("Nenhuma comunidade com necessidade de água");

      const startingPoint =
        driver.currentLatitude != null && driver.currentLongitude != null
          ? { lat: driver.currentLatitude, lng: driver.currentLongitude }
          : { lat: -7.72, lng: -42.73 };

      const optimized = optimizeRouteWithCapacity(targets, truck.capacity, startingPoint);
      const best = optimized[0];
      if (!best) throw new Error("Não foi possível gerar rota");

      const routeResult = createRoute({
        truckId,
        communityOrder: routeToJSON(best.communities),
        totalDistance: best.totalDistance,
        estimatedTime: best.estimatedTime,
        status: "planned",
      });
      const routeId = Number(routeResult.lastInsertRowid);

      best.communities.forEach((c, i) =>
        createDelivery({
          routeId,
          communityId: c.id,
          driverId: input.driverId,
          sequenceOrder: i + 1,
          status: "pending",
        })
      );

      broadcastEvent("driver_call", {
        driverId: input.driverId,
        driverName: driver.name,
        routeId,
        truckId,
        communityCount: best.communities.length,
        estimatedTime: best.estimatedTime,
        estimatedDistance: Math.round(best.totalDistance * 10) / 10,
      });

      return {
        routeId,
        communityCount: best.communities.length,
        estimatedTime: best.estimatedTime,
      };
    }),

  // Motorista aceita o chamado
  acceptCall: publicProcedure
    .input(z.object({ driverId: z.number(), routeId: z.number(), truckId: z.number() }))
    .mutation(({ input }) => {
      updateRoute(input.routeId, { status: "in_progress" });
      updateDriver(input.driverId, { status: "on_route" });
      updateTruck(input.truckId, { status: "in_route" });
      broadcastEvent("call_accepted", { driverId: input.driverId, routeId: input.routeId });
      return { success: true };
    }),
});
