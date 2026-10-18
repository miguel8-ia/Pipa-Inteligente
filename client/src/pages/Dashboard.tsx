import { useAuth } from "@/_core/hooks/useAuth";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Droplet, MapPin, Truck, TrendingUp, Calendar } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: communities, isLoading: communitiesLoading } =
    trpc.communities.list.useQuery();
  const { data: trucks, isLoading: trucksLoading } = trpc.trucks.list.useQuery();

  // Contar comunidades por status
  const criticalCommunities =
    communities?.filter((c) => c.reservoirLevel < 10).length || 0;
  const urgentCommunities =
    communities?.filter((c) => c.daysWithoutWater > 5).length || 0;
  const availableTrucks =
    trucks?.filter((t) => t.status === "available").length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header com gradiente dramático */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <BackButton />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                PIPA INTELIGENTE
              </h1>
              <p className="text-teal-300 text-lg">
                Sistema de Otimização de Distribuição de Água
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-sm mb-1">Bem-vindo,</p>
              <p className="text-white font-semibold">{user?.name || "Operador"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Comunidades Críticas */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-red-900/30 to-red-950/50 border-red-500/30 hover:border-red-500/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <span className="text-3xl font-bold text-red-300">
                  {criticalCommunities}
                </span>
              </div>
              <p className="text-red-200 text-sm">Comunidades Críticas</p>
              <p className="text-red-300/70 text-xs mt-2">
                Reservatório &lt; 10%
              </p>
            </div>
          </Card>

          {/* Comunidades Urgentes */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-900/30 to-orange-950/50 border-orange-500/30 hover:border-orange-500/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-orange-400" />
                <span className="text-3xl font-bold text-orange-300">
                  {urgentCommunities}
                </span>
              </div>
              <p className="text-orange-200 text-sm">Comunidades Urgentes</p>
              <p className="text-orange-300/70 text-xs mt-2">
                Sem água &gt; 5 dias
              </p>
            </div>
          </Card>

          {/* Total de Comunidades */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-teal-900/30 to-teal-950/50 border-teal-500/30 hover:border-teal-500/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <MapPin className="w-8 h-8 text-teal-400" />
                <span className="text-3xl font-bold text-teal-300">
                  {communities?.length || 0}
                </span>
              </div>
              <p className="text-teal-200 text-sm">Total de Comunidades</p>
              <p className="text-teal-300/70 text-xs mt-2">
                Cadastradas no sistema
              </p>
            </div>
          </Card>

          {/* Caminhões Disponíveis */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-900/30 to-cyan-950/50 border-cyan-500/30 hover:border-cyan-500/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <Truck className="w-8 h-8 text-cyan-400" />
                <span className="text-3xl font-bold text-cyan-300">
                  {availableTrucks}
                </span>
              </div>
              <p className="text-cyan-200 text-sm">Caminhões Disponíveis</p>
              <p className="text-cyan-300/70 text-xs mt-2">
                Prontos para atendimento
              </p>
            </div>
          </Card>
        </div>

        {/* Seção de Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Ranking de Prioridade */}
          <Card className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-orange-500/5" />
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Droplet className="w-6 h-6 text-teal-400" />
                  Ranking de Prioridade
                </h2>
                <Button
                  asChild
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
                >
                  <Link href="/communities">Ver Detalhes</Link>
                </Button>
              </div>

              {communitiesLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin">
                    <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
                  </div>
                  <p className="text-teal-300 mt-4">Carregando comunidades...</p>
                </div>
              ) : communities && communities.length > 0 ? (
                <div className="space-y-3">
                  {communities.slice(0, 5).map((community, index) => (
                    <div
                      key={community.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-teal-500/10 hover:border-teal-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-semibold">
                            {community.name}
                          </p>
                          <p className="text-teal-300/70 text-sm">
                            {community.population} pessoas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-bold">
                          {community.reservoirLevel.toFixed(1)}%
                        </p>
                        <p className="text-teal-300/70 text-xs">
                          {community.daysWithoutWater}d sem água
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-teal-300/70 text-center py-8">
                  Nenhuma comunidade cadastrada
                </p>
              )}
            </div>
          </Card>

          {/* Ações Rápidas */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
            <div className="relative p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Ações Rápidas
              </h2>
              <div className="space-y-4">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
                >
                  <Link href="/communities">
                    Gerenciar Comunidades
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white border-0"
                >
                  <Link href="/trucks">
                    Gerenciar Caminhões
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0"
                >
                  <Link href="/routes">
                    Otimizar Rotas
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
                >
                  <Link href="/ranking">
                    Ranking de Prioridade
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white border-0"
                >
                  <Link href="/driver">
                    Painel de Motorista
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white border-0"
                >
                  <Link href="/map">
                    Visualizar Mapa
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white border-0"
                >
                  <Link href="/delivery-history">
                    <Calendar className="w-4 h-4 mr-2" />
                    Histórico de Entregas
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-0"
                >
                  <Link href="/driver-map">
                    <MapPin className="w-4 h-4 mr-2" />
                    Mapa de Rota
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Seção de Notificações Críticas */}
        {(criticalCommunities > 0 || urgentCommunities > 0) && (
          <Card className="relative overflow-hidden bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5" />
            <div className="relative p-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-red-300 mb-2">
                    Alertas de Urgência
                  </h3>
                  <p className="text-red-200/80">
                    Existem {criticalCommunities} comunidades em nível crítico e{" "}
                    {urgentCommunities} comunidades urgentes que requerem
                    atendimento imediato. Recomenda-se otimizar rotas e
                    despachar caminhões com prioridade.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
