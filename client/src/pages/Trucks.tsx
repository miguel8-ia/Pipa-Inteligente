import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Truck, Plus, Fuel, Gauge, MapPin } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Trucks() {
  const { data: trucks, isLoading, refetch } = trpc.trucks.list.useQuery();
  const createTruck = trpc.trucks.create.useMutation();
  const updateTruck = trpc.trucks.update.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateTruck.mutateAsync({
          id: editingId,
          data: {
            name: formData.name,
            capacity: parseInt(formData.capacity),
          },
        });
        toast.success("Caminhão atualizado com sucesso!");
      } else {
        await createTruck.mutateAsync({
          name: formData.name,
          capacity: parseInt(formData.capacity),
        });
        toast.success("Caminhão criado com sucesso!");
      }

      setFormData({
        name: "",
        capacity: "",
      });
      setEditingId(null);
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar caminhão");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-teal-500/20 border-teal-500/30 text-teal-300";
      case "in_route":
        return "bg-orange-500/20 border-orange-500/30 text-orange-300";
      case "maintenance":
        return "bg-red-500/20 border-red-500/30 text-red-300";
      default:
        return "bg-slate-500/20 border-slate-500/30 text-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponível";
      case "in_route":
        return "Em Rota";
      case "maintenance":
        return "Manutenção";
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
              <h1 className="text-4xl font-bold text-white mb-2">Caminhões</h1>
              <p className="text-teal-300">
                Gerenciamento de frota de distribuição de água
              </p>
            </div>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: "",
                    capacity: "",
                  });
                  setIsDialogOpen(true);
                }}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Caminhão
            </Button>
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
            <p className="text-teal-300 mt-4">Carregando caminhões...</p>
          </div>
        ) : trucks && trucks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trucks.map((truck) => (
              <Card
                key={truck.id}
                className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20 hover:border-teal-500/50 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                <div className="relative p-6">
                  {/* Ícone e Nome */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-500/20 border border-teal-500/30">
                        <Truck className="w-6 h-6 text-teal-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {truck.name}
                        </h3>
                        <p className="text-teal-300/70 text-sm font-mono">
                          {truck.currentLatitude && truck.currentLongitude
                            ? `${truck.currentLatitude}, ${truck.currentLongitude}`
                            : "Sem localização"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        truck.status
                      )}`}
                    >
                      {getStatusLabel(truck.status)}
                    </div>
                  </div>

                  {/* Indicadores */}
                  <div className="space-y-3 mb-6">
                    {/* Capacidade */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Gauge className="w-4 h-4 text-cyan-400" />
                        Capacidade
                      </div>
                      <span className="text-cyan-300 font-semibold">
                        {truck.capacity}L
                      </span>
                    </div>

                    {/* Localização */}
                    {truck.currentLatitude && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white text-sm">
                          <MapPin className="w-4 h-4 text-orange-400" />
                          Localização
                        </div>
                        <span className="text-orange-300 text-xs font-mono">
                          {truck.currentLatitude}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <Button
                    onClick={() => {
                      setEditingId(truck.id);
                      setFormData({
                        name: truck.name,
                        capacity: truck.capacity.toString(),
                      });
                      setIsDialogOpen(true);
                    }}
                    className="w-full bg-orange-600/50 hover:bg-orange-600 text-white border border-orange-500/30 hover:border-orange-500/50"
                  >
                    Editar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
            <div className="relative p-12 text-center">
              <Truck className="w-12 h-12 text-teal-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Nenhum caminhão cadastrado
              </h3>
              <p className="text-teal-300/70 mb-6">
                Comece adicionando um caminhão à frota
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Caminhão
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
              {editingId ? "Editar Caminhão" : "Novo Caminhão"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-teal-300 text-sm font-semibold mb-2 block">
                Nome do Caminhão
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Caminhão 01"
                className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <label className="text-teal-300 text-sm font-semibold mb-2 block">
                Capacidade (Litros)
              </label>
              <Input
                type="number"
                min="1000"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                placeholder="10000"
                className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                required
              />
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
                disabled={createTruck.isPending || updateTruck.isPending}
                className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
              >
                {createTruck.isPending || updateTruck.isPending
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
