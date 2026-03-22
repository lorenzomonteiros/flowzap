import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GitBranch,
  MessageSquare,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { flowsService } from '../services/flows.service.ts';
import type { DashboardStats } from '../types/index.ts';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton.tsx';
import { formatRelativeTime } from '../lib/utils.ts';

const statusIcons = {
  running: <Clock size={14} className="text-blue-400" />,
  completed: <CheckCircle size={14} className="text-green-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
};

const statusVariants = {
  running: 'info',
  completed: 'success',
  failed: 'danger',
} as const;

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    flowsService
      .getDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const metricCards = stats
    ? [
        {
          label: 'Fluxos Ativos',
          value: stats.activeFlows,
          icon: <GitBranch size={20} className="text-gold" />,
          color: 'text-gold',
          link: '/flows',
        },
        {
          label: 'Mensagens Hoje',
          value: stats.messagesToday,
          icon: <MessageSquare size={20} className="text-blue-400" />,
          color: 'text-blue-400',
          link: '/conversations',
        },
        {
          label: 'Contatos',
          value: stats.totalContacts,
          icon: <Users size={20} className="text-purple-400" />,
          color: 'text-purple-400',
          link: '/contacts',
        },
        {
          label: 'Taxa de Entrega',
          value: `${stats.deliveryRate}%`,
          icon: <TrendingUp size={20} className="text-green-400" />,
          color: 'text-green-400',
          link: '/conversations',
        },
      ]
    : [];

  // Build chart data from last 7 days
  const chartData = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        count: 0,
      };
    });
    return days;
  })();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Visão geral da sua automação</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : metricCards.map((card) => (
              <Link key={card.label} to={card.link}>
                <Card hover className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-text-secondary text-sm">{card.label}</p>
                      <p className={`text-3xl font-bold mt-1 font-heading ${card.color}`}>
                        {card.value}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-btn bg-bg-tertiary flex items-center justify-center">
                      {card.icon}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Mensagens — Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.08)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8A8A8A', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8A8A8A', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid rgba(212,175,55,0.15)',
                      borderRadius: '8px',
                      color: '#F5F5F0',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    dot={{ fill: '#D4AF37', r: 4 }}
                    activeDot={{ r: 6, fill: '#F0C040' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle>Execuções Recentes</CardTitle>
            <Link to="/flows" className="text-xs text-gold hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recentExecutions.length === 0 ? (
              <div className="p-6 text-center text-text-secondary text-sm">
                Nenhuma execução ainda
              </div>
            ) : (
              <ul className="divide-y divide-gold-muted">
                {stats?.recentExecutions.slice(0, 6).map((exec) => (
                  <li key={exec.id} className="px-4 py-3 flex items-center gap-3">
                    {statusIcons[exec.status] || <Clock size={14} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {exec.flow?.name || 'Fluxo'}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {exec.contact?.name || exec.contact?.phone}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusVariants[exec.status] || 'default'} size="sm">
                        {exec.status === 'running'
                          ? 'Em andamento'
                          : exec.status === 'completed'
                          ? 'Concluído'
                          : 'Falhou'}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        {formatRelativeTime(exec.startedAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
