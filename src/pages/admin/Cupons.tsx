import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  Film,
  Gift,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  MousePointerClick,
  MapPin,
  Monitor,
  Link2,
  Plus,
  RefreshCw,
  Save,
  ShoppingBag,
  TicketPercent,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { uploadFileToCloudinary } from '../../lib/cloudinaryMedia';
import { CloudinaryMediaPicker } from '../../components/admin/CloudinaryMediaPicker';
import type { CouponAnalyticsSummary, CouponCampaign, CouponUnlockMode } from '../../types/coupon';

const emptyCampaign = (): CouponCampaign => ({
  id: '',
  name: 'Nova campanha',
  slug: `cupom-${new Date().toISOString().slice(0, 10)}`,
  active: false,
  eyebrow: 'CUPOM DA LIVE',
  title: 'Uma oferta liberada para você',
  subtitle: 'Desbloqueie o cupom e aproveite a campanha no site.',
  logoUrl: null,
  backgroundColor: '#000000',
  backgroundImageUrl: null,
  backgroundVideoUrl: null,
  backgroundOverlay: 0.34,
  backgroundBlur: 0,
  textColor: '#FFFFFF',
  mutedTextColor: '#B7B7B7',
  accentColor: '#FFFFFF',
  buttonBackgroundColor: '#FFFFFF',
  buttonTextColor: '#000000',
  timerColor: '#FFFFFF',
  couponCode: 'LIVE10',
  unlockMode: 'immediate',
  unlockDelaySeconds: 10,
  unlockVideoUrl: null,
  unlockVideoMinPercent: 80,
  unlockButtonText: 'Desbloquear cupom',
  waitingText: 'Seu cupom será liberado em instantes.',
  successTitle: 'Cupom desbloqueado',
  successMessage: 'Copie o código e use no site para aproveitar a oferta.',
  copyButtonText: 'Copiar cupom',
  copiedText: 'Cupom copiado',
  siteCtaEnabled: true,
  siteCtaText: 'Aproveitar oferta',
  siteUrl: 'https://www.zhaya.com.br/',
  scheduleEnabled: false,
  unlockStartsAt: null,
  unlockEndsAt: null,
  timerEnabled: true,
  timerLabel: 'Termina em',
  timerLooping: false,
  timerDurationMinutes: 120,
  timerEndAt: null,
  maxUnlocks: null,
  showRemaining: false,
  showMaxUnlocks: false,
});

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

