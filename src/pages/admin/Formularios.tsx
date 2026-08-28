import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Copy, Mail, Phone, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Repository } from '../../lib/repository';
import type { BestSellerInternationalLead } from '../../types/zhaya';

const FORMS_SQL = `CREATE TABLE IF NOT EXISTS public.best_seller_international_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  list_title TEXT,
  product_id UUID REFERENCES public.best_seller_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  country_code TEXT,
  locale TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted')),
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contacted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_created ON public.best_seller_international_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_list ON public.best_seller_international_forms(list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_status ON public.best_seller_international_forms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_country ON public.best_seller_international_forms(country_code, created_at DESC);
ALTER TABLE public.best_seller_international_forms ENABLE ROW LEVEL SECURITY;`;

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function countryName(code?: string | null): string {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return 'País não identificado';
  try {
    const display = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
    return `${display.of(normalized) || normalized} · ${normalized}`;
  } catch {
    return normalized;
  }
}

export const Formularios: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const listIdFilter = searchParams.get('listId') || '';
  const [leads, setLeads] = useState<BestSellerInternationalLead[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'new' | 'contacted'>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await Repository.getBestSellerInternationalForms();
    setLeads(result.leads);
    setConfigured(result.configured);
    setError(result.error || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (listIdFilter && lead.listId !== listIdFilter) return false;
      if (status !== 'all' && lead.status !== status) return false;
      if (!q) return true;
      return [lead.name, lead.email, lead.phone, lead.productName, lead.listTitle, lead.countryCode]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [leads, listIdFilter, search, status]);

  const counts = useMemo(() => ({
    all: leads.filter((lead) => !listIdFilter || lead.listId === listIdFilter).length,
    new: leads.filter((lead) => (!listIdFilter || lead.listId === listIdFilter) && lead.status === 'new').length,
    contacted: leads.filter((lead) => (!listIdFilter || lead.listId === listIdFilter) && lead.status === 'contacted').length,
  }), [leads, listIdFilter]);

  const filteredListTitle = listIdFilter
    ? leads.find((lead) => lead.listId === listIdFilter)?.listTitle || 'Vitrine selecionada'
    : null;

  const copy = async (value: string, key: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => current === key ? null : current), 1400);
  };

  const toggleStatus = async (lead: BestSellerInternationalLead) => {
    const next = lead.status === 'new' ? 'contacted' : 'new';
    const result = await Repository.updateBestSellerInternationalFormStatus(lead.id, next);
    if (result.success) {
      setLeads((current) => current.map((item) => item.id === lead.id ? (result.lead || { ...item, status: next }) : item));
    }
  };

  const removeLead = async (lead: BestSellerInternationalLead) => {
    if (!window.confirm(`Excluir o formulário de ${lead.name}?`)) return;
    const ok = await Repository.deleteBestSellerInternationalForm(lead.id);
    if (ok) setLeads((current) => current.filter((item) => item.id !== lead.id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Formulários
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Pessoas do exterior que demonstraram interesse em produtos da Vitrine Personalizada.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-neutral-300 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-amber-900">O banco de Formulários ainda não foi criado.</p>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-800">Execute a migration <code>20260828163000_best_seller_international_forms.sql</code> no Supabase. O SQL abaixo é o mesmo setup, caso prefira colar diretamente no SQL Editor.</p>
          </div>
          <button type="button" onClick={async () => { await navigator.clipboard?.writeText(FORMS_SQL); setSqlCopied(true); window.setTimeout(() => setSqlCopied(false), 1600); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-amber-900 text-white text-[10px] font-bold cursor-pointer">
            <Copy className="w-3 h-3" /> {sqlCopied ? 'SQL copiado' : 'Copiar SQL'}
          </button>
        </div>
      )}

      {error && configured && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
      )}

      {listIdFilter && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-blue-800"><strong>Filtrando:</strong> {filteredListTitle}</p>
          <button type="button" onClick={() => setSearchParams({})} className="text-[10px] font-bold text-blue-900 underline cursor-pointer">Ver todas</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {([
          ['all', 'Todos', counts.all],
          ['new', 'Novos', counts.new],
          ['contacted', 'Contatados', counts.contacted],
        ] as const).map(([key, label, count]) => (
          <button key={key} type="button" onClick={() => setStatus(key)} className={`rounded-xl border p-3 text-left cursor-pointer ${status === key ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-900'}`}>
            <span className={`block text-[9px] font-bold uppercase tracking-wider ${status === key ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</span>
            <span className="mt-1 block text-xl font-black">{count}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, produto, e-mail, telefone ou país..." className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs outline-none focus:border-neutral-500" />
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-neutral-500">Carregando formulários...</div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 px-5 text-center">
          <ClipboardList className="w-8 h-8 mx-auto text-neutral-300" />
          <p className="mt-3 text-sm font-bold text-neutral-800">Nenhum formulário encontrado</p>
          <p className="mt-1 text-xs text-neutral-500">Quando alguém enviar o CTA internacional, o contato aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((lead) => (
            <article key={lead.id} className={`rounded-xl border bg-white p-4 shadow-sm ${lead.status === 'new' ? 'border-blue-200 ring-1 ring-blue-50' : 'border-neutral-200'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${lead.status === 'new' ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                      {lead.status === 'new' ? 'Novo' : 'Contatado'}
                    </span>
                    <span className="text-[10px] text-neutral-500">{formatDate(lead.createdAt)}</span>
                    <span className="text-[10px] text-neutral-500">{countryName(lead.countryCode)}</span>
                  </div>
                  <h2 className="mt-2 text-base font-black text-neutral-900">{lead.name}</h2>
                  <p className="mt-1 text-xs text-neutral-700"><strong>Produto:</strong> {lead.productName}</p>
                  {lead.listTitle && <p className="mt-0.5 text-[10px] text-neutral-500"><strong>Vitrine:</strong> {lead.listTitle}</p>}

                  <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2">
                    <button type="button" onClick={() => copy(lead.email, `email:${lead.id}`)} className="inline-flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] text-neutral-700 hover:bg-neutral-100 cursor-pointer">
                      <Mail className="w-3.5 h-3.5" /> <span className="break-all">{lead.email}</span> <Copy className="w-3 h-3 text-neutral-400" />
                      {copied === `email:${lead.id}` && <span className="font-bold">Copiado</span>}
                    </button>
                    <button type="button" onClick={() => copy(lead.phone, `phone:${lead.id}`)} className="inline-flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] text-neutral-700 hover:bg-neutral-100 cursor-pointer">
                      <Phone className="w-3.5 h-3.5" /> <span>{lead.phone}</span> <Copy className="w-3 h-3 text-neutral-400" />
                      {copied === `phone:${lead.id}` && <span className="font-bold">Copiado</span>}
                    </button>
                  </div>
                </div>

                <div className="flex lg:flex-col items-center gap-2 shrink-0">
                  <button type="button" onClick={() => toggleStatus(lead)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-[10px] font-bold cursor-pointer ${lead.status === 'new' ? 'bg-neutral-900 text-white' : 'border border-neutral-300 bg-white text-neutral-700'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {lead.status === 'new' ? 'Marcar contatado' : 'Voltar para novo'}
                  </button>
                  <button type="button" onClick={() => removeLead(lead)} title="Excluir formulário" className="inline-flex items-center justify-center w-9 h-9 rounded border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
