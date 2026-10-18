import type { Community } from "../../drizzle/schema";

/**
 * Algoritmo de pontuação ponderada para priorização de comunidades
 * Fatores considerados:
 * - Nível do reservatório (peso: 0.35) - quanto menor, maior a prioridade
 * - População (peso: 0.25) - quanto maior, maior a prioridade
 * - Dias sem água (peso: 0.25) - quanto maior, maior a prioridade
 * - Temperatura (peso: 0.15) - quanto maior, maior a prioridade (clima quente aumenta urgência)
 */
export function calculatePriorityScore(community: Community): number {
  const weights = {
    reservoir: 0.35,
    population: 0.25,
    daysWithoutWater: 0.25,
    temperature: 0.15,
  };

  // Normalizar nível do reservatório (0-100%) para escala invertida (0-1)
  // Quanto menor o nível, maior a pontuação
  const reservoirScore = (100 - community.reservoirLevel) / 100;

  // Normalizar população - usar escala logarítmica para evitar dominância
  // Assumir população máxima de 10000 pessoas
  const populationScore = Math.min(community.population / 10000, 1);

  // Normalizar dias sem água - usar escala logarítmica
  // Assumir máximo de 30 dias
  const daysScore = Math.min(community.daysWithoutWater / 30, 1);

  // Normalizar temperatura - usar escala de 0-50°C
  // Temperaturas acima de 40°C aumentam urgência
  const temperatureScore = Math.min(community.temperature / 50, 1);

  // Calcular score ponderado
  const totalScore =
    reservoirScore * weights.reservoir +
    populationScore * weights.population +
    daysScore * weights.daysWithoutWater +
    temperatureScore * weights.temperature;

  return totalScore;
}

/**
 * Gerar ranking de prioridade para lista de comunidades
 * Retorna comunidades ordenadas por prioridade (maior score = maior urgência)
 */
export function rankCommunities(communities: Community[]): Community[] {
  const scored = communities.map((community) => ({
    ...community,
    priorityScore: calculatePriorityScore(community),
  }));

  // Ordenar por score descendente (maior score = maior prioridade)
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Atribuir ranking (1 = maior prioridade)
  return scored.map((community, index) => ({
    ...community,
    priority: index + 1,
  }));
}

/**
 * Gerar justificativa textual para ranking usando dados da comunidade
 */
export function generateRankingJustification(community: Community): string {
  const factors: string[] = [];

  // Analisar nível do reservatório
  if (community.reservoirLevel < 10) {
    factors.push(
      `nível crítico de reservatório (${community.reservoirLevel.toFixed(1)}%)`
    );
  } else if (community.reservoirLevel < 30) {
    factors.push(
      `nível baixo de reservatório (${community.reservoirLevel.toFixed(1)}%)`
    );
  }

  // Analisar dias sem água
  if (community.daysWithoutWater > 5) {
    factors.push(`${community.daysWithoutWater} dias sem abastecimento`);
  } else if (community.daysWithoutWater > 2) {
    factors.push(`${community.daysWithoutWater} dias sem água`);
  }

  // Analisar temperatura
  if (community.temperature > 35) {
    factors.push(`temperatura elevada (${community.temperature.toFixed(1)}°C)`);
  }

  // Analisar população
  if (community.population > 5000) {
    factors.push(`população grande (${community.population} pessoas)`);
  }

  const factorText =
    factors.length > 0 ? factors.join(", ") : "situação estável";

  return `A comunidade ${community.name} foi priorizada devido a: ${factorText}. Com ${community.population} habitantes, a urgência de atendimento é alta.`;
}

/**
 * Gerar ações recomendadas baseadas nos dados da comunidade
 */
export function generateRecommendedActions(community: Community): string {
  const actions: string[] = [];

  if (community.reservoirLevel < 10) {
    actions.push("URGENTE: Atender com prioridade máxima");
  } else if (community.reservoirLevel < 30) {
    actions.push("Atender em breve para evitar situação crítica");
  }

  if (community.daysWithoutWater > 5) {
    actions.push("Aumentar volume de água no próximo abastecimento");
  }

  if (community.temperature > 35) {
    actions.push("Considerar abastecimento adicional devido ao clima quente");
  }

  if (community.population > 5000) {
    actions.push("Pode ser necessário mais de um caminhão para atender");
  }

  return actions.length > 0
    ? actions.join("; ")
    : "Manter monitoramento regular";
}

/**
 * Detectar limiares críticos para notificações
 */
export function detectCriticalThresholds(community: Community): string[] {
  const alerts: string[] = [];

  if (community.reservoirLevel < 10) {
    alerts.push("low_reservoir");
  }

  if (community.daysWithoutWater > 5) {
    alerts.push("days_without_water");
  }

  if (community.temperature > 40) {
    alerts.push("high_temperature");
  }

  return alerts;
}