async function authHeaders() {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function couponApi(mode: string, options: RequestInit = {}, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ mode: `coupon-${mode}`, ...params });
  const headers = await authHeaders();
  const response = await fetch(`/api/best-sellers?${query.toString()}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data?.message || data?.error || 'Erro ao acessar o módulo de cupons.');
    err.code = data?.error;
    throw err;
  }
  return data;
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-700 mb-1.5">
      {children}
      {hint && <span className="normal-case tracking-normal font-normal text-neutral-400 ml-1">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-4 text-left py-2 cursor-pointer">
      <div>
        <div className="text-xs font-bold text-neutral-900">{label}</div>
        {description && <div className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <span className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

function MediaField({
  label,
  value,
  type,
  purpose,
  onChange,
}: {
  label: string;
  value: string | null;
  type: 'image' | 'video';
  purpose: string;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const asset = await uploadFileToCloudinary(file, type, `coupons/${purpose}`);
      onChange(asset.url);
    } catch (err: any) {
      setError(err?.message || 'Falha no upload.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="px-3 py-2 border border-neutral-300 rounded bg-white text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-50 cursor-pointer disabled:opacity-50">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Enviar {type === 'video' ? 'vídeo' : 'imagem'}
        </button>
        <CloudinaryMediaPicker
          allowedTypes={[type]}
          label="Selecionar já enviado"
          onSelect={(asset) => onChange(asset.url)}
        />
        {value && <button type="button" onClick={() => onChange(null)} className="px-3 py-2 border border-red-200 rounded bg-white text-[11px] font-semibold text-red-600 cursor-pointer">Remover</button>}
      </div>
      <input ref={inputRef} type="file" className="hidden" accept={type === 'video' ? 'video/*' : 'image/*'} onChange={(e) => upload(e.target.files?.[0])} />
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="ou cole uma URL https://..."
        className="w-full mt-2 px-3 py-2.5 border border-neutral-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
      />
      {value && (
        <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden max-h-52 flex items-center justify-center">
          {type === 'video' ? <video src={value} className="max-h-52 max-w-full" muted controls /> : <img src={value} alt="" className="max-h-52 max-w-full object-contain" />}
        </div>
      )}
      {error && <div className="text-[10px] text-red-600 mt-1.5">{error}</div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-neutral-200 rounded-xl bg-white p-4">
      <div className="flex items-center gap-2 text-neutral-500"><Icon className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</span></div>
      <div className="text-2xl font-black text-neutral-900 mt-2 tracking-tight">{value}</div>
      {sub && <div className="text-[10px] text-neutral-400 mt-1">{sub}</div>}
    </div>
  );
}

function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes < 60) return secs ? `${minutes}m ${secs}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function referrerLabel(value: string) {
  if (!value || value === 'Direto / não identificado') return 'Direto / não identificado';
  try { return new URL(value).hostname.replace(/^www\./, '') || value; } catch { return value; }
}

function CouponHourlyChart({ items }: { items: CouponAnalyticsSummary['hourlyVisitors'] }) {
  const max = Math.max(1, ...items.map((item) => Math.max(item.visitors, item.unlocks)));
  return (
    <div className="border border-neutral-200 rounded-xl bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-4"><div><div className="text-[10px] font-black uppercase tracking-[0.1em] text-neutral-600">Horários</div><div className="text-[10px] text-neutral-400 mt-0.5">Visitantes únicos e desbloqueios por hora</div></div></div>
      <div className="h-36 flex items-end gap-1">
        {items.map((item) => (
          <div key={item.hour} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1" title={`${String(item.hour).padStart(2, '0')}:00 · ${item.visitors} visitantes · ${item.unlocks} desbloqueios`}>
            <div className="w-full flex items-end justify-center gap-[2px] h-[105px]">
              <div className="w-[42%] bg-neutral-900 rounded-t-sm min-h-[2px]" style={{ height: `${Math.max(2, (item.visitors / max) * 100)}%` }} />
              <div className="w-[42%] bg-neutral-300 rounded-t-sm min-h-[2px]" style={{ height: `${Math.max(2, (item.unlocks / max) * 100)}%` }} />
            </div>
            <span className="text-[8px] text-neutral-400 tabular-nums">{item.hour % 3 === 0 ? String(item.hour).padStart(2, '0') : ''}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[9px] text-neutral-500"><span className="inline-flex items-center gap-1"><i className="w-2 h-2 bg-neutral-900 rounded-sm" />Visitantes</span><span className="inline-flex items-center gap-1"><i className="w-2 h-2 bg-neutral-300 rounded-sm" />Desbloqueios</span></div>
    </div>
  );
}

export function Cupons() {
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<CouponCampaign | null>(null);
  const [analytics, setAnalytics] = useState<CouponAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const selected = useMemo(() => campaigns.find((item) => item.id === selectedId) || null, [campaigns, selectedId]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase não está configurado no projeto.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await couponApi('admin-list', { method: 'GET' });
      const next = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(next);
      setTableMissing(false);
      setSelectedId((current) => {
        if (current === 'new') return current;
        if (current && next.some((item: CouponCampaign) => item.id === current)) return current;
        return next[0]?.id || null;
      });
    } catch (err: any) {
      if (err?.code === 'COUPONS_TABLE_MISSING') setTableMissing(true);
      else setError(err?.message || 'Não foi possível carregar as campanhas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedId === 'new') {
      setDraft((current) => current && !current.id ? current : emptyCampaign());
      setAnalytics(null);
      return;
    }
    if (selected) setDraft({ ...selected });
    else if (selectedId === null) setDraft(null);
  }, [selected, selectedId]);

  const loadAnalytics = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const data = await couponApi('analytics', { method: 'GET' }, { id });
      setAnalytics(data.analytics || null);
    } catch {
      setAnalytics(null);
    }
  }, []);

  useEffect(() => {
    if (!draft?.id) { setAnalytics(null); return; }
    loadAnalytics(draft.id);
    const id = window.setInterval(() => loadAnalytics(draft.id), 15000);
    return () => window.clearInterval(id);
  }, [draft?.id, loadAnalytics]);

  const patch = <K extends keyof CouponCampaign>(key: K, value: CouponCampaign[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const newCampaign = () => {
    setSelectedId('new');
    setDraft(emptyCampaign());
    setAnalytics(null);
  };

  const save = async () => {
    if (!draft || saving) return;
    if (!draft.name.trim()) { setError('Dê um nome interno para a campanha.'); return; }
    if (!draft.slug.trim()) { setError('Defina um endereço para a campanha.'); return; }
    if (!draft.couponCode?.trim()) { setError('Informe o código do cupom.'); return; }
    if (draft.siteCtaEnabled && !draft.siteUrl?.trim()) { setError('Informe a URL do site ou desligue o CTA.'); return; }
    if (draft.unlockMode === 'video' && !draft.unlockVideoUrl) { setError('No modo vídeo, escolha o vídeo que libera o cupom.'); return; }
    if (draft.scheduleEnabled && !draft.unlockStartsAt) { setError('No Modo Live programado, informe quando o cupom será liberado.'); return; }
    if (draft.timerEnabled && draft.timerLooping && (!draft.timerDurationMinutes || draft.timerDurationMinutes < 1 || draft.timerDurationMinutes > 10080)) { setError('Informe uma duração entre 1 minuto e 7 dias para o timer em looping.'); return; }
    if (draft.unlockStartsAt && draft.unlockEndsAt && new Date(draft.unlockEndsAt).getTime() <= new Date(draft.unlockStartsAt).getTime()) {
      setError('O encerramento precisa acontecer depois da liberação.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = { ...draft, slug: slugify(draft.slug) };
      const data = await couponApi('admin-save', { method: draft.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      const saved: CouponCampaign = data.campaign;
      setCampaigns((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current];
      });
      setSelectedId(saved.id);
      setDraft(saved);
    } catch (err: any) {
      setError(err?.code === 'SLUG_ALREADY_EXISTS' ? 'Esse endereço já pertence a outra campanha.' : (err?.message || 'Não foi possível salvar.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || deleting) return;
    if (!window.confirm(`Excluir a campanha “${draft.name}”? Os analytics dela também serão removidos.`)) return;
    setDeleting(true);
    try {
      await couponApi('admin-delete', { method: 'DELETE' }, { id: draft.id });
      const next = campaigns.filter((item) => item.id !== draft.id);
      setCampaigns(next);
      setSelectedId(next[0]?.id || null);
      setDraft(next[0] || null);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir a campanha.');
    } finally {
      setDeleting(false);
    }
  };

  const publicUrl = draft?.id && draft.slug && typeof window !== 'undefined' ? `${window.location.origin}/cupom/${draft.slug}` : '';
  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl).catch(() => undefined);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>;
  }

  if (tableMissing) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6"><TicketPercent className="w-6 h-6" /><div><h1 className="text-xl font-black">Cupons</h1><p className="text-xs text-neutral-500">Campanhas de desbloqueio para live e ações promocionais.</p></div></div>
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-5">
          <h2 className="text-sm font-bold text-amber-900">Falta preparar o Supabase</h2>
          <p className="text-xs text-amber-800 mt-2 leading-relaxed">Execute o arquivo <strong>ZHAYA_MATCH_CUPONS_SETUP.sql</strong> no SQL Editor do Supabase e depois clique em atualizar.</p>
          <button type="button" onClick={load} className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded text-xs font-bold inline-flex items-center gap-2 cursor-pointer"><RefreshCw className="w-4 h-4" />Atualizar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center"><TicketPercent className="w-5 h-5" /></div>
          <div><h1 className="text-xl font-black tracking-tight">Cupons</h1><p className="text-xs text-neutral-500 mt-0.5">Crie drops de cupom para lives e campanhas com desbloqueio mensurável.</p></div>
        </div>
        <button type="button" onClick={newCampaign} className="px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"><Plus className="w-4 h-4" />Nova campanha</button>
      </div>

      {error && <div className="mb-5 p-3 border border-red-200 bg-red-50 rounded-lg text-xs text-red-700">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        <aside className="border border-neutral-200 rounded-xl bg-white overflow-hidden xl:sticky xl:top-0">
          <div className="p-3 border-b border-neutral-200 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">Campanhas</span><span className="text-[10px] text-neutral-400">{campaigns.length}</span></div>
          <div className="max-h-[70vh] overflow-y-auto p-2 space-y-1">
            {selectedId === 'new' && <button type="button" className="w-full text-left p-3 rounded-lg bg-neutral-900 text-white"><div className="text-xs font-bold">Nova campanha</div><div className="text-[10px] opacity-60 mt-1">Ainda não salva</div></button>}
            {campaigns.map((campaign) => (
              <button key={campaign.id} type="button" onClick={() => setSelectedId(campaign.id)} className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${selectedId === campaign.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100 text-neutral-800'}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold truncate">{campaign.name}</span><span className={`w-2 h-2 rounded-full shrink-0 ${campaign.active ? 'bg-emerald-400' : 'bg-neutral-300'}`} /></div>
                <div className={`text-[10px] mt-1 truncate ${selectedId === campaign.id ? 'text-white/55' : 'text-neutral-400'}`}>/cupom/{campaign.slug}</div>
                {typeof campaign.totalUnlocks === 'number' && <div className={`text-[10px] mt-1 ${selectedId === campaign.id ? 'text-white/65' : 'text-neutral-500'}`}>{campaign.totalUnlocks} desbloqueios</div>}
              </button>
            ))}
            {campaigns.length === 0 && selectedId !== 'new' && <div className="text-xs text-neutral-400 text-center py-10">Nenhuma campanha criada.</div>}
          </div>
        </aside>

        {!draft ? (
          <div className="border border-dashed border-neutral-300 rounded-xl min-h-[420px] flex items-center justify-center p-8 text-center">
            <div><Gift className="w-9 h-9 text-neutral-300 mx-auto mb-3" /><div className="text-sm font-bold text-neutral-700">Crie sua primeira campanha</div><p className="text-xs text-neutral-400 mt-1">O link público nasce pronto para usar na live.</p></div>
          </div>
        ) : (
          <div className="space-y-6 min-w-0">
            <div className="border border-neutral-200 rounded-xl bg-white p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.08em] ${draft.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{draft.active ? 'Ativa' : 'Inativa'}</span><span className="text-[10px] text-neutral-400 truncate">{publicUrl || 'Salve para gerar o link'}</span></div>
                <h2 className="text-lg font-black mt-2 truncate">{draft.name}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {publicUrl && <><button type="button" onClick={copyLink} className="px-3 py-2 border border-neutral-300 rounded text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"><Copy className="w-3.5 h-3.5" />{copiedLink ? 'Copiado' : 'Copiar link'}</button><a href={publicUrl} target="_blank" rel="noreferrer" className="px-3 py-2 border border-neutral-300 rounded text-[11px] font-bold inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />Abrir página</a></>}
                {draft.id && <button type="button" onClick={remove} disabled={deleting} className="px-3 py-2 border border-red-200 text-red-600 rounded text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">{deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}Excluir</button>}
                <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-neutral-900 text-white rounded text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Salvar</button>
              </div>
            </div>

            {draft.id && analytics && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600">Analytics da campanha</h3><p className="text-[10px] text-neutral-400 mt-0.5">Atualiza a cada 15s. Computadores são ignorados em todas as métricas.</p></div></div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <Stat icon={Users} label="Visitantes únicos" value={analytics.uniqueVisitors} sub={`${analytics.pageViews} visualizações`} />
                  <Stat icon={Clock3} label="Tempo médio ativo" value={formatDuration(analytics.averageEngagementSeconds)} sub={`mediana ${formatDuration(analytics.medianEngagementSeconds)}`} />
                  <Stat icon={LockKeyhole} label="Desbloqueados" value={analytics.unlocked} sub={`${analytics.unlockRate.toFixed(1)}% dos visitantes`} />
                  <Stat icon={Copy} label="Copiaram" value={analytics.copies} sub={`${analytics.copyRate.toFixed(1)}% dos desbloqueios`} />
                  <Stat icon={ShoppingBag} label="Foram ao site" value={analytics.siteClicks} sub={`${analytics.siteClickRate.toFixed(1)}% dos desbloqueios`} />
                  <Stat icon={Film} label="Vídeo iniciado" value={analytics.videoStarts} sub={`${analytics.videoCompleted} chegaram ao ponto de liberar`} />
                </div>

                <div className="border border-neutral-200 rounded-xl bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><div><div className="text-[10px] font-black uppercase tracking-[0.1em] text-neutral-600">Funil</div><div className="text-[10px] text-neutral-400 mt-0.5">Acompanha onde a pessoa abandona a campanha</div></div><div className="text-[10px] text-neutral-400">Tempo ativo total: <strong className="text-neutral-700">{formatDuration(analytics.totalEngagementSeconds)}</strong></div></div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      ['Visitaram', analytics.uniqueVisitors, 100],
                      ['Tocaram em desbloquear', analytics.unlockClicks, analytics.uniqueVisitors ? (analytics.unlockClicks / analytics.uniqueVisitors) * 100 : 0],
                      ['Desbloquearam', analytics.unlocked, analytics.unlockRate],
                      ['Foram ao site', analytics.siteClicks, analytics.uniqueVisitors ? (analytics.siteClicks / analytics.uniqueVisitors) * 100 : 0],
                    ].map(([label, value, rate]) => (
                      <div key={String(label)} className="rounded-lg bg-neutral-50 border border-neutral-200 p-3"><div className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">{label}</div><div className="text-xl font-black mt-1">{Number(value)}</div><div className="h-1.5 bg-neutral-200 rounded-full mt-2 overflow-hidden"><div className="h-full bg-neutral-900 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(rate)))}%` }} /></div><div className="text-[9px] text-neutral-400 mt-1">{Number(rate).toFixed(1)}%</div></div>
                    ))}
                  </div>
                </div>

                {!analytics.engagementConfigured && <div className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-[11px] text-amber-800">Execute o SQL V2 para liberar tempo ativo, visitantes únicos avançados e horários. O funil básico continua funcionando.</div>}

                <CouponHourlyChart items={analytics.hourlyVisitors || []} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="border border-neutral-200 rounded-xl bg-white p-4"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-600 mb-3"><Monitor className="w-3.5 h-3.5" />Dispositivos</div><div className="space-y-2">{analytics.devices.length ? analytics.devices.map((item) => <div key={item.deviceType} className="flex items-center justify-between text-[11px]"><span className="text-neutral-600">{item.deviceType === 'mobile' ? 'Mobile' : item.deviceType === 'tablet' ? 'Tablet' : 'Outro'}</span><strong>{item.count}</strong></div>) : <span className="text-[11px] text-neutral-400">Sem dados.</span>}<div className="pt-2 mt-2 border-t border-neutral-100 text-[10px] text-neutral-400">Desktop bloqueado do rastreio.</div></div></div>
                  <div className="border border-neutral-200 rounded-xl bg-white p-4"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-600 mb-3"><MapPin className="w-3.5 h-3.5" />Localização</div><div className="space-y-2 max-h-52 overflow-y-auto pr-1">{analytics.locations.length ? analytics.locations.slice(0, 20).map((item, index) => { const label = [item.city, item.region, item.countryCode].filter(Boolean).join(', ') || 'Não identificada'; return <div key={`${label}-${index}`} className="flex items-center justify-between gap-3 text-[11px]"><span className="truncate text-neutral-600" title={label}>{label}</span><span className="shrink-0"><strong>{item.count}</strong>{item.unlocks > 0 && <em className="not-italic text-[9px] text-neutral-400 ml-1">· {item.unlocks} unlock</em>}</span></div>; }) : <span className="text-[11px] text-neutral-400">Sem dados.</span>}</div></div>
                  <div className="border border-neutral-200 rounded-xl bg-white p-4"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-600 mb-3"><Link2 className="w-3.5 h-3.5" />Origem</div><div className="space-y-2 max-h-52 overflow-y-auto pr-1">{analytics.referrers.length ? analytics.referrers.slice(0, 20).map((item) => <div key={item.referrer} className="flex items-center justify-between gap-3 text-[11px]"><span className="truncate text-neutral-600" title={item.referrer}>{referrerLabel(item.referrer)}</span><strong>{item.count}</strong></div>) : <span className="text-[11px] text-neutral-400">Sem dados.</span>}</div></div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 items-start">
              <div className="space-y-6">
                <section className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4">
                  <div><h3 className="text-sm font-black">Campanha</h3><p className="text-[11px] text-neutral-500 mt-0.5">Nome interno, endereço e textos públicos.</p></div>
                  <div><FieldLabel>Nome interno</FieldLabel><input value={draft.name} onChange={(e) => patch('name', e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>
                  <div><FieldLabel>Endereço público</FieldLabel><div className="flex items-center"><span className="px-3 py-2.5 border border-r-0 border-neutral-300 bg-neutral-50 rounded-l text-[11px] text-neutral-400">/cupom/</span><input value={draft.slug} onChange={(e) => patch('slug', slugify(e.target.value))} className="min-w-0 flex-1 px-3 py-2.5 border border-neutral-300 rounded-r text-xs" /></div></div>
                  <Toggle checked={draft.active} onChange={(v) => patch('active', v)} label="Campanha ativa" description="Quando desligada, o link público fica indisponível para desbloqueio." />
                  <div><FieldLabel>Texto pequeno acima do título</FieldLabel><input value={draft.eyebrow || ''} onChange={(e) => patch('eyebrow', e.target.value || null)} placeholder="CUPOM DA LIVE" className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>
                  <div><FieldLabel>Título <span className="normal-case font-normal text-neutral-400">(opcional)</span></FieldLabel><input value={draft.title} onChange={(e) => patch('title', e.target.value)} placeholder="Deixe vazio para não exibir" className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>
                  <div><FieldLabel>Subtítulo</FieldLabel><textarea value={draft.subtitle || ''} onChange={(e) => patch('subtitle', e.target.value || null)} rows={3} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs resize-y" /></div>
                  <MediaField label="Logo customizada" value={draft.logoUrl} type="image" purpose="logos" onChange={(v) => patch('logoUrl', v)} />
                </section>

                <section className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4">
                  <div><h3 className="text-sm font-black">Cupom e CTA</h3><p className="text-[11px] text-neutral-500 mt-0.5">O código não é enviado na página pública antes do desbloqueio.</p></div>
                  <div><FieldLabel>Código do cupom</FieldLabel><input value={draft.couponCode || ''} onChange={(e) => patch('couponCode', e.target.value)} className="w-full px-3 py-3 border border-neutral-300 rounded text-lg font-black tracking-wider uppercase" /></div>
                  <div className="grid sm:grid-cols-2 gap-3"><div><FieldLabel>Botão para desbloquear</FieldLabel><input value={draft.unlockButtonText} onChange={(e) => patch('unlockButtonText', e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div><div><FieldLabel>Botão para copiar</FieldLabel><input value={draft.copyButtonText} onChange={(e) => patch('copyButtonText', e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div></div>
                  <div className="grid sm:grid-cols-2 gap-3"><div><FieldLabel>Título após liberar</FieldLabel><input value={draft.successTitle || ''} onChange={(e) => patch('successTitle', e.target.value || null)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div><div><FieldLabel>Texto após copiar</FieldLabel><input value={draft.copiedText} onChange={(e) => patch('copiedText', e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div></div>
                  <div><FieldLabel>Mensagem após liberar</FieldLabel><textarea value={draft.successMessage || ''} onChange={(e) => patch('successMessage', e.target.value || null)} rows={2} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs resize-y" /></div>
                  <Toggle checked={draft.siteCtaEnabled} onChange={(v) => patch('siteCtaEnabled', v)} label="CTA para o site" description="Depois de copiar, leva a pessoa para a campanha ou produto no site." />
                  {draft.siteCtaEnabled && <><div><FieldLabel>Texto do CTA</FieldLabel><input value={draft.siteCtaText} onChange={(e) => patch('siteCtaText', e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div><div><FieldLabel>URL do site</FieldLabel><input value={draft.siteUrl || ''} onChange={(e) => patch('siteUrl', e.target.value || null)} placeholder="https://..." className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div></>}
                </section>

                <section className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4">
                  <div><h3 className="text-sm font-black">Desbloqueio</h3><p className="text-[11px] text-neutral-500 mt-0.5">Para live, o imediato é o mais rápido. Contagem e vídeo são opcionais.</p></div>
                  <div><FieldLabel>Como liberar</FieldLabel><select value={draft.unlockMode} onChange={(e) => patch('unlockMode', e.target.value as CouponUnlockMode)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs bg-white"><option value="immediate">Imediato ao tocar</option><option value="countdown">Contagem depois do toque</option><option value="video">Assistir vídeo</option></select></div>
                  {draft.unlockMode === 'countdown' && <div><FieldLabel>Segundos para liberar</FieldLabel><input type="number" min={1} max={3600} value={draft.unlockDelaySeconds} onChange={(e) => patch('unlockDelaySeconds', Math.max(1, Number(e.target.value) || 1))} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>}
                  {draft.unlockMode === 'video' && <><MediaField label="Vídeo do desbloqueio" value={draft.unlockVideoUrl} type="video" purpose="unlock-videos" onChange={(v) => patch('unlockVideoUrl', v)} /><div><FieldLabel>Porcentagem necessária do vídeo</FieldLabel><div className="flex items-center gap-3"><input type="range" min={10} max={100} step={5} value={draft.unlockVideoMinPercent} onChange={(e) => patch('unlockVideoMinPercent', Number(e.target.value))} className="flex-1" /><span className="text-xs font-bold w-10 text-right">{draft.unlockVideoMinPercent}%</span></div></div></>}
                  {(draft.unlockMode === 'countdown' || draft.unlockMode === 'video') && <div><FieldLabel>Mensagem durante a espera</FieldLabel><input value={draft.waitingText || ''} onChange={(e) => patch('waitingText', e.target.value || null)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>}
                </section>
              </div>

              <div className="space-y-6">
                <section className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4">
                  <div><h3 className="text-sm font-black">Modo Live</h3><p className="text-[11px] text-neutral-500 mt-0.5">Programe a hora em que o drop abre e quando ele termina.</p></div>
                  <Toggle checked={draft.scheduleEnabled} onChange={(v) => patch('scheduleEnabled', v)} label="Programar liberação" description="Antes do horário, a página pode ficar aberta mostrando a contagem até liberar." />
                  {draft.scheduleEnabled && <div className="grid sm:grid-cols-2 gap-3"><div><FieldLabel>Libera em</FieldLabel><input type="datetime-local" value={toLocalInput(draft.unlockStartsAt)} onChange={(e) => patch('unlockStartsAt', fromLocalInput(e.target.value))} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div><div><FieldLabel>Termina em</FieldLabel><input type="datetime-local" value={toLocalInput(draft.unlockEndsAt)} onChange={(e) => patch('unlockEndsAt', fromLocalInput(e.target.value))} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div></div>}
                  {!draft.scheduleEnabled && <div><FieldLabel>Encerramento opcional</FieldLabel><input type="datetime-local" value={toLocalInput(draft.unlockEndsAt)} onChange={(e) => patch('unlockEndsAt', fromLocalInput(e.target.value))} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>}
                  <Toggle checked={draft.timerEnabled} onChange={(v) => patch('timerEnabled', v)} label="Mostrar timer na página" description="Antes da liberação mostra “Libera em”. Depois, o timer pode ter data fixa ou reiniciar por visitante." />
                  {draft.timerEnabled && <>
                    <div><FieldLabel>Texto do timer ativo</FieldLabel><input value={draft.timerLabel} onChange={(e) => patch('timerLabel', e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>
                    <div><FieldLabel>Funcionamento do timer</FieldLabel><div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1 rounded-lg"><button type="button" onClick={() => patch('timerLooping', false)} className={`px-3 py-2 rounded text-[10px] font-bold cursor-pointer ${!draft.timerLooping ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>Data / hora fixa</button><button type="button" onClick={() => patch('timerLooping', true)} className={`px-3 py-2 rounded text-[10px] font-bold cursor-pointer ${draft.timerLooping ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>Looping por visitante</button></div></div>
                    {draft.timerLooping ? <div className="space-y-2"><FieldLabel>Duração de cada ciclo</FieldLabel><div className="grid grid-cols-2 gap-2"><div><span className="text-[10px] text-neutral-400">Horas</span><input type="number" min={0} max={168} value={Math.floor((draft.timerDurationMinutes || 120) / 60)} onChange={(e) => { const h = Math.max(0, Math.min(168, Number(e.target.value) || 0)); patch('timerDurationMinutes', Math.max(1, h * 60 + ((draft.timerDurationMinutes || 0) % 60))); }} className="w-full mt-1 px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div><div><span className="text-[10px] text-neutral-400">Minutos</span><input type="number" min={0} max={59} value={(draft.timerDurationMinutes || 120) % 60} onChange={(e) => { const m = Math.max(0, Math.min(59, Number(e.target.value) || 0)); patch('timerDurationMinutes', Math.max(1, Math.floor((draft.timerDurationMinutes || 120) / 60) * 60 + m)); }} className="w-full mt-1 px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div></div><div className="flex flex-wrap gap-1.5">{[10, 30, 60, 120, 240].map((minutes) => <button key={minutes} type="button" onClick={() => patch('timerDurationMinutes', minutes)} className="px-2 py-1 border border-neutral-200 rounded text-[10px] font-semibold text-neutral-600 cursor-pointer">{minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}</button>)}</div></div> : <div><FieldLabel>Timer termina em <span className="normal-case font-normal text-neutral-400">(se vazio, usa o encerramento da campanha)</span></FieldLabel><input type="datetime-local" value={toLocalInput(draft.timerEndAt)} onChange={(e) => patch('timerEndAt', fromLocalInput(e.target.value))} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>}
                  </>}
                </section>

                <section className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4">
                  <div><h3 className="text-sm font-black">Urgência</h3><p className="text-[11px] text-neutral-500 mt-0.5">Opcional. Um mesmo dispositivo só consome um desbloqueio do limite.</p></div>
                  <div><FieldLabel>Quantidade máxima de desbloqueios <span className="normal-case font-normal text-neutral-400">(vazio = ilimitado)</span></FieldLabel><input type="number" min={1} value={draft.maxUnlocks ?? ''} onChange={(e) => patch('maxUnlocks', e.target.value ? Math.max(1, Number(e.target.value)) : null)} className="w-full px-3 py-2.5 border border-neutral-300 rounded text-xs" /></div>
                  <Toggle checked={draft.showRemaining} onChange={(v) => patch('showRemaining', v)} label="Mostrar quantos cupons restam" description="A informação aparece pequena, imediatamente acima do botão Desbloquear cupom." />
                  {draft.maxUnlocks !== null && <Toggle checked={draft.showMaxUnlocks} onChange={(v) => patch('showMaxUnlocks', v)} label="Mostrar também a quantidade máxima" description={draft.showRemaining ? `Exemplo: “17 cupons restantes de ${draft.maxUnlocks}”.` : `Exemplo: “Limite de ${draft.maxUnlocks} cupons”.`} />}
                </section>

                <section className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4">
                  <div><h3 className="text-sm font-black">Aparência</h3><p className="text-[11px] text-neutral-500 mt-0.5">Mantém a liberdade para você usar uma logo/arte como a da campanha Alert Sale.</p></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {([
                      ['backgroundColor', 'Fundo'],
                      ['textColor', 'Texto'],
                      ['mutedTextColor', 'Texto suave'],
                      ['accentColor', 'Destaque'],
                      ['buttonBackgroundColor', 'Botão'],
                      ['buttonTextColor', 'Texto botão'],
                      ['timerColor', 'Timer'],
                    ] as const).map(([key, label]) => <div key={key}><FieldLabel>{label}</FieldLabel><div className="flex gap-2"><input type="color" value={draft[key]} onChange={(e) => patch(key, e.target.value.toUpperCase() as any)} className="w-10 h-9 p-0.5 border border-neutral-300 rounded bg-white" /><input value={draft[key]} onChange={(e) => patch(key, e.target.value.toUpperCase() as any)} className="min-w-0 flex-1 px-2 py-2 border border-neutral-300 rounded text-[10px] font-mono" /></div></div>)}
                  </div>
                  <MediaField label="Imagem de fundo" value={draft.backgroundImageUrl} type="image" purpose="backgrounds" onChange={(v) => patch('backgroundImageUrl', v)} />
                  <MediaField label="Vídeo de fundo" value={draft.backgroundVideoUrl} type="video" purpose="background-videos" onChange={(v) => patch('backgroundVideoUrl', v)} />
                  <div><FieldLabel>Escurecimento do fundo</FieldLabel><div className="flex items-center gap-3"><input type="range" min={0} max={0.95} step={0.05} value={draft.backgroundOverlay} onChange={(e) => patch('backgroundOverlay', Number(e.target.value))} className="flex-1" /><span className="text-xs font-bold w-10 text-right">{Math.round(draft.backgroundOverlay * 100)}%</span></div></div>
                  <div><FieldLabel>Desfoque do fundo</FieldLabel><div className="flex items-center gap-3"><input type="range" min={0} max={40} step={1} value={draft.backgroundBlur} onChange={(e) => patch('backgroundBlur', Number(e.target.value))} className="flex-1" /><span className="text-xs font-bold w-10 text-right">{draft.backgroundBlur}px</span></div></div>
                </section>

                <section className="border border-neutral-200 rounded-xl bg-neutral-950 text-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.12em] font-black text-white/55">Prévia rápida</span><span className="text-[10px] text-white/35">visual aproximado</span></div>
                  <div className="relative min-h-[520px] p-6 flex items-center justify-center overflow-hidden" style={{ backgroundColor: draft.backgroundColor, color: draft.textColor }}>
                    {draft.backgroundImageUrl && <img src={draft.backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" style={{ filter: `blur(${draft.backgroundBlur}px)` }} />}
                    {draft.backgroundVideoUrl && <video src={draft.backgroundVideoUrl} muted autoPlay loop playsInline className="absolute inset-0 w-full h-full object-cover scale-105" style={{ filter: `blur(${draft.backgroundBlur}px)` }} />}
                    {(draft.backgroundImageUrl || draft.backgroundVideoUrl) && <div className="absolute inset-0" style={{ backgroundColor: draft.backgroundColor, opacity: draft.backgroundOverlay }} />}
                    <div className="relative z-10 w-full max-w-sm text-center">
                      {draft.logoUrl && <img src={draft.logoUrl} alt="" className="relative left-1/2 -translate-x-1/2 w-[calc(100%+2rem)] max-w-none h-auto max-h-32 object-contain mb-7" />}
                      {draft.eyebrow && <div className="text-[9px] uppercase tracking-[0.25em] font-bold mb-2" style={{ color: draft.accentColor }}>{draft.eyebrow}</div>}
                      {draft.title.trim() && <div className="text-2xl font-black leading-tight tracking-tight">{draft.title}</div>}
                      {draft.subtitle && <div className="text-xs mt-2 leading-relaxed" style={{ color: draft.mutedTextColor }}>{draft.subtitle}</div>}
                      {draft.timerEnabled && <div className="mt-7" style={{ color: draft.timerColor }}><div className="text-[9px] uppercase tracking-[0.24em] opacity-70">{draft.timerLabel}</div><div className="text-4xl font-black mt-1">00:50:58</div></div>}
                      {(draft.showRemaining || draft.showMaxUnlocks) && draft.maxUnlocks && <div className="mt-7 mb-2 text-[9px] uppercase tracking-[0.14em] font-bold opacity-60">{draft.showRemaining ? `${Math.max(0, draft.maxUnlocks - (draft.totalUnlocks || 0))} cupons restantes${draft.showMaxUnlocks ? ` de ${draft.maxUnlocks}` : ''}` : `Limite de ${draft.maxUnlocks} cupons`}</div>}
                      <button type="button" className={`w-full ${!(draft.showRemaining || draft.showMaxUnlocks) ? 'mt-8' : ''} py-4 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2`} style={{ backgroundColor: draft.buttonBackgroundColor, color: draft.buttonTextColor }}><LockKeyhole className="w-4 h-4" />{draft.unlockButtonText}</button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
