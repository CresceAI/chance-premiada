import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GridNumber,
  AdminConfig,
  AffiliateSeller,
  ParticipationRecord,
  WinnerRecord,
  CustomerLoyaltyProfile,
  formatGridNumber,
  getGridStats,
  validateCheckoutInput,
  generatePixCopyPasteCode,
  getPublicParticipantsFeed,
  generateVisualQrMatrix,
  calculateComboPricing,
  getAvailableNeighbors,
  DEFAULT_PARTNER_COUPONS,
} from '../utils/engine';
import { databaseService } from '../services/database';
import { ScratchCardWidget } from './ScratchCardWidget';
import { PARTNER_AD_SHOWCASE_BANNERS, resolveActiveBannerInfo } from '../utils/banners';
import {
  Shuffle,
  Copy,
  Check,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Search,
  AlertCircle,
  Users,
  ShieldCheck,
  Mail,
  Zap,
  Clock,
  Flame,
  Gift,
  Share2,
  Ticket,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface HomeAndGridViewProps {
  grid: GridNumber[];
  participations: ParticipationRecord[];
  selectedNumbers: number[];
  adminConfig: AdminConfig;
  latestWinner: WinnerRecord | null;
  customerProfile?: CustomerLoyaltyProfile;
  activeAffiliate?: AffiliateSeller | null;
  remarketingDiscountBRL?: number;
  onUpdateRemarketingDiscount?: (amount: number) => void;
  onToggleNumber: (num: number) => void;
  onSelectRandom: () => void;
  onSelectMultipleRandom?: (count: number) => void;
  onSelectExactComboPackage?: (count: number) => void;
  onSurroundNeighbors?: () => void;
  onClearSelection: () => void;
  activeViewersCount?: number;
  onAttemptAtomicReservation: (
    nums: number[],
    customerName: string,
    customerWhatsapp: string
  ) => { success: boolean; conflicts: string[] };
  onReleaseReservedNumbers: (nums: number[]) => void;
  onCompletePurchase: (payload: {
    name: string;
    whatsapp: string;
    email?: string;
    numbers: number[];
    pixCode: string;
    pendingVerification?: boolean;
  }) => ParticipationRecord;
  onScratchRevealed: (participationId: string) => void;
  onNavigateTab: (tab: 'home' | 'how-to-play' | 'lookup' | 'results' | 'admin') => void;
}

function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const HomeAndGridView: React.FC<HomeAndGridViewProps> = ({
  grid,
  participations,
  selectedNumbers,
  adminConfig,
  latestWinner,
  customerProfile,
  activeAffiliate,
  remarketingDiscountBRL: externalDiscountBRL,
  onUpdateRemarketingDiscount,
  onToggleNumber,
  onSelectRandom,
  onSelectMultipleRandom,
  onSelectExactComboPackage,
  onSurroundNeighbors,
  onClearSelection,
  activeViewersCount = 6,
  onAttemptAtomicReservation,
  onReleaseReservedNumbers,
  onCompletePurchase,
  onScratchRevealed,
  onNavigateTab,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [name, setName] = useState(customerProfile?.name || '');
  const [whatsapp, setWhatsapp] = useState(
    customerProfile?.whatsapp ? formatPhoneMask(customerProfile.whatsapp) : ''
  );
  const [email, setEmail] = useState(customerProfile?.email || '');
  const [errors, setErrors] = useState<{
    name?: string;
    whatsapp?: string;
    numbers?: string;
    conflict?: string;
  }>({});
  const [pixStep, setPixStep] = useState<'form' | 'awaiting_pix' | 'confirmed'>('form');
  const [pixCode, setPixCode] = useState('');
  const [mpQrBase64, setMpQrBase64] = useState<string>('');
  const [mpPaymentId, setMpPaymentId] = useState<string>('');
  const [isAsaasSandbox, setIsAsaasSandbox] = useState<boolean>(false);
  const [qrImgFailed, setQrImgFailed] = useState<boolean>(false);
  const [pixCheckMsg, setPixCheckMsg] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [lastRecord, setLastRecord] = useState<ParticipationRecord | null>(null);
  const [localDiscountBRL, setLocalDiscountBRL] = useState<number>(
    externalDiscountBRL ?? customerProfile?.remarketingDiscountBRL ?? 0
  );
  const [pixCountdownSec, setPixCountdownSec] = useState<number>(600);
  const [highlightCheckout, setHighlightCheckout] = useState(false);
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [customSellerCode, setCustomSellerCode] = useState(activeAffiliate?.code || '');
  const [copiedStoriesLink, setCopiedStoriesLink] = useState(false);

  const activeDiscountBRL =
    externalDiscountBRL !== undefined ? externalDiscountBRL : localDiscountBRL;

  const setDiscountBRL = (val: number) => {
    setLocalDiscountBRL(val);
    onUpdateRemarketingDiscount?.(val);
  };

  // Sync customer profile if loaded and fields are empty
  useEffect(() => {
    if (customerProfile?.name && !name) setName(customerProfile.name);
    if (customerProfile?.whatsapp && !whatsapp) {
      setWhatsapp(formatPhoneMask(customerProfile.whatsapp));
    }
    if (customerProfile?.email && !email) setEmail(customerProfile.email);
  }, [customerProfile]);

  // If user clicks any green number on the grid or selects a combo while viewing a previous receipt, switch checkout back to 'form' immediately
  useEffect(() => {
    if (selectedNumbers.length > 0 && pixStep === 'confirmed') {
      setPixStep('form');
      setLastRecord(null);
    }
  }, [selectedNumbers.length, pixStep]);

  // If Admin refunded/estornou the last purchase, reset the receipt view back to 'form'
  useEffect(() => {
    if (
      pixStep === 'confirmed' &&
      lastRecord &&
      !participations.some((p) => p.id === lastRecord.id)
    ) {
      setPixStep('form');
      setLastRecord(null);
    }
  }, [participations, pixStep, lastRecord]);

  // Real-time countdown timer during awaiting_pix step
  useEffect(() => {
    if (pixStep !== 'awaiting_pix') {
      setPixCountdownSec(600);
      return;
    }
    const timer = setInterval(() => {
      setPixCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pixStep]);

  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const stats = getGridStats(grid);
  const publicParticipants = getPublicParticipantsFeed(grid, participations);
  const ticketPriceBRL = adminConfig.ticketPriceBRL;
  const activeBannerInfo = resolveActiveBannerInfo(
    adminConfig.prizeAmountBRL,
    ticketPriceBRL,
    adminConfig.customBannerUrl
  );
  const comboPricing = calculateComboPricing(selectedNumbers.length, ticketPriceBRL);
  const availableNeighbors = getAvailableNeighbors(grid, selectedNumbers);
  const subtotalBRL = comboPricing.comboTotalBRL;
  const appliedDiscount = Math.min(activeDiscountBRL, subtotalBRL * 0.5);
  const finalAmountBRL = Math.max(0, subtotalBRL - appliedDiscount);

  const secretPositions =
    Array.isArray(adminConfig.secretScratchPositions) &&
    adminConfig.secretScratchPositions.length === 4
      ? adminConfig.secretScratchPositions
      : [7, 22, 39, 53];
  const remainingBonusCartelas = secretPositions.filter((pos) => pos > stats.sold).length;

  const filteredGrid = grid.filter((item) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'available') return item.status === 'available';
    return item.status === 'sold' || item.status === 'reserved';
  });

  const handleGeneratePix = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCheckoutInput({
      name,
      whatsapp,
      selectedNumbers,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const lockResult = onAttemptAtomicReservation(selectedNumbers, name, whatsapp);
    if (!lockResult.success) {
      setErrors({
        conflict: `O número ${lockResult.conflicts.join(', ')} acabou de ser reservado! Escolha outro número verde.`,
      });
      return;
    }

    setErrors({});
    setPixCheckMsg('');
    setQrImgFailed(false);
    setIsAsaasSandbox(false);
    const activeDirectKey =
      adminConfig.directPixKey && adminConfig.directPixKey !== 'chancepremiada@pix.com.br'
        ? adminConfig.directPixKey
        : import.meta.env?.VITE_DIRECT_PIX_KEY || adminConfig.directPixKey || 'chancepremiada@pix.com.br';
    const directEmvCode = generatePixCopyPasteCode(
      selectedNumbers,
      finalAmountBRL,
      `ED${adminConfig.editionNumber}`,
      activeDirectKey,
      adminConfig.directPixReceiverName || 'CHANCE PREMIADA'
    );
    setPixCode(directEmvCode);
    setMpQrBase64('');
    setMpPaymentId('');
    setPixStep('awaiting_pix');

    // Option 1: Try Asaas API v3 (unless Admin explicitly forced Option 2 Direct PIX Key)
    if (adminConfig.paymentMode !== 'direct_pix_zero_fee') {
      void databaseService
        .createPixCharge({
          amountBRL: finalAmountBRL,
          numbers: selectedNumbers,
          customerName: name.trim(),
          customerWhatsapp: whatsapp.trim(),
          customerEmail: email.trim() || undefined,
          editionNumber: adminConfig.editionNumber,
        })
        .then((pixRes) => {
          setMpPaymentId(pixRes.paymentId);
          setIsAsaasSandbox(Boolean(pixRes.isSandbox));
          // Only overwrite the real Direct PIX QR/Code if Asaas is in Production (not Sandbox _hmlg_)
          if (pixRes.mode === 'asaas_live' && pixRes.pixCopyPaste && !pixRes.isSandbox) {
            setPixCode(pixRes.pixCopyPaste);
            if (pixRes.qrCodeBase64) {
              setMpQrBase64(pixRes.qrCodeBase64);
            }
          }
        });
    }
  };

  const handleBackToEdit = () => {
    onReleaseReservedNumbers(selectedNumbers);
    setPixCheckMsg('');
    setPixStep('form');
  };

  const handleConfirmPixPayment = async (forceSimulate: boolean = false) => {
    const isDirectPixMode =
      adminConfig.paymentMode === 'direct_pix_zero_fee' ||
      !mpPaymentId ||
      mpPaymentId.startsWith('DIRECT-') ||
      mpPaymentId.startsWith('SIM-') ||
      isAsaasSandbox;

    if (!isDirectPixMode && !forceSimulate) {
      setPixCheckMsg('Verificando confirmação do PIX...');
      const check = await databaseService.checkPixChargeStatus(
        mpPaymentId,
        forceSimulate || isAsaasSandbox
      );
      if (!check.approved) {
        setPixCheckMsg(
          'Pagamento ainda pendente no Asaas. Se você pagou pela Chave PIX Direta ou quer simular um teste grátis, toque em "Liberar / Simular Aprovação" abaixo.'
        );
        return;
      }
    }

    const isDirectZeroFee =
      adminConfig.paymentMode === 'direct_pix_zero_fee' && !forceSimulate;

    const created = onCompletePurchase({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim() || undefined,
      numbers: selectedNumbers,
      pixCode,
      pendingVerification: isDirectZeroFee,
    });

    if (appliedDiscount > 0) {
      setDiscountBRL(0);
    }

    setPixCheckMsg('');
    setLastRecord(created);
    setPixStep('confirmed');
  };

  const handleCopyPix = () => {
    if (navigator.clipboard && pixCode) {
      navigator.clipboard.writeText(pixCode).catch(() => {});
    }
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const scrollToCheckout = () => {
    const el = document.getElementById('checkout-mvp');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlightCheckout(true);
      setTimeout(() => setHighlightCheckout(false), 1400);
      const nameInput = document.getElementById('checkout-name') as HTMLInputElement | null;
      if (nameInput && !nameInput.value) {
        setTimeout(() => nameInput.focus({ preventScroll: true }), 450);
      }
    }
  };

  const qrMatrix = generateVisualQrMatrix(pixCode || 'CHANCE-PREMIADA-PIX');

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 lg:pb-8">
      {/* OFFICIAL RESULT BANNER (Appears when Admin publishes the 1st Ball) */}
      <AnimatePresence>
        {latestWinner && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-[#1D1D1F] via-[#1E293B] to-[#1D1D1F] text-white rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md border border-white/10"
            data-testid="latest-winner-banner"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white flex flex-col items-center justify-center font-mono font-bold shrink-0 shadow-md ring-2 ring-[#4ADE80]/40">
                <span className="text-[9px] uppercase tracking-wider leading-none">1ª Bola</span>
                <span className="text-lg leading-tight">{latestWinner.firstBallNumber}</span>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#4ADE80]">
                  Resultado Oficial Publicado · {latestWinner.editionNumber}
                </p>
                <p className="text-sm sm:text-base font-bold text-white">
                  1ª Bola: Nº {latestWinner.firstBallNumber} — {latestWinner.winnerName} ganhou R${' '}
                  {latestWinner.prizeAmountBRL.toFixed(2).replace('.', ',')} no PIX
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('results')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Ver Detalhes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      {/* REMARKETING COUPON BANNER (Appears when user has an unspent Scratch Card discount) */}
      <AnimatePresence>
        {activeDiscountBRL > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-gradient-to-r from-[#15803D] to-[#16A34A] text-white rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-white" />
              </span>
              <div>
                <strong className="font-bold">
                  Cupom da Raspadinha Ativo: R$ {activeDiscountBRL.toFixed(2).replace('.', ',')} OFF!
                </strong>{' '}
                <span className="text-white/90">
                  Escolha mais um número verde agora e pague com desconto automático no PIX.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPixStep('form');
                setLastRecord(null);
                if (selectedNumbers.length === 0) {
                  onSelectRandom();
                }
                scrollToCheckout();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white text-[#15803D] text-xs font-extrabold hover:bg-[#F0FDF4] transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Escolher +1 Nº com Desconto
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFFICIAL EDITION HERO + AUTOMATIC ARTWORK BANNER */}
      <section className="relative overflow-hidden bg-[#063D2B] text-white rounded-3xl border border-black/[0.08] p-4 sm:p-6 space-y-5 shadow-[0_8px_28px_rgba(6,61,43,0.12)]">
        {/* AUTOMATIC EDITION ARTWORK BANNER (Changes automatically when Admin changes prize/ticket values!) */}
        {activeBannerInfo.hasExactHorizontalBanner && (
          <div
            onClick={() => {
              if (selectedNumbers.length === 0) {
                onSelectRandom();
              }
              scrollToCheckout();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (selectedNumbers.length === 0) {
                  onSelectRandom();
                }
                scrollToCheckout();
              }
            }}
            aria-label={`Banner Oficial Edição #${adminConfig.editionNumber}: Ganhe R$ ${adminConfig.prizeAmountBRL} no PIX com cota de R$ ${ticketPriceBRL.toFixed(2).replace('.', ',')}. Toque para participar agora.`}
            className="relative w-full rounded-2xl overflow-hidden border border-white/15 shadow-md cursor-pointer group select-none"
            data-testid="dynamic-edition-banner"
          >
            <img
              src={activeBannerInfo.heroBannerUrl}
              alt={`Chance Premiada - Ganhe R$ ${adminConfig.prizeAmountBRL} no PIX - 1 Número R$ ${ticketPriceBRL.toFixed(2).replace('.', ',')}`}
              className="w-full h-auto object-cover block transition-transform duration-200 group-hover:scale-[1.008]"
            />

            {/* Seamless Visual Correction Overlay over the AI typo ("branca sua vida!") on the 4 16:9 banners */}
            {activeBannerInfo.fixTopHeadlineOverlay && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-[6.5%] left-[36.5%] w-[29.5%] h-[19.5%] bg-[#0B3B24] rounded-xl flex flex-col items-center justify-center text-center px-1.5 shadow-[0_0_14px_8px_#0B3B24]"
              >
                <span className="text-[9px] sm:text-xs md:text-base lg:text-lg font-medium italic text-white leading-tight drop-shadow-xs">
                  Mais que um sorteio...
                </span>
                <span className="text-[10px] sm:text-sm md:text-lg lg:text-xl font-extrabold italic text-[#E5B85B] leading-tight drop-shadow-xs">
                  uma chance real de
                </span>
                <span className="text-[10px] sm:text-sm md:text-lg lg:text-xl font-extrabold italic text-[#E5B85B] leading-tight drop-shadow-xs">
                  transformar sua vida!
                </span>
              </div>
            )}

            <div className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-full bg-[#0A1713]/85 backdrop-blur-xs border border-white/15 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
              <span>Participar agora</span>
              <ArrowRight className="size-3 text-[#B5F44A]" />
            </div>
          </div>
        )}

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-white/80">
              <span className="font-bold text-[#063D2B] bg-[#B5F44A] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#063D2B]" />
                <span>Edição #{adminConfig.editionNumber}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90">
                Grade 01 a 75
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 tabular-nums">
                {activeViewersCount} online
              </span>
              {adminConfig.scratchEnabled && (
                <span className="text-[#0A1713] bg-[#D5AC58] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <Sparkles className="size-3" /> Raspadinha inclusa
                </span>
              )}
              {activeAffiliate && (
                <span
                  className="text-[#063D2B] bg-[#F5F0E5] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1"
                  data-testid="active-affiliate-badge"
                >
                  <CheckCircle2 className="size-3 text-[#16A34A]" />
                  <span>Indicação: {activeAffiliate.name}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-extrabold text-white tracking-tight leading-[1.18] text-balance">
              Escolha seu número. Saiu na 1ª bola do sorteio, você leva{' '}
              <span className="text-[#B5F44A] tabular-nums">
                R$ {adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')} no PIX
              </span>
              .
            </h1>

            <p className="text-sm text-white/80 leading-relaxed text-pretty">
              Cota única de{' '}
              <strong className="text-white font-bold tabular-nums">
                R$ {ticketPriceBRL.toFixed(2).replace('.', ',')}
              </strong>
              . Ao confirmar o PIX, você recebe na hora 1 Raspadinha Digital com chance de ganhar
              cartela extra grátis ou desconto imediato.
            </p>

            <div className="pt-0.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('how-to-play')}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-semibold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Zap className="size-3.5 text-[#B5F44A]" />
                <span>Como funciona em 30s</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStoriesModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#D5AC58] hover:bg-[#e0ba6c] text-[#0A1713] text-xs font-bold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5"
                data-testid="open-stories-card-button"
              >
                <Share2 className="size-3.5 text-[#0A1713]" />
                <span>Divulgar e ganhar comissão</span>
              </button>
            </div>
          </div>

          {/* Live Thermometer & Stacked Avatars Card */}
          <div className="lg:w-80 bg-white text-[#151515] rounded-2xl p-4 sm:p-5 space-y-3 shrink-0 shadow-md border border-black/[0.06]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#151515] font-bold flex items-center gap-1.5">
                <Flame className="size-4 text-[#16A34A]" />
                <span>Andamento da edição</span>
              </span>
              <span
                className="font-mono font-bold text-[#063D2B] tabular-nums bg-[#F2F4F7] px-2.5 py-0.5 rounded-full"
                data-testid="sold-progress-count"
              >
                {stats.sold} / 75 vendidos
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#F2F4F7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#16A34A] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, (stats.sold / 75) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#6E6E73]">
              <span className="font-bold text-[#15803D] tabular-nums" data-testid="stat-available">
                {stats.available} disponíveis
              </span>
              <div className="flex items-center gap-1.5">
                {publicParticipants.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {publicParticipants.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="size-5 rounded-full bg-[#063D2B] text-white border border-white text-[9px] font-bold flex items-center justify-center"
                      >
                        {p.maskedName.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                <span className="font-medium tabular-nums">
                  Faltam {stats.remainingToDraw} p/ sortear
                </span>
              </div>
            </div>

            {adminConfig.scratchEnabled && (
              <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-[#6E6E73] flex items-center gap-1 font-medium">
                  <Gift className="size-3.5 text-[#15803D]" /> Bônus na raspadinha:
                </span>
                <span className="font-mono font-bold text-[#063D2B] tabular-nums">
                  {remainingBonusCartelas} de 4 restantes
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4 QUICK-ACCESS NATIVE APP SQUIRCLES */}
      <section
        aria-label="Atalhos Rápidos do App"
        className="grid grid-cols-4 gap-2 sm:gap-3"
      >
        <button
          type="button"
          onClick={() => {
            if (pixStep !== 'form') {
              onReleaseReservedNumbers(selectedNumbers);
              setPixStep('form');
              setLastRecord(null);
            }
            onSelectRandom();
            scrollToCheckout();
          }}
          className="bg-white hover:bg-[#FAFAFA] border border-black/[0.06] rounded-2xl p-2.5 sm:p-3.5 flex flex-col items-center text-center gap-1.5 transition-colors duration-150 active:scale-[0.98] cursor-pointer"
        >
          <span className="size-10 rounded-xl bg-[#F2F4F7] text-[#063D2B] flex items-center justify-center">
            <Shuffle className="size-4 text-[#063D2B]" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-[#151515] leading-tight">
            Surpresinha
          </span>
          <span className="text-[10px] text-[#6E6E73] hidden sm:block tabular-nums">
            1 Nº por R$ {ticketPriceBRL.toFixed(2).replace('.', ',')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (pixStep !== 'form') {
              onReleaseReservedNumbers(selectedNumbers);
              setPixStep('form');
              setLastRecord(null);
            }
            if (onSelectExactComboPackage) {
              onSelectExactComboPackage(5);
            } else if (onSelectMultipleRandom) {
              onSelectMultipleRandom(5);
            }
            scrollToCheckout();
          }}
          className="bg-white hover:bg-[#FAFAFA] border border-black/[0.06] rounded-2xl p-2.5 sm:p-3.5 flex flex-col items-center text-center gap-1.5 transition-colors duration-150 active:scale-[0.98] cursor-pointer"
        >
          <span className="size-10 rounded-xl bg-[#ECFDF5] text-[#15803D] flex items-center justify-center">
            <Flame className="size-4 text-[#15803D]" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-[#151515] leading-tight">
            Combo 5 Nºs
          </span>
          <span className="text-[10px] text-[#15803D] font-semibold hidden sm:block tabular-nums">
            Por R$ {calculateComboPricing(5, ticketPriceBRL).comboTotalBRL.toFixed(2).replace('.', ',')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('lookup')}
          className="bg-white hover:bg-[#FAFAFA] border border-black/[0.06] rounded-2xl p-2.5 sm:p-3.5 flex flex-col items-center text-center gap-1.5 transition-colors duration-150 active:scale-[0.98] cursor-pointer"
        >
          <span className="size-10 rounded-xl bg-[#FEF3C7]/70 text-[#B45309] flex items-center justify-center">
            <Gift className="size-4 text-[#B45309]" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-[#151515] leading-tight">
            Parceiros
          </span>
          <span className="text-[10px] text-[#6E6E73] hidden sm:block">
            Cupons locais
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowStoriesModal(true)}
          className="bg-white hover:bg-[#FAFAFA] border border-black/[0.06] rounded-2xl p-2.5 sm:p-3.5 flex flex-col items-center text-center gap-1.5 transition-colors duration-150 active:scale-[0.98] cursor-pointer"
        >
          <span className="size-10 rounded-xl bg-[#063D2B] text-[#B5F44A] flex items-center justify-center">
            <Share2 className="size-4 text-[#B5F44A]" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-[#151515] leading-tight">
            Ganhar 20%
          </span>
          <span className="text-[10px] text-[#15803D] font-semibold hidden sm:block">
            Link e artes
          </span>
        </button>
      </section>

      {/* MAIN WORKSPACE: 01–75 GRID (LEFT) + PIX CHECKOUT (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* 01 to 75 Visual Grid */}
          <section className="bg-white rounded-3xl border border-black/[0.06] p-4 sm:p-6 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#1D1D1F] flex items-center gap-2">
                  <span>Toque nos Números da Sorte (01 a 75)</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E6E73] mt-1">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> Verde = Livre
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1D1D1F] ring-2 ring-[#16A34A]" />{' '}
                    Preto = Selecionado
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Vermelho = Reservado
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB]" /> Cinza = Pago
                  </span>
                </div>
              </div>

              {/* Quick Pick & Combo Multipliers */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (pixStep !== 'form') {
                      onReleaseReservedNumbers(selectedNumbers);
                      setPixStep('form');
                      setLastRecord(null);
                    }
                    onSelectRandom();
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Shuffle className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>Surpresinha (+1)</span>
                </button>

                {onSelectMultipleRandom && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (pixStep !== 'form') {
                          onReleaseReservedNumbers(selectedNumbers);
                          setPixStep('form');
                          setLastRecord(null);
                        }
                        onSelectMultipleRandom(3);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-bold transition-all cursor-pointer active:scale-95"
                      title="Adicionar 3 números aleatórios"
                    >
                      {ticketPriceBRL === 4 ? '+3 Nºs (R$ 10)' : '+3 Nºs'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (pixStep !== 'form') {
                          onReleaseReservedNumbers(selectedNumbers);
                          setPixStep('form');
                          setLastRecord(null);
                        }
                        onSelectMultipleRandom(5);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      title="Adicionar 5 números aleatórios"
                    >
                      <Flame className="w-3 h-3 text-[#4ADE80]" />
                      <span>{ticketPriceBRL === 4 ? '+5 Nºs (R$ 15)' : '+5 Nºs'}</span>
                    </button>
                  </>
                )}

                {selectedNumbers.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold text-[#6E6E73] hover:text-[#DC2626] cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* VENDA UNITÁRIA + COMBOS PROMOCIONAIS (1 TOQUE) */}
            <div className="p-3 rounded-2xl bg-[#F7F8FA] border border-black/[0.06] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#151515] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#15803D]" /> Combos com Desconto
                </span>
                <span className="text-[#6E6E73] hidden sm:inline">
                  Seleção automática em 1 toque
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    count: 1,
                    title: '1 Número',
                    badge: 'Unitário',
                    price: calculateComboPricing(1, ticketPriceBRL).comboTotalBRL,
                    discount: 0,
                  },
                  {
                    count: 3,
                    title: 'Combo 3 Nºs',
                    badge: `-${calculateComboPricing(3, ticketPriceBRL).comboDiscountBRL.toFixed(2).replace('.00', '').replace('.', ',')}`,
                    price: calculateComboPricing(3, ticketPriceBRL).comboTotalBRL,
                    discount: calculateComboPricing(3, ticketPriceBRL).comboDiscountBRL,
                  },
                  {
                    count: 5,
                    title: 'Combo 5 Nºs',
                    badge: `Mais pedido`,
                    price: calculateComboPricing(5, ticketPriceBRL).comboTotalBRL,
                    discount: calculateComboPricing(5, ticketPriceBRL).comboDiscountBRL,
                    popular: true,
                  },
                  {
                    count: 10,
                    title: 'Combo 10 Nºs',
                    badge: `-${calculateComboPricing(10, ticketPriceBRL).comboDiscountBRL.toFixed(2).replace('.00', '').replace('.', ',')}`,
                    price: calculateComboPricing(10, ticketPriceBRL).comboTotalBRL,
                    discount: calculateComboPricing(10, ticketPriceBRL).comboDiscountBRL,
                  },
                ].map((pkg) => {
                  const isCurrentCount = selectedNumbers.length === pkg.count;
                  return (
                    <button
                      key={pkg.count}
                      type="button"
                      onClick={() => {
                        if (pixStep !== 'form') {
                          onReleaseReservedNumbers(selectedNumbers);
                          setPixStep('form');
                          setLastRecord(null);
                        }
                        if (onSelectExactComboPackage) {
                          onSelectExactComboPackage(pkg.count);
                        } else if (pkg.count === 1) {
                          onClearSelection();
                          onSelectRandom();
                        } else if (onSelectMultipleRandom) {
                          onClearSelection();
                          onSelectMultipleRandom(pkg.count);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrentCount
                          ? 'bg-[#1D1D1F] text-white border-[#16A34A] ring-2 ring-[#16A34A]'
                          : pkg.popular
                          ? 'bg-white hover:bg-[#F0FDF4] border-[#16A34A]'
                          : 'bg-white hover:bg-[#F5F5F7] border-black/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-extrabold ${
                            isCurrentCount ? 'text-white' : 'text-[#1D1D1F]'
                          }`}
                        >
                          {pkg.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isCurrentCount
                              ? 'bg-[#16A34A] text-white'
                              : pkg.discount > 0
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : 'bg-[#F5F5F7] text-[#6E6E73]'
                          }`}
                        >
                          {pkg.badge}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <strong
                          className={`font-mono text-sm font-extrabold ${
                            isCurrentCount ? 'text-[#4ADE80]' : 'text-[#15803D]'
                          }`}
                        >
                          R$ {pkg.price.toFixed(2).replace('.', ',')}
                        </strong>
                        {pkg.discount > 0 && (
                          <span
                            className={`text-[10px] line-through ${
                              isCurrentCount ? 'text-white/60' : 'text-[#86868B]'
                            }`}
                          >
                            R$ {(pkg.count * ticketPriceBRL).toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Pills */}
            <div
              className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.05]"
              role="group"
              aria-label="Filtrar números"
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Todos (75)
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('available')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'available'
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Disponíveis ({stats.available})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('sold')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'sold'
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Ocupados ({stats.sold + stats.reserved})
                </button>
              </div>

              {selectedNumbers.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#BBF7D0]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedNumbers.length}{' '}
                  {selectedNumbers.length === 1 ? 'selecionado' : 'selecionados'}
                </span>
              )}
            </div>

            {/* 75 Numbers Tactile Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-10 xl:grid-cols-15 gap-2 pt-1">
              {filteredGrid.map((item) => {
                const isSelected = selectedNumbers.includes(item.number);
                const isAvailable = item.status === 'available';
                const isReserved = item.status === 'reserved';

                let cellStyle = '';
                if (isSelected) {
                  cellStyle =
                    'bg-[#0A1713] text-[#B5F44A] ring-2 ring-[#16A34A] ring-offset-1 cursor-pointer';
                } else if (isAvailable) {
                  cellStyle =
                    'bg-[#15803D] hover:bg-[#063D2B] text-white border border-[#166534]/20 cursor-pointer active:scale-95';
                } else if (isReserved) {
                  cellStyle =
                    'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] cursor-not-allowed';
                } else {
                  cellStyle =
                    'bg-[#F1F5F9] text-[#94A3B8] border border-black/[0.04] cursor-not-allowed';
                }

                return (
                  <button
                    key={item.number}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      if (pixStep !== 'form') {
                        onReleaseReservedNumbers(selectedNumbers);
                        setPixStep('form');
                        setLastRecord(null);
                      }
                      onToggleNumber(item.number);
                    }}
                    aria-label={`Número ${item.formatted} ${
                      isSelected
                        ? 'selecionado'
                        : isAvailable
                        ? 'disponível'
                        : isReserved
                        ? 'reservado'
                        : 'vendido'
                    }`}
                    className={`relative h-11 sm:h-11 rounded-xl font-mono text-sm font-bold flex items-center justify-center transition-all select-none ${cellStyle}`}
                  >
                    <span>{item.formatted}</span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#22C55E] text-[#1D1D1F] flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* STRATEGIC SPONSOR & PARTNER RECRUITMENT STRIP WITH 4 DEMO BANNERS */}
            <div className="pt-3.5 border-t border-black/[0.06] space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309] font-extrabold text-[10px] uppercase tracking-wider">
                    Exemplos de Anúncios · Buscando Patrocinadores ({adminConfig.cityRegionLabel || 'Maracanaú'})
                  </span>
                  <span className="text-[#6E6E73]">
                    Tem um comércio ou serviço?{' '}
                    <strong className="text-[#15803D]">Faça um banner igual para sua loja</strong> e{' '}
                    <strong className="text-[#1D1D1F]">receba pedidos direto no seu WhatsApp!</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('lookup')}
                  className="text-xs font-extrabold text-[#15803D] hover:underline cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span>Seja Parceiro · Ver Vitrine Completa</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PARTNER_AD_SHOWCASE_BANNERS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => onNavigateTab('lookup')}
                    className="group relative rounded-xl overflow-hidden border border-black/[0.08] bg-[#063D2B] text-left cursor-pointer shadow-2xs"
                  >
                    <img
                      src={demo.imageUrl}
                      alt={`Exemplo de anúncio: ${demo.title}`}
                      className="w-full h-20 sm:h-22 object-cover block transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#063D2B]/90 text-[#B5F44A] text-[8px] font-extrabold uppercase tracking-wider">
                      Exemplo
                    </span>
                    <div className="px-2 py-1 bg-[#063D2B] text-white flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold truncate">{demo.title}</span>
                      <span className="text-[9px] text-[#B5F44A] font-extrabold shrink-0">
                        Anunciar →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Privacy-Safe Public Participants Leaderboard */}
          <section
            className="bg-white rounded-[28px] border border-black/[0.06] p-4 sm:p-6 space-y-4 shadow-2xs"
            data-testid="public-participants-section"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-2xl bg-[#063D2B] flex items-center justify-center text-[#B5F44A]">
                  <Users className="size-4" />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#151515]">
                  Quem está participando desta edição ({publicParticipants.length})
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#063D2B] bg-[#B5F44A]/40 px-2.5 py-1 rounded-full">
                <ShieldCheck className="size-3.5 text-[#063D2B]" /> Números e dados protegidos
              </span>
            </div>

            {publicParticipants.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F2F4F7] text-center space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-[#151515]">
                    Grade iniciando do zero (0/75 vendidos). Seja o #1 da rodada!
                  </p>
                  <p className="text-[11px] text-[#6E6E73]">
                    Assim que sua compra no PIX é confirmada, seu nome mascarado aparece no ranking
                    da edição.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRandom();
                    scrollToCheckout();
                  }}
                  className="px-4 py-2 rounded-full bg-[#063D2B] hover:bg-[#0B5339] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Escolher o 1º Número da Rodada</span>
                  <ArrowRight className="size-3.5 text-[#B5F44A]" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {publicParticipants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#F2F4F7]/85 border border-black/[0.04] flex items-center justify-between gap-2.5"
                    data-testid="public-participant-card"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative size-10 rounded-full bg-[#063D2B] text-[#B5F44A] flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                        <span>{p.maskedName.slice(0, 2).toUpperCase()}</span>
                        {idx < 3 && (
                          <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-[#B5F44A] text-[#063D2B] text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white tabular-nums">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#151515] truncate">
                          {p.maskedName}
                        </p>
                        <p className="text-[11px] font-mono text-[#6E6E73] tabular-nums">
                          {p.maskedWhatsapp}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#B5F44A] text-[#063D2B] text-[10px] font-extrabold tabular-nums">
                        <CheckCircle2 className="size-3" /> {p.cartelasCount}{' '}
                        {p.cartelasCount === 1 ? 'cartela' : 'cartelas'}
                      </span>
                      <p className="text-[10px] text-[#86868B] mt-0.5 flex items-center justify-end gap-0.5">
                        <Lock className="size-2.5" /> Nº oculto
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* REVERSE MARKETING COMPARISON STRIP (1 in 75 vs Traditional 1 in 1,000,000) */}
            <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/[0.07] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 max-w-xl">
                <span className="text-[11px] font-bold text-[#063D2B] block">
                  Por que sua chance aqui é muito maior
                </span>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  Nos sorteios tradicionais de milhar (como{' '}
                  <span className="font-semibold text-[#151515]">
                    Fortcap, Totolec, Canal da Sorte ou Lotece
                  </span>
                  ), você disputa contra <strong>100 mil a 1 milhão de bilhetes</strong>. Aqui são{' '}
                  <strong className="text-[#063D2B]">apenas 75 números (01 a 75)</strong> e a{' '}
                  <strong>1ª bola sorteada</strong> já leva o PIX na hora.
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-[#063D2B] text-[#B5F44A] font-mono text-xs font-bold shrink-0">
                1 em 75
              </span>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: PIX CHECKOUT + INSTANT RASPADINHA */}
        <aside
          id="checkout-mvp"
          className={`lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 lg:sticky lg:top-20 shadow-[0_10px_35px_rgba(0,0,0,0.04)] ${
            highlightCheckout
              ? 'border-[#16A34A] ring-4 ring-[#16A34A]/20'
              : 'border-black/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#15803D]">
                <Zap className="w-3 h-3" /> Checkout Instantâneo · Zero Senha
              </div>
              <h2 className="text-lg font-extrabold text-[#1D1D1F]">Finalizar no PIX</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-medium text-[#6E6E73] block">Cota Unitária</span>
              <span className="font-mono text-xs font-bold text-[#1D1D1F]">
                R$ {ticketPriceBRL.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {errors.conflict && (
            <div
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-[#DC2626] flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errors.conflict}</span>
            </div>
          )}

          {pixStep === 'form' && (
            <form onSubmit={handleGeneratePix} className="space-y-4" noValidate>
              {/* Selected Numbers Summary */}
              <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#6E6E73]">
                  <span className="font-semibold text-[#1D1D1F]">
                    Suas cartelas ({selectedNumbers.length})
                  </span>
                  <span className="font-mono font-bold text-[#1D1D1F] tabular-nums">
                    R$ {subtotalBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {selectedNumbers.length === 0 ? (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-[#6E6E73]">
                      Toque em um número verde na grade ou use a Surpresinha:
                    </p>
                    <button
                      type="button"
                      onClick={onSelectRandom}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-black/[0.08] text-xs font-bold text-[#15803D] hover:bg-[#F0FDF4] shrink-0 cursor-pointer"
                    >
                      +1 Nº Aleatório
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNumbers.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => onToggleNumber(num)}
                          className="px-2.5 py-1 rounded-lg bg-[#1D1D1F] text-white font-mono text-xs font-bold tabular-nums hover:bg-[#DC2626] transition-colors cursor-pointer flex items-center gap-1"
                          title="Remover número"
                        >
                          <span>Nº {formatGridNumber(num)}</span>
                          <span className="opacity-75">×</span>
                        </button>
                      ))}
                    </div>

                    {/* VIRAL UPSELL: CERCAR VIZINHOS DA SORTE (1 TOQUE) */}
                    {onSurroundNeighbors &&
                      availableNeighbors.length > 0 &&
                      selectedNumbers.length <= 4 && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#ECFDF5] to-[#F0FDF4] border border-[#86EFAC] flex items-center justify-between gap-2">
                          <div className="text-[11px] leading-snug text-[#166534]">
                            <strong className="font-extrabold text-[#15803D] flex items-center gap-1">
                              <Sparkles className="size-3 shrink-0" /> Cercar Vizinhos da Sorte?
                            </strong>
                            <span>
                              Garanta também o{' '}
                              <strong className="font-mono">
                                Nº {availableNeighbors.map(formatGridNumber).join(' e ')}
                              </strong>{' '}
                              e ative desconto de Combo!
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={onSurroundNeighbors}
                            className="px-2.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-extrabold shrink-0 cursor-pointer shadow-2xs active:scale-95"
                          >
                            + Cercar ({availableNeighbors.length})
                          </button>
                        </div>
                      )}
                  </div>
                )}

                {errors.numbers && (
                  <p className="text-xs text-[#DC2626] font-medium" role="alert">
                    {errors.numbers}
                  </p>
                )}
              </div>

              {/* Returning Customer Auto-Fill Badge */}
              {customerProfile?.name && customerProfile?.whatsapp && (
                <div className="px-3 py-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-[11px] text-[#15803D]">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Dados preenchidos p/ compra em 1 toque</span>
                  </span>
                </div>
              )}

              {/* Customer Inputs: Name, WhatsApp & Optional Email for Receipt */}
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="block text-xs font-bold text-[#1D1D1F] mb-1"
                  >
                    Seu Nome Completo
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    placeholder="Ex: Maria Silva"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F5F5F7] focus:bg-white border border-black/[0.08] focus:border-[#16A34A] rounded-xl focus:outline-none transition-colors font-medium"
                  />
                  {errors.name && (
                    <p className="text-xs text-[#DC2626] mt-1 font-medium" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-whatsapp"
                    className="block text-xs font-bold text-[#1D1D1F] mb-1"
                  >
                    Seu WhatsApp (com DDD)
                  </label>
                  <input
                    id="checkout-whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => {
                      setWhatsapp(formatPhoneMask(e.target.value));
                      if (errors.whatsapp) setErrors({ ...errors, whatsapp: undefined });
                    }}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F5F5F7] focus:bg-white border border-black/[0.08] focus:border-[#16A34A] rounded-xl focus:outline-none transition-colors font-semibold"
                  />
                  {errors.whatsapp && (
                    <p className="text-xs text-[#DC2626] mt-1 font-medium" role="alert">
                      {errors.whatsapp}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-email"
                    className="block text-xs font-medium text-[#6E6E73] mb-1"
                  >
                    E-mail para receber o comprovante (opcional)
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2 text-xs bg-[#F5F5F7] focus:bg-white border border-black/[0.06] focus:border-[#1D1D1F] rounded-xl focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.06] space-y-1.5 text-xs">
                {comboPricing.comboDiscountBRL > 0 && (
                  <div className="flex items-center justify-between text-[#15803D] font-bold bg-[#ECFDF5] px-2.5 py-1 rounded-lg border border-[#A7F3D0]">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="size-3.5 shrink-0" /> {comboPricing.comboLabel}
                    </span>
                    <span className="font-mono">
                      - R$ {comboPricing.comboDiscountBRL.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                {appliedDiscount > 0 && (
                  <div className="flex items-center justify-between text-[#15803D] font-bold bg-[#F0FDF4] px-2.5 py-1 rounded-lg">
                    <span>Desconto da Raspadinha aplicado</span>
                    <span className="font-mono">
                      - R$ {appliedDiscount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base font-extrabold text-[#1D1D1F]">
                  <span>Total no PIX</span>
                  <span className="font-mono tabular-nums text-[#15803D]">
                    R$ {finalAmountBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                {adminConfig.scratchEnabled && (
                  <div className="flex items-center justify-between text-[#15803D] pt-0.5">
                    <span>Bônus liberado na hora</span>
                    <span className="font-bold inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> +1 Raspadinha Premiada
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={selectedNumbers.length === 0}
                className={`w-full py-2.5 pl-5 pr-2.5 rounded-2xl text-sm font-extrabold transition-all duration-150 flex items-center justify-between gap-2 ${
                  selectedNumbers.length === 0
                    ? 'bg-[#E8E8ED] text-[#86868B] cursor-not-allowed'
                    : 'bg-[#063D2B] hover:bg-[#0B5339] text-white shadow-md cursor-pointer active:scale-[0.99]'
                }`}
              >
                <span>Pagar R$ {finalAmountBRL.toFixed(2).replace('.', ',')} no PIX</span>
                <span
                  className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedNumbers.length === 0
                      ? 'bg-black/5 text-[#86868B]'
                      : 'bg-[#B5F44A] text-[#063D2B]'
                  }`}
                >
                  <ArrowRight className="size-4" />
                </span>
              </button>
            </form>
          )}

          {pixStep === 'awaiting_pix' && (
            <div className="space-y-4" data-testid="pix-payment-step">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToEdit}
                  className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Trocar número</span>
                </button>
                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#DC2626] bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expira em {formatTimer(pixCountdownSec)}</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col items-center text-center space-y-3">
                <p className="text-xs text-[#6E6E73]">
                  Reservado para <strong className="text-[#1D1D1F]">{name}</strong>:{' '}
                  <strong className="text-[#15803D] font-mono">
                    Nº {selectedNumbers.map(formatGridNumber).join(', ')}
                  </strong>
                </p>

                {mpQrBase64 ? (
                  <img
                    src={`data:image/png;base64,${mpQrBase64}`}
                    alt="QR Code PIX Oficial"
                    referrerPolicy="no-referrer"
                    className="w-40 h-40 bg-white p-2.5 rounded-2xl border border-black/[0.08] object-contain shadow-xs"
                  />
                ) : !qrImgFailed && pixCode ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                      pixCode
                    )}`}
                    alt="QR Code PIX Oficial Banco Central"
                    onError={() => setQrImgFailed(true)}
                    className="w-40 h-40 bg-white p-2.5 rounded-2xl border border-black/[0.08] object-contain shadow-xs"
                  />
                ) : (
                  <div className="w-36 h-36 bg-white p-3 rounded-2xl border border-black/[0.08] shadow-xs flex items-center justify-center">
                    <svg
                      viewBox="0 0 21 21"
                      className="w-full h-full"
                      role="img"
                      aria-label="QR Code PIX"
                    >
                      {qrMatrix.map((row, rIdx) =>
                        row.map((cell, cIdx) =>
                          cell ? (
                            <rect
                              key={`${rIdx}-${cIdx}`}
                              x={cIdx}
                              y={rIdx}
                              width={1}
                              height={1}
                              fill="#1D1D1F"
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#6E6E73] block">
                    Valor Exato do PIX
                  </span>
                  <p className="text-lg font-extrabold font-mono text-[#1D1D1F] tabular-nums">
                    R$ {finalAmountBRL.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>

              {isAsaasSandbox && (
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[11px] text-[#15803D] space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 shrink-0" /> Modo Homologação / Chave Direta Ativo (Teste Grátis)
                  </p>
                  <p className="text-[#166534]">
                    O QR Code acima usa seu PIX Oficial Banco Central, e você também pode testar o
                    fluxo completo <strong>sem gastar dinheiro</strong> clicando no botão verde
                    abaixo!
                  </p>
                </div>
              )}

              {/* Copy & Paste PIX Code */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#1D1D1F]">
                  PIX Copia e Cola (Banco Central):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixCode}
                    aria-label="Código PIX Copia e Cola"
                    className="w-full px-3 py-2.5 text-xs font-mono bg-[#F5F5F7] border border-black/[0.08] rounded-xl text-[#1D1D1F]"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-4 py-2.5 bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedPix ? (
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedPix ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {pixCheckMsg && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#B45309] bg-[#FEF3C7] px-3 py-2 rounded-xl text-center">
                    {pixCheckMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleConfirmPixPayment(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-bold cursor-pointer"
                  >
                    Liberar / Simular Aprovação Agora (Sem Gastar)
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleConfirmPixPayment(false)}
                className="w-full py-3.5 px-4 bg-[#063D2B] hover:bg-[#0B5339] text-white text-sm font-extrabold rounded-2xl transition-all cursor-pointer shadow-md active:scale-[0.99]"
              >
                {adminConfig.paymentMode === 'direct_pix_zero_fee'
                  ? 'Já fiz o PIX · Enviar p/ Conferência'
                  : 'Confirmar Pagamento PIX'}
              </button>
            </div>
          )}

          {pixStep === 'confirmed' && lastRecord && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
              data-testid="pix-confirmed-step"
            >
              {/* PREMIUM OFFICIAL RECEIPT TICKET CARD */}
              <div
                className={`p-4 rounded-2xl border-2 space-y-3 shadow-xs ${
                  lastRecord.status === 'Pagamento em Conferência'
                    ? 'bg-gradient-to-b from-[#FEF3C7]/45 to-white border-[#F59E0B]/60'
                    : 'bg-gradient-to-b from-[#F0FDF4] to-white border-[#86EFAC]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex items-center gap-1.5 font-extrabold text-sm ${
                      lastRecord.status === 'Pagamento em Conferência'
                        ? 'text-[#B45309]'
                        : 'text-[#15803D]'
                    }`}
                  >
                    {lastRecord.status === 'Pagamento em Conferência' ? (
                      <Clock className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {lastRecord.status === 'Pagamento em Conferência'
                        ? 'Reservado · Conferência do PIX'
                        : 'Comprovante Oficial Emitido'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#15803D] bg-white px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                    {lastRecord.pixTxId}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-black/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#6E6E73] font-bold block">
                      {lastRecord.status === 'Pagamento em Conferência'
                        ? 'Números Segurados p/ Você'
                        : 'Seus Números Garantidos'}
                    </span>
                    <strong className="font-mono text-base font-extrabold text-[#15803D]">
                      Nº {lastRecord.numbers.join(', ')}
                    </strong>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>

                <div className="ticket-divider pt-3 flex items-center justify-between text-[11px] text-[#6E6E73]">
                  <span>
                    Titular: <strong className="text-[#1D1D1F]">{lastRecord.customerName}</strong> ·{' '}
                    <span className="font-mono">{lastRecord.customerWhatsappFormatted}</span>
                  </span>
                </div>

                {lastRecord.customerEmail && (
                  <p className="text-[11px] text-[#15803D] flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Cópia enviada para {lastRecord.customerEmail}
                  </p>
                )}

                {lastRecord.status === 'Pagamento em Conferência' ? (
                  <a
                    href={`https://wa.me/${(adminConfig.whatsappSupportNumber || '5585999999999').replace(
                      /\D/g,
                      ''
                    )}?text=${encodeURIComponent(
                      `Olá! Fiz o PIX de *R$ ${lastRecord.amountPaid
                        .toFixed(2)
                        .replace('.', ',')}* na *${lastRecord.editionNumber}* da Chance Premiada!\n\n👤 *Nome:* ${lastRecord.customerName}\n🔢 *Números:* Nº ${lastRecord.numbers.join(
                        ', '
                      )}\n🧾 *Código:* ${lastRecord.pixTxId}\n\nSegue meu comprovante para liberação:`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#063D2B] hover:bg-[#0B5339] text-[#B5F44A] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Enviar Comprovante no WhatsApp do Admin</span>
                  </a>
                ) : (
                  <a
                    href={`https://wa.me/55${lastRecord.customerWhatsapp}?text=${encodeURIComponent(
                      `✅ *COMPROVANTE OFICIAL — CHANCE PREMIADA*\n\n🎟 *${lastRecord.editionNumber}*\n🔢 *Meus Números:* Nº ${lastRecord.numbers.join(
                        ', '
                      )}\n💰 *Prêmio da 1ª Bola:* R$ ${lastRecord.prizeAmountBRL
                        .toFixed(2)
                        .replace('.', ',')} no PIX\n🧾 *ID Transação:* ${lastRecord.pixTxId}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Salvar Comprovante no Meu WhatsApp</span>
                  </a>
                )}
              </div>

              {/* FUNCTIONAL TAMPER-PROOF SCRATCH CARD (Locked until Admin approves Direct PIX) */}
              {adminConfig.scratchEnabled && lastRecord.status === 'Pagamento em Conferência' ? (
                <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/[0.08] text-center space-y-1.5">
                  <div className="size-9 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mx-auto">
                    <Lock className="size-4" />
                  </div>
                  <p className="text-xs font-extrabold text-[#151515]">
                    Raspadinha Digital bloqueada até a conferência do PIX
                  </p>
                  <p className="text-[11px] text-[#6E6E73]">
                    Assim que o Administrador confirmar seu PIX no extrato bancário, seus números
                    ficam validados e sua Raspadinha é liberada na aba{' '}
                    <strong>Meus Números</strong>.
                  </p>
                </div>
              ) : (
                adminConfig.scratchEnabled && (
                  <ScratchCardWidget
                    scratch={lastRecord.scratchCard}
                    onRevealComplete={() => {
                      onScratchRevealed(lastRecord.id);
                      if (lastRecord.scratchCard.tier === 'bonus_coins') {
                      setDiscountBRL(lastRecord.scratchCard.valueBRL);
                    }
                  }}
                  onUseDiscountNow={() => {
                    setDiscountBRL(lastRecord.scratchCard.valueBRL);
                    setPixStep('form');
                    setLastRecord(null);
                    if (selectedNumbers.length === 0) {
                      onSelectRandom();
                    }
                    scrollToCheckout();
                  }}
                />
                )
              )}

              {/* POST-PIX GOLD SLOT: UNLOCKED PARTNER COUPONS IN MARACANAÚ */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#ECFDF5] to-[#FEF9C3]/35 border border-[#86EFAC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#15803D] flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" /> Passaporte VIP Liberado em{' '}
                    {adminConfig.cityRegionLabel || 'Maracanaú'}!
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded text-[#15803D] border border-[#BBF7D0]">
                    +{lastRecord.coinsEarned} Coins
                  </span>
                </div>
                <p className="text-[11px] text-[#166534] leading-snug">
                  Seus R$ {lastRecord.amountPaid.toFixed(2).replace('.', ',')} já valem até{' '}
                  <strong>R$ 15,00 de desconto</strong> hoje nas lojas parceiras (Pizza, Açaí,
                  Barbearia e Lava-Jato):
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('lookup')}
                  className="w-full py-2 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold cursor-pointer transition-colors shadow-2xs"
                >
                  Usar Meus Cupons de Desconto Agora →
                </button>
              </div>

              {/* COMMUNITY INVITE ON RECEIPT: WHATSAPP & TELEGRAM */}
              <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2">
                <p className="text-[11px] font-bold text-[#1D1D1F]">
                  Onde ver o vídeo da 1ª bola ao vivo? Entre na Comunidade:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={
                      adminConfig.whatsappGroupUrl || 'https://chat.whatsapp.com/chancepremiada-vip'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-bold text-center transition-colors"
                  >
                    Grupo VIP WhatsApp
                  </a>
                  <a
                    href={
                      adminConfig.telegramChannelUrl || 'https://t.me/chancepremiada_oficial'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-[11px] font-bold text-center transition-colors"
                  >
                    Canal do Telegram
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPixStep('form');
                    setLastRecord(null);
                    if (selectedNumbers.length === 0) {
                      onSelectRandom();
                    }
                    scrollToCheckout();
                  }}
                  className="py-2.5 px-3 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {activeDiscountBRL > 0
                    ? `Usar Desconto R$ ${activeDiscountBRL.toFixed(2).replace('.', ',')}`
                    : 'Escolher +1 Número'}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('lookup')}
                  className="py-2.5 px-3 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Meus Números</span>
                </button>
              </div>
            </motion.div>
          )}
        </aside>
      </div>

      {/* INSTAGRAMMABLE 9:16 STORIES & WHATSAPP STATUS CARD GENERATOR MODAL */}
      <AnimatePresence>
        {showStoriesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center overflow-y-auto"
            data-testid="stories-card-modal"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl border border-black/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#15803D] block">
                    Kit Viral · Instagram Stories & Status Zap
                  </span>
                  <h3 className="text-base font-extrabold text-[#1D1D1F]">
                    Card 9:16 Pronto p/ Print + Seu Link de Comissão
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStoriesModal(false)}
                  className="px-2.5 py-1 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-xs font-bold text-[#1D1D1F] cursor-pointer"
                >
                  Fechar ✕
                </button>
              </div>

              {/* 9:16 Vertical Instagrammable Card */}
              <div className="mx-auto max-w-[290px] rounded-3xl bg-gradient-to-b from-[#063D2B] via-[#0A1713] to-[#063D2B] text-white p-5 space-y-3.5 border-2 border-[#D5AC58]/60 shadow-xl text-center relative overflow-hidden">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D5AC58]/20 border border-[#D5AC58]/50 text-[#F5F0E5] text-[10px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-[#D5AC58]" /> Edição #{adminConfig.editionNumber}{' '}
                  Ao Vivo · {adminConfig.cityRegionLabel || 'Maracanaú'}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-[#D5AC58] font-bold">
                    Saiu na 1ª Bola, Ganhou na Hora
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-white tracking-tight">
                    R$ {adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')} NO PIX
                  </p>
                  <p className="text-xs text-white/80">
                    Apenas <strong>75 números (01 a 75)</strong> · R${' '}
                    {ticketPriceBRL.toFixed(2).replace('.', ',')} cada
                  </p>
                </div>

                {/* Live Mini Scarcity Bar for the Print */}
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#4ADE80] inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#4ADE80]" /> Restam {stats.available} números livres
                    </span>
                    <span className="font-mono font-bold text-white">{stats.sold}/75</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#22C55E] to-[#D5AC58] rounded-full"
                      style={{ width: `${Math.max(8, (stats.sold / 75) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/85 text-center pt-0.5 inline-flex items-center justify-center gap-1 w-full">
                    <Gift className="size-3 text-[#D5AC58] shrink-0" />
                    <span>Comprou, ganhou <strong>+1 Raspadinha Digital</strong> na hora</span>
                  </p>
                </div>

                {/* Space Reserved for Instagram "LINK" Sticker */}
                <div className="py-2.5 px-3 rounded-2xl bg-[#F5F0E5] text-[#0A1713] border-2 border-dashed border-[#D5AC58] space-y-0.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#15803D] block">
                    Cole a Figurinha [LINK] do Instagram Aqui
                  </span>
                  <strong className="text-xs font-extrabold block">
                    TOQUE AQUI P/ ESCOLHER SEU Nº DA SORTE
                  </strong>
                </div>

                <p className="text-[10px] font-mono text-[#D5AC58]">
                  Parceiro Oficial: @{customSellerCode.trim() || activeAffiliate?.code || 'vip'}
                </p>
              </div>

              {/* Official Banners Ready to Download (WhatsApp / Feed & Instagram Stories 9:16) */}
              <div className="grid grid-cols-2 gap-2.5 bg-[#F2F4F7] p-3 rounded-2xl border border-black/[0.06]">
                <div className="space-y-1.5 text-center">
                  <img
                    src={activeBannerInfo.zapShareBannerUrl}
                    alt={`Arte Oficial R$ ${adminConfig.prizeAmountBRL} no PIX`}
                    className="w-full h-28 object-cover rounded-xl border border-black/[0.08]"
                  />
                  <a
                    href={activeBannerInfo.zapShareBannerUrl}
                    download={`chance-premiada-pix-${adminConfig.prizeAmountBRL}.jpg`}
                    className="block w-full py-1.5 px-2 rounded-lg bg-[#063D2B] hover:bg-[#0B5339] text-[#B5F44A] text-[10px] font-extrabold transition-colors"
                  >
                    ⬇ Baixar Arte R$ {adminConfig.prizeAmountBRL}
                  </a>
                </div>
                <div className="space-y-1.5 text-center">
                  <img
                    src={activeBannerInfo.storiesVerticalBannerUrl}
                    alt="Arte Oficial Stories 9:16 (De R$ 50 a R$ 600 no PIX)"
                    className="w-full h-28 object-cover rounded-xl border border-black/[0.08]"
                  />
                  <a
                    href={activeBannerInfo.storiesVerticalBannerUrl}
                    download="chance-premiada-stories-9x16.jpg"
                    className="block w-full py-1.5 px-2 rounded-lg bg-[#D5AC58] hover:bg-[#E2BC6B] text-[#0A1713] text-[10px] font-extrabold transition-colors"
                  >
                    ⬇ Baixar Stories 9:16
                  </a>
                </div>
              </div>

              {/* Custom Affiliate Code Input + 1-Click Copy Link & Caption */}
              <div className="space-y-2.5 bg-[#F5F5F7] p-3.5 rounded-2xl border border-black/[0.06]">
                <label className="block text-xs font-bold text-[#1D1D1F]">
                  Seu Código de Divulgador / Afiliado (para rastrear sua comissão automática):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSellerCode}
                    onChange={(e) =>
                      setCustomSellerCode(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                      )
                    }
                    placeholder="Ex: lucas, maria, barbearia"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-black/[0.12] font-mono text-xs text-[#1D1D1F]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const code = customSellerCode.trim() || activeAffiliate?.code || 'vip';
                      const origin =
                        typeof window !== 'undefined'
                          ? window.location.origin
                          : 'https://chancepremiada.com.br';
                      const fullLink = `${origin}/?ind=${code}`;
                      navigator.clipboard?.writeText(fullLink).catch(() => {});
                      setCopiedStoriesLink(true);
                      setTimeout(() => setCopiedStoriesLink(false), 2500);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    {copiedStoriesLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Meu Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-[#6E6E73]">
                  1. Tire print do card acima e poste nos Stories ou Status. <br />
                  2. Cole seu link{' '}
                  <strong className="font-mono text-[#15803D]">
                    /?ind={customSellerCode.trim() || activeAffiliate?.code || 'vip'}
                  </strong>{' '}
                  na figurinha de Link. Toda compra pelo seu link gera seu extrato automático no
                  sorteio!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE STICKY BOTTOM CHECKOUT CALLOUT WHEN NUMBERS ARE SELECTED */}
      <AnimatePresence>
        {selectedNumbers.length > 0 && pixStep === 'form' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-16 left-3 right-3 z-30 lg:hidden bg-[#1D1D1F]/95 backdrop-blur-md text-white p-3.5 rounded-2xl flex items-center justify-between shadow-2xl border border-white/15"
          >
            <div className="min-w-0 pr-2">
              <p className="text-[11px] font-medium text-white/80 truncate">
                {selectedNumbers.length} {selectedNumbers.length === 1 ? 'cartela' : 'cartelas'} (Nº{' '}
                {selectedNumbers.map(formatGridNumber).join(', ')})
              </p>
              <div className="flex items-center gap-2">
                <p className="text-base font-extrabold font-mono tabular-nums text-[#4ADE80]">
                  R$ {finalAmountBRL.toFixed(2).replace('.', ',')}
                </p>
                {appliedDiscount > 0 && (
                  <span className="text-[10px] font-bold bg-[#16A34A] text-white px-1.5 py-0.5 rounded">
                    Desconto Ativo
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToCheckout}
              className="px-4 py-2.5 bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white text-xs font-extrabold rounded-xl cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>Finalizar PIX</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
