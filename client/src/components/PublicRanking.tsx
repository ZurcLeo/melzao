import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Star, TrendingUp, Clock, Search, RefreshCw, User } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';

const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com';

type Period = 'all-time' | 'monthly' | 'weekly';

interface RankingEntry {
  rank: number;
  handle: string;
  display_name: string;
  total_honey: number;
  sessions_played: number;
  best_level: number;
  win_count: number;
  accuracy_rate: number;
  last_seen: string;
}

interface PlayerProfile extends RankingEntry {
  first_seen: string;
  correct_answers: number;
  total_answers: number;
  recent_sessions: Array<{
    session_id: string;
    final_status: string;
    final_level: number;
    total_earned: number;
    joined_at: string;
  }>;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  'all-time': 'Geral',
  'monthly': 'Este Mês',
  'weekly': 'Esta Semana',
};

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const STATUS_LABELS: Record<string, string> = {
  winner: 'Campeão',
  eliminated: 'Eliminado',
  quit: 'Desistiu',
};

function formatHoney(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d atrás`;
  if (days < 365) return `${Math.floor(days / 30)}m atrás`;
  return `${Math.floor(days / 365)}a atrás`;
}

const PublicRanking: React.FC = () => {
  const [period, setPeriod] = useState<Period>('all-time');
  const [players, setPlayers] = useState<RankingEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: 20, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchRanking = useCallback(async (p: Period, offset = 0) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ranking?period=${p}&limit=20&offset=${offset}`);
      if (!res.ok) throw new Error('Falha ao carregar ranking');
      const data = await res.json();
      setPlayers(data.players || []);
      setPagination(data.pagination || { total: 0, limit: 20, offset });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking(period, 0);
  }, [period, fetchRanking]);

  const fetchProfile = async (handle: string) => {
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ranking/${handle}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  const filteredPlayers = search.trim()
    ? players.filter(p =>
        p.handle.includes(search.toLowerCase().replace('@', '')) ||
        p.display_name.toLowerCase().includes(search.toLowerCase())
      )
    : players;

  // ── Profile Modal ──
  if (selectedProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => setSelectedProfile(null)} className="mb-4">
          ← Voltar ao Ranking
        </Button>
        <Card variant="glass" padding="lg">
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <User size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedProfile.display_name}</h2>
                <p className="text-gray-400">@{selectedProfile.handle}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Mel total', value: formatHoney(selectedProfile.total_honey), icon: '🍯' },
                { label: 'Partidas', value: selectedProfile.sessions_played, icon: '🎮' },
                { label: 'Vitórias', value: selectedProfile.win_count, icon: '🏆' },
                { label: 'Precisão', value: `${selectedProfile.accuracy_rate}%`, icon: '🎯' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs text-gray-500 mb-6">
              <span>Nível máximo: <span className="text-white font-semibold">{selectedProfile.best_level}</span></span>
              <span>Desde {new Date(selectedProfile.first_seen).toLocaleDateString('pt-BR')}</span>
            </div>

            {/* Recent sessions */}
            {selectedProfile.recent_sessions?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Últimas partidas</h3>
                <div className="space-y-2">
                  {selectedProfile.recent_sessions.map(s => (
                    <div key={s.session_id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                      <span className={
                        s.final_status === 'winner' ? 'text-yellow-400' :
                        s.final_status === 'eliminated' ? 'text-red-400' : 'text-gray-400'
                      }>
                        {STATUS_LABELS[s.final_status] || s.final_status}
                      </span>
                      <span className="text-white">Nível {s.final_level}</span>
                      <span className="text-yellow-400">🍯 {formatHoney(s.total_earned)}</span>
                      <span className="text-gray-500">{timeAgo(s.joined_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main Leaderboard ──
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <Trophy size={30} className="text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Ranking do Melzão</h1>
        <p className="text-gray-400 text-sm">Os maiores colecionadores de mel do Show</p>
      </div>

      {/* Period Tabs */}
      <div className="flex justify-center gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p
                ? 'bg-yellow-500 text-black'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Search + Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar jogador ou @handle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
          />
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={16} />} onClick={() => fetchRanking(period, 0)}>
          <span className="sr-only">Atualizar</span>
        </Button>
      </div>

      {/* Table */}
      <Card variant="glass" padding="none">
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full w-10 h-10 border-2 border-transparent border-b-yellow-400" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>{search ? 'Nenhum jogador encontrado.' : 'Nenhuma partida registrada ainda.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 font-medium">
                <span className="col-span-1">#</span>
                <span className="col-span-4">Jogador</span>
                <span className="col-span-2 text-right">🍯 Mel</span>
                <span className="col-span-2 text-right hidden sm:block">Nível</span>
                <span className="col-span-2 text-right hidden sm:block">Precisão</span>
                <span className="col-span-1 text-right">🏆</span>
              </div>

              {filteredPlayers.map(player => (
                <div
                  key={player.handle}
                  onClick={() => fetchProfile(player.handle)}
                  className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors items-center"
                >
                  {/* Rank */}
                  <span className="col-span-1 text-lg">
                    {RANK_ICONS[player.rank] || (
                      <span className="text-gray-500 text-sm font-mono">{player.rank}</span>
                    )}
                  </span>

                  {/* Player */}
                  <div className="col-span-4">
                    <p className="text-white font-semibold text-sm truncate">{player.display_name}</p>
                    <p className="text-gray-500 text-xs">@{player.handle}</p>
                  </div>

                  {/* Honey */}
                  <span className="col-span-2 text-right text-yellow-400 font-bold text-sm">
                    {formatHoney(player.total_honey)}
                  </span>

                  {/* Best Level */}
                  <span className="col-span-2 text-right text-gray-300 text-sm hidden sm:block">
                    {player.best_level}
                  </span>

                  {/* Accuracy */}
                  <span className="col-span-2 text-right text-blue-300 text-sm hidden sm:block">
                    {player.accuracy_rate}%
                  </span>

                  {/* Wins */}
                  <span className="col-span-1 text-right text-gray-400 text-sm">
                    {player.win_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!search && pagination.total > pagination.limit && (
        <div className="flex justify-center gap-3">
          <Button
            variant="ghost" size="sm"
            disabled={pagination.offset === 0}
            onClick={() => fetchRanking(period, Math.max(0, pagination.offset - pagination.limit))}
          >
            ← Anterior
          </Button>
          <span className="text-gray-400 text-sm self-center">
            {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <Button
            variant="ghost" size="sm"
            disabled={pagination.offset + pagination.limit >= pagination.total}
            onClick={() => fetchRanking(period, pagination.offset + pagination.limit)}
          >
            Próximo →
          </Button>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-gray-600">
        Clique em um jogador para ver o perfil completo
      </p>
    </div>
  );
};

export default PublicRanking;
