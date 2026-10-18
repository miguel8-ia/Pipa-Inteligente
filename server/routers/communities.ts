import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  createRankingJustification,
  getRankingJustification,
  createCriticalNotification,
  getDb,
} from "../db";
import {
  rankCommunities,
  generateRankingJustification,
  detectCriticalThresholds,
} from "../ai/prioritization";
import { invokeLLM } from "../_core/llm";

const communitySchema = z.object({
  name: z.string().min(1),
  latitude: z.union([z.number().min(-90).max(90), z.string()]),
  longitude: z.union([z.number().min(-180).max(180), z.string()]),
  reservoirLevel: z.number().min(0).max(100),
  population: z.number().int().positive(),
  daysWithoutWater: z.number().int().min(0),
  temperature: z.number().min(-50).max(60),
}).transform((data) => ({
  ...data,
  latitude: typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude,
  longitude: typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude,
}));

export const communitiesRouter = router({
  // Listar todas as comunidades com ranking de prioridade
  list: publicProcedure.query(async () => {
    const communities = await getAllCommunities();
    return rankCommunities(communities);
  }),

  // Obter detalhes de uma comunidade específica
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getCommunityById(input);
  }),

  // Criar nova comunidade
  create: protectedProcedure
    .input(communitySchema)
    .mutation(async ({ input }) => {
      const result = await createCommunity({
        ...input,
        latitude: input.latitude as any,
        longitude: input.longitude as any,
        priority: 0,
        priorityScore: 0,
      });

      return result;
    }),

  // Atualizar comunidade
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          latitude: z.union([z.number().min(-90).max(90), z.string()]).optional(),
          longitude: z.union([z.number().min(-180).max(180), z.string()]).optional(),
          reservoirLevel: z.number().min(0).max(100).optional(),
          population: z.number().int().positive().optional(),
          daysWithoutWater: z.number().int().min(0).optional(),
          temperature: z.number().min(-50).max(60).optional(),
        }).transform((data) => ({
          ...data,
          latitude: data.latitude ? (typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude) : undefined,
          longitude: data.longitude ? (typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude) : undefined,
        })),
      })
    )
    .mutation(async ({ input }) => {
      await updateCommunity(input.id, input.data as any);
      return getCommunityById(input.id);
    }),

  // Deletar comunidade
  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      await deleteCommunity(input);
      return { success: true };
    }),

  // Recalcular ranking de prioridade para todas as comunidades
  recalculatePriority: protectedProcedure.mutation(() => {
    const communities = getAllCommunities();
    const ranked = rankCommunities(communities);

    getDb()!.$client.transaction(() => {
      for (const community of ranked) {
        updateCommunity(community.id, {
          priority: community.priority,
          priorityScore: community.priorityScore,
        });
        const alerts = detectCriticalThresholds(community);
        if (alerts.length > 0) {
          const message = generateRankingJustification(community);
          for (const alert of alerts) {
            createCriticalNotification({ communityId: community.id, type: alert as any, message });
          }
        }
      }
    })();

    return ranked;
  }),

  // Gerar justificativa textual com LLM para ranking de uma comunidade
  generateJustification: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: communityId }) => {
      const community = await getCommunityById(communityId);
      if (!community) throw new Error("Community not found");

      // Verificar se já existe justificativa
      const existing = await getRankingJustification(communityId);
      if (existing) return existing;

      // Gerar justificativa com LLM
      const prompt = `
Analise os dados da comunidade e gere uma justificativa detalhada para seu ranking de prioridade no sistema de distribuição de água:

Comunidade: ${community.name}
Nível do Reservatório: ${community.reservoirLevel}%
População: ${community.population} pessoas
Dias sem Abastecimento: ${community.daysWithoutWater} dias
Temperatura: ${community.temperature}°C

Gere:
1. Uma justificativa clara explicando por que essa comunidade tem essa prioridade
2. Ações recomendadas para atender essa comunidade

Formato de resposta em JSON:
{
  "justification": "...",
  "recommendedActions": "..."
}
`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em gestão de recursos hídricos e otimização de distribuição de água. Analise dados de comunidades e gere justificativas claras e ações recomendadas.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "justification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                justification: {
                  type: "string",
                  description: "Justificativa para o ranking",
                },
                recommendedActions: {
                  type: "string",
                  description: "Ações recomendadas",
                },
              },
              required: ["justification", "recommendedActions"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message.content;
      if (!content || typeof content !== "string") throw new Error("Failed to generate justification");

      const parsed = JSON.parse(content);

      // Salvar justificativa no banco
      await createRankingJustification({
        communityId,
        justification: String(parsed.justification),
        recommendedActions: String(parsed.recommendedActions),
      });

      return {
        justification: String(parsed.justification),
        recommendedActions: String(parsed.recommendedActions),
      };
    }),
});
