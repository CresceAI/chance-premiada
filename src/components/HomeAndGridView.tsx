import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  calculateSafeFinalAmount,
  getAvailableNeighbors,
  DEFAULT_PARTNER_COUPONS,
} from '../utils/engine';
import { databaseService } from '../services/database';
import { ScratchCardWidget } from './ScratchCardWidget';
import { PARTNER_AD_SHOWCASE_BANNERS, resolveActiveBannerInfo } from '../utils/banners';
import chancePremiadaLogo from '../assets/images/chance-premiada.svg';
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
  onNavigateTab: (
    tab: 'home' | 'numbers' | 'how-to-play' | 'lookup' | 'profile' | 'results' | 'admin'
  ) => void;
  mobileFocusMode?: 'overview' | 'grid';
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

interface GridCellButtonProps {
  item: GridNumber;
  isSelected: boolean;
  onSelect: (num: number) => void;
}

const GridCellButton = React.memo<GridCellButtonProps>(
  ({ item, isSelected, onSelect }) => {
    const isAvailable = item.status === 'available';
    const isReserved = item.status === 'reserved';

    let cellStyle = '';
    if (isSelected) {
      cellStyle =
        'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] ring-2 ring-[var(--brand-accent)] ring-offset-2 ring-offset-[#111512] cursor-pointer font-extrabold shadow-[0_0_20px_rgba(200,255,55,0.22)]';
    } else if (isAvailable) {
      cellStyle =
        'bg-[#171c18] hover:bg-[#1e261f] text-[#f5f7f3] border border-white/[0.09] hover:border-[var(--brand-accent)]/40 cursor-pointer active:scale-95';
    } else if (isReserved) {
      cellStyle =
        'bg-[#3f1515]/80 text-[#fca5a5] border border-[#ef4444]/30 cursor-not-allowed';
    } else {
      cellStyle =
        'bg-white/[0.03] text-[#4b524d] border border-white/[0.04] cursor-not-allowed';
    }

    return (
      <button
        type="button"
        disabled={!isAvailable}
        onClick={() => onSelect(item.number)}
        aria-label={`Número ${item.formatted} ${
          isSelected
            ? 'selecionado'
            : isAvailable
            ? 'disponível'
            : isReserved
            ? 'reservado'
            : 'vendido'
        }`}
        className={`relative h-11 rounded-xl font-mono text-sm font-bold tabular-nums flex items-center justify-center transition-transform duration-150 select-none ${cellStyle}`}
      >
        <span>{item.formatted}</span>
        {isSelected && (
          <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] flex items-center justify-center shadow-xs">
            <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
          </span>
        )}
      </button>
    );
  }
);

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
  mobileFocusMode = 'overview',
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
  const [favoriteNumber, setFavoriteNumber] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('cp_favorite_number');
      const parsed = saved ? Number(saved) : NaN;
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= 75 ? parsed : null;
    } catch {
      return null;
    }
  });

  const handleSaveFavoriteNumber = (num: number) => {
    setFavoriteNumber(num);
    try {
      localStorage.setItem('cp_favorite_number', String(num));
    } catch {
      // ignore storage quota errors
    }
  };

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

  const stats = useMemo(() => getGridStats(grid), [grid]);
  const publicParticipants = useMemo(
    () => getPublicParticipantsFeed(grid, participations),
    [grid, participations]
  );
  const syncedLastRecord = useMemo(
    () =>
      lastRecord ? participations.find((p) => p.id === lastRecord.id) || lastRecord : null,
    [lastRecord, participations]
  );
  const ticketPriceBRL = adminConfig.ticketPriceBRL;
  const activeBannerInfo = useMemo(
    () =>
      resolveActiveBannerInfo(
        adminConfig.prizeAmountBRL,
        ticketPriceBRL,
        adminConfig.customBannerUrl
      ),
    [adminConfig.prizeAmountBRL, ticketPriceBRL, adminConfig.customBannerUrl]
  );
  const {
    comboPricing,
    subtotalBRL,
    appliedDiscountBRL: appliedDiscount,
    finalAmountBRL,
  } = useMemo(
    () =>
      calculateSafeFinalAmount(
        selectedNumbers.length,
        ticketPriceBRL,
        activeDiscountBRL
      ),
    [selectedNumbers.length, ticketPriceBRL, activeDiscountBRL]
  );
  const availableNeighbors = useMemo(
    () => getAvailableNeighbors(grid, selectedNumbers),
    [grid, selectedNumbers]
  );

  const secretPositions =
    Array.isArray(adminConfig.secretScratchPositions) &&
    adminConfig.secretScratchPositions.length === 4
      ? adminConfig.secretScratchPositions
      : [7, 22, 39, 53];
  const remainingBonusCartelas = secretPositions.filter((pos) => pos > stats.sold).length;

  const filteredGrid = useMemo(
    () =>
      grid.filter((item) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'available') return item.status === 'available';
        return item.status === 'sold' || item.status === 'reserved';
      }),
    [grid, statusFilter]
  );

  const handleGridCellClick = useCallback(
    (num: number) => {
      if (pixStep !== 'form') {
        onReleaseReservedNumbers(selectedNumbers);
        setPixStep('form');
        setLastRecord(null);
      }
      onToggleNumber(num);
    },
    [pixStep, selectedNumbers, onReleaseReservedNumbers, onToggleNumber]
  );

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

    const isDirectZeroFee = isDirectPixMode && !forceSimulate;

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
            transition={{ duration: 0.16 }}
            className="bg-[var(--brand-primary)] text-white rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="size-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-[var(--brand-accent)]" aria-hidden="true" />
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

      {/* OFFICIAL EDITION HERO — Chance Premiada Premium Redesign (Obsidian + Electric Lime + Orbital Ball) */}
      <section
        className={`${
          mobileFocusMode === 'grid' ? 'hidden lg:block' : 'block'
        } relative overflow-hidden redesign-hero text-[#f5f7f3] rounded-[34px] p-5 sm:p-8 lg:p-12 space-y-6`}
      >
        {/* Subtle 42px Tech Grid Overlay & Lime Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15 redesign-hero-grid"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 right-6 w-[380px] h-[380px] rounded-full blur-xl opacity-80"
          style={{
            background:
              'radial-gradient(circle, rgba(184, 255, 46, 0.22), rgba(78, 235, 31, 0.08) 38%, transparent 70%)',
          }}
        />
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

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl relative z-10">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em]">
              <span className="border border-[var(--brand-accent)]/25 bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                <span className="size-[7px] rounded-full bg-[var(--brand-accent)] shadow-[0_0_0_5px_rgba(200,255,55,0.12)]" />
                <span>Edição #{adminConfig.editionNumber} · Ao vivo</span>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#929a94] tabular-nums">
                {activeViewersCount} online
              </span>
              {adminConfig.scratchEnabled && (
                <span className="text-[#0a0d0a] bg-[#D9B85D] px-3 py-1.5 rounded-full font-extrabold inline-flex items-center gap-1">
                  <Sparkles className="size-3" /> Raspadinha inclusa
                </span>
              )}
              {activeAffiliate && (
                <span
                  className="text-[#0a0d0a] bg-[var(--brand-accent)] px-3 py-1.5 rounded-full font-extrabold inline-flex items-center gap-1"
                  data-testid="active-affiliate-badge"
                >
                  <CheckCircle2 className="size-3" />
                  <span>Indicação: {activeAffiliate.name}</span>
                </span>
              )}
            </div>

            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--brand-accent)]">
              Sorteio do dia · Grade 01 a 75
            </p>

            <h1 className="text-3xl sm:text-5xl font-bold text-[#f5f7f3] tracking-[-0.04em] leading-[1.02] text-balance">
              Seu número pode valer{' '}
              <em className="not-italic font-extrabold text-[var(--brand-accent)] tabular-nums">
                R$ {adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')}
              </em>{' '}
              hoje.
            </h1>

            <p className="text-sm sm:text-[15px] text-[#a8b0aa] leading-relaxed text-pretty max-w-lg">
              Escolha de 01 a 75 por{' '}
              <strong className="text-[#f5f7f3] font-bold tabular-nums">
                R$ {ticketPriceBRL.toFixed(2).replace('.', ',')}
              </strong>
              . Se o seu número sair na 1ª bola, o PIX é seu — mais 1 Raspadinha Digital na hora.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('numbers')}
                className="w-full sm:w-auto px-5 py-3.5 rounded-[14px] bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer inline-flex items-center justify-center gap-2.5 shadow-[0_12px_35px_rgba(200,255,55,0.18)]"
              >
                <span>Escolher meus números</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('how-to-play')}
                className="px-4 py-3 rounded-[14px] bg-white/[0.05] hover:bg-white/[0.1] text-[#f5f7f3] border border-white/[0.09] text-xs font-bold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Zap className="size-3.5 text-[var(--brand-accent)]" aria-hidden="true" />
                <span>Como funciona</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStoriesModal(true)}
                className="px-4 py-3 rounded-[14px] bg-[#D9B85D]/15 hover:bg-[#D9B85D]/25 text-[#D9B85D] border border-[#D9B85D]/30 text-xs font-bold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5"
                data-testid="open-stories-card-button"
              >
                <Share2 className="size-3.5" aria-hidden="true" />
                <span>Ganhar 20%</span>
              </button>
            </div>

            {/* Hero Bottom Stats Strip (Redesign Pattern) */}
            <div className="pt-3 flex flex-wrap items-center gap-6 text-xs">
              <div className="flex items-baseline gap-1.5">
                <strong className="text-sm font-extrabold text-[#e9eee9] tabular-nums" data-testid="stat-available">
                  {stats.available}
                </strong>
                <span className="text-[11px] text-[#747c76]">disponíveis</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <strong className="text-sm font-extrabold text-[#e9eee9] tabular-nums" data-testid="sold-progress-count">
                  {stats.sold} / 75
                </strong>
                <span className="text-[11px] text-[#747c76]">já escolhidos</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <strong className="text-sm font-extrabold text-[var(--brand-accent)] tabular-nums">
                  R$ {ticketPriceBRL.toFixed(2).replace('.', ',')}
                </strong>
                <span className="text-[11px] text-[#747c76]">por número</span>
              </div>
              {adminConfig.scratchEnabled && (
                <div className="flex items-baseline gap-1.5">
                  <strong className="text-sm font-extrabold text-[#D9B85D] tabular-nums">
                    {remainingBonusCartelas} de 4
                  </strong>
                  <span className="text-[11px] text-[#747c76]">bônus na raspadinha</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Orbital 3D Ball + Floating Glass Cards (Mobile + Desktop Showcase) */}
          <div className="flex relative w-full lg:w-[390px] h-[250px] lg:h-[340px] items-center justify-center shrink-0">
            <div
              aria-hidden="true"
              className="absolute size-[235px] lg:size-[330px] rounded-full border border-[var(--brand-accent)]/15 redesign-orbit-1"
            >
              <span className="absolute left-7 top-7 lg:left-9 lg:top-9 size-2.5 rounded-full bg-[var(--brand-accent)] shadow-[0_0_18px_#c8ff37]" />
            </div>
            <div
              aria-hidden="true"
              className="absolute size-[185px] lg:size-[250px] rounded-full border border-dashed border-[var(--brand-accent)]/20 redesign-orbit-2"
            />
            <div className="relative size-[152px] lg:size-[196px] rounded-full redesign-ball flex flex-col items-center justify-center select-none">
              <span className="text-[8px] lg:text-[9px] font-extrabold tracking-[0.18em]">PIX 1ª BOLA</span>
              <b
                className={`${
                  adminConfig.prizeAmountBRL >= 100
                    ? 'text-[44px] lg:text-[62px]'
                    : 'text-[56px] lg:text-[76px]'
                } font-extrabold tracking-[-0.08em] leading-[0.9] tabular-nums`}
              >
                {adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')}
              </b>
              <small className="text-[9px] lg:text-[10px] font-bold mt-1">reais no PIX</small>
            </div>

            <div className="absolute top-3 right-1 lg:top-6 lg:right-2 flex items-center gap-2 px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-[14px] liquid-glass-dark">
              <span className="size-2 rounded-full bg-[var(--brand-accent)] shadow-[0_0_0_5px_rgba(200,255,55,0.14)]" />
              <div className="leading-tight">
                <b className="text-[11px] lg:text-xs font-extrabold text-white block tabular-nums">
                  R$ {adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')}
                </b>
                <small className="text-[9px] lg:text-[10px] text-[#929a94] block">Prêmio no PIX</small>
              </div>
            </div>

            <div className="absolute bottom-3 left-1 lg:bottom-6 lg:left-0 flex items-center gap-2 px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-[14px] liquid-glass-dark">
              <Sparkles className="size-3.5 lg:size-4 text-[var(--brand-accent)]" aria-hidden="true" />
              <div className="leading-tight">
                <b className="text-[11px] lg:text-xs font-extrabold text-white block">Raspadinha</b>
                <small className="text-[9px] lg:text-[10px] text-[#929a94] block">Bônus instantâneo</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 QUICK-ACCESS REDESIGN CARDS (Obsidian + Electric Lime) */}
      <section
        aria-label="Atalhos Rápidos do App"
        className={`${
          mobileFocusMode === 'grid' ? 'hidden lg:block' : 'block'
        } space-y-4`}
      >
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--brand-accent)] block">
              Mais rápido
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#f5f7f3] tracking-tight">
              O que você quer fazer?
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            className="min-h-[96px] bg-[#111512] hover:bg-[#151b15] border border-white/[0.09] hover:border-[var(--brand-accent)]/35 rounded-[20px] p-4 flex items-center text-left gap-3 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="size-11 rounded-[13px] bg-[var(--brand-accent)] text-[#10130f] flex items-center justify-center shrink-0">
              <Shuffle className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="text-xs font-extrabold text-[#f5f7f3] block truncate">Surpresinha</b>
              <small className="text-[10px] text-[#798179] block mt-0.5 tabular-nums truncate">
                1 Nº por R$ {ticketPriceBRL.toFixed(2).replace('.', ',')}
              </small>
            </div>
            <ArrowRight className="size-4 text-[#798179] hidden sm:block shrink-0" aria-hidden="true" />
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
            className="min-h-[96px] bg-[#111512] hover:bg-[#151b15] border border-white/[0.09] hover:border-[var(--brand-accent)]/35 rounded-[20px] p-4 flex items-center text-left gap-3 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="size-11 rounded-[13px] bg-[#222822] text-[#c7cec8] flex items-center justify-center shrink-0">
              <Flame className="size-4 text-[var(--brand-accent)]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="text-xs font-extrabold text-[#f5f7f3] block truncate">Combo 5 Nºs</b>
              <small className="text-[10px] text-[#798179] block mt-0.5 tabular-nums truncate">
                R$ {calculateComboPricing(5, ticketPriceBRL).comboTotalBRL.toFixed(2).replace('.', ',')}
              </small>
            </div>
            <span className="px-1.5 py-1 rounded-md bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] text-[9px] font-extrabold tracking-wider shrink-0 hidden sm:inline-block">
              POPULAR
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('lookup')}
            className="min-h-[96px] bg-[#111512] hover:bg-[#151b15] border border-white/[0.09] hover:border-[var(--brand-accent)]/35 rounded-[20px] p-4 flex items-center text-left gap-3 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="size-11 rounded-[13px] bg-[#222822] text-[#c7cec8] flex items-center justify-center shrink-0">
              <Gift className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="text-xs font-extrabold text-[#f5f7f3] block truncate">Clube local</b>
              <small className="text-[10px] text-[#798179] block mt-0.5 truncate">
                Cupons exclusivos
              </small>
            </div>
            <ArrowRight className="size-4 text-[#798179] hidden sm:block shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setShowStoriesModal(true)}
            className="min-h-[96px] bg-[#111512] hover:bg-[#151b15] border border-white/[0.09] hover:border-[var(--brand-accent)]/35 rounded-[20px] p-4 flex items-center text-left gap-3 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="size-11 rounded-[13px] bg-[#222822] text-[#D9B85D] flex items-center justify-center shrink-0">
              <Share2 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="text-xs font-extrabold text-[#f5f7f3] block truncate">Ganhar 20%</b>
              <small className="text-[10px] text-[#798179] block mt-0.5 truncate">
                Link e artes
              </small>
            </div>
            <ArrowRight className="size-4 text-[#798179] hidden sm:block shrink-0" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* MOBILE OVERVIEW SUMMARY (Rules, Partners & Participants — Shown only on Mobile "Início" Tab) */}
      {mobileFocusMode === 'overview' && (
        <div className="lg:hidden space-y-4">
          {/* Resumo das Regras (3 passos Apple Wallet) */}
          <section className="bg-white rounded-3xl border border-black/[0.06] p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#202124]">Como funciona em 3 passos</h2>
              <button
                type="button"
                onClick={() => onNavigateTab('how-to-play')}
                className="text-xs font-bold text-[#087C45] hover:underline cursor-pointer"
              >
                Tutorial 30s →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-[#F4F5F7]">
                <span className="text-xs font-extrabold text-[#073D2B] block">1. Escolha</span>
                <span className="text-[11px] text-[#5F6368] leading-tight block mt-0.5">
                  Nºs de 01 a 75
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#F4F5F7]">
                <span className="text-xs font-extrabold text-[#073D2B] block">2. PIX</span>
                <span className="text-[11px] text-[#5F6368] leading-tight block mt-0.5">
                  Libera Raspadinha
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#F4F5F7]">
                <span className="text-xs font-extrabold text-[#073D2B] block">3. 1ª Bola</span>
                <span className="text-[11px] text-[#5F6368] leading-tight block mt-0.5">
                  Ganhou na hora
                </span>
              </div>
            </div>
          </section>

          {/* Parceiros & Exemplos de Anúncios */}
          <section className="bg-white rounded-3xl border border-black/[0.06] p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#202124]">
                Parceiros & Anúncios ({adminConfig.cityRegionLabel || 'Maracanaú'})
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('profile')}
                className="text-xs font-bold text-[#087C45] hover:underline cursor-pointer"
              >
                Ver todos →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PARTNER_AD_SHOWCASE_BANNERS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => onNavigateTab('profile')}
                  className="rounded-xl overflow-hidden border border-black/[0.08] bg-[#073D2B] text-left cursor-pointer"
                >
                  <img
                    src={demo.imageUrl}
                    alt={demo.title}
                    className="w-full h-20 object-cover block"
                  />
                  <div className="px-2 py-1.5 text-white flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold truncate">{demo.title}</span>
                    <span className="text-[9px] text-[#B5F44A] font-bold shrink-0">Ver</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Participantes & CTA para Grade */}
          <section className="bg-white rounded-3xl border border-black/[0.06] p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#202124]">
                Participantes ({publicParticipants.length})
              </h2>
              <span className="text-[11px] font-bold text-[#087C45] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                Chance 1 em 75
              </span>
            </div>
            {publicParticipants.length === 0 ? (
              <p className="text-xs text-[#5F6368]">
                Grade iniciando do zero ({stats.sold}/75 vendidos). Seja o primeiro a garantir seu
                número!
              </p>
            ) : (
              <div className="space-y-2">
                {publicParticipants.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-2xl bg-[#F4F5F7] flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-[#202124]">{p.maskedName}</span>
                    <span className="font-mono font-bold text-[#087C45]">
                      {p.cartelasCount} {p.cartelasCount === 1 ? 'número' : 'números'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('numbers')}
              className="w-full py-3.5 rounded-2xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-transform duration-150 active:scale-[0.99]"
            >
              <span>Abrir Grade 01–75 e Escolher Números</span>
              <ArrowRight className="size-4" />
            </button>
          </section>
        </div>
      )}

      {/* COMPACT MOBILE HEADER BAR WHEN ON "NÚMEROS" TAB */}
      {mobileFocusMode === 'grid' && (
        <div className="lg:hidden bg-[#111512] border border-white/[0.09] text-[#f5f7f3] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-accent)] block">
              Edição #{adminConfig.editionNumber} · 1ª Bola no PIX
            </span>
            <strong className="text-base font-extrabold tabular-nums">
              Prêmio R$ {adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')} · R${' '}
              {ticketPriceBRL.toFixed(2).replace('.', ',')}/nº
            </strong>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] text-xs font-bold tabular-nums shrink-0">
            {stats.available} livres
          </span>
        </div>
      )}

      {/* MAIN WORKSPACE: 01–75 GRID (LEFT) + PIX CHECKOUT (RIGHT) */}
      <div
        className={`${
          mobileFocusMode === 'overview' ? 'hidden lg:grid' : 'grid'
        } grid-cols-1 lg:grid-cols-12 gap-6 items-start`}
      >
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* 01 to 75 Visual Grid */}
          <section className="bg-[#111512] rounded-3xl border border-white/[0.09] p-4 sm:p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#f5f7f3] flex items-center gap-2">
                  <span>Toque nos Números da Sorte (01 a 75)</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#929a94] mt-1">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#171c18] border border-white/25" /> Livre
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-accent)]" />{' '}
                    Selecionado
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Reservado
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" /> Pago
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
                      className="px-2.5 py-2 rounded-xl bg-[#171c18] hover:bg-[#1e261f] border border-white/[0.09] text-[#f5f7f3] text-xs font-bold transition-transform duration-150 cursor-pointer active:scale-95"
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
                      className="px-2.5 py-2 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold flex items-center gap-1 transition-transform duration-150 cursor-pointer active:scale-95"
                      title="Adicionar 5 números aleatórios"
                    >
                      <Flame className="w-3 h-3" aria-hidden="true" />
                      <span>{ticketPriceBRL === 4 ? '+5 Nºs (R$ 15)' : '+5 Nºs'}</span>
                    </button>
                  </>
                )}

                {selectedNumbers.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold text-[#929a94] hover:text-[#f87171] cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* VENDA UNITÁRIA + COMBOS PROMOCIONAIS (1 TOQUE) */}
            <div className="p-3 rounded-2xl bg-[#171c18] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#f5f7f3] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand-accent)]" aria-hidden="true" /> Combos com Desconto
                </span>
                <span className="text-[#929a94] hidden sm:inline">
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
                          ? 'bg-[var(--brand-accent)]/15 text-[#f5f7f3] border-[var(--brand-accent)] ring-1 ring-[var(--brand-accent)]'
                          : pkg.popular
                          ? 'bg-[#111512] hover:bg-[#1e261f] border-[var(--brand-accent)]/40'
                          : 'bg-[#111512] hover:bg-[#1e261f] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-[#f5f7f3]">
                          {pkg.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isCurrentCount
                              ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)]'
                              : pkg.discount > 0
                              ? 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]'
                              : 'bg-white/[0.06] text-[#929a94]'
                          }`}
                        >
                          {pkg.badge}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <strong className="font-mono text-sm font-extrabold text-[var(--brand-accent)] tabular-nums">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)]'
                      : 'bg-[#171c18] text-[#929a94] hover:text-white border border-white/[0.08]'
                  }`}
                >
                  Todos (75)
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('available')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'available'
                      ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)]'
                      : 'bg-[#171c18] text-[#929a94] hover:text-white border border-white/[0.08]'
                  }`}
                >
                  Disponíveis ({stats.available})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('sold')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'sold'
                      ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)]'
                      : 'bg-[#171c18] text-[#929a94] hover:text-white border border-white/[0.08]'
                  }`}
                >
                  Ocupados ({stats.sold + stats.reserved})
                </button>
              </div>

              {selectedNumbers.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 px-2.5 py-1 rounded-full border border-[var(--brand-accent)]/25">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedNumbers.length}{' '}
                  {selectedNumbers.length === 1 ? 'selecionado' : 'selecionados'}
                </span>
              )}
            </div>

            {/* Reta Final Banner (Quando restam 15 ou menos números disponíveis) */}
            {stats.available > 0 && stats.available <= 15 && (
              <div className="p-3 rounded-2xl bg-[#171c18] border border-[var(--brand-accent)]/35 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Flame className="size-4 text-[var(--brand-accent)] shrink-0" aria-hidden="true" />
                  <span className="text-[#f5f7f3] font-bold">
                    Reta Final: faltam apenas{' '}
                    <strong className="text-[var(--brand-accent)] font-mono tabular-nums">
                      {stats.available}
                    </strong>{' '}
                    {stats.available === 1 ? 'número' : 'números'} para fechar a grade!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRandom();
                    scrollToCheckout();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] text-[11px] font-extrabold cursor-pointer shrink-0"
                >
                  Pegar 1 dos Últimos →
                </button>
              </div>
            )}

            {/* Meu Número da Sorte Fixo (1 toque para salvar ou reservar) */}
            {(favoriteNumber !== null || selectedNumbers.length === 1) && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#171c18] border border-white/[0.08] text-xs">
                {favoriteNumber !== null ? (
                  <>
                    <span className="text-[#929a94] flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-[#D9B85D]" aria-hidden="true" />
                      <span>
                        Seu Nº da Sorte:{' '}
                        <strong className="font-mono text-[#f5f7f3]">
                          {formatGridNumber(favoriteNumber)}
                        </strong>
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      {grid.find((g) => g.number === favoriteNumber)?.status === 'available' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedNumbers.includes(favoriteNumber)) {
                              handleGridCellClick(favoriteNumber);
                            }
                            scrollToCheckout();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] text-[11px] font-extrabold cursor-pointer"
                        >
                          Escolher Nº {formatGridNumber(favoriteNumber)}
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#929a94] font-semibold">
                          Já ocupado nesta rodada
                        </span>
                      )}
                      {selectedNumbers.length === 1 && selectedNumbers[0] !== favoriteNumber && (
                        <button
                          type="button"
                          onClick={() => handleSaveFavoriteNumber(selectedNumbers[0])}
                          className="text-[11px] text-[var(--brand-accent)] font-bold hover:underline cursor-pointer"
                        >
                          Trocar p/ {formatGridNumber(selectedNumbers[0])}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[#929a94]">
                      Quer salvar o{' '}
                      <strong className="font-mono text-[#f5f7f3]">
                        Nº {formatGridNumber(selectedNumbers[0])}
                      </strong>{' '}
                      como seu Número da Sorte fixo?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveFavoriteNumber(selectedNumbers[0])}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-[var(--brand-accent)] text-[11px] font-bold cursor-pointer"
                    >
                      Salvar Favorito ★
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 75 Numbers Tactile Grid + Skeleton Fallback */}
            <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-10 xl:grid-cols-15 gap-2 pt-1">
              {grid.length === 0
                ? Array.from({ length: 15 }).map((_, idx) => (
                    <div
                      key={idx}
                      aria-hidden="true"
                      className="h-11 rounded-xl bg-[#171c18] border border-white/[0.06] animate-pulse"
                    />
                  ))
                : filteredGrid.map((item) => (
                    <GridCellButton
                      key={item.number}
                      item={item}
                      isSelected={selectedNumbers.includes(item.number)}
                      onSelect={handleGridCellClick}
                    />
                  ))}
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
            className="bg-[#111512] rounded-[28px] border border-white/[0.09] p-4 sm:p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
            data-testid="public-participants-section"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-2xl bg-[var(--brand-accent)]/15 border border-[var(--brand-accent)]/25 flex items-center justify-center text-[var(--brand-accent)]">
                  <Users className="size-4" aria-hidden="true" />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#f5f7f3]">
                  Quem está participando desta edição ({publicParticipants.length})
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/25 px-2.5 py-1 rounded-full">
                <ShieldCheck className="size-3.5" aria-hidden="true" /> Números e dados protegidos
              </span>
            </div>

            {publicParticipants.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#171c18] border border-white/[0.07] text-center space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-[#f5f7f3]">
                    Grade iniciando do zero (0/75 vendidos). Seja o #1 da rodada!
                  </p>
                  <p className="text-[11px] text-[#929a94]">
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
                  className="px-4 py-2 rounded-full bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Escolher o 1º Número da Rodada</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {publicParticipants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#171c18] border border-white/[0.07] flex items-center justify-between gap-2.5"
                    data-testid="public-participant-card"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative size-10 rounded-full bg-[#222822] border border-white/[0.1] text-[var(--brand-accent)] flex items-center justify-center font-extrabold text-xs shrink-0">
                        <span>{p.maskedName.slice(0, 2).toUpperCase()}</span>
                        {idx < 3 && (
                          <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] text-[9px] font-extrabold flex items-center justify-center ring-2 ring-[#171c18] tabular-nums">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#f5f7f3] truncate">
                          {p.maskedName}
                        </p>
                        <p className="text-[11px] font-mono text-[#929a94] tabular-nums">
                          {p.maskedWhatsapp}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] text-[10px] font-extrabold tabular-nums">
                        <CheckCircle2 className="size-3" /> {p.cartelasCount}{' '}
                        {p.cartelasCount === 1 ? 'cartela' : 'cartelas'}
                      </span>
                      <p className="text-[10px] text-[#747c76] mt-0.5 flex items-center justify-end gap-0.5">
                        <Lock className="size-2.5" /> Nº oculto
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* REVERSE MARKETING COMPARISON STRIP (1 in 75 vs Traditional 1 in 1,000,000) */}
            <div className="p-4 rounded-2xl bg-[#171c18] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 max-w-xl">
                <span className="text-[11px] font-bold text-[var(--brand-accent)] block">
                  Por que sua chance aqui é muito maior
                </span>
                <p className="text-xs text-[#929a94] leading-relaxed text-pretty">
                  Nos sorteios tradicionais de milhar (como{' '}
                  <span className="font-semibold text-[#f5f7f3]">
                    Fortcap, Totolec, Canal da Sorte ou Lotece
                  </span>
                  ), você disputa contra <strong>100 mil a 1 milhão de bilhetes</strong>. Aqui são{' '}
                  <strong className="text-[#f5f7f3]">apenas 75 números (01 a 75)</strong> e a{' '}
                  <strong>1ª bola sorteada</strong> já leva o PIX na hora.
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-mono text-xs font-extrabold shrink-0">
                1 em 75
              </span>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: PIX CHECKOUT + INSTANT RASPADINHA */}
        <aside
          id="checkout-mvp"
          className={`lg:col-span-5 xl:col-span-4 bg-[#111512] text-[#f5f7f3] rounded-3xl border transition-all p-5 sm:p-6 space-y-4 lg:sticky lg:top-24 shadow-[0_20px_50px_rgba(0,0,0,0.4)] ${
            highlightCheckout
              ? 'border-[var(--brand-accent)] ring-4 ring-[var(--brand-accent)]/20'
              : 'border-white/[0.09]'
          }`}
        >
          <div className="space-y-3 border-b border-white/[0.09] pb-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-accent)]">
                  <Zap className="w-3 h-3" /> Checkout em 3 passos · Sem senha
                </div>
                <h2 className="text-lg font-extrabold text-[#f5f7f3]">Confirmar Compra</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-medium text-[#929a94] block">Cota Unitária</span>
                <span className="font-mono text-xs font-bold text-[#f5f7f3] tabular-nums">
                  R$ {ticketPriceBRL.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-[#171c18] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--brand-accent)] rounded-full transition-all duration-300"
                  style={{
                    width:
                      pixStep === 'confirmed'
                        ? '100%'
                        : pixStep === 'awaiting_pix'
                        ? '70%'
                        : selectedNumbers.length > 0
                        ? '40%'
                        : '18%',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#929a94]">
                <span className={selectedNumbers.length > 0 ? 'text-[var(--brand-accent)] font-bold' : ''}>
                  1. Números
                </span>
                <span className={pixStep !== 'form' ? 'text-[var(--brand-accent)] font-bold' : ''}>
                  2. Pagamento PIX
                </span>
                <span className={pixStep === 'confirmed' ? 'text-[var(--brand-accent)] font-bold' : ''}>
                  3. Comprovante
                </span>
              </div>
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
              {/* Selected Numbers Summary (Obsidian Dark Surface) */}
              <div className="p-3.5 rounded-2xl bg-[#171c18] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#929a94]">
                  <span className="font-semibold text-[#f5f7f3]">
                    Suas cartelas ({selectedNumbers.length})
                  </span>
                  <span className="font-mono font-bold text-[var(--brand-accent)] tabular-nums">
                    R$ {subtotalBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {selectedNumbers.length === 0 ? (
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs text-[#929a94]">
                      Toque em um número disponível na grade ou use a Surpresinha:
                    </p>
                    <button
                      type="button"
                      onClick={onSelectRandom}
                      className="px-3 py-1.5 rounded-lg bg-[var(--brand-accent)]/15 hover:bg-[var(--brand-accent)]/25 border border-[var(--brand-accent)]/30 text-xs font-extrabold text-[var(--brand-accent)] shrink-0 cursor-pointer transition-colors"
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
                          className="px-2.5 py-1 rounded-lg bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-mono text-xs font-extrabold tabular-nums hover:bg-[#ef4444] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
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
                        <div className="p-2.5 rounded-xl bg-[#111512] border border-[var(--brand-accent)]/30 flex items-center justify-between gap-2">
                          <div className="text-[11px] leading-snug text-[#929a94]">
                            <strong className="font-extrabold text-[var(--brand-accent)] flex items-center gap-1">
                              <Sparkles className="size-3 shrink-0" aria-hidden="true" /> Cercar Vizinhos da Sorte?
                            </strong>
                            <span>
                              Garanta também o{' '}
                              <strong className="font-mono text-[#f5f7f3]">
                                Nº {availableNeighbors.map(formatGridNumber).join(' e ')}
                              </strong>{' '}
                              e ative desconto de Combo!
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={onSurroundNeighbors}
                            className="px-2.5 py-1.5 rounded-lg bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-[11px] font-extrabold shrink-0 cursor-pointer shadow-2xs active:scale-95"
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
                <div className="px-3 py-2 rounded-xl bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/25 flex items-center justify-between text-[11px] text-[var(--brand-accent)]">
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
                    className="block text-xs font-bold text-[#f5f7f3] mb-1"
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
                    className="w-full px-3.5 py-2.5 text-sm text-[#f5f7f3] placeholder:text-[#5e6660] bg-[#171c18] focus:bg-[#1c231d] border border-white/[0.1] focus:border-[var(--brand-accent)] rounded-xl focus:outline-none transition-colors font-medium"
                  />
                  {errors.name && (
                    <p className="text-xs text-[#f87171] mt-1 font-medium" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-whatsapp"
                    className="block text-xs font-bold text-[#f5f7f3] mb-1"
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
                    className="w-full px-3.5 py-2.5 text-sm font-mono text-[#f5f7f3] placeholder:text-[#5e6660] bg-[#171c18] focus:bg-[#1c231d] border border-white/[0.1] focus:border-[var(--brand-accent)] rounded-xl focus:outline-none transition-colors font-semibold"
                  />
                  {errors.whatsapp && (
                    <p className="text-xs text-[#f87171] mt-1 font-medium" role="alert">
                      {errors.whatsapp}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-email"
                    className="block text-xs font-medium text-[#929a94] mb-1"
                  >
                    E-mail para receber o comprovante (opcional)
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2 text-xs text-[#f5f7f3] placeholder:text-[#5e6660] bg-[#171c18] focus:bg-[#1c231d] border border-white/[0.1] focus:border-[var(--brand-accent)] rounded-xl focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Spendvest-style Order Review Hairline Summary */}
              <div className="rounded-2xl bg-[#171c18] border border-white/[0.08] divide-y divide-white/[0.07] px-3.5 text-xs">
                {comboPricing.comboDiscountBRL > 0 && (
                  <div className="py-2.5 flex items-center justify-between text-[var(--brand-accent)] font-bold">
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>{comboPricing.comboLabel}</span>
                    </span>
                    <span className="font-mono tabular-nums">
                      - R$ {comboPricing.comboDiscountBRL.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                {appliedDiscount > 0 && (
                  <div className="py-2.5 flex items-center justify-between text-[var(--brand-accent)] font-bold">
                    <span>Desconto da Raspadinha</span>
                    <span className="font-mono tabular-nums">
                      - R$ {appliedDiscount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-[#f5f7f3]">Total no PIX</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-mono font-extrabold text-sm tabular-nums">
                    R$ {finalAmountBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                {adminConfig.scratchEnabled && (
                  <div className="py-2.5 flex items-center justify-between text-[#929a94]">
                    <span>Bônus liberado na hora</span>
                    <span className="font-bold text-[#D9B85D] inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" aria-hidden="true" /> +1 Raspadinha Premiada
                    </span>
                  </div>
                )}
              </div>

              {/* Purchase Protection Row */}
              <div className="p-3 rounded-xl bg-[#171c18] border border-white/[0.07] flex items-start gap-2.5 text-[11px] text-[#929a94]">
                <ShieldCheck className="size-4 text-[var(--brand-accent)] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="leading-snug">
                  <strong className="text-[#f5f7f3] block">Compra Protegida Chance Premiada</strong>
                  Trava única anti-duplicidade: nenhum outro participante pode escolher o seu número.
                </p>
              </div>

              <button
                type="submit"
                disabled={selectedNumbers.length === 0}
                className={`w-full py-3.5 pl-5 pr-3.5 rounded-[14px] text-sm font-extrabold transition-all duration-150 flex items-center justify-between gap-2 ${
                  selectedNumbers.length === 0
                    ? 'bg-white/[0.06] text-[#5e6660] cursor-not-allowed'
                    : 'bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] shadow-[0_12px_35px_rgba(200,255,55,0.18)] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <span>Pagar R$ {finalAmountBRL.toFixed(2).replace('.', ',')} no PIX</span>
                <span
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedNumbers.length === 0
                      ? 'bg-white/[0.05] text-[#5e6660]'
                      : 'bg-[#0a0d0a]/15 text-[#0a0d0a]'
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

          {pixStep === 'confirmed' && syncedLastRecord && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
              data-testid="pix-confirmed-step"
            >
              {/* FINTECH REVIEW RECEIPT CARD (Brand Obsidian Hero + Hairline Rows + Security Seal) */}
              <div className="rounded-3xl bg-[#171c18] border border-white/[0.1] overflow-hidden shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
                {/* Branded Receipt Hero */}
                <div
                  className="p-5 text-center space-y-2.5 border-b border-white/[0.08]"
                  style={{
                    background:
                      syncedLastRecord.status === 'Pagamento em Conferência'
                        ? 'linear-gradient(135deg, #241d10 0%, #14120c 100%)'
                        : 'linear-gradient(135deg, #172816 0%, #0d150e 100%)',
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="size-8 rounded-lg bg-[var(--brand-accent)] flex items-center justify-center -rotate-6 shadow-xs shrink-0">
                      <img
                        src={chancePremiadaLogo}
                        alt="Chance Premiada"
                        className="h-5 w-auto object-contain rotate-6"
                      />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#f5f7f3]">
                      Chance Premiada
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 border border-white/15 text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-accent)]">
                    {syncedLastRecord.status === 'Pagamento em Conferência' ? (
                      <Clock className="w-3 h-3 text-[#D9B85D]" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span>
                      {syncedLastRecord.status === 'Pagamento em Conferência'
                        ? 'Reservado · Conferência do PIX'
                        : 'Comprovante Oficial · Chance Premiada'}
                    </span>
                  </div>

                  <p className="text-3xl font-extrabold font-mono text-[#f5f7f3] tabular-nums tracking-tight">
                    R$ {syncedLastRecord.amountPaid.toFixed(2).replace('.', ',')}
                  </p>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.1] text-xs">
                    <span className="size-5 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold text-[10px] flex items-center justify-center">
                      {syncedLastRecord.customerName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-bold text-[#f5f7f3] truncate max-w-[180px]">
                      {syncedLastRecord.customerName}
                    </span>
                  </div>
                </div>

                {/* Hairline Details Table */}
                <div className="px-4 py-1 divide-y divide-white/[0.07] text-xs">
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#929a94]">Edição</span>
                    <strong className="text-[#f5f7f3] font-bold">{syncedLastRecord.editionNumber}</strong>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#929a94]">Seus Números</span>
                    <strong className="font-mono font-extrabold text-[var(--brand-accent)] tabular-nums">
                      Nº {syncedLastRecord.numbers.join(', ')}
                    </strong>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#929a94]">Pagamento</span>
                    <span className="text-[#f5f7f3] font-semibold">PIX Instantâneo</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#929a94]">ID Transação</span>
                    <span className="font-mono text-[11px] text-[#f5f7f3] tabular-nums">
                      {syncedLastRecord.pixTxId}
                    </span>
                  </div>
                  {syncedLastRecord.customerEmail && (
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[#929a94]">Cópia E-mail</span>
                      <span className="text-[var(--brand-accent)] text-[11px] truncate max-w-[180px]">
                        {syncedLastRecord.customerEmail}
                      </span>
                    </div>
                  )}
                </div>

                {/* Security Seal & Actions */}
                <div className="p-4 pt-2 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-[#111512] border border-white/[0.07] flex items-center gap-2 text-[11px] text-[#929a94]">
                    <ShieldCheck className="size-4 text-[var(--brand-accent)] shrink-0" aria-hidden="true" />
                    <span>
                      Participação protegida pela trava única anti-duplicidade{' '}
                      <strong className="text-[#f5f7f3]">Chance Premiada</strong>.
                    </span>
                  </div>

                  {syncedLastRecord.status === 'Pagamento em Conferência' ? (
                    <a
                      href={`https://wa.me/${(adminConfig.whatsappSupportNumber || '5585985252317').replace(
                        /\D/g,
                        ''
                      )}?text=${encodeURIComponent(
                        `Olá! Fiz o PIX de *R$ ${syncedLastRecord.amountPaid
                          .toFixed(2)
                          .replace('.', ',')}* na *${syncedLastRecord.editionNumber}* da Chance Premiada!\n\n👤 *Nome:* ${syncedLastRecord.customerName}\n🔢 *Números:* Nº ${syncedLastRecord.numbers.join(
                          ', '
                        )}\n🧾 *Código:* ${syncedLastRecord.pixTxId}\n\nSegue meu comprovante para liberação:`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Enviar Comprovante no WhatsApp</span>
                    </a>
                  ) : (
                    <a
                      href={`https://wa.me/55${syncedLastRecord.customerWhatsapp}?text=${encodeURIComponent(
                        `✅ *COMPROVANTE OFICIAL — CHANCE PREMIADA*\n\n🎟 *${syncedLastRecord.editionNumber}*\n🔢 *Meus Números:* Nº ${syncedLastRecord.numbers.join(
                          ', '
                        )}\n💰 *Prêmio da 1ª Bola:* R$ ${syncedLastRecord.prizeAmountBRL
                          .toFixed(2)
                          .replace('.', ',')} no PIX\n🧾 *ID Transação:* ${syncedLastRecord.pixTxId}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Salvar Comprovante no Meu WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Ethical Remarketing Block inside Receipt */}
              <div className="p-3.5 rounded-2xl bg-[#171c18] border border-[var(--brand-accent)]/25 space-y-1.5 text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-accent)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" aria-hidden="true" /> Próximo Passo Inteligente
                </span>
                <p className="text-[11px] text-[#929a94] leading-relaxed">
                  {syncedLastRecord.status === 'Pagamento em Conferência'
                    ? 'Envie o comprovante acima para liberar seus números e sua Raspadinha Digital na hora.'
                    : 'Raspe sua Raspadinha abaixo para conferir seu bônus instantâneo ou compartilhe com amigos para fechar os 75 números mais rápido.'}
                </p>
              </div>

              {/* FUNCTIONAL TAMPER-PROOF SCRATCH CARD (Locked until Admin approves Direct PIX) */}
              {adminConfig.scratchEnabled && syncedLastRecord.status === 'Pagamento em Conferência' ? (
                <div className="p-4 rounded-2xl bg-[#171c18] border border-white/[0.08] text-center space-y-1.5">
                  <div className="size-9 rounded-xl bg-[#D9B85D]/15 text-[#D9B85D] flex items-center justify-center mx-auto">
                    <Lock className="size-4" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-extrabold text-[#f5f7f3]">
                    Raspadinha Digital bloqueada até a conferência do PIX
                  </p>
                  <p className="text-[11px] text-[#929a94]">
                    Assim que o Administrador confirmar seu PIX no extrato bancário, seus números
                    ficam validados e sua Raspadinha é liberada na aba{' '}
                    <strong className="text-[#f5f7f3]">Participações</strong>.
                  </p>
                </div>
              ) : (
                adminConfig.scratchEnabled && (
                  <ScratchCardWidget
                    scratch={syncedLastRecord.scratchCard}
                    onRevealComplete={() => {
                      onScratchRevealed(syncedLastRecord.id);
                      if (syncedLastRecord.scratchCard.tier === 'bonus_coins') {
                      setDiscountBRL(syncedLastRecord.scratchCard.valueBRL);
                    }
                  }}
                  onUseDiscountNow={() => {
                    setDiscountBRL(syncedLastRecord.scratchCard.valueBRL);
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
                    +{syncedLastRecord.coinsEarned} Coins
                  </span>
                </div>
                <p className="text-[11px] text-[#166534] leading-snug">
                  Seus R$ {syncedLastRecord.amountPaid.toFixed(2).replace('.', ',')} já valem até{' '}
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

      {/* MOBILE LIQUID GLASS STICKY CHECKOUT CALLOUT WHEN NUMBERS ARE SELECTED */}
      <AnimatePresence>
        {selectedNumbers.length > 0 && pixStep === 'form' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 lg:hidden liquid-glass-dark text-white p-3.5 rounded-[22px] flex items-center justify-between gap-3"
          >
            <div className="min-w-0 pr-1">
              <p className="text-[11px] font-medium text-white/80 truncate">
                {selectedNumbers.length} {selectedNumbers.length === 1 ? 'cartela' : 'cartelas'} (Nº{' '}
                {selectedNumbers.map(formatGridNumber).join(', ')})
              </p>
              <div className="flex items-center gap-2">
                <p className="text-base font-extrabold font-mono tabular-nums text-[var(--brand-accent)]">
                  R$ {finalAmountBRL.toFixed(2).replace('.', ',')}
                </p>
                {appliedDiscount > 0 && (
                  <span className="text-[10px] font-bold bg-white/15 text-white px-1.5 py-0.5 rounded">
                    Desconto Ativo
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToCheckout}
              className="px-4 py-2.5 bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold rounded-xl cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform duration-150"
            >
              <span>Finalizar PIX</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
