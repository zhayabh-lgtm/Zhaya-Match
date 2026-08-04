import React from 'react';

interface MeasurementIllustrationProps {
  imageUrl?: string;
  caption?: string;
  showCaption?: boolean;
  activeMeasurement?: string;
  typeName?: string;
  bgColor?: string;
  className?: string;
  onSaberMaisClick?: () => void;
}

export const MeasurementIllustration: React.FC<MeasurementIllustrationProps> = ({
  imageUrl,
  caption,
  showCaption = true,
  activeMeasurement,
  typeName,
  bgColor = '#0A0A0A',
  className = '',
  onSaberMaisClick,
}) => {
  const isFootwear =
    typeName?.toLowerCase().includes('sapato') ||
    typeName?.toLowerCase().includes('calçado') ||
    typeName?.toLowerCase().includes('tenis') ||
    typeName?.toLowerCase().includes('sapatilha') ||
    typeName?.toLowerCase().includes('sandália') ||
    activeMeasurement === 'footLength' ||
    activeMeasurement === 'footWidth';

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`relative w-full h-full flex flex-col items-center justify-between p-4 rounded-md border border-neutral-800/80 overflow-hidden select-none ${className}`}
    >
      {/* Background Subtle Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Header Tag / Type name */}
      <div className="relative z-10 w-full flex justify-between items-center text-[10px] uppercase tracking-widest text-neutral-400 font-mono pb-2 border-b border-neutral-900">
        <span>GUIA DE MEDIÇÃO</span>
        <span>{typeName || (isFootwear ? 'PÉ & CALÇADO' : 'CORPO & MEDIDAS')}</span>
      </div>

      {/* Main Image or Vector Graphic */}
      <div className="relative z-10 my-auto w-full flex-1 flex items-center justify-center p-2 min-h-[200px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={caption || 'Guia de medição'}
            className="max-h-[320px] w-full object-contain filter drop-shadow-md transition-all duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallbackSvg = e.currentTarget.nextElementSibling;
              if (fallbackSvg) (fallbackSvg as HTMLElement).style.display = 'block';
            }}
          />
        ) : null}

        <div
          className={`w-full max-w-[220px] h-[280px] flex items-center justify-center ${
            imageUrl ? 'hidden' : 'block'
          }`}
        >
          {isFootwear ? (
            /* Footwear / Shoe Vector SVG */
            <svg
              viewBox="0 0 200 280"
              className="w-full h-full text-white/90"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Foot Silhouette */}
              <path
                d="M80,240 C60,240 50,220 50,180 C50,130 65,90 75,60 C80,45 92,30 110,30 C130,30 145,45 145,70 C145,90 135,110 135,140 C135,180 140,210 120,240 C105,250 90,248 80,240 Z"
                className="opacity-30"
                fill="rgba(255,255,255,0.03)"
              />
              {/* Toes Outline */}
              <path
                d="M100,38 C105,38 112,42 112,50 C112,58 105,62 100,62 C95,62 90,58 90,50 C90,42 95,38 100,38 Z
                   M118,48 C122,48 127,51 127,57 C127,63 122,66 118,66 C114,66 110,63 110,57 C110,51 114,48 118,48 Z"
                className="opacity-40"
              />

              {/* Foot Length Indicator Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'footLength' ? 'opacity-100' : 'opacity-30'}`}>
                <line x1="30" y1="30" x2="30" y2="245" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="24" y1="30" x2="110" y2="30" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="24" y1="245" x2="100" y2="245" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx="30" cy="137" r="3" fill="#FFFFFF" />
                <text x="10" y="140" fill="#FFFFFF" fontSize="8" fontWeight="700" textAnchor="end">COMPRIMENTO</text>
              </g>

              {/* Foot Width Indicator Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'footWidth' ? 'opacity-100' : 'opacity-30'}`}>
                <line x1="45" y1="130" x2="148" y2="130" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="96" cy="130" r="3" fill="#FFFFFF" />
                <text x="96" y="146" fill="#FFFFFF" fontSize="8" fontWeight="700" textAnchor="middle">LARGURA DO PÉ</text>
              </g>
            </svg>
          ) : (
            /* Apparel Fashion Silhouette Graphic SVG */
            <svg
              viewBox="0 0 200 320"
              className="w-full h-full text-white/90"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Elegant Silhouette Path */}
              <path
                d="M100,28 C108,28 114,35 114,44 C114,52 108,58 100,58 C92,58 86,52 86,44 C86,35 92,28 100,28 Z
                   M90,62 L110,62 L128,74 C134,88 138,102 136,116 C132,112 124,106 118,106 L82,106 C76,106 68,112 64,116 C62,102 66,88 72,74 Z
                   M82,106 C80,122 78,138 88,154 C92,160 92,166 90,172 C80,186 72,204 70,224 L130,224 C128,204 120,186 110,172 C108,166 108,160 112,154 C122,138 120,122 118,106 Z
                   M80,224 L78,290 M120,224 L122,290"
                className="opacity-40"
                strokeDasharray="none"
              />

              {/* Measuring Tape Graphic Accent */}
              <path
                d="M136,116 C138,130 134,150 128,168"
                stroke="#A3A3A3"
                strokeWidth="1"
                strokeDasharray="2,2"
                className="opacity-60"
              />

              {/* Bust Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'bust' ? 'opacity-100' : 'opacity-35'}`}>
                <line x1="30" y1="116" x2="140" y2="116" stroke="#FFFFFF" strokeWidth={activeMeasurement === 'bust' ? "2" : "1"} strokeDasharray="3 3" />
                <circle cx="85" cy="116" r="2.5" fill="#FFFFFF" />
                <text x="145" y="119" fill="#FFFFFF" fontSize="8" fontWeight="700" letterSpacing="0.05em">BUSTO</text>
              </g>

              {/* Waist Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'waist' ? 'opacity-100' : 'opacity-35'}`}>
                <line x1="35" y1="155" x2="135" y2="155" stroke="#FFFFFF" strokeWidth={activeMeasurement === 'waist' ? "2" : "1"} strokeDasharray="3 3" />
                <circle cx="85" cy="155" r="2.5" fill="#FFFFFF" />
                <text x="140" y="158" fill="#FFFFFF" fontSize="8" fontWeight="700" letterSpacing="0.05em">CINTURA</text>
              </g>

              {/* Hip Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'hip' ? 'opacity-100' : 'opacity-35'}`}>
                <line x1="30" y1="192" x2="135" y2="192" stroke="#FFFFFF" strokeWidth={activeMeasurement === 'hip' ? "2" : "1"} strokeDasharray="3 3" />
                <circle cx="85" cy="192" r="2.5" fill="#FFFFFF" />
                <text x="140" y="195" fill="#FFFFFF" fontSize="8" fontWeight="700" letterSpacing="0.05em">QUADRIL</text>
              </g>

              {/* Shoulders Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'shoulders' ? 'opacity-100' : 'opacity-35'}`}>
                <line x1="45" y1="74" x2="135" y2="74" stroke="#FFFFFF" strokeWidth={activeMeasurement === 'shoulders' ? "2" : "1"} strokeDasharray="3 3" />
                <circle cx="90" cy="74" r="2.5" fill="#FFFFFF" />
                <text x="140" y="77" fill="#FFFFFF" fontSize="8" fontWeight="700" letterSpacing="0.05em">OMBROS</text>
              </g>

              {/* Back Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'back' ? 'opacity-100' : 'opacity-35'}`}>
                <line x1="45" y1="94" x2="135" y2="94" stroke="#FFFFFF" strokeWidth={activeMeasurement === 'back' ? "2" : "1"} strokeDasharray="3 3" />
                <circle cx="90" cy="94" r="2.5" fill="#FFFFFF" />
                <text x="140" y="97" fill="#FFFFFF" fontSize="8" fontWeight="700" letterSpacing="0.05em">COSTAS</text>
              </g>

              {/* Inseam / Entreperna Line */}
              <g className={`transition-opacity duration-300 ${!activeMeasurement || activeMeasurement === 'thigh' || activeMeasurement === 'inseam' ? 'opacity-100' : 'opacity-35'}`}>
                <line x1="50" y1="230" x2="130" y2="230" stroke="#FFFFFF" strokeWidth={activeMeasurement === 'thigh' || activeMeasurement === 'inseam' ? "2" : "1"} strokeDasharray="3 3" />
                <circle cx="90" cy="230" r="2.5" fill="#FFFFFF" />
                <text x="135" y="233" fill="#FFFFFF" fontSize="8" fontWeight="700" letterSpacing="0.05em">ENTREPERNA</text>
              </g>
            </svg>
          )}
        </div>
      </div>

      {/* Caption / Legend and Saber Mais */}
      <div className="relative z-10 w-full text-center pt-2.5 border-t border-neutral-900/80 flex flex-col items-center gap-2">
        {showCaption && (
          <p className="text-[11px] text-neutral-400 font-sans leading-snug">
            {caption || 'Áreas corporais de referência para uma escolha precisa.'}
          </p>
        )}

        {onSaberMaisClick && (
          <button
            onClick={onSaberMaisClick}
            type="button"
            className="mt-0.5 text-[12px] font-medium text-white hover:text-neutral-300 underline underline-offset-4 transition-all duration-200 cursor-pointer p-1"
          >
            Ver como medir
          </button>
        )}
      </div>
    </div>
  );
};
