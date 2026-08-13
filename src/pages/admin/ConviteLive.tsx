import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  Database,
  ChevronDown,
  ChevronUp,
  Globe,
  Info,
  Pencil,
  X,
} from 'lucide-react';
import { Repository } from '../../lib/repository';
import type { LiveInvite } from '../../types/zhaya';

const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- ZHAYA MATCH - SETUP DE CONVITES DE LIVE (100% COMPLETO E IDEMPOTENTE)
-- ==============================================================================
-- Execute este script no SQL Editor do Supabase para habilitar o armazenamento
-- persistente de convites de lives, suporte à edição, contador de cliques e plataforma.
-- ==============================================================================

-- 1. Criação da tabela live_invites
CREATE TABLE IF NOT EXISTS public.live_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  platform_url TEXT DEFAULT 'https://instagram.com/shoes.zhaya',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  active BOOLEAN NOT NULL DEFAULT true,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

-- 2. Garante todas as colunas caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.live_invites ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.live_invites ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'instagram';
ALTER TABLE public.live_invites ADD COLUMN IF NOT EXISTS platform_url TEXT DEFAULT 'https://instagram.com/shoes.zhaya';
ALTER TABLE public.live_invites ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_live_invites_slug ON public.live_invites(slug);
CREATE INDEX IF NOT EXISTS idx_live_invites_created_at ON public.live_invites(created_at DESC);

-- 4. Habilitação de Segurança por Linha (RLS)
ALTER TABLE public.live_invites ENABLE ROW LEVEL SECURITY;

-- 5. Permissões de isolamento estrito
REVOKE ALL ON public.live_invites FROM anon, authenticated;
GRANT ALL ON public.live_invites TO service_role;

