import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Plus, Droplet, Users, Thermometer, Calendar } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Communities() {
  const { data: communities, isLoading, refetch } =
    trpc.communities.list.useQuery();
  const createCommunity = trpc.communities.create.useMutation();
  const updateCommunity = trpc.communities.update.useMutation();
  const recalculatePriority = trpc.communities.recalculatePriority.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    reservoirLevel: "",
    population: "",
    daysWithoutWater: "",
    temperature: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateCommunity.mutateAsync({
          id: editingId,
          data: {
            name: formData.name,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            reservoirLevel: parseFloat(formData.reservoirLevel),
            population: parseInt(formData.population),
            daysWithoutWater: parseInt(formData.daysWithoutWater),
            temperature: parseFloat(formData.temperature),
          },
        });
        toast.success("Comunidade atualizada com sucesso!");
      } else {
        await createCommunity.mutateAsync({
          name: formData.name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          reservoirLevel: parseFloat(formData.reservoirLevel),
          population: parseInt(formData.population),
          daysWithoutWater: parseInt(formData.daysWithoutWater),
          temperature: parseFloat(formData.temperature),
        });
        toast.success("Comunidade criada com sucesso!");
      }

      setFormData({
        name: "",
        latitude: "",
        longitude: "",
        reservoirLevel: "",
        population: "",
        daysWithoutWater: "",
        temperature: "",
      });
      setEditingId(null);
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar comunidade");
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculatePriority.mutateAsync();
      toast.success("Ranking recalculado com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao recalcular ranking");
    }
  };

  const getPriorityColor = (priority: number | null | undefined) => {
    if (!priority) return "bg-slate-500/20 border-slate-500/30";
    if (priority <= 3) return "bg-red-500/20 border-red-500/30";
    if (priority <= 7) return "bg-orange-500/20 border-orange-500/30";
    return "bg-teal-500/20 border-teal-500/30";
  };

  const getReservoirColor = (level: number) => {
    if (level < 10) return "text-red-400";
    if (level < 30) return "text-orange-400";
    return "text-teal-400";
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
              <h1 className="text-4xl font-bold text-white mb-2">Comunidades</h1>
              <p className="text-teal-300">
                Gerenciamento de comunidades e dados de abastecimento
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRecalculate}
                disabled={recalculatePriority.isPending}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
              >
                {recalculatePriority.isPending ? "Recalculando..." : "Recalcular Ranking"}
              </Button>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: "",
                    latitude: "",
                    longitude: "",
                    reservoirLevel: "",
                    population: "",
                    daysWithoutWater: "",
                    temperature: "",
                  });
                  setIsDialogOpen(true);
                }}
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Comunidade
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
            </div>
            <p className="text-teal-300 mt-4">Carregando comunidades...</p>
          </div>
        ) : communities && communities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <Card
                key={community.id}
                className={`relative overflow-hidden border transition-all hover:border-teal-500/50 ${getPriorityColor(community.priority)}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                <div className="relative p-6">
                  {/* Ranking Badge */}
                  {community.priority && (
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                      #{community.priority}
                    </div>
                  )}

                  {/* Nome */}
                  <h3 className="text-xl font-bold text-white mb-4 pr-12">
                    {community.name}
                  </h3>

                  {/* Localização */}
                  <div className="flex items-center gap-2 text-teal-300 text-sm mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {parseFloat(community.latitude.toString()).toFixed(4)},{" "}
                      {parseFloat(community.longitude.toString()).toFixed(4)}
                    </span>
                  </div>

                  {/* Indicadores */}
                  <div className="space-y-3 mb-6">
                    {/* Reservatório */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Droplet className="w-4 h-4 text-teal-400" />
                        Reservatório
                      </div>
                      <span className={`font-bold ${getReservoirColor(community.reservoirLevel)}`}>
                        {community.reservoirLevel.toFixed(1)}%
                      </span>
                    </div>

                    {/* População */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Users className="w-4 h-4 text-cyan-400" />
                        População
                      </div>
                      <span className="text-cyan-300 font-semibold">
                        {community.population}
                      </span>
                    </div>

                    {/* Dias sem água */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        Sem água
                      </div>
                      <span className="text-orange-300 font-semibold">
                        {community.daysWithoutWater}d
                      </span>
                    </div>

                    {/* Temperatura */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Thermometer className="w-4 h-4 text-red-400" />
                        Temperatura
                      </div>
                      <span className="text-red-300 font-semibold">
                        {community.temperature.toFixed(1)}°C
                      </span>
                    </div>
                  </div>

                  {/* Score de Prioridade */}
                  {community.priorityScore && community.priorityScore > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-teal-500/20">
                      <p className="text-teal-300 text-xs mb-1">Score de Prioridade</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-orange-500"
                            style={{
                              width: `${Math.min((community.priorityScore as number) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-teal-300 text-sm font-semibold">
                          {(((community.priorityScore as number) * 100).toFixed(0))}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex gap-2">
                    <Button
                      asChild
                      className="flex-1 bg-teal-600/50 hover:bg-teal-600 text-white border border-teal-500/30 hover:border-teal-500/50"
                    >
                      <Link href={`/communities/${community.id}`}>Detalhes</Link>
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingId(community.id);
                        setFormData({
                          name: community.name,
                          latitude: community.latitude.toString(),
                          longitude: community.longitude.toString(),
                          reservoirLevel: community.reservoirLevel.toString(),
                          population: community.population.toString(),
                          daysWithoutWater: community.daysWithoutWater.toString(),
                          temperature: community.temperature.toString(),
                        });
                        setIsDialogOpen(true);
                      }}
                      className="flex-1 bg-orange-600/50 hover:bg-orange-600 text-white border border-orange-500/30 hover:border-orange-500/50"
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
            <div className="relative p-12 text-center">
              <Droplet className="w-12 h-12 text-teal-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Nenhuma comunidade cadastrada
              </h3>
              <p className="text-teal-300/70 mb-6">
                Comece criando a primeira comunidade para o sistema
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Comunidade
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-teal-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? "Editar Comunidade" : "Nova Comunidade"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-teal-300 text-sm font-semibold mb-2 block">
                Nome da Comunidade
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Vila do Rio"
                className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-teal-300 text-sm font-semibold mb-2 block">
                  Latitude
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                  placeholder="-15.7942"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-teal-300 text-sm font-semibold mb-2 block">
                  Longitude
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                  placeholder="-47.8822"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-teal-300 text-sm font-semibold mb-2 block">
                  Nível Reservatório (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.reservoirLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, reservoirLevel: e.target.value })
                  }
                  placeholder="50"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-teal-300 text-sm font-semibold mb-2 block">
                  População
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.population}
                  onChange={(e) =>
                    setFormData({ ...formData, population: e.target.value })
                  }
                  placeholder="1000"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-teal-300 text-sm font-semibold mb-2 block">
                  Dias sem Água
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.daysWithoutWater}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      daysWithoutWater: e.target.value,
                    })
                  }
                  placeholder="3"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-teal-300 text-sm font-semibold mb-2 block">
                  Temperatura (°C)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: e.target.value })
                  }
                  placeholder="28"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-0"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createCommunity.isPending || updateCommunity.isPending}
                className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
              >
                {createCommunity.isPending || updateCommunity.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
