import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Palette, FileText, Eye, BarChart3, ChevronRight, Sparkles } from 'lucide-react';

const sections = [
  {
    title: 'Tipos e Medidas',
    description: 'Tipos de produto, medidas e guias usados pelo Zhaya Match.',
    path: '/admin/tipos-medidas',
    icon: Layers,
  },
  {
    title: 'Aparência',
    description: 'Identidade visual, cores, logo e comportamento visual.',
    path: '/admin/aparencia',
    icon: Palette,
  },
  {
    title: 'Textos e Imagens',
    description: 'Conteúdo, textos e imagens exibidos pelo sistema.',
    path: '/admin/textos-imagens',
    icon: FileText,
  },
  {
    title: 'Visualização',
    description: 'Revise como a experiência está sendo apresentada ao público.',
    path: '/admin/visualizacao',
    icon: Eye,
  },
  {
    title: 'Analytics',
    description: 'Visualizações, comportamento e métricas gerais do Zhaya Match.',
    path: '/admin/analytics',
    icon: BarChart3,
  },
];

export const ZhayaMatchHub: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="border-b border-neutral-200 pb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-neutral-900" />
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Zhaya Match</h1>
        </div>
        <p className="mt-1.5 text-xs text-neutral-500 max-w-2xl">
          Central das configurações do Zhaya Match. As páginas continuam independentes; esta área apenas organiza os acessos em um só lugar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.path}
              to={section.path}
              className="group rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 hover:border-neutral-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-neutral-900">{section.title}</h2>
                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-700 transition-colors shrink-0" />
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
