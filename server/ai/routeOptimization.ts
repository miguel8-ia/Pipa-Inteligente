import type { Community } from "../../drizzle/schema";

interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * Calcular distância entre dois pontos usando Haversine formula
 * Retorna distância em km
 */
export function haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Heurística gulosa para TSP (Traveling Salesman Problem)
 * Seleciona sempre o próximo ponto mais próximo não visitado
 * Complexidade: O(n²) - adequado para pequenas instâncias
 */
export function greedyTSP(
  communities: Community[],
  startingPoint?: Coordinate
): Community[] {
  if (communities.length === 0) return [];
  if (communities.length === 1) return communities;

  const unvisited = [...communities];
  const route: Community[] = [];

  // Se não houver ponto de partida, usar a primeira comunidade
  let current = startingPoint || {
    lat: parseFloat(communities[0].latitude.toString()),
    lng: parseFloat(communities[0].longitude.toString()),
  };

  while (unvisited.length > 0) {
    // Encontrar comunidade mais próxima não visitada
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const communityCoord = {
        lat: parseFloat(unvisited[i].latitude.toString()),
        lng: parseFloat(unvisited[i].longitude.toString()),
      };

      const distance = haversineDistance(current, communityCoord);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    // Adicionar comunidade mais próxima à rota
    const nearest = unvisited[nearestIndex];
    route.push(nearest);

    // Atualizar posição atual
    current = {
      lat: parseFloat(nearest.latitude.toString()),
      lng: parseFloat(nearest.longitude.toString()),
    };

    // Remover da lista de não visitados
    unvisited.splice(nearestIndex, 1);
  }

  return route;
}

/**
 * Calcular distância total de uma rota
 */
export function calculateRouteTotalDistance(communities: Community[]): number {
  if (communities.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 0; i < communities.length - 1; i++) {
    const current = {
      lat: parseFloat(communities[i].latitude.toString()),
      lng: parseFloat(communities[i].longitude.toString()),
    };

    const next = {
      lat: parseFloat(communities[i + 1].latitude.toString()),
      lng: parseFloat(communities[i + 1].longitude.toString()),
    };

    totalDistance += haversineDistance(current, next);
  }

  return totalDistance;
}

/**
 * Estimar tempo de rota considerando:
 * - Velocidade média de 40 km/h em trânsito
 * - 15 minutos por comunidade para abastecimento
 */
export function estimateRouteTime(
  communities: Community[],
  avgSpeed: number = 40
): number {
  const distance = calculateRouteTotalDistance(communities);
  const travelTime = (distance / avgSpeed) * 60; // em minutos
  const supplyTime = communities.length * 15; // 15 min por comunidade

  return Math.round(travelTime + supplyTime);
}

/**
 * Otimizar rota considerando capacidade do caminhão
 * Se a capacidade não for suficiente para todas as comunidades,
 * dividir em múltiplas rotas
 */
export interface OptimizedRoute {
  communities: Community[];
  totalDistance: number;
  estimatedTime: number;
  totalWaterNeeded: number;
}

export function optimizeRouteWithCapacity(
  communities: Community[],
  truckCapacity: number,
  startingPoint?: Coordinate
): OptimizedRoute[] {
  // Calcular água necessária por comunidade (simplificado)
  // Assumir 100 litros por pessoa por dia
  const communitiesWithWaterNeeds = communities.map((c) => ({
    ...c,
    waterNeeded: c.population * 100 * (c.daysWithoutWater || 1),
  }));

  const routes: OptimizedRoute[] = [];
  let remaining = [...communitiesWithWaterNeeds];

  while (remaining.length > 0) {
    const route: OptimizedRoute = {
      communities: [],
      totalDistance: 0,
      estimatedTime: 0,
      totalWaterNeeded: 0,
    };

    // Adicionar comunidades até atingir capacidade
    while (remaining.length > 0) {
      const next = remaining[0];

      if (
        route.totalWaterNeeded + next.waterNeeded <= truckCapacity ||
        route.communities.length === 0
      ) {
        route.communities.push(next);
        route.totalWaterNeeded += next.waterNeeded;
        remaining.shift();
      } else {
        break;
      }
    }

    // Otimizar ordem das comunidades nesta rota
    route.communities = greedyTSP(route.communities, startingPoint);
    route.totalDistance = calculateRouteTotalDistance(route.communities);
    route.estimatedTime = estimateRouteTime(route.communities);

    routes.push(route);
  }

  return routes;
}

/**
 * Converter rota otimizada para array JSON de IDs para armazenar no banco
 */
export function routeToJSON(communities: Community[]): string {
  return JSON.stringify(communities.map((c) => c.id));
}

/**
 * Converter array JSON de IDs para array de comunidades
 */
export function jsonToRoute(jsonString: string, communities: Community[]): Community[] {
  const ids = JSON.parse(jsonString) as number[];
  const communityMap = new Map(communities.map((c) => [c.id, c]));

  return ids
    .map((id) => communityMap.get(id))
    .filter((c) => c !== undefined) as Community[];
}