-- 6. Função atômica para incremento seguro de cliques
CREATE OR REPLACE FUNCTION public.increment_live_invite_clicks(invite_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.live_invites
  SET clicks = clicks + 1
  WHERE slug = invite_slug
  RETURNING clicks INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.increment_live_invite_clicks(TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_live_invite_clicks(TEXT) TO service_role;

-- 7. Recarga do schema cache do PostgREST / Supabase API
NOTIFY pgrst, 'reload schema';`;

function parseIsoToLocalDateTime(isoStr: string) {
  try {
    const d = new Date(isoStr);
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

    const timeParts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);

    return { date: dateParts, time: timeParts };
  } catch {
    return { date: '', time: '' };
  }
}

export const ConviteLive: React.FC = () => {
  const [invites, setInvites] = useState<LiveInvite[]>([]);
  const [tableConfigured, setTableConfigured] = useState<boolean>(false);
  const [storageMode, setStorageMode] = useState<'supabase' | 'in_memory'>('in_memory');
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State (Novo Convite)
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('20:30');
  const [platform, setPlatform] = useState<string>('instagram');
  const [platformUrl, setPlatformUrl] = useState('https://instagram.com/shoes.zhaya');
  const [description, setDescription] = useState('');

  // Edit Modal State
  const [editingInvite, setEditingInvite] = useState<LiveInvite | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('19:30');
  const [editEndTime, setEditEndTime] = useState('20:30');
  const [editPlatform, setEditPlatform] = useState<string>('instagram');
  const [editPlatformUrl, setEditPlatformUrl] = useState('https://instagram.com/shoes.zhaya');
  const [editDescription, setEditDescription] = useState('');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Feedback State
  const [latestCreated, setLatestCreated] = useState<LiveInvite | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  // Load Invites
  const loadInvites = async () => {
    try {
      setLoading(true);
      const info = await Repository.getLiveInvitesInfo();
      setInvites(info.invites);
      setTableConfigured(info.tableConfigured);
      setStorageMode(info.storageMode);
    } catch (err: any) {
      console.error('Erro ao carregar convites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();

    // Default to tomorrow for convenience
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const handlePlatformSelect = (selectedPlatform: string) => {
    setPlatform(selectedPlatform);
    if (selectedPlatform === 'instagram') {
      setPlatformUrl('https://instagram.com/shoes.zhaya');
    } else if (selectedPlatform === 'tiktok') {
      setPlatformUrl('https://tiktok.com/@shoes.zhaya');
    } else if (selectedPlatform === 'youtube') {
      setPlatformUrl('https://youtube.com/@shoes.zhaya');
    }
  };

  const handleEditPlatformSelect = (selectedPlatform: string) => {
    setEditPlatform(selectedPlatform);
    if (selectedPlatform === 'instagram' && (!editPlatformUrl || editPlatformUrl.includes('tiktok') || editPlatformUrl.includes('youtube'))) {
      setEditPlatformUrl('https://instagram.com/shoes.zhaya');
    } else if (selectedPlatform === 'tiktok' && (!editPlatformUrl || editPlatformUrl.includes('instagram') || editPlatformUrl.includes('youtube'))) {
      setEditPlatformUrl('https://tiktok.com/@shoes.zhaya');
    } else if (selectedPlatform === 'youtube' && (!editPlatformUrl || editPlatformUrl.includes('instagram') || editPlatformUrl.includes('tiktok'))) {
      setEditPlatformUrl('https://youtube.com/@shoes.zhaya');
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Informe o título da live.');
      return;
    }

    if (!date || !startTime || !endTime) {
      setError('Preencha a data e os horários de início e término.');
      return;
    }

    const startsAt = new Date(`${date}T${startTime}:00-03:00`).toISOString();
    const endsAt = new Date(`${date}T${endTime}:00-03:00`).toISOString();

    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    setCreating(true);
    try {
      const res = await Repository.createLiveInvite({
        title: title.trim(),
        description: description.trim() || undefined,
        platform,
        platformUrl: platformUrl.trim() || 'https://instagram.com/shoes.zhaya',
        startsAt,
        endsAt,
      });

      if (res.success && res.invite) {
        setLatestCreated(res.invite);
        setTitle('');
        setDescription('');
        await loadInvites();
      } else {
        setError(res.error || 'Erro ao criar convite.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao gerar convite.');
    } finally {
      setCreating(false);
    }
  };

  // Abrir Modal de Edição
  const startEditing = (inv: LiveInvite) => {
    const { date: dStart, time: tStart } = parseIsoToLocalDateTime(inv.startsAt);
    const { time: tEnd } = parseIsoToLocalDateTime(inv.endsAt);

    setEditingInvite(inv);
    setEditTitle(inv.title);
    setEditDate(dStart);
    setEditStartTime(tStart || '19:30');
    setEditEndTime(tEnd || '20:30');
    setEditPlatform(inv.platform || 'instagram');
    setEditPlatformUrl(inv.platformUrl || 'https://instagram.com/shoes.zhaya');
    setEditDescription(inv.description || '');
    setEditActive(inv.active ?? true);
    setEditError(null);
    setEditSuccessMsg(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvite) return;

    setEditError(null);
    setEditSuccessMsg(null);

    if (!editTitle.trim()) {
      setEditError('O título da live é obrigatório.');
      return;
    }

    if (!editDate || !editStartTime || !editEndTime) {
      setEditError('Preencha a data e os horários.');
      return;
    }

    const startsAt = new Date(`${editDate}T${editStartTime}:00-03:00`).toISOString();
    const endsAt = new Date(`${editDate}T${editEndTime}:00-03:00`).toISOString();

    if (new Date(endsAt) <= new Date(startsAt)) {
      setEditError('O horário de término deve ser posterior ao início.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await Repository.updateLiveInvite(editingInvite.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        platform: editPlatform,
        platformUrl: editPlatformUrl.trim() || 'https://instagram.com/shoes.zhaya',
        startsAt,
        endsAt,
        active: editActive,
      });

      if (res.success && res.invite) {
        const updated = res.invite;
        setInvites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        if (latestCreated?.id === updated.id) {
          setLatestCreated(updated);
        }
        setEditSuccessMsg('Convite atualizado com sucesso!');
        setTimeout(() => {
          setEditingInvite(null);
          setEditSuccessMsg(null);
        }, 1200);
      } else {
        setEditError(res.error || 'Erro ao atualizar convite.');
      }
    } catch (err: any) {
      setEditError(err?.message || 'Erro inesperado ao salvar alterações.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopy = (slug: string, id: string) => {
    const url = `${window.location.origin}/live/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => {
      setCopiedSql(false);
    }, 2500);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este convite de live?')) {
      return;
    }
    const success = await Repository.deleteLiveInvite(id);
    if (success) {
      if (latestCreated?.id === id) {
        setLatestCreated(null);
      }
      setInvites((prev) => prev.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neutral-700" />
            Convite de Live
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Crie, edite e gerencie links exclusivos para o seu público adicionar as lives à agenda e assistir com um clique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {storageMode === 'supabase' && tableConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Supabase Conectado
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowSqlGuide((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200 transition-colors cursor-pointer"
              title="A tabela no Supabase é opcional. Clique para ver instruções."
            >
              <Database className="w-3 h-3 text-neutral-500" />
              <span>Modo Opcional Ativo</span>
              {showSqlGuide ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Box de Guia SQL (Opcional) */}
      {showSqlGuide && (
        <div className="bg-neutral-900 text-white rounded-lg p-5 space-y-4 shadow-sm border border-neutral-800 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                SQL de Persistência no Supabase (100% Opcional)
              </h3>
            </div>

            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SQL Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPIAR SQL</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            A criação da tabela é <strong>totalmente opcional</strong>. O gerador de convites funciona de imediato. Caso queira salvar os convites permanentemente no seu banco Supabase, cole e execute o script abaixo no <strong>Supabase SQL Editor</strong>:
          </p>

          <div className="relative bg-black rounded p-3 border border-neutral-800 overflow-x-auto max-h-48">
            <pre className="text-[11px] font-mono text-neutral-300 whitespace-pre">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        </div>
      )}

      {/* Card: Gerador de Convite */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
          Criar Novo Convite
        </h2>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Título da Live *
            </label>
            <input
              id="live-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lançamento Coleção Especial Zhaya"
              required
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Data *
              </label>
              <input
                id="live-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Horário de Início *
              </label>
              <input
                id="live-start-time-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Horário de Término *
              </label>
              <input
                id="live-end-time-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
              />
            </div>
          </div>

          {/* Configuração de Plataforma e Link da Live */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Plataforma da Live
              </label>
              <select
                id="live-platform-select"
                value={platform}
                onChange={(e) => handlePlatformSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
              >
                <option value="instagram">Instagram (@shoes.zhaya)</option>
                <option value="tiktok">TikTok (@shoes.zhaya)</option>
                <option value="youtube">YouTube (@shoes.zhaya)</option>
                <option value="custom">Outro / Link Direto</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Link da Live / Perfil *
              </label>
              <input
                id="live-platform-url-input"
                type="url"
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                placeholder="https://instagram.com/shoes.zhaya"
                required
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white font-mono"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Quando a live estiver ao vivo, o botão levará o público diretamente para este link.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Descrição do Evento (Opcional — incluída no calendário)
            </label>
            <textarea
              id="live-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Venha conferir as novas peças exclusivas no Instagram @shoes.zhaya."
              rows={2}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
              <Globe className="w-3.5 h-3.5" />
              <span>Fuso horário: <strong>America/Sao_Paulo (Brasília)</strong></span>
            </div>

            <button
              id="btn-gerar-convite"
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 bg-neutral-900 text-white rounded-md text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {creating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gerando convite...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>GERAR CONVITE</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Feedback do Convite Recém-Gerado */}
      {latestCreated && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Convite Gerado com Sucesso!
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-emerald-900 font-semibold">
                Cliques: {latestCreated.clicks ?? 0}
              </span>
              <span className="text-emerald-700 font-medium">
                /{latestCreated.slug}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-emerald-800 font-medium">
              {latestCreated.title}
            </p>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] uppercase font-semibold">
              {latestCreated.platform || 'instagram'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
            <div className="flex-1 bg-white border border-emerald-300 rounded px-3 py-2 text-xs font-mono text-neutral-800 truncate select-all">
              {`${window.location.origin}/live/${latestCreated.slug}`}
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-editar-convite-destaque"
                type="button"
                onClick={() => startEditing(latestCreated)}
                className="px-3 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Editar este convite"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>

              <button
                id="btn-copiar-link-destaque"
                type="button"
                onClick={() => handleCopy(latestCreated.slug, latestCreated.id)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedId === latestCreated.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPIAR LINK</span>
                  </>
                )}
              </button>

              <a
                id="btn-visualizar-convite-destaque"
                href={`/live/${latestCreated.slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visualizar</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Convites Anteriores */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
          Convites Gerados ({invites.length})
        </h2>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs flex flex-col items-center gap-2">
            <Info className="w-4 h-4 text-neutral-400" />
            <span>Nenhum convite gerado até o momento. Preencha o formulário acima para criar o primeiro.</span>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {invites.map((inv) => {
              const startDate = new Date(inv.startsAt);
              const endDate = new Date(inv.endsAt);
              const isEnded = endDate.getTime() < Date.now();

              const formattedStart = startDate.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                dateStyle: 'short',
                timeStyle: 'short',
              });
              const formattedEndTime = endDate.toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                timeStyle: 'short',
              });

              return (
                <div
                  key={inv.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 truncate">
                        {inv.title}
                      </span>
                      <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] uppercase font-mono">
                        {inv.platform || 'instagram'}
                      </span>
                      {inv.active === false ? (
                        <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded text-[10px] font-medium">
                          Inativo
                        </span>
                      ) : isEnded ? (
                        <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded text-[10px] font-medium">
                          Encerrado
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-neutral-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        {formattedStart} às {formattedEndTime}
                      </span>
                      <span>•</span>
                      <span className="text-neutral-400">/{inv.slug}</span>
                      <span>•</span>
                      <span className="font-semibold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded text-[10px]" title="Total de cliques no botão">
                        Cliques: {inv.clicks ?? 0}
                      </span>
                      {inv.platformUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={inv.platformUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neutral-600 hover:text-neutral-900 underline truncate max-w-[160px]"
                          >
                            {inv.platformUrl.replace(/^https?:\/\//, '')}
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`btn-edit-live-${inv.id}`}
                      type="button"
                      onClick={() => startEditing(inv)}
                      className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Editar convite de live"
                    >
                      <Pencil className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(inv.slug, inv.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copiar link do convite"
                    >
                      {copiedId === inv.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`/live/${inv.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded flex items-center gap-1 transition-colors"
                      title="Visualizar convite público"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Ver</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDelete(inv.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="Excluir convite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição de Convite de Live */}
      {editingInvite && (
        <div
          id="modal-editar-live"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Editar Convite de Live
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvite(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              <div className="text-[11px] text-neutral-500 font-mono bg-neutral-50 p-2 rounded border border-neutral-200 flex items-center justify-between">
                <span>Slug permanente: <strong>/{editingInvite.slug}</strong></span>
                <span>Cliques registrados: <strong>{editingInvite.clicks ?? 0}</strong></span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título da Live *
                </label>
                <input
                  id="edit-live-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ex: Lançamento Coleção Especial Zhaya"
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Data *
                  </label>
                  <input
                    id="edit-live-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Início *
                  </label>
                  <input
                    id="edit-live-start-time"
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Término *
                  </label>
                  <input
                    id="edit-live-end-time"
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                  />
                </div>
              </div>

              {/* Plataforma e Link */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Plataforma
                  </label>
                  <select
                    id="edit-live-platform"
                    value={editPlatform}
                    onChange={(e) => handleEditPlatformSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="custom">Outro / Link Direto</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Link da Live / Perfil *
                  </label>
                  <input
                    id="edit-live-platform-url"
                    type="url"
                    value={editPlatformUrl}
                    onChange={(e) => setEditPlatformUrl(e.target.value)}
                    placeholder="https://instagram.com/shoes.zhaya"
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Descrição do Evento (Opcional)
                </label>
                <textarea
                  id="edit-live-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Ex: Venha conferir as novas peças exclusivas no Instagram @shoes.zhaya."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-live-active"
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                />
                <label htmlFor="edit-live-active" className="text-xs font-medium text-neutral-700 cursor-pointer">
                  Convite Ativo (desmarque para desativar o link público)
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingInvite(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-edicao-live"
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 rounded text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>SALVAR ALTERAÇÕES</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
