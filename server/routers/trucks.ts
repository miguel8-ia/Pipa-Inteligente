import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createTruck,
  getAllTrucks,
  getTruckById,
  updateTruck,
  getAllCommunities,
  createRoute,
  getRoutesByTruck,
  updateRoute,
} from "../db";
import {
  greedyTSP,
  calculateRouteTotalDistance,
  estimateRouteTime,
  optimizeRouteWithCapacity,
  routeToJSON,
} from "../ai/routeOptimization";

const truckSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().positive(),
});

export const trucksRouter = router({
  // Listar todos os caminhões
  list: publicProcedure.query(async () => {
    return getAllTrucks();
  }),

  // Obter detalhes de um caminhão específico
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getTruckById(input);
  }),

  // Criar novo caminhão
  create: protectedProcedure
    .input(truckSchema)
    .mutation(async ({ input }) => {
      const result = await createTruck({
        ...input,
        status: "available",
      });
      return result;
    }),

  // Atualizar caminhão
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: truckSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      await updateTruck(input.id, input.data);
      return getTruckById(input.id);
    }),

  // Atualizar status do caminhão
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["available", "in_route", "maintenance", "offline"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateTruck(input.id, { status: input.status });
      return getTruckById(input.id);
    }),

  // Atualizar localização do caminhão
  updateLocation: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
    )
    .mutation(async ({ input }) => {
      await updateTruck(input.id, {
        currentLatitude: input.latitude as any,
        currentLongitude: input.longitude as any,
      });
      return getTruckById(input.id);
    }),

  // Obter rotas de um caminhão
  getRoutes: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getRoutesByTruck(input);
  }),

  // Gerar rota otimizada para um caminhão com base nas comunidades priorizadas
  generateOptimizedRoute: protectedProcedure
    .input(
      z.object({
        truckId: z.number(),
        communityIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const truck = await getTruckById(input.truckId);
      if (!truck) throw new Error("Truck not found");

      // Obter todas as comunidades
      let communities = await getAllCommunities();

      // Filtrar por IDs específicos se fornecidos
      if (input.communityIds && input.communityIds.length > 0) {
        communities = communities.filter((c) =>
          input.communityIds!.includes(c.id)
        );
      }

      // Otimizar rotas considerando capacidade do caminhão
      const optimizedRoutes = optimizeRouteWithCapacity(
        communities,
        truck.capacity
      );

      // Se houver múltiplas rotas, usar a primeira
      const route = optimizedRoutes[0];
      if (!route) throw new Error("Could not generate route");

      // Salvar rota no banco
      await createRoute({
        truckId: input.truckId,
        communityOrder: routeToJSON(route.communities),
        totalDistance: route.totalDistance,
        estimatedTime: route.estimatedTime,
        status: "planned",
      });

      // Obter a rota criada
      const routes = await getRoutesByTruck(input.truckId);
      const createdRoute = routes[routes.length - 1];

      return {
        ...route,
        routeId: createdRoute?.id,
      };
    }),

  // Iniciar rota (atualizar status para in_progress)
  startRoute: protectedProcedure
    .input(
      z.object({
        routeId: z.number(),
        truckId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await updateRoute(input.routeId, { status: "in_progress" });
      await updateTruck(input.truckId, { status: "in_route" });

      const routes = await getRoutesByTruck(input.truckId);
      return routes.find((r) => r.id === input.routeId);
    }),

  // Completar rota (atualizar status para completed)
  completeRoute: protectedProcedure
    .input(
      z.object({
        routeId: z.number(),
        truckId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await updateRoute(input.routeId, { status: "completed" });
      await updateTruck(input.truckId, { status: "available" });

      const routes = await getRoutesByTruck(input.truckId);
      return routes.find((r) => r.id === input.routeId);
    }),
});
