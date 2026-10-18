import { BackButton } from "@/components/BackButton";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MapPin,
  Truck,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Droplet,
  Users,
  BarChart2,
  Play,
  Bell,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useDriverCall } from "@/hooks/useDriverCall";

export default function DriverDashboard() {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTruckId, setNewTruckId] = useState("");

  const { data: drivers, refetch: refetchDrivers } = trpc.drivers.list.useQuery();
  const { data: trucks } = trpc.trucks.list.useQuery();
  const { data: route, isLoading: routeLoading } = trpc.drivers.getCurrentRoute.useQuery(
    selectedDriverId || 0,
    { enabled: !!selectedDriverId }
  );
  const { data: efficiency } = trpc.drivers.efficiency.useQuery(
    { driverId: selectedDriverId! },
    { enabled: !!selectedDriverId }
  );

  const utils = trpc.useUtils();
  const updateDeliveryMutation = trpc.drivers.deliveries.updateStatus.useMutation({
    onSuccess: () => {
      if (selectedDriverId) {
        utils.drivers.getCurrentRoute.invalidate(selectedDriverId);
      }
    },
  });

  const createDriverMutation = trpc.drivers.create.useMutation({
    onSuccess: () => {
      toast.success("Motorista cadastrado com sucesso!");
      setIsRegisterOpen(false);
      setNewName("");
      setNewPhone("");
      setNewTruckId("");
      refetchDrivers();
    },
    onError: () => toast.error("Erro ao cadastrar motorista"),
  });

  const handleRegister = () => {
    if (!newName.trim()) { toast.error("Nome é obrigatório"); return; }
    createDriverMutation.mutate({
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      truckId: newTruckId ? parseInt(newTruckId) : undefined,
      status: "available",
    });
  };

  const { pendingCall, dismissCall } = useDriverCall(selectedDriverId);
  const acceptCallMutation = trpc.drivers.acceptCall.useMutation({
    onSuccess: () => {
      dismissCall();
      if (selectedDriverId) utils.drivers.getCurrentRoute.invalidate(selectedDriverId);
      toast.success("Chamado aceito! Sua rota foi atualizada.");
    },
    onError: () => toast.error("Erro ao aceitar chamado"),
  });

  const handleAcceptCall = () => {
    if (!pendingCall || !selectedDriverId) return;
    acceptCallMutation.mutate({
      driverId: selectedDriverId,
      routeId: pendingCall.routeId,
      truckId: pendingCall.truckId,
    });
  };

  useEffect(() => {
    if (route) {
      setCurrentRoute(route);
    }
  }, [route]);

  const handleStartDelivery = async (deliveryId: number) => {
    try {
      await updateDeliveryMutation.mutateAsync({
        id: deliveryId,
        status: "in_progress",
      });
      toast.success("Entrega iniciada");
    } catch (error) {
      toast.error("Erro ao iniciar entrega");
    }
  };

  const handleCompleteDelivery = async (deliveryId: number) => {
    try {
      await updateDeliveryMutation.mutateAsync({
        id: deliveryId,
        status: "completed",
      });
      toast.success("Entrega concluída. Agora confirme a entrega.");
    } catch (error) {
      toast.error("Erro ao concluir entrega");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in_progress":
        return "text-orange-400";
      case "pending":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-900/20 border-green-500/30";
      case "in_progress":
        return "bg-orange-900/20 border-orange-500/30";
      case "pending":
        return "bg-yellow-900/20 border-yellow-500/30";
      case "failed":
        return "bg-red-900/20 border-red-500/30";
      default:
        return "bg-gray-900/20 border-gray-500/30";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: "Concluída",
      in_progress: "Em Progresso",
      pending: "Pendente",
      failed: "Falha",
    };
    return labels[status] || status;
  };

  const completedCount = currentRoute?.deliveries?.filter(
    (d: any) => d.status === "completed"
  ).length || 0;
  const totalCount = currentRoute?.deliveries?.length || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/20 to-orange-950/20">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-950/80 to-orange-950/80 border-b border-teal-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <BackButton />
          <div className="flex items-center gap-4 mb-4">
            <Truck className="w-10 h-10 text-orange-400" />
            <h1 className="text-4xl font-bold text-white">Painel do Motorista</h1>
          </div>
          <p className="text-teal-300/80 text-lg">
            Visualize sua rota e marque as entregas como concluídas
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seletor de Motorista */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-400" />
                    Motoristas
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => setIsRegisterOpen(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white border-0 text-xs"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Cadastrar
                  </Button>
                </div>

                {!drivers ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin">
                      <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
                    </div>
                    <p className="text-teal-300 mt-3">Carregando motoristas...</p>
                  </div>
                ) : drivers.length > 0 ? (
                  <div className="space-y-2">
                    {drivers.map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => setSelectedDriverId(driver.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedDriverId === driver.id
                            ? "bg-orange-900/30 border-orange-500 text-white"
                            : "bg-slate-800/50 border-teal-500/20 text-teal-300 hover:border-teal-500/50"
                        }`}
                      >
                        <div className="font-semibold">{driver.name}</div>
                        <div className="text-xs mt-1 flex items-center gap-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              driver.status === "on_route"
                                ? "bg-green-500"
                                : driver.status === "available"
                                ? "bg-yellow-500"
                                : "bg-gray-500"
                            }`}
                          />
                          {driver.status === "on_route"
                            ? "Em rota"
                            : driver.status === "available"
                            ? "Disponível"
                            : "Offline"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-teal-300/70 text-center py-8">Nenhum motorista cadastrado</p>
                )}
              </div>
            </Card>
          </div>

          {/* Rota e Entregas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner de chamado recebido */}
            {pendingCall && selectedDriverId && (
              <div className="bg-orange-900/40 border border-orange-500/50 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-orange-300 font-bold text-lg">Chamado recebido!</p>
                    <p className="text-sm text-teal-300/80">
                      {pendingCall.communityCount} entregas &middot; {pendingCall.estimatedDistance} km &middot;&nbsp;
                      ~{Math.floor(pendingCall.estimatedTime / 60)}h{String(pendingCall.estimatedTime % 60).padStart(2, "0")}min
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleAcceptCall}
                    disabled={acceptCallMutation.isPending}
                    className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white border-0"
                  >
                    {acceptCallMutation.isPending ? "Aceitando..." : "Aceitar"}
                  </Button>
                  <Button
                    onClick={dismissCall}
                    variant="outline"
                    className="flex-1 sm:flex-none border-slate-500 text-slate-300 hover:bg-slate-700"
                  >
                    Recusar
                  </Button>
                </div>
              </div>
            )}

            {/* Métricas de Eficiência */}
            {selectedDriverId && efficiency && (
              <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-teal-400" />
                    Eficiência do Motorista
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-teal-500/20 text-center">
                      <div className="text-2xl font-bold text-white">{efficiency.totalDeliveries}</div>
                      <div className="text-xs text-teal-300/70 mt-1">Total Entregas</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-teal-500/20 text-center">
                      <div className="text-2xl font-bold text-blue-400">{efficiency.totalLitersDistributed} L</div>
                      <div className="text-xs text-teal-300/70 mt-1">Litros Distribuídos</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-teal-500/20 text-center">
                      <div className={`text-2xl font-bold ${efficiency.successRate >= 80 ? "text-green-400" : efficiency.successRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {efficiency.successRate}%
                      </div>
                      <div className="text-xs text-teal-300/70 mt-1">Taxa de Sucesso</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-teal-500/20 text-center">
                      <div className="text-2xl font-bold text-orange-400">
                        {efficiency.avgDeliveryTimeMinutes > 0 ? `${efficiency.avgDeliveryTimeMinutes}m` : "—"}
                      </div>
                      <div className="text-xs text-teal-300/70 mt-1">Tempo Médio</div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {selectedDriverId ? (
              <>
                {/* Informações da Rota */}
                {currentRoute ? (
                  <>
                    <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Navigation className="w-6 h-6 text-teal-400" />
                            Rota #{currentRoute.id}
                          </h2>
                          <div className="text-right">
                            <div className="text-sm text-teal-300/70">Status</div>
                            <div className="text-lg font-bold text-orange-400 capitalize">
                              {currentRoute.status === "in_progress"
                                ? "Em Progresso"
                                : currentRoute.status === "planned"
                                ? "Planejada"
                                : "Concluída"}
                            </div>
                          </div>
                        </div>

                        {/* Progresso */}
                        <div className="mb-6">
                          <div className="flex justify-between mb-2">
                            <span className="text-teal-300">Progresso</span>
                            <span className="text-orange-400 font-bold">
                              {completedCount}/{totalCount}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-3">
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-teal-500 to-orange-500 transition-all"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Estatísticas */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-slate-800/50 rounded-lg p-3 border border-teal-500/20">
                            <div className="text-xs text-teal-300/70">Distância</div>
                            <div className="text-lg font-bold text-white">
                              {currentRoute.totalDistance?.toFixed(1) || "0"} km
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3 border border-teal-500/20">
                            <div className="text-xs text-teal-300/70">Tempo Est.</div>
                            <div className="text-lg font-bold text-white">
                              {currentRoute.estimatedTime || "0"} min
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3 border border-teal-500/20">
                            <div className="text-xs text-teal-300/70">Entregas</div>
                            <div className="text-lg font-bold text-white">{totalCount}</div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Lista de Entregas */}
                    <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-teal-400" />
                          Entregas
                        </h3>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {currentRoute.deliveries?.map((delivery: any, index: number) => (
                            <div
                              key={delivery.id}
                              className={`rounded-lg border p-4 transition-all ${getStatusBgColor(
                                delivery.status
                              )}`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-teal-300 bg-teal-900/50 px-2 py-1 rounded">
                                      #{index + 1}
                                    </span>
                                    <h4 className="text-lg font-bold text-white">
                                      {delivery.community?.name || "Comunidade"}
                                    </h4>
                                  </div>
                                  <div className="text-sm text-teal-300/70 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {delivery.community?.latitude}, {delivery.community?.longitude}
                                  </div>
                                </div>
                                <div className={`text-sm font-bold ${getStatusColor(delivery.status)}`}>
                                  {getStatusLabel(delivery.status)}
                                </div>
                              </div>

                              {/* Informações da Comunidade */}
                              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                                <div className="flex items-center gap-2 text-teal-300/70">
                                  <Users className="w-4 h-4" />
                                  {delivery.community?.population} pessoas
                                </div>
                                <div className="flex items-center gap-2 text-teal-300/70">
                                  <Droplet className="w-4 h-4" />
                                  {delivery.community?.reservoirLevel}% reservatório
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex gap-2 flex-wrap">
                                {delivery.status !== "completed" && delivery.community?.latitude && (
                                  <Button asChild size="sm" className="bg-blue-600/80 hover:bg-blue-700 text-white border-0 text-xs">
                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.community.latitude},${delivery.community.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Navegar
                                    </a>
                                  </Button>
                                )}
                                {delivery.status === "pending" && (
                                  <Button
                                    onClick={() => handleStartDelivery(delivery.id)}
                                    size="sm"
                                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0 text-sm"
                                  >
                                    <Play className="w-4 h-4 mr-1" />
                                    Iniciar
                                  </Button>
                                )}
                                {delivery.status === "in_progress" && (
                                  <Button
                                    asChild
                                    size="sm"
                                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 text-sm"
                                  >
                                    <Link href={`/delivery/${delivery.id}/confirm`}>
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Confirmar
                                    </Link>
                                  </Button>
                                )}
                                {delivery.status === "completed" && (
                                  <div className="bg-green-900/30 border border-green-500/30 rounded-md px-3 py-1.5 text-center">
                                    <div className="text-xs text-green-300">&#10003; Concluída</div>
                                  </div>
                                )}
                              </div>

                              {delivery.completionTime && (
                                <div className="text-xs text-teal-300/50 mt-2">
                                  Concluída em:{" "}
                                  {new Date(delivery.completionTime).toLocaleTimeString("pt-BR")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </>
                ) : (
                  <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
                    <div className="relative p-12 text-center">
                      <AlertCircle className="w-12 h-12 text-orange-400/50 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Nenhuma rota ativa</h3>
                      <p className="text-teal-300/70">
                        Este motorista não tem uma rota planejada no momento
                      </p>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
                <div className="relative p-12 text-center">
                  <Truck className="w-12 h-12 text-orange-400/50 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Selecione um motorista</h3>
                  <p className="text-teal-300/70">
                    Escolha um motorista na lista para visualizar sua rota e entregas
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Cadastrar Motorista */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-teal-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-400" />
              Cadastrar Motorista
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-teal-300 font-medium block mb-1">
                Nome <span className="text-red-400">*</span>
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full rounded-md border border-teal-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-teal-300 font-medium block mb-1">
                Telefone
              </label>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ex: (86) 99999-0000"
                className="w-full rounded-md border border-teal-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-teal-300 font-medium block mb-1">
                Caminhão associado
              </label>
              <select
                value={newTruckId}
                onChange={(e) => setNewTruckId(e.target.value)}
                className="w-full rounded-md border border-teal-500/30 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="">Selecione um caminhão (opcional)</option>
                {trucks?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.capacity.toLocaleString("pt-BR")} L
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setIsRegisterOpen(false)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRegister}
                disabled={createDriverMutation.isPending || !newName.trim()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white border-0"
              >
                {createDriverMutation.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
