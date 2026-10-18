import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Droplet,
  MapPin,
  Truck,
  Zap,
  LayoutDashboard,
  Route,
  BarChart2,
  Send,
  Navigation,
  Map,
  ClipboardList,
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-14 text-center">
          <Droplet className="w-14 h-14 text-teal-400 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-white mb-3">PIPA INTELIGENTE</h1>
          <p className="text-xl text-teal-300 mb-1">
            Sistema de Otimização de Distribuição de Água
          </p>
          <p className="text-base text-orange-300/80">Piauí · Powered by AI</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-12">
        {/* Portal do Gestor */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <LayoutDashboard className="w-6 h-6 text-teal-400" />
            <h2 className="text-2xl font-bold text-white">Portal do Gestor</h2>
            {!isAuthenticated && (
              <span className="text-xs text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5">
                Requer login
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ManagerCard
              href="/dashboard"
              icon={<LayoutDashboard className="w-7 h-7 text-teal-400" />}
              title="Dashboard"
              description="Visão geral: comunidades críticas, caminhões e alertas em tempo real"
              locked={!isAuthenticated}
            />
            <ManagerCard
              href="/routes"
              icon={<Send className="w-7 h-7 text-orange-400" />}
              title="Despacho & Rotas"
              description="Envie chamados para motoristas e visualize rotas otimizadas"
              locked={!isAuthenticated}
              highlight
            />
            <ManagerCard
              href="/map"
              icon={<Map className="w-7 h-7 text-cyan-400" />}
              title="Mapa do Piauí"
              description="Visualização geográfica das comunidades com status de abastecimento"
              locked={false}
            />
            <ManagerCard
              href="/communities"
              icon={<Droplet className="w-7 h-7 text-teal-400" />}
              title="Comunidades"
              description="Cadastro e monitoramento das comunidades rurais"
              locked={!isAuthenticated}
            />
            <ManagerCard
              href="/ranking"
              icon={<BarChart2 className="w-7 h-7 text-purple-400" />}
              title="Ranking de Prioridade"
              description="Classificação por urgência gerada pela IA"
              locked={false}
            />
            <ManagerCard
              href="/trucks"
              icon={<Truck className="w-7 h-7 text-orange-400" />}
              title="Caminhões"
              description="Gestão da frota de caminhões-pipa"
              locked={!isAuthenticated}
            />
          </div>

          {!isAuthenticated && (
            <div className="mt-4 text-center">
              <Button
                asChild
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0 px-6"
              >
                <a href={getLoginUrl()}>
                  <Zap className="w-4 h-4 mr-2" />
                  Entrar como Gestor
                </a>
              </Button>
            </div>
          )}
        </section>

        {/* Divisor */}
        <div className="border-t border-teal-500/20" />

        {/* Portal do Motorista */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Truck className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl font-bold text-white">Portal do Motorista</h2>
            <span className="text-xs text-teal-300 border border-teal-500/30 rounded-full px-2 py-0.5">
              Sem login necessário
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DriverCard
              href="/driver"
              icon={<ClipboardList className="w-8 h-8 text-orange-400" />}
              title="Painel do Motorista"
              description="Receba chamados, acompanhe suas entregas e navegue até as comunidades"
              primary
            />
            <DriverCard
              href="/driver-map"
              icon={<Navigation className="w-8 h-8 text-teal-400" />}
              title="Mapa de Rota"
              description="Veja sua rota em tempo real no mapa do Piauí com GPS integrado"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ManagerCard({
  href,
  icon,
  title,
  description,
  locked,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  locked: boolean;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`relative p-5 h-full rounded-xl border transition-all ${
        locked
          ? "opacity-50 cursor-not-allowed border-slate-700 bg-slate-900/30"
          : highlight
          ? "border-orange-500/40 bg-gradient-to-br from-orange-900/20 to-slate-950/60 hover:border-orange-500/70 cursor-pointer"
          : "border-teal-500/20 bg-gradient-to-br from-slate-900/40 to-slate-950/60 hover:border-teal-500/50 cursor-pointer"
      }`}
    >
      {highlight && (
        <span className="absolute top-3 right-3 text-[10px] font-bold text-orange-300 bg-orange-900/50 border border-orange-500/30 rounded-full px-2 py-0.5">
          NOVO
        </span>
      )}
      <div className="mb-3">{icon}</div>
      <h3 className="font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-teal-300/60 leading-relaxed">{description}</p>
    </div>
  );

  if (locked) return content;
  return <Link href={href}>{content}</Link>;
}

function DriverCard({
  href,
  icon,
  title,
  description,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`p-6 rounded-xl border transition-all cursor-pointer ${
          primary
            ? "border-orange-500/40 bg-gradient-to-br from-orange-900/25 to-slate-950/60 hover:border-orange-500/70"
            : "border-teal-500/20 bg-gradient-to-br from-slate-900/40 to-slate-950/60 hover:border-teal-500/50"
        }`}
      >
        <div className="mb-3">{icon}</div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-teal-300/70 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}
