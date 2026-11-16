import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ScratchPrizeResult } from '../utils/engine';
import { Sparkles, CheckCircle2, ShieldCheck, Gift, Hand } from 'lucide-react';

interface ScratchCardWidgetProps {
  scratch: ScratchPrizeResult;
  onRevealComplete: () => void;
  onUseDiscountNow?: () => void;
}

export const ScratchCardWidget: React.FC<ScratchCardWidgetProps> = ({
  scratch,
  onRevealComplete,
  onUseDiscountNow,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealed, setRevealed] = useState(scratch.scratched);
  const [scratchProgress, setScratchProgress] = useState(scratch.scratched ? 100 : 0);
  const scratchedPixelsRef = useRef(0);

  useEffect(() => {
    setRevealed(scratch.scratched);
    if (scratch.scratched) setScratchProgress(100);
  }, [scratch.scratched]);

  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Premium brushed metallic gold/champagne foil
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#E2E8F0');
    grad.addColorStop(0.28, '#F8FAFC');
    grad.addColorStop(0.5, '#CBD5E1');
    grad.addColorStop(0.75, '#F1F5F9');
    grad.addColorStop(1, '#94A3B8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle luxury diagonal pattern lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let x = -canvas.height; x < canvas.width; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + canvas.height, canvas.height);
      ctx.stroke();
    }

    // Pill badge in center of foil
    ctx.fillStyle = 'rgba(29, 29, 31, 0.88)';
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 108, canvas.height / 2 - 24, 216, 32, 16);
    ctx.fill();

    ctx.fillStyle = '#4ADE80';
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RASPE AQUI COM O DEDO', canvas.width / 2, canvas.height / 2 - 4);

    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(
      `Raspadinha Oficial · ${scratch.signatureHash}`,
      canvas.width / 2,
      canvas.height / 2 + 24
    );
  }, [revealed, scratch.signatureHash]);

  const scratchAtPoint = (x: number, y: number) => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    scratchedPixelsRef.current += 1;
    const pct = Math.min(100, Math.round((scratchedPixelsRef.current / 14) * 100));
    setScratchProgress(pct);

    if (scratchedPixelsRef.current >= 14) {
      setRevealed(true);
      setScratchProgress(100);
      onRevealComplete();
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    scratchAtPoint((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const handleInstantReveal = () => {
    if (revealed) return;
    setRevealed(true);
    setScratchProgress(100);
    onRevealComplete();
  };

  const isFreeCartela = scratch.tier === 'free_number';

  return (
    <div
      className={`p-4 rounded-2xl border transition-all space-y-3 ${
        revealed
          ? isFreeCartela
            ? 'bg-gradient-to-br from-[#ECFDF5] via-[#F0FDF4] to-[#FEF9C3]/40 border-[#86EFAC] shadow-sm'
            : 'bg-gradient-to-br from-[#F0FDF4] to-white border-[#BBF7D0] shadow-xs'
          : 'bg-[#F5F5F7] border-black/[0.08]'
      }`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
          <span>Raspadinha Bônus Instantânea</span>
        </span>
        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-black/[0.06] text-[#6E6E73]">
          {scratch.signatureHash}
        </span>
      </div>

      {/* Prize Layer Underneath + Foil Canvas on Top */}
      <div className="relative min-h-[124px] rounded-xl overflow-hidden bg-white border border-black/[0.06] flex flex-col items-center justify-center p-4 text-center select-none shadow-inner">
        <motion.div
          initial={false}
          animate={revealed ? { scale: [0.94, 1.03, 1], opacity: 1 } : { scale: 0.98, opacity: 0.85 }}
          transition={{ duration: 0.35 }}
          className="space-y-1.5 max-w-sm"
        >
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-mono uppercase tracking-wider font-bold">
            <Gift className="w-3 h-3" />
            <span>{revealed ? 'Prêmio Revelado ✓' : 'Prêmio Oculto'}</span>
          </div>
          <p
            className="text-sm sm:text-base font-extrabold text-[#1D1D1F] leading-snug"
            data-testid="scratch-prize-title"
          >
            {scratch.title}
          </p>
          <p className="text-xs text-[#6E6E73] leading-relaxed">{scratch.subtitle}</p>

          {revealed && !isFreeCartela && onUseDiscountNow && (
            <div className="pt-1.5">
              <button
                type="button"
                onClick={onUseDiscountNow}
                className="px-3.5 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Usar Desconto de R$ {scratch.valueBRL.toFixed(2).replace('.', ',')} Agora →
              </button>
            </div>
          )}
        </motion.div>

        {!revealed && (
          <canvas
            ref={canvasRef}
            width={340}
            height={124}
            onClick={handleInstantReveal}
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onMouseMove={(e) => {
              if (isDrawing) handlePointerMove(e.clientX, e.clientY);
            }}
            onTouchStart={() => setIsDrawing(true)}
            onTouchEnd={() => setIsDrawing(false)}
            onTouchMove={(e) => {
              if (e.touches[0]) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            className="absolute inset-0 w-full h-full cursor-pointer touch-none"
          />
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#6E6E73]">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
          <span>
            {!revealed && scratchProgress > 0
              ? `Raspando... (${scratchProgress}%)`
              : 'Resultado auditável no servidor'}
          </span>
        </span>
        {!revealed ? (
          <button
            type="button"
            onClick={handleInstantReveal}
            className="font-bold text-[#15803D] hover:text-[#166534] inline-flex items-center gap-1 underline cursor-pointer"
          >
            <Hand className="w-3 h-3" />
            <span>Raspar com 1 toque</span>
          </button>
        ) : (
          <span className="font-bold text-[#15803D] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Creditado (+30 Coins)
          </span>
        )}
      </div>
    </div>
  );
};
