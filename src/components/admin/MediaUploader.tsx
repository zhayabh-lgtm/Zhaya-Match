import React, { useState, useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, RefreshCw, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Type } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Repository } from '../../lib/repository';

export type MediaCategory =
  | 'logos'
  | 'product-types'
  | 'product-type-icons'
  | 'measurement-guides'
  | 'main-images'
  | 'backgrounds-desktop'
  | 'backgrounds-mobile'
  | 'fonts';

interface MediaUploaderProps {
  category: MediaCategory;
  value?: string;
  onChange: (url: string, path?: string) => void;
  altText?: string;
  onAltTextChange?: (alt: string) => void;
  label?: string;
  description?: string;
}

interface FileMetrics {
  width?: number;
  height?: number;
  sizeMB: number;
  aspectRatio?: number;
}

const CATEGORY_CONFIG: Record<
  MediaCategory,
  {
    folder: string;
    label: string;
    accept: string;
    maxSizeMB: number;
    recommendedDim: string;
    recommendedRatio: string;
    minDim?: { w: number; h: number };
    ratioRange?: { min: number; max: number };
  }
> = {
  logos: {
    folder: 'logos',
    label: 'Logo (Branca, Preta ou Geral)',
    accept: 'image/svg+xml,image/png,image/jpeg,image/webp',
    maxSizeMB: 2,
    recommendedDim: '1200 × 240 (Mín: 600 × 120)',
    recommendedRatio: '3:1 a 6:1 (horizontal)',
    minDim: { w: 600, h: 120 },
    ratioRange: { min: 2.5, max: 6.5 },
  },
  'product-types': {
    folder: 'product-types',
    label: 'Imagem do Tipo de Peça',
    accept: 'image/png,image/jpeg,image/webp',
    maxSizeMB: 4,
    recommendedDim: '1000 × 1250 (Mín: 800 × 1000)',
    recommendedRatio: '4:5 (Vertical)',
    minDim: { w: 800, h: 1000 },
    ratioRange: { min: 0.72, max: 0.88 },
  },
  'product-type-icons': {
    folder: 'product-type-icons',
    label: 'Ícone do Tipo de Peça (PNG transparente recomendado)',
    accept: 'image/png,image/webp',
    maxSizeMB: 2,
    recommendedDim: '500 × 500 px (Mín: 256 × 256 px)',
    recommendedRatio: '1:1 (Quadrado)',
    minDim: { w: 256, h: 256 },
    ratioRange: { min: 0.8, max: 1.2 },
  },
  'measurement-guides': {
    folder: 'measurement-guides',
    label: 'Guia de Medição',
    accept: 'image/png,image/jpeg,image/webp',
    maxSizeMB: 4,
    recommendedDim: '1200 × 1500 (Mín: 800 × 1000)',
    recommendedRatio: '4:5 (Vertical)',
    minDim: { w: 800, h: 1000 },
    ratioRange: { min: 0.72, max: 0.88 },
  },
  'main-images': {
    folder: 'main-images',
    label: 'Imagem Principal de Medição',
    accept: 'image/png,image/jpeg,image/webp',
    maxSizeMB: 4,
    recommendedDim: '1200 × 1500 (Mín: 800 × 1000)',
    recommendedRatio: '4:5 (Vertical)',
    minDim: { w: 800, h: 1000 },
    ratioRange: { min: 0.72, max: 0.88 },
  },
  'backgrounds-desktop': {
    folder: 'backgrounds',
    label: 'Imagem de Fundo (Desktop)',
    accept: 'image/png,image/jpeg,image/webp',
    maxSizeMB: 5,
    recommendedDim: '1920 × 1080',
    recommendedRatio: '16:9 (Horizontal)',
    ratioRange: { min: 1.6, max: 1.9 },
  },
  'backgrounds-mobile': {
    folder: 'backgrounds',
    label: 'Imagem de Fundo (Mobile)',
    accept: 'image/png,image/jpeg,image/webp',
    maxSizeMB: 5,
    recommendedDim: '1080 × 1920',
    recommendedRatio: '9:16 (Vertical)',
    ratioRange: { min: 0.5, max: 0.65 },
  },
  fonts: {
    folder: 'fonts',
    label: 'Fonte Personalizada (WOFF2)',
    accept: '.woff2,font/woff2,application/font-woff2',
    maxSizeMB: 2,
    recommendedDim: 'Arquivo de fonte .woff2',
    recommendedRatio: 'N/A',
  },
};

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  category,
  value,
  onChange,
  altText,
  onAltTextChange,
  label,
  description,
}) => {
  const config = CATEGORY_CONFIG[category];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string | null>(null);
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);

  if (!config) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[MediaUploader] Categoria de mídia inválida recebida: "${category}"`);
    }
    return (
      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs font-mono">
        Categoria de mídia inválida ({String(category)}).
      </div>
    );
  }

  const isFont = category === 'fonts';

  const readMetrics = (file: File): Promise<FileMetrics> => {
    return new Promise((resolve) => {
      const sizeMB = file.size / (1024 * 1024);
      if (isFont || file.type === 'image/svg+xml') {
        resolve({ sizeMB });
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const aspectRatio = width / (height || 1);
        URL.revokeObjectURL(objectUrl);
        resolve({ width, height, sizeMB, aspectRatio });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ sizeMB });
      };
      img.src = objectUrl;
    });
  };

  const validateFile = (file: File, metrics: FileMetrics): { valid: boolean; reason?: string; details?: string } => {
    // 1. Extension / Mime validation
    if (isFont) {
      if (!file.name.endsWith('.woff2')) {
        return {
          valid: false,
          reason: 'O arquivo de fonte precisa estar obrigatoriamente no formato .woff2.',
          details: `Formato atual: ${file.name.split('.').pop() || 'desconhecido'} | Formato exigido: .woff2`,
        };
      }
    }

    // 2. Max size validation
    if (metrics.sizeMB > config.maxSizeMB) {
      return {
        valid: false,
        reason: `O arquivo excede o tamanho máximo permitido de ${config.maxSizeMB} MB.`,
        details: `Tamanho atual: ${metrics.sizeMB.toFixed(2)} MB | Limite: ${config.maxSizeMB} MB`,
      };
    }

    // 3. Dimension & Aspect Ratio validation for images (non-SVG, non-font)
    if (!isFont && file.type !== 'image/svg+xml' && metrics.width && metrics.height) {
      const currentDimStr = `${metrics.width} × ${metrics.height}px`;
      const currentRatioStr = `${metrics.aspectRatio?.toFixed(2)}:1`;

      if (config.minDim) {
        if (metrics.width < config.minDim.w || metrics.height < config.minDim.h) {
          return {
            valid: false,
            reason: `Dimensões abaixo do mínimo exigido (${config.minDim.w} × ${config.minDim.h}px).`,
            details: `Dimensão atual: ${currentDimStr} | Recomendado: ${config.recommendedDim}`,
          };
        }
      }

      if (config.ratioRange && metrics.aspectRatio) {
        if (metrics.aspectRatio < config.ratioRange.min || metrics.aspectRatio > config.ratioRange.max) {
          return {
            valid: false,
            reason: `A proporção da imagem não atende ao padrão exigido (${config.recommendedRatio}).`,
            details: `Proporção atual: ${currentRatioStr} | Proporção recomendada: ${config.recommendedRatio} | Dimensão atual: ${currentDimStr}`,
          };
        }
      }
    }

    return { valid: true };
  };

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    setValidationDetails(null);

    const metrics = await readMetrics(file);
    const validation = validateFile(file, metrics);

    if (!validation.valid) {
      setErrorMessage(validation.reason || 'Arquivo inválido.');
      setValidationDetails(validation.details || null);
      return;
    }

    // Start upload
    setUploading(true);
    setProgress(20);

    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${config.folder}/${timestamp}_${sanitizedName}`;

      let publicUrl = '';

      if (isSupabaseConfigured && supabase) {
        setProgress(50);
        const { data, error } = await supabase.storage
          .from('zhaya-match-media')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          throw new Error(`Falha no upload para o Supabase Storage: ${error.message}`);
        }

        setProgress(80);
        const { data: publicUrlData } = supabase.storage
          .from('zhaya-match-media')
          .getPublicUrl(storagePath);

        publicUrl = publicUrlData.publicUrl;

        // Register in media_assets table
        await Repository.saveMediaAsset({
          name: file.name,
          category: config.folder,
          storage_path: storagePath,
          public_url: publicUrl,
          mime_type: file.type || (isFont ? 'font/woff2' : 'application/octet-stream'),
          width: metrics.width,
          height: metrics.height,
          file_size: file.size,
          alt_text: altText || file.name,
        });
      } else {
        // Local preview fallback if Supabase credentials are not connected
        publicUrl = URL.createObjectURL(file);
      }

      setProgress(100);
      onChange(publicUrl, storagePath);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao realizar o upload do arquivo.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    onChange('', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
            {label || config.label}
          </label>
          {description && <p className="text-[11px] text-neutral-500 mt-0.5">{description}</p>}
        </div>
        <span className="text-[10px] text-neutral-400 font-mono">
          Rec: {config.recommendedDim}
        </span>
      </div>

      {isFont && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Aviso de Licenciamento:</strong> Certifique-se de possuir a licença adequada para o uso da fonte personalizada na Web.
          </span>
        </div>
      )}

      {/* Main Upload Box / Preview Area */}
      {value ? (
        <div className="relative bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            {isFont ? (
              <div className="w-12 h-12 bg-neutral-800 rounded flex items-center justify-center shrink-0">
                <Type className="w-6 h-6 text-neutral-300" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-neutral-950 rounded border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={value}
                  alt={altText || 'Mídia'}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-neutral-100 truncate">
                {value.split('/').pop()}
              </div>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 underline truncate"
              >
                <span>Ver arquivo original</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-colors cursor-pointer"
              title="Substituir arquivo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-neutral-800 hover:bg-red-900 text-red-300 rounded text-xs transition-colors cursor-pointer"
              title="Remover arquivo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-neutral-900 bg-neutral-100'
              : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/70 hover:border-neutral-400'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700">
              {uploading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : isFont ? (
                <Type className="w-5 h-5" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>

            {uploading ? (
              <div className="w-full max-w-xs space-y-1">
                <p className="text-xs font-semibold text-neutral-800">Enviando arquivo...</p>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-neutral-800">
                  Clique ou arraste um arquivo até aqui
                </p>
                <p className="text-[11px] text-neutral-500">
                  {config.recommendedRatio} | Máx: {config.maxSizeMB} MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={config.accept}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Alt text field if image & provided callback */}
      {value && !isFont && onAltTextChange && (
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
            Texto Alternativo (Acessibilidade / SEO)
          </label>
          <input
            type="text"
            value={altText || ''}
            onChange={(e) => onAltTextChange(e.target.value)}
            placeholder="Descreva brevemente esta imagem..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-neutral-900"
          />
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Erro na validação do arquivo</span>
          </div>
          <p>{errorMessage}</p>
          {validationDetails && (
            <p className="text-[11px] text-red-600 font-mono bg-red-100/60 p-1.5 rounded mt-1">
              {validationDetails}
            </p>
          )}
        </div>
      )}

      {/* Advanced URL collapsed option */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
          className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer"
        >
          <span>Opções avançadas (URL manual)</span>
          {showAdvancedUrl ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showAdvancedUrl && (
          <div className="mt-2 p-2.5 bg-neutral-100 border border-neutral-200 rounded space-y-1">
            <label className="block text-[10px] font-bold text-neutral-600 uppercase">
              Cole a URL externa da imagem
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://exemplo.com/imagem.png"
              className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs text-neutral-900 font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
};
