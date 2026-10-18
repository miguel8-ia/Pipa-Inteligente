import { BackButton } from "@/components/BackButton";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Route, ArrowRight, Zap, MapPin, Send, Truck } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Routes() {
  const { data: trucks } = trpc.trucks.list.useQuery();
  const { data: communities } = trpc.communities.list.useQuery();
  const { data: drivers } = trpc.drivers.list.useQuery();
  const [allRoutes, setAllRoutes] = useState<any[]>([]);

  // Carregar rotas de todos os caminhões ao inicializar
  const { data: firstTruckRoutes } = trpc.trucks.getRoutes.useQuery(
    trucks?.[0]?.id || 0,
    { enabled: !!trucks && trucks.length > 0 }
  );

  const optimizeRoute = trpc.trucks.generateOptimizedRoute.useMutation();
  const sendCallMutation = trpc.drivers.sendCall.useMutation({
    onSuccess: (data, vars) => {
      const driver = drivers?.find((d) => d.id === vars.driverId);
      toast.success(`Chamado enviado para ${driver?.name ?? "motorista"}!`, {
        description: `${data.communityCount} comunidades · ~${Math.round(data.estimatedTime / 60)}h de rota`,
      });
    },
    onError: (err) => toast.error(`Erro ao enviar chamado: ${err.message}`),
  });

  const [dispatchTarget, setDispatchTarget] = useState<{ id: number; name: string; truckId: number | null } | null>(null);
  const [dispatchTruckId, setDispatchTruckId] = useState<string>("");

  const openDispatch = (driver: { id: number; name: string; truckId: number | null }) => {
    setDispatchTarget(driver);
    setDispatchTruckId(driver.truckId?.toString() ?? trucks?.[0]?.id?.toString() ?? "");
  };

  const handleSendCall = () => {
    if (!dispatchTarget || !dispatchTruckId) {
      toast.error("Selecione um caminhão");
      return;
    }
    sendCallMutation.mutate(
      { driverId: dispatchTarget.id, truckId: parseInt(dispatchTruckId) },
      { onSuccess: () => setDispatchTarget(null) }
    );
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<string>("");

  // Atualizar allRoutes quando rotas forem carregadas
  useEffect(() => {
    if (firstTruckRoutes) {
      setAllRoutes(firstTruckRoutes);
    }
  }, [firstTruckRoutes]);

  const handleOptimizeRoute = async () => {
    if (!selectedTruck) {
      toast.error("Selecione um caminhão");
      return;
    }

    try {
      await optimizeRoute.mutateAsync({
        truckId: parseInt(selectedTruck),
      });
      toast.success("Rota otimizada com sucesso!");
      setIsDialogOpen(false);
      setSelectedTruck("");
      // Recarregar rotas
      if (trucks && trucks.length > 0) {
        const truckId = trucks[0].id;
        // Refetch would be called here if we had it
      }
    } catch (error) {
      toast.error("Erro ao otimizar rota");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 border-yellow-500/30 text-yellow-300";
      case "in_progress":
        return "bg-blue-500/20 border-blue-500/30 text-blue-300";
      case "completed":
        return "bg-teal-500/20 border-teal-500/30 text-teal-300";
      default:
        return "bg-slate-500/20 border-slate-500/30 text-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "in_progress":
        return "Em Progresso";
      case "completed":
        return "Concluída";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <BackButton />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Route className="w-8 h-8 text-orange-400" />
                Rotas Otimizadas
              </h1>
              <p className="text-teal-300">
                Visualize e otimize as rotas de distribuição de água
              </p>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0"
            >
              <Zap className="w-4 h-4 mr-2" />
              Otimizar Nova Rota
            </Button>
          </div>
        </div>
      </div>

      {/* Despacho */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-0">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Send className="w-6 h-6 text-orange-400" />
          Despacho de Motoristas
        </h2>
        {!drivers ? (
          <p className="text-teal-300/70 mb-6">Carregando motoristas...</p>
        ) : drivers.length === 0 ? (
          <p className="text-teal-300/70 mb-6">Nenhum motorista cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {drivers.map((driver) => (
              <Card
                key={driver.id}
                className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20"
              >
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-400" />
                      <p className="font-bold text-white">{driver.name}</p>
                    </div>
                    <p className="text-xs text-teal-300/60 mt-0.5">
                      {driver.phone ?? "Sem telefone"}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        driver.status === "on_route"
                          ? "bg-green-900/40 text-green-300"
                          : driver.status === "available"
                          ? "bg-yellow-900/40 text-yellow-300"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {driver.status === "on_route"
                        ? "Em Rota"
                        : driver.status === "available"
                        ? "Disponível"
                        : "Offline"}
                    </span>
                  </div>
                  <Button
                    disabled={driver.status === "on_route" || sendCallMutation.isPending}
                    onClick={() => openDispatch(driver)}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-0 text-sm flex-shrink-0"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {driver.status === "on_route" ? "Em Rota" : "Enviar Chamado"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!trucks || !communities ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
            </div>
            <p className="text-teal-300 mt-4">Carregando rotas...</p>
          </div>
        ) : allRoutes && allRoutes.length > 0 ? (
          <div className="space-y-6">
            {allRoutes.map((route: any) => {
              const truck = trucks?.find((t) => t.id === route.truckId);
              const routeCommunities = route.communityOrder
                ? route.communityOrder
                    .split(",")
                    .map((id: string) => communities?.find((c) => c.id === parseInt(id)))
                    .filter(Boolean)
                : [];

              return (
                <Card
                  key={route.id}
                  className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20"
                >
                  <div className="relative p-8">
                    {/* Header da Rota */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          Rota #{route.id}
                        </h3>
                        <p className="text-orange-300/70">
                          Caminhão: <span className="font-semibold">{truck?.name}</span>
                        </p>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(
                          route.status
                        )}`}
                      >
                        {getStatusLabel(route.status)}
                      </div>
                    </div>

                    {/* Informações da Rota */}
                    <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-700/50">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Distância Total</p>
                        <p className="text-xl font-bold text-teal-300">
                          {(route.totalDistance || 0).toFixed(1)} km
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Comunidades</p>
                        <p className="text-xl font-bold text-cyan-300">
                          {routeCommunities.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Tempo Estimado</p>
                        <p className="text-xl font-bold text-purple-300">
                          {Math.round((route.totalDistance || 0) / 40)} h
                        </p>
                      </div>
                    </div>

                    {/* Sequência de Comunidades */}
                    <div className="mb-6">
                      <h4 className="text-lg font-bold text-white mb-4">
                        Sequência de Atendimento
                      </h4>
                      <div className="space-y-3">
                        {routeCommunities.length > 0 ? (
                          routeCommunities.map((community: any, index: number) => (
                            <div key={community?.id}>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-white font-semibold">
                                    {community?.name}
                                  </p>
                                  <p className="text-slate-400 text-sm">
                                    Reservatório: {community?.reservoirLevel.toFixed(1)}% | Prioridade: #{community?.priority}
                                  </p>
                                </div>
                                <MapPin className="w-5 h-5 text-teal-400" />
                              </div>
                              {index < routeCommunities.length - 1 && (
                                <div className="flex justify-center py-2">
                                  <ArrowRight className="w-4 h-4 text-orange-400 rotate-90" />
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400">Nenhuma comunidade nesta rota</p>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3">
                      <Button
                        disabled
                        className="flex-1 bg-teal-600/50 text-white border border-teal-500/30 opacity-50 cursor-not-allowed"
                      >
                        Iniciar Rota
                      </Button>
                      <Button
                        disabled
                        className="flex-1 bg-slate-600/50 text-white border border-slate-500/30 opacity-50 cursor-not-allowed"
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
            <div className="relative p-12 text-center">
              <Route className="w-12 h-12 text-orange-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Nenhuma rota otimizada
              </h3>
              <p className="text-teal-300/70 mb-6">
                Crie uma nova rota otimizada para começar
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0"
              >
                <Zap className="w-4 h-4 mr-2" />
                Otimizar Rota
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Dialog de Otimização */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-orange-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              Otimizar Nova Rota
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-orange-300 text-sm font-semibold mb-2 block">
                Selecione um Caminhão
              </label>
              <select
                value={selectedTruck}
                onChange={(e) => setSelectedTruck(e.target.value)}
                className="w-full rounded-md border border-orange-500/30 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="" disabled>Escolha um caminhão...</option>
                {trucks?.map((truck) => (
                  <option key={truck.id} value={truck.id.toString()}>
                    {truck.name} ({truck.capacity}L)
                  </option>
                ))}
              </select>
            </div>

            <p className="text-slate-400 text-sm">
              O sistema irá otimizar automaticamente a rota baseado nas prioridades das comunidades.
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-0"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleOptimizeRoute}
                disabled={optimizeRoute.isPending || !selectedTruck}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0"
              >
                {optimizeRoute.isPending ? "Otimizando..." : "Otimizar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Despacho — confirmar caminhão */}
      <Dialog open={!!dispatchTarget} onOpenChange={(open) => !open && setDispatchTarget(null)}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-orange-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-orange-400" />
              Enviar Chamado — {dispatchTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-orange-300 text-sm font-semibold mb-2 block">
                Caminhão para esta rota
              </label>
              <select
                value={dispatchTruckId}
                onChange={(e) => setDispatchTruckId(e.target.value)}
                className="w-full rounded-md border border-orange-500/30 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="" disabled>Selecione um caminhão...</option>
                {trucks?.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.name} — {t.capacity.toLocaleString("pt-BR")} L
                  </option>
                ))}
              </select>
            </div>
            <p className="text-slate-400 text-sm">
              A rota será otimizada a partir da posição atual do motorista.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setDispatchTarget(null)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendCall}
                disabled={sendCallMutation.isPending || !dispatchTruckId}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0"
              >
                {sendCallMutation.isPending ? "Enviando..." : "Enviar Chamado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
