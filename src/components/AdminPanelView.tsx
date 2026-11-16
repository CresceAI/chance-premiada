import React, { useState, useEffect } from 'react';
import {
  Sliders,
  DollarSign,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Lock,
  Plus,
  Trophy,
  KeyRound,
  LogOut,
  MessageCircle,
  UserCheck,
  AlertCircle,
  Megaphone,
  Copy,
  Check,
  Shuffle,
  Send,
  CreditCard,
  BarChart3,
  Link2,
  MousePointerClick,
  Eye,
  Store,
  Download,
  Trash2,
  Users,
  Layers,
  Receipt,
} from 'lucide-react';
import {
  AdminConfig,
  AdsAnalyticsState,
  AffiliateSeller,
  ArchivedEditionSnapshot,
  DAILY_PRIZE_OPTIONS,
  DEFAULT_AFFILIATE_SELLERS,
  DEFAULT_PARTNER_COUPONS,
  GridNumber,
  ParticipationRecord,
  PartnerStoreCategory,
  PartnerStoreCoupon,
  WinnerRecord,
  calculateComboPricing,
  calculateEditionAffiliateSettlements,
  createInitialAdsAnalytics,
  formatCommunityResultAnnouncement,
  generateSecretScratchWindows,
  getGridStats,
  inspectFirstBallCandidate,
  normalizeShowcasePartnerCoupons,
} from '../utils/engine';
import { databaseService } from '../services/database';
import { EDITION_BANNER_PRESETS, resolveActiveBannerInfo } from '../utils/banners';

interface AdminPanelViewProps {
  adminConfig: AdminConfig;
  grid: GridNumber[];
  participations?: ParticipationRecord[];
  winners: WinnerRecord[];
  affiliates?: AffiliateSeller[];
  onUpdateAffiliates?: (nextAffiliates: AffiliateSeller[]) => void;
  archivedEditions?: ArchivedEditionSnapshot[];
  onFreezeAndAdvanceEdition?: () => void;
  isAdminAuthenticated: boolean;
  adminPin: string;
  onAuthenticateAdmin: (pinAttempt: string) => boolean;
  onLogoutAdmin: () => void;
  onUpdateAdminConfig: (newConfig: AdminConfig) => void;
  onPublishManualFirstBall: (firstBallNumber: number, targetEditionNumber?: number) => WinnerRecord;
  onResetZeroedEdition: () => void;
  onSimulateIncomingSale: (specificNumber?: number, affiliateCode?: string) => void;
  onAdminReleaseSingleNumber?: (num: number) => void;
  onApprovePendingPayment?: (participationId: string) => void;
  onRejectPendingPayment?: (participationId: string) => void;
  adsAnalytics?: AdsAnalyticsState;
  onResetAdsAnalytics?: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  adminConfig,
  grid,
  participations = [],
  winners,
  affiliates = DEFAULT_AFFILIATE_SELLERS,
  onUpdateAffiliates,
  archivedEditions = [],
  onFreezeAndAdvanceEdition,
  isAdminAuthenticated,
  onAuthenticateAdmin,
  onLogoutAdmin,
  onUpdateAdminConfig,
  onPublishManualFirstBall,
  onResetZeroedEdition,
  onSimulateIncomingSale,
  onAdminReleaseSingleNumber,
  onApprovePendingPayment,
  onRejectPendingPayment,
  adsAnalytics,
  onResetAdsAnalytics,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Manual 1st Ball Entry State + Target Edition Selector (Active vs Frozen Queue)
  const [manualBallInput, setManualBallInput] = useState<string>('25');
  const [targetDrawEditionNumber, setTargetDrawEditionNumber] = useState<number>(
    adminConfig.editionNumber
  );
  const [publishedWinner, setPublishedWinner] = useState<WinnerRecord | null>(winners[0] || null);

  // Affiliate / Partner Seller Registration State
  const [newAffName, setNewAffName] = useState('');
  const [newAffCode, setNewAffCode] = useState('');
  const [newAffWhatsapp, setNewAffWhatsapp] = useState('');
  const [newAffCommissionPct, setNewAffCommissionPct] = useState('20');
  const [newAffHotFootBonus, setNewAffHotFootBonus] = useState('10');
  const [copiedAffCode, setCopiedAffCode] = useState<string | null>(null);
  const [copiedReceiptAffId, setCopiedReceiptAffId] = useState<string | null>(null);

  // Prize & Ticket Config State
  const [customPrize, setCustomPrize] = useState(String(adminConfig.prizeAmountBRL));
  const [customTicket, setCustomTicket] = useState(String(adminConfig.ticketPriceBRL));
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [copiedResultCommunity, setCopiedResultCommunity] = useState(false);
  const [copiedTrackingSource, setCopiedTrackingSource] = useState<string | null>(null);
  const analytics = adsAnalytics || createInitialAdsAnalytics();
  const pendingLeads = analytics.abandonedLeads.filter((l) => l.status === 'pending');

  // Partner Store Coupon Form State (Maracanaú Local B2B Network)
  const partnerCoupons = normalizeShowcasePartnerCoupons(adminConfig.partnerCoupons);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreNeighborhood, setNewStoreNeighborhood] = useState('Centro · Maracanaú');
  const [newStoreCategory, setNewStoreCategory] = useState<PartnerStoreCategory>('food');
  const [newStoreDiscountLabel, setNewStoreDiscountLabel] = useState('R$ 10 OFF');
  const [newStoreOfferTitle, setNewStoreOfferTitle] = useState('');
  const [newStoreCouponCode, setNewStoreCouponCode] = useState('CHANCE10');
  const [newStoreWhatsapp, setNewStoreWhatsapp] = useState('');
  const [newStoreSponsored, setNewStoreSponsored] = useState(true);

  // Payment & Community Config State
  const [paymentMode, setPaymentMode] = useState<'asaas_auto' | 'direct_pix_zero_fee'>(
    adminConfig.paymentMode || 'direct_pix_zero_fee'
  );
  const [directPixKey, setDirectPixKey] = useState(
    adminConfig.directPixKey || import.meta.env?.VITE_DIRECT_PIX_KEY || 'chancepremiada@pix.com.br'
  );
  const [directPixReceiverName, setDirectPixReceiverName] = useState(
    adminConfig.directPixReceiverName || 'CHANCE PREMIADA'
  );
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState(
    adminConfig.whatsappGroupUrl || 'https://chat.whatsapp.com/chancepremiada-vip'
  );
  const [telegramChannelUrl, setTelegramChannelUrl] = useState(
    adminConfig.telegramChannelUrl || 'https://t.me/chancepremiada_oficial'
  );
  const [telegramBotToken, setTelegramBotToken] = useState(adminConfig.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(
    adminConfig.telegramChatId || '@chancepremiada_oficial'
  );
  const [integrationStatus, setIntegrationStatus] = useState<{
    asaasConnected: boolean;
    supabaseConnected: boolean;
  }>({
    asaasConnected: false,
    supabaseConnected: Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
        !String(import.meta.env.VITE_SUPABASE_URL).includes('SEU_PROJETO') &&
        (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    ),
  });

  useEffect(() => {
    fetch('/api/integration-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setIntegrationStatus({
            asaasConnected: Boolean(data.asaasConnected),
            supabaseConnected:
              Boolean(data.supabaseConnected) ||
              Boolean(
                import.meta.env.VITE_SUPABASE_URL &&
                  !String(import.meta.env.VITE_SUPABASE_URL).includes('SEU_PROJETO') &&
                  (import.meta.env.VITE_SUPABASE_ANON_KEY ||
                    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
              ),
          });
        }
      })
      .catch(() => {});
  }, []);

  const stats = getGridStats(grid);
  const soldItems = grid.filter((g) => g.status === 'sold' || g.status === 'reserved');

  // Resolve which edition is currently selected for 1st-ball draw & affiliate commission inspection
  const selectedArchivedEdition =
    targetDrawEditionNumber !== adminConfig.editionNumber
      ? archivedEditions.find((e) => e.editionNumber === targetDrawEditionNumber)
      : undefined;
  const activeDrawGrid = selectedArchivedEdition ? selectedArchivedEdition.grid : grid;
  const activeDrawPrizeBRL = selectedArchivedEdition
    ? selectedArchivedEdition.prizeAmountBRL
    : adminConfig.prizeAmountBRL;
  const activeDrawTicketBRL = selectedArchivedEdition
    ? selectedArchivedEdition.ticketPriceBRL
    : adminConfig.ticketPriceBRL;
  const activeDrawSoldItems = activeDrawGrid.filter(
    (g) => g.status === 'sold' || g.status === 'reserved'
  );

  const parsedBall = parseInt(manualBallInput.replace(/\D/g, ''), 10);
  const candidateInspection = inspectFirstBallCandidate(
    activeDrawGrid,
    Number.isNaN(parsedBall) ? 0 : parsedBall,
    activeDrawPrizeBRL
  );

  // Live Affiliate Commission Settlements for the selected edition
  const editionWinLabel = `Edição #${String(targetDrawEditionNumber).padStart(2, '0')}`;
  const editionOfficialWinner =
    selectedArchivedEdition?.winner || winners.find((w) => w.editionNumber === editionWinLabel);
  const affiliateSettlements = calculateEditionAffiliateSettlements(
    activeDrawGrid,
    participations,
    affiliates,
    targetDrawEditionNumber,
    editionOfficialWinner?.firstBallNumber,
    activeDrawTicketBRL
  );

  const showSavedFeedback = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onAuthenticateAdmin(pinInput);
    if (!ok) {
      setPinError(true);
    } else {
      setPinError(false);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mx-auto text-[#1D1D1F]">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[#1D1D1F]">Acesso Restrito · Administrador</h1>
          <p className="text-xs text-[#6E6E73]">
            Área exclusiva para você digitar a 1ª bola do sorteio, ver quem ganhou, divulgar a
            rodada e trocar valores.
          </p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-3">
          <input
            type="password"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError(false);
            }}
            placeholder="Digite sua senha PIN de Administrador"
            aria-label="PIN do Administrador"
            className="w-full px-4 py-3 text-center font-mono text-base bg-[#F5F5F7] focus:bg-white border border-transparent focus:border-[#1D1D1F] rounded-2xl focus:outline-none"
          />
          {pinError && (
            <p className="text-xs text-[#DC2626] font-medium">
              PIN incorreto. Verifique sua senha de administrador.
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Entrar no Painel Admin
          </button>
        </form>
      </div>
    );
  }

  // Unit Economics with 71 paid tickets + 4 free bonus tickets (from the 4 blocks of 15)
  const numPrize = Math.max(10, Number(customPrize) || adminConfig.prizeAmountBRL);
  const numTicket = Math.max(0.5, Number(customTicket) || adminConfig.ticketPriceBRL);
  const paidTicketsCount = adminConfig.scratchEnabled ? 71 : 75;
  const grossCashRevenue = numTicket * paidTicketsCount;
  const gatewayFee = Math.round(grossCashRevenue * 0.0099 * 100) / 100;
  const netProfitPerEdition = grossCashRevenue - numPrize - gatewayFee;

  // How many of the 4 secret scratch positions are still ahead of current sales count
  const secretPositions =
    Array.isArray(adminConfig.secretScratchPositions) &&
    adminConfig.secretScratchPositions.length === 4
      ? adminConfig.secretScratchPositions
      : [7, 22, 39, 53];
  const remainingBonusCartelas = secretPositions.filter(
    (pos) => pos > stats.sold
  ).length;

  const c3 = calculateComboPricing(3, adminConfig.ticketPriceBRL);
  const c5 = calculateComboPricing(5, adminConfig.ticketPriceBRL);
  const c10 = calculateComboPricing(10, adminConfig.ticketPriceBRL);
  const promoCopyText = `🔥 Edição #${adminConfig.editionNumber} Chance Premiada — Prêmio R$ ${adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')} no PIX!\n🎯 Regra simples: fechou os 75 números, a 1ª bola que sair leva o PIX na hora!\n🟢 Restam ${stats.available} números verdes disponíveis:\n• 1 Número: R$ ${adminConfig.ticketPriceBRL.toFixed(2).replace('.', ',')}\n• Combo 3 Nºs: R$ ${c3.comboTotalBRL.toFixed(2).replace('.', ',')} (Economize R$ ${c3.comboDiscountBRL.toFixed(2).replace('.', ',')})\n• 🔥 Combo 5 Nºs: R$ ${c5.comboTotalBRL.toFixed(2).replace('.', ',')} (Economize R$ ${c5.comboDiscountBRL.toFixed(2).replace('.', ',')})\n• 🚀 Combo 10 Nºs: R$ ${c10.comboTotalBRL.toFixed(2).replace('.', ',')} (Economize R$ ${c10.comboDiscountBRL.toFixed(2).replace('.', ',')})\n🎁 Comprou, ganhou 1 Raspadinha Digital na hora para concorrer a Cartela Extra Grátis!\n👉 Escolha seu número agora: https://chancepremiada.com.br`;

  const handleCopyPromo = () => {
    navigator.clipboard?.writeText(promoCopyText).catch(() => {});
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2500);
  };

  const handlePublishFirstBall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateInspection.validNumber) return;
    const winRecord = onPublishManualFirstBall(
      candidateInspection.ballNumber,
      targetDrawEditionNumber
    );
    setPublishedWinner(winRecord);
    showSavedFeedback(
      `1ª Bola Nº ${candidateInspection.formattedBall} publicada na Edição #${String(
        targetDrawEditionNumber
      ).padStart(2, '0')}! Ganhador: ${winRecord.winnerName} · Extratos de comissão gerados!`
    );
  };

  const handleApplyPreset = (prize: number, ticket: number) => {
    setCustomPrize(String(prize));
    setCustomTicket(String(ticket));
    onUpdateAdminConfig({
      ...adminConfig,
      prizeAmountBRL: prize,
      ticketPriceBRL: ticket,
    });
    showSavedFeedback(`Prêmio alterado para R$ ${prize} (Cota R$ ${ticket.toFixed(2).replace('.', ',')})`);
  };

  const handleSaveCustomValues = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdminConfig({
      ...adminConfig,
      prizeAmountBRL: numPrize,
      ticketPriceBRL: numTicket,
    });
    showSavedFeedback('Valores personalizados atualizados na tela do cliente!');
  };

  const handleReshuffleSecretPositions = () => {
    const nextPositions = generateSecretScratchWindows(Date.now());
    onUpdateAdminConfig({
      ...adminConfig,
      secretScratchPositions: nextPositions,
    });
    showSavedFeedback(`Novas posições secretas sorteadas nos 4 blocos de 15: ${nextPositions.join(', ')}`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Admin Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#1D1D1F] via-[#27272A] to-[#1D1D1F] text-white px-5 py-4 rounded-3xl shadow-md">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-[#4ADE80]" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#4ADE80] block">
              Painel Exclusivo do Administrador
            </span>
            <span className="text-sm font-semibold">
              Edição #{adminConfig.editionNumber} · {stats.sold}/75 números ocupados
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="px-3 py-1.5 rounded-xl bg-[#16A34A] text-white text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {savedToast}
            </span>
          )}
          <button
            type="button"
            onClick={onLogoutAdmin}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Trancar Admin</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6E6E73] block">Ocupação da Grade</span>
          <strong className="text-lg font-extrabold font-mono text-[#1D1D1F]">
            {stats.sold}/75 ({stats.occupancyPct}%)
          </strong>
          <span className="text-[11px] text-[#15803D] font-medium block mt-0.5">
            {stats.available} números livres
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6E6E73] block">
            Receita da Grade Cheia (71 pagas)
          </span>
          <strong className="text-lg font-extrabold font-mono text-[#1D1D1F]">
            R$ {grossCashRevenue.toFixed(2).replace('.', ',')}
          </strong>
          <span className="text-[11px] text-[#6E6E73] block mt-0.5">
            Cota R$ {numTicket.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6E6E73] block">
            Lucro Líquido / Edição
          </span>
          <strong
            className={`text-lg font-extrabold font-mono ${
              netProfitPerEdition >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
            }`}
          >
            R$ {netProfitPerEdition.toFixed(2).replace('.', ',')}
          </strong>
          <span className="text-[11px] text-[#6E6E73] block mt-0.5">
            Após pagar R$ {numPrize} no PIX
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6E6E73] block">
            Raspadinhas Premadas (1/15)
          </span>
          <strong className="text-lg font-extrabold font-mono text-[#15803D]">
            {remainingBonusCartelas} de 4 restantes
          </strong>
          <span className="text-[11px] text-[#6E6E73] block mt-0.5">
            Posições: {secretPositions.join(', ')}
          </span>
        </div>
      </div>

      {/* =====================================================================
          BLOCO 0.5: FILA DE APROVAÇÃO PIX DIRETO (TAXA ZERO · 1 CLIQUE)
      ===================================================================== */}
      {(() => {
        const pendingPayments = participations.filter(
          (p) => p.status === 'Pagamento em Conferência'
        );
        return (
          <section
            className={`rounded-3xl border p-5 sm:p-6 space-y-4 ${
              pendingPayments.length > 0
                ? 'bg-[#FFFBEB] border-[#F59E0B] shadow-xs'
                : 'bg-white border-black/[0.06]'
            }`}
            data-testid="admin-pending-pix-queue"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] block">
                  Conferência PIX Direto · Taxa R$ 0,00
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#1D1D1F]">
                  PIX Aguardando Sua Aprovação ({pendingPayments.length})
                </h2>
                <p className="text-xs text-[#6E6E73]">
                  Confira a notificação do seu banco e clique em <strong>Aprovar PIX</strong> para
                  confirmar o número e liberar a Raspadinha do cliente.
                </p>
              </div>
              {pendingPayments.length === 0 && (
                <span className="px-3 py-1 rounded-full bg-[#F0FDF4] text-[#15803D] text-xs font-bold border border-[#BBF7D0]">
                  Tudo conferido ✓
                </span>
              )}
            </div>

            {pendingPayments.length > 0 && (
              <div className="space-y-2.5">
                {pendingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-white border border-black/[0.08] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-extrabold text-[#1D1D1F]">
                          {p.customerName}
                        </strong>
                        <span className="font-mono text-xs font-bold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                          Nº {p.numbers.join(', ')}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-[#063D2B] bg-[#B5F44A]/45 px-2 py-0.5 rounded-md">
                          R$ {p.amountPaid.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[#6E6E73]">
                        WhatsApp: {p.customerWhatsappFormatted} · Código: {p.pixTxId}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onApprovePendingPayment?.(p.id)}
                        className="px-3.5 py-2 rounded-xl bg-[#063D2B] hover:bg-[#0B5339] text-[#B5F44A] text-xs font-extrabold cursor-pointer shadow-xs"
                      >
                        Aprovar PIX ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectPendingPayment?.(p.id)}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#DC2626] border border-rose-200 text-xs font-bold cursor-pointer"
                      >
                        Recusar / Liberar Nº
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* =====================================================================
          BLOCO 1 (DESTAQUE): DIGITAR MANUALMENTE A 1ª BOLA QUE SAIU NO SORTEIO
      ===================================================================== */}
      <section
        className="bg-white rounded-3xl border-2 border-[#16A34A] p-5 sm:p-7 space-y-5 shadow-xs"
        data-testid="admin-manual-ball-section"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-3 py-1 rounded-lg border border-[#BBF7D0] mb-2">
              <Trophy className="w-3.5 h-3.5" /> Apuração Manual do Sorteio
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
              Digite a 1ª Bola que Saiu no Sorteio (01 a 75)
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6E73] mt-1 leading-relaxed">
              Quando iniciar o sorteio e você ver a <strong>1ª bola que saiu</strong>, digite o
              número abaixo. O sistema localiza na hora quem comprou e publica nos Resultados.
            </p>
          </div>

          {activeDrawSoldItems.length > 0 && (
            <div className="text-right">
              <p className="text-[11px] font-semibold text-[#6E6E73] mb-1">
                Números vendidos na Edição #{String(targetDrawEditionNumber).padStart(2, '0')} (clique p/ testar):
              </p>
              <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                {activeDrawSoldItems.slice(0, 8).map((item) => (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => setManualBallInput(item.formatted)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold cursor-pointer transition-colors ${
                      candidateInspection.ballNumber === item.number
                        ? 'bg-[#16A34A] text-white'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#DCFCE7]'
                    }`}
                  >
                    Nº {item.formatted}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Seletor de Qual Edição Apurar (Edição Atual ou Edições Congeladas na Fila) */}
        {archivedEditions.length > 0 && (
          <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#16A34A]" /> Escolha qual Edição você vai sortear /
              apurar agora:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTargetDrawEditionNumber(adminConfig.editionNumber)}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  targetDrawEditionNumber === adminConfig.editionNumber
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-white text-[#1D1D1F] border border-black/[0.08]'
                }`}
              >
                Edição Atual #{String(adminConfig.editionNumber).padStart(2, '0')} ({stats.sold}/75)
              </button>
              {archivedEditions.map((ed) => {
                const edSold = getGridStats(ed.grid).sold;
                const isSelected = targetDrawEditionNumber === ed.editionNumber;
                return (
                  <button
                    key={ed.editionNumber}
                    type="button"
                    onClick={() => setTargetDrawEditionNumber(ed.editionNumber)}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1D1D1F] text-white ring-2 ring-[#16A34A]'
                        : ed.status === 'awaiting_draw'
                        ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                        : 'bg-white text-[#6E6E73] border border-black/[0.08]'
                    }`}
                  >
                    {ed.label} ({edSold}/75 ·{' '}
                    {ed.status === 'awaiting_draw' ? '⏳ Aguardando Sorteio' : '✅ Sorteada'})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <form
          onSubmit={handlePublishFirstBall}
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-2"
        >
          {/* Input da 1ª Bola */}
          <div className="lg:col-span-4 bg-[#F5F5F7] rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <label
              htmlFor="manual-first-ball-input"
              className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F]"
            >
              Qual foi a 1ª Bola que saiu?
            </label>
            <div className="flex items-center gap-3">
              <input
                id="manual-first-ball-input"
                type="number"
                min={1}
                max={75}
                value={manualBallInput}
                onChange={(e) => setManualBallInput(e.target.value)}
                placeholder="Ex: 25"
                className="w-28 h-16 text-center font-mono text-3xl font-bold text-[#1D1D1F] bg-white rounded-2xl border-2 border-[#1D1D1F] focus:outline-none focus:border-[#16A34A]"
              />
              <div className="text-xs text-[#6E6E73] space-y-1">
                <p className="font-semibold text-[#1D1D1F]">Número de 01 a 75</p>
                <p>Prêmio: R$ {adminConfig.prizeAmountBRL.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </div>

          {/* Resultado Instantâneo de Quem Comprou a Bola Digitada */}
          <div
            className="lg:col-span-5 rounded-2xl p-4 border flex flex-col justify-between space-y-3 bg-[#F5F5F7]/60 border-black/[0.08]"
            data-testid="admin-ball-winner-preview"
          >
            {!candidateInspection.validNumber ? (
              <div className="flex items-center gap-2 text-xs text-[#DC2626] my-auto">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Digite um número válido entre 01 e 75 para ver quem comprou.</span>
              </div>
            ) : candidateInspection.hasBuyer ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#15803D] bg-[#DCFCE7] px-2.5 py-0.5 rounded-md">
                    <UserCheck className="w-3.5 h-3.5" /> Ganhador Localizado na Hora!
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1D1D1F]">
                    Bola Nº {candidateInspection.formattedBall}
                  </span>
                </div>
                <div>
                  <p className="text-base font-bold text-[#1D1D1F]">
                    {candidateInspection.buyerName}
                  </p>
                  <p className="text-xs font-mono text-[#6E6E73] mt-0.5">
                    WhatsApp:{' '}
                    <strong className="text-[#1D1D1F]">{candidateInspection.buyerWhatsapp}</strong>
                  </p>
                  <p className="text-[11px] font-mono text-[#86868B] mt-0.5">
                    Recibo PIX: {candidateInspection.pixTxId}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B45309] bg-[#FEF3C7] px-2.5 py-0.5 rounded-md">
                    Número Nº {candidateInspection.formattedBall} ainda está livre (Verde)
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73]">
                  Nenhum cliente comprou o número{' '}
                  <strong className="text-[#1D1D1F]">Nº {candidateInspection.formattedBall}</strong>{' '}
                  ainda.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => onSimulateIncomingSale(candidateInspection.ballNumber)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-black/[0.12] hover:bg-[#F5F5F7] text-xs font-semibold text-[#1D1D1F] cursor-pointer"
                  >
                    + Simular Comprador no Nº {candidateInspection.formattedBall} para Testar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Botão de Confirmar e Publicar */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-2">
            <button
              type="submit"
              disabled={!candidateInspection.validNumber}
              className="w-full h-full min-h-14 py-4 px-4 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] disabled:bg-[#E5E5EA] disabled:text-[#86868B] text-white font-bold text-sm transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xs"
            >
              <span>
                Confirmar 1ª Bola Nº {candidateInspection.formattedBall} (Ed. #
                {String(targetDrawEditionNumber).padStart(2, '0')})
              </span>
              <span className="text-[11px] font-normal text-white/90">
                Publicar Ganhador & Gerar Comissões
              </span>
            </button>
          </div>
        </form>

        {publishedWinner && (
          <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#166534]">
              <strong className="text-sm block text-[#15803D]">
                Última 1ª Bola Publicada ({publishedWinner.editionNumber}): Nº{' '}
                {publishedWinner.firstBallNumber} — {publishedWinner.winnerName}
              </strong>
              <span>
                Prêmio de R$ {publishedWinner.prizeAmountBRL.toFixed(2).replace('.', ',')}{' '}
                disponível na aba pública de Resultados e extratos de comissão liberados abaixo.
              </span>
            </div>
            {candidateInspection.buyerWhatsapp && (
              <a
                href={`https://wa.me/55${candidateInspection.buyerWhatsapp.replace(
                  /\D/g,
                  ''
                )}?text=${encodeURIComponent(
                  `Parabéns ${publishedWinner.winnerName}! A 1ª bola sorteada na Chance Premiada (${publishedWinner.editionNumber}) foi o seu número Nº ${publishedWinner.firstBallNumber}! Você ganhou R$ ${publishedWinner.prizeAmountBRL.toFixed(2).replace('.', ',')} no PIX!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Avisar Ganhador no WhatsApp</span>
              </a>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          BLOCO 1.5: FILA DE EDIÇÕES SEQUENCIAIS (#01 → #02 → #03 SEM PARAR VENDAS)
      ===================================================================== */}
      <section
        className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-4 shadow-2xs"
        data-testid="admin-edition-queue-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#BBF7D0] mb-1">
              <Layers className="w-3.5 h-3.5" /> Fila Inteligente de Grades · Zero Venda Perdida
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">
              Fechou os 75 Nºs? Congele a Edição #{String(adminConfig.editionNumber).padStart(2, '0')} p/ Sorteio e Abra a Edição #
              {String(adminConfig.editionNumber + 1).padStart(2, '0')} na Hora!
            </h2>
            <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed">
              Todos os vendedores concentram força na mesma grade para fechar rápido (sem risco de
              prejuízo). Quando lotar, clique no botão ao lado: a grade atual fica salva aguardando
              o sorteio da noite e a próxima já abre zerada (`0/75`) para ninguém parar de vender!
            </p>
          </div>

          {onFreezeAndAdvanceEdition && (
            <button
              type="button"
              onClick={() => {
                const closedNum = adminConfig.editionNumber;
                onFreezeAndAdvanceEdition();
                setTargetDrawEditionNumber(closedNum);
                showSavedFeedback(
                  `Edição #${String(closedNum).padStart(
                    2,
                    '0'
                  )} congelada na fila e Edição #${String(closedNum + 1).padStart(
                    2,
                    '0'
                  )} aberta (0/75)!`
                );
              }}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] text-white text-xs font-extrabold cursor-pointer flex items-center gap-2 shadow-sm shrink-0"
              data-testid="freeze-advance-edition-button"
            >
              <Layers className="w-4 h-4" />
              <span>
                Congelar Edição #{String(adminConfig.editionNumber).padStart(2, '0')} e Abrir Edição
                #{String(adminConfig.editionNumber + 1).padStart(2, '0')} (0/75)
              </span>
            </button>
          )}
        </div>

        {archivedEditions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {archivedEditions.map((ed) => {
              const edStats = getGridStats(ed.grid);
              return (
                <div
                  key={ed.editionNumber}
                  className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="font-extrabold text-[#1D1D1F]">{ed.label}</strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          ed.status === 'awaiting_draw'
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : 'bg-[#DCFCE7] text-[#15803D]'
                        }`}
                      >
                        {ed.status === 'awaiting_draw' ? 'Aguardando Sorteio' : 'Sorteada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6E6E73] mt-0.5">
                      {edStats.sold}/75 vendidos · Fechada às {ed.closedAt}
                    </p>
                    {ed.winner && (
                      <p className="text-[11px] font-bold text-[#15803D] mt-0.5">
                        1ª Bola: Nº {ed.winner.firstBallNumber} ({ed.winner.winnerName})
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDrawEditionNumber(ed.editionNumber);
                      const el = document.querySelector(
                        '[data-testid="admin-manual-ball-section"]'
                      );
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-black/[0.1] hover:bg-[#DCFCE7] text-[#15803D] font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    {ed.status === 'awaiting_draw' ? 'Sortear 1ª Bola' : 'Ver Comissões'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          BLOCO 1.8: EQUIPE DE AFILIADOS / DIVULGADORES + COMPROVANTE AUTOMÁTICO DE COMISSÃO
      ===================================================================== */}
      <section
        className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-5 shadow-2xs"
        data-testid="admin-affiliates-commission-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#BBF7D0] mb-1">
              <Users className="w-3.5 h-3.5" /> Parceiros Divulgadores Independentes · Comissão Automática
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">
              Links de Vendedores (`?ind=codigo`) & Comprovante de Comissão ({editionWinLabel})
            </h2>
            <p className="text-xs text-[#6E6E73]">
              Cada divulgador tem seu link exclusivo. O sistema soma tudo sozinho, adiciona o{' '}
              <strong>Bônus Pé Quente</strong> se o cliente dele ganhar a 1ª Bola e gera o
              comprovante pronto para enviar no WhatsApp dele!
            </p>
          </div>
        </div>

        {/* Formulário p/ Cadastrar Novo Afiliado / Divulgador */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const cleanCode = newAffCode
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9_-]/g, '');
            if (!newAffName.trim() || !cleanCode) {
              showSavedFeedback('Preencha o Nome e o Código do Link do Divulgador.');
              return;
            }
            const createdAff: AffiliateSeller = {
              id: `aff-${Date.now()}`,
              code: cleanCode,
              name: newAffName.trim(),
              whatsapp: newAffWhatsapp.replace(/\D/g, ''),
              commissionPct: Math.min(50, Math.max(5, Number(newAffCommissionPct) || 20)),
              hotFootBonusBRL: Math.max(0, Number(newAffHotFootBonus) || 10),
              active: true,
            };
            onUpdateAffiliates?.([
              createdAff,
              ...affiliates.filter((a) => a.code.toLowerCase() !== cleanCode),
            ]);
            setNewAffName('');
            setNewAffCode('');
            setNewAffWhatsapp('');
            showSavedFeedback(`Divulgador "${createdAff.name}" (?ind=${createdAff.code}) cadastrado!`);
          }}
          className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end"
        >
          <div className="lg:col-span-2">
            <label className="block font-semibold text-[#1D1D1F] mb-1">
              Nome do Divulgador / Parceiro
            </label>
            <input
              type="text"
              value={newAffName}
              onChange={(e) => setNewAffName(e.target.value)}
              placeholder="Ex: João Barbeiro"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white text-xs text-[#1D1D1F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1D1D1F] mb-1">
              Código do Link (`?ind=`)
            </label>
            <input
              type="text"
              value={newAffCode}
              onChange={(e) =>
                setNewAffCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
              }
              placeholder="Ex: joao"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white font-mono text-xs text-[#1D1D1F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1D1D1F] mb-1">WhatsApp (c/ DDD)</label>
            <input
              type="tel"
              value={newAffWhatsapp}
              onChange={(e) => setNewAffWhatsapp(e.target.value)}
              placeholder="85999998888"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white font-mono text-xs text-[#1D1D1F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-[#1D1D1F] mb-1">Comissão %</label>
              <input
                type="number"
                min="5"
                max="50"
                value={newAffCommissionPct}
                onChange={(e) => setNewAffCommissionPct(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-black/[0.12] bg-white font-mono text-xs text-[#1D1D1F]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1D1D1F] mb-1" title="Bônus se o cliente dele ganhar a 1ª bola">
                Pé Quente R$
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={newAffHotFootBonus}
                onChange={(e) => setNewAffHotFootBonus(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-black/[0.12] bg-white font-mono text-xs text-[#1D1D1F]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs cursor-pointer"
          >
            + Cadastrar Vendedor
          </button>
        </form>

        {/* Tabela de Fechamento Automático de Comissões & Disparo de Comprovante no WhatsApp */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] text-[#6E6E73]">
                <th className="py-2.5 px-3">Parceiro Divulgador</th>
                <th className="py-2.5 px-3">Link Exclusivo</th>
                <th className="py-2.5 px-3">Nºs Vendidos ({editionWinLabel})</th>
                <th className="py-2.5 px-3 text-right">Vendas (R$)</th>
                <th className="py-2.5 px-3 text-right">Comissão + Pé Quente</th>
                <th className="py-2.5 px-3 text-right">Comprovante de Fechamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F7]">
              {affiliateSettlements.map((s) => {
                const baseUrl =
                  typeof window !== 'undefined'
                    ? window.location.origin
                    : 'https://chancepremiada.com.br';
                const affUrl = `${baseUrl}/?ind=${s.affiliateCode}`;
                const isLinkCopied = copiedAffCode === s.affiliateCode;
                const isReceiptCopied = copiedReceiptAffId === s.affiliateId;

                return (
                  <tr key={s.affiliateId}>
                    <td className="py-3 px-3">
                      <strong className="font-bold text-[#1D1D1F] block">{s.affiliateName}</strong>
                      <span className="font-mono text-[11px] text-[#6E6E73]">
                        {s.affiliateWhatsapp || 'Sem WhatsApp'} · {s.commissionPct}% comissão
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(affUrl).catch(() => {});
                            setCopiedAffCode(s.affiliateCode);
                            setTimeout(() => setCopiedAffCode(null), 2200);
                            showSavedFeedback(`Link de ${s.affiliateName} copiado!`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#DCFCE7] text-[#1D1D1F] font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isLinkCopied ? (
                            <Check className="w-3 h-3 text-[#16A34A]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>/?ind={s.affiliateCode}</span>
                        </button>
                        {targetDrawEditionNumber === adminConfig.editionNumber && (
                          <button
                            type="button"
                            onClick={() => onSimulateIncomingSale(undefined, s.affiliateCode)}
                            className="px-2 py-1.5 rounded-lg bg-white border border-black/[0.1] hover:bg-[#F5F5F7] text-[10px] font-bold text-[#15803D] cursor-pointer"
                            title="Simular 1 venda vinda deste divulgador para testar o comprovante"
                          >
                            + Testar Venda
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {s.salesCount > 0 ? (
                        <span className="text-[#15803D] font-bold">
                          {s.salesCount} ({s.numbersSold.map((n) => `Nº ${n}`).join(', ')})
                        </span>
                      ) : (
                        <span className="text-[#86868B]">0 vendidos</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-[#1D1D1F]">
                      R$ {s.grossRevenueBRL.toFixed(2).replace('.', ',')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <strong className="text-sm font-extrabold text-[#15803D] block">
                        R$ {s.totalPayoutBRL.toFixed(2).replace('.', ',')}
                      </strong>
                      {s.wonHotFootBonus && (
                        <span className="inline-block text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] px-1.5 py-0.5 rounded">
                          🔥 +R$ {s.hotFootBonusBRL} Pé Quente!
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(s.whatsappReceiptText).catch(() => {});
                            setCopiedReceiptAffId(s.affiliateId);
                            setTimeout(() => setCopiedReceiptAffId(null), 2200);
                            showSavedFeedback(
                              `Comprovante de comissão de ${s.affiliateName} copiado!`
                            );
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Copiar texto do comprovante de fechamento"
                        >
                          {isReceiptCopied ? (
                            <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                          ) : (
                            <Receipt className="w-3.5 h-3.5" />
                          )}
                          <span>{isReceiptCopied ? 'Copiado!' : 'Copiar Extrato'}</span>
                        </button>

                        {s.affiliateWhatsapp && (
                          <a
                            href={`https://wa.me/55${s.affiliateWhatsapp.replace(
                              /\D/g,
                              ''
                            )}?text=${encodeURIComponent(s.whatsappReceiptText)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Enviar no Zap</span>
                          </a>
                        )}

                        {affiliates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAffiliates?.(
                                affiliates.filter((a) => a.id !== s.affiliateId)
                              );
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#DC2626] cursor-pointer"
                            title="Remover divulgador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================================
          BLOCO 2: CENTRAL DE DIVULGAÇÃO RÁPIDA (PARA VENDER NO WHATSAPP / STORIES)
      ===================================================================== */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-lg mb-1">
              <Megaphone className="w-3.5 h-3.5" /> Máquina de Vendas · Status & Grupo WhatsApp
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">
              Texto Pronto de Divulgação da Rodada (Atualizado em Tempo Real)
            </h2>
            <p className="text-xs text-[#6E6E73]">
              Copie com 1 clique e cole no seu Status do WhatsApp, Grupo VIP e Stories do Instagram
              para vender as cartelas restantes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyPromo}
            className="px-4 py-2.5 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {copiedPromo ? (
              <>
                <Check className="w-4 h-4 text-[#4ADE80]" /> Copiado p/ WhatsApp!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copiar Texto de Divulgação
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] text-xs text-[#1D1D1F] font-sans whitespace-pre-wrap leading-relaxed">
          {promoCopyText}
        </pre>
      </section>

      {/* =====================================================================
          BLOCO 2.2: PAINEL ESTILO ADS MANAGER (TRÁFEGO, ORIGEM DOS CLIQUES & RECUPERAÇÃO PIX)
      ===================================================================== */}
      <section
        className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-5 shadow-2xs"
        data-testid="admin-ads-analytics-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#BBF7D0] mb-1">
              <BarChart3 className="w-3.5 h-3.5" /> Inteligência de Tráfego · Estilo Ads Manager
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">
              Métricas de Visitas, Funil de Conversão e Origem dos Cliques
            </h2>
            <p className="text-xs text-[#6E6E73]">
              Descubra de onde vêm os compradores (Status, Grupo VIP, Instagram, Telegram) e
              recupere quem gerou PIX e ainda não pagou.
            </p>
          </div>
          {onResetAdsAnalytics && (
            <button
              type="button"
              onClick={onResetAdsAnalytics}
              className="px-3 py-2 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Zerar Métricas da Campanha
            </button>
          )}
        </div>

        {/* 4 Etapas do Funil Estilo Meta Ads */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#F5F5F7]/80 border border-black/[0.05] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#6E6E73]">
              <span>1. Visitas no Site</span>
              <Eye className="w-3.5 h-3.5 text-[#15803D]" />
            </div>
            <strong className="text-xl font-extrabold font-mono text-[#1D1D1F] block">
              {analytics.totalVisits}
            </strong>
            <span className="text-[10px] text-[#6E6E73] block">
              Sessões únicas rastreadas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F7]/80 border border-black/[0.05] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#6E6E73]">
              <span>2. Tocaram na Grade</span>
              <MousePointerClick className="w-3.5 h-3.5 text-[#15803D]" />
            </div>
            <strong className="text-xl font-extrabold font-mono text-[#1D1D1F] block">
              {analytics.numberClicks}
            </strong>
            <span className="text-[10px] text-[#15803D] font-semibold block">
              {analytics.totalVisits > 0
                ? `${Math.min(100, Math.round((analytics.numberClicks / analytics.totalVisits) * 100))}% das visitas`
                : 'Aguardando tráfego'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F7]/80 border border-black/[0.05] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#6E6E73]">
              <span>3. PIX Gerados (Leads)</span>
              <CreditCard className="w-3.5 h-3.5 text-[#0284C7]" />
            </div>
            <strong className="text-xl font-extrabold font-mono text-[#1D1D1F] block">
              {analytics.pixGenerated}
            </strong>
            <span className="text-[10px] text-[#0284C7] font-semibold block">
              {pendingLeads.length} aguardando pagamento
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#15803D]">
              <span>4. PIX Confirmados</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            </div>
            <strong className="text-xl font-extrabold font-mono text-[#15803D] block">
              {analytics.purchases} (R$ {analytics.totalRevenueBRL.toFixed(2).replace('.', ',')})
            </strong>
            <span className="text-[10px] text-[#166534] font-semibold block">
              {analytics.pixGenerated > 0
                ? `${Math.min(100, Math.round((analytics.purchases / analytics.pixGenerated) * 100))}% de conversão PIX`
                : 'Pronto p/ converter'}
            </span>
          </div>
        </div>

        {/* Gerador de Links Rastreáveis (1 Clique) */}
        <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-[#16A34A]" /> Links Rastreáveis por Canal (Use em cada
              rede para o painel medir de onde vieram os cliques):
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'status_zap', label: 'Link Status Zap' },
              { id: 'grupo_vip', label: 'Link Grupo VIP' },
              { id: 'instagram', label: 'Link Instagram' },
              { id: 'telegram', label: 'Link Telegram' },
              { id: 'indicacao', label: 'Link Indicação' },
            ].map((item) => {
              const baseUrl =
                typeof window !== 'undefined'
                  ? window.location.origin
                  : 'https://chancepremiada.com.br';
              const fullTrackedUrl = `${baseUrl}/?src=${item.id}`;
              const isCopied = copiedTrackingSource === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(fullTrackedUrl).catch(() => {});
                    setCopiedTrackingSource(item.id);
                    setTimeout(() => setCopiedTrackingSource(null), 2200);
                    showSavedFeedback(`Link rastreável (${item.label}) copiado!`);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isCopied
                      ? 'bg-[#16A34A] text-white border-[#16A34A]'
                      : 'bg-white hover:bg-[#F0FDF4] text-[#1D1D1F] border-black/[0.08]'
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copiado!' : item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabela de Performance por Canal + Recuperação de PIX Abandonado */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 overflow-x-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E6E73] mb-2">
              Desempenho por Origem do Clique
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5EA] text-[#6E6E73]">
                  <th className="py-2 px-2.5">Canal de Origem</th>
                  <th className="py-2 px-2.5 text-center">Visitas</th>
                  <th className="py-2 px-2.5 text-center">Cliques Nº</th>
                  <th className="py-2 px-2.5 text-center">PIX Gerados</th>
                  <th className="py-2 px-2.5 text-right">Vendas (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F7]">
                {Object.values(analytics.channels).map((ch) => (
                  <tr key={ch.sourceId}>
                    <td className="py-2 px-2.5 font-semibold text-[#1D1D1F]">{ch.label}</td>
                    <td className="py-2 px-2.5 text-center font-mono">{ch.visits}</td>
                    <td className="py-2 px-2.5 text-center font-mono">{ch.numberClicks}</td>
                    <td className="py-2 px-2.5 text-center font-mono">{ch.pixGenerated}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-[#15803D]">
                      {ch.purchases} (R$ {ch.revenueBRL.toFixed(2).replace('.', ',')})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recuperação de PIX Gerado e Não Pago (1 Clique p/ WhatsApp) */}
          <div className="lg:col-span-5 bg-[#F5F5F7]/70 rounded-2xl p-4 border border-black/[0.06] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
                  Recuperação de PIX no WhatsApp ({pendingLeads.length})
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D]">
                  Alta Conversão
                </span>
              </div>
              <p className="text-[11px] text-[#6E6E73]">
                Clientes que digitaram Nome + WhatsApp e geraram PIX mas ainda não finalizaram:
              </p>
            </div>

            {pendingLeads.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#6E6E73] bg-white rounded-xl border border-black/[0.04]">
                Nenhum PIX pendente no momento. Todos os leads foram convertidos!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pendingLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-2.5 rounded-xl bg-white border border-black/[0.06] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1D1D1F] truncate">
                        {lead.customerName}{' '}
                        <span className="font-mono text-[10px] text-[#6E6E73]">
                          ({lead.createdAt})
                        </span>
                      </p>
                      <p className="text-[11px] font-mono text-[#15803D]">
                        Nº {lead.numbers.join(', ')} · R${' '}
                        {lead.amountBRL.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <a
                      href={`https://wa.me/55${lead.customerWhatsapp.replace(
                        /\D/g,
                        ''
                      )}?text=${encodeURIComponent(
                        `Oi ${lead.customerName}! Vi que você escolheu o(s) número(s) Nº ${lead.numbers.join(
                          ', '
                        )} na Edição #${adminConfig.editionNumber} da Chance Premiada (Prêmio R$ ${adminConfig.prizeAmountBRL} no PIX). Quer que eu segure seu número para você garantir sua Raspadinha Bônus?`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Recuperar</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          BLOCO 2.5: COMUNIDADE DE RESULTADOS (TELEGRAM & WHATSAPP) + PAGAMENTO PIX (ASAAS + 2ª OPÇÃO)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comunidade de Resultados no WhatsApp e Telegram */}
        <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7] block">
                Comunidade de Resultados · WhatsApp & Telegram
              </span>
              <h2 className="text-base font-bold text-[#1D1D1F]">
                Links dos Grupos & Disparo de Resultados
              </h2>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#1D1D1F] mb-1">
                Link da Comunidade / Grupo VIP no WhatsApp
              </label>
              <input
                type="url"
                value={whatsappGroupUrl}
                onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white text-xs text-[#1D1D1F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1D1D1F] mb-1">
                Link do Canal / Grupo de Resultados no Telegram
              </label>
              <input
                type="url"
                value={telegramChannelUrl}
                onChange={(e) => setTelegramChannelUrl(e.target.value)}
                placeholder="https://t.me/seu_canal"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white text-xs text-[#1D1D1F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-[#6E6E73] mb-1">
                  Token Bot Telegram (Opcional p/ auto-post)
                </label>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white text-xs text-[#1D1D1F]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#6E6E73] mb-1">
                  @Canal do Telegram (Ex: @chancepremiada)
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="@chancepremiada_oficial"
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white text-xs text-[#1D1D1F]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdateAdminConfig({
                  ...adminConfig,
                  whatsappGroupUrl: whatsappGroupUrl.trim(),
                  telegramChannelUrl: telegramChannelUrl.trim(),
                  telegramBotToken: telegramBotToken.trim(),
                  telegramChatId: telegramChatId.trim(),
                });
                showSavedFeedback('Links da Comunidade WhatsApp & Telegram salvos!');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white font-semibold text-xs cursor-pointer"
            >
              Salvar Links da Comunidade
            </button>
          </div>

          {/* Disparo de Comunicado Oficial de Resultado (WhatsApp + Telegram) */}
          {publishedWinner && (
            <div className="pt-3 border-t border-black/[0.06] space-y-2.5">
              <span className="text-xs font-bold text-[#15803D] block">
                Comunicado Oficial Pronto (1ª Bola Nº {publishedWinner.firstBallNumber}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = formatCommunityResultAnnouncement(
                      publishedWinner,
                      adminConfig.prizeAmountBRL,
                      adminConfig.ticketPriceBRL
                    );
                    navigator.clipboard?.writeText(text).catch(() => {});
                    setCopiedResultCommunity(true);
                    setTimeout(() => setCopiedResultCommunity(false), 2500);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedResultCommunity ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copiado p/ Grupo!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Resultado p/ WhatsApp
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const text = formatCommunityResultAnnouncement(
                      publishedWinner,
                      adminConfig.prizeAmountBRL,
                      adminConfig.ticketPriceBRL
                    );
                    const res = await databaseService.broadcastResultToTelegram(
                      telegramBotToken,
                      telegramChatId,
                      text
                    );
                    if (res.ok) {
                      showSavedFeedback('Resultado publicado no Canal do Telegram!');
                    } else {
                      navigator.clipboard?.writeText(text).catch(() => {});
                      showSavedFeedback('Texto copiado! Cole no seu Canal do Telegram.');
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Publicar no Telegram
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Configuração de Pagamento PIX: Opção 1 (Asaas) + Opção 2 (Chave PIX Direta Taxa Zero) */}
        <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] block">
                Recebimento PIX & Banco · Status das Chaves
              </span>
              <h2 className="text-base font-bold text-[#1D1D1F] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#16A34A]" /> Opção 1: Asaas · Opção 2: Chave PIX Direta
              </h2>
            </div>
          </div>

          {/* Live Status Check of Environment Variables */}
          <div className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-black/[0.05]">
              <span className="font-semibold text-[#1D1D1F]">Asaas API:</span>
              <span
                className={`font-bold ${
                  integrationStatus.asaasConnected ? 'text-[#15803D]' : 'text-[#B45309]'
                }`}
              >
                {integrationStatus.asaasConnected
                  ? 'Conectado ✓'
                  : 'Usando 2ª Opção (PIX Direto)'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-black/[0.05]">
              <span className="font-semibold text-[#1D1D1F]">Supabase SQL:</span>
              <span
                className={`font-bold ${
                  integrationStatus.supabaseConnected ? 'text-[#15803D]' : 'text-[#B45309]'
                }`}
              >
                {integrationStatus.supabaseConnected ? 'Conectado ✓' : 'Modo Local (Falta Chave)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setPaymentMode('asaas_auto')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                paymentMode === 'asaas_auto'
                  ? 'border-[#16A34A] bg-[#F0FDF4]'
                  : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7]'
              }`}
            >
              <strong className="text-[#1D1D1F] block">1ª Opção: Asaas Automático</strong>
              <span className="text-[11px] text-[#6E6E73]">
                Usa a API do Asaas (`ASAAS_API_KEY`). Se não configurada, usa a 2ª Opção automaticamente.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('direct_pix_zero_fee')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                paymentMode === 'direct_pix_zero_fee'
                  ? 'border-[#16A34A] bg-[#F0FDF4]'
                  : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7]'
              }`}
            >
              <strong className="text-[#1D1D1F] block">2ª Opção: Chave PIX Direta (R$ 0 Taxa)</strong>
              <span className="text-[11px] text-[#6E6E73]">
                Gera o PIX Oficial do Banco Central (EMV CRC16) direto p/ sua chave (InfinitePay, Nubank, Inter).
              </span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#1D1D1F] mb-1">
                Sua Chave PIX para a 2ª Opção (CPF, CNPJ, Celular, E-mail ou Aleatória)
              </label>
              <input
                type="text"
                value={directPixKey}
                onChange={(e) => setDirectPixKey(e.target.value)}
                placeholder="Ex: seuemail@dominio.com ou +5511999999999"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white font-mono text-xs text-[#1D1D1F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1D1D1F] mb-1">
                Nome do Recebedor no PIX (Até 25 letras, sem acento)
              </label>
              <input
                type="text"
                value={directPixReceiverName}
                onChange={(e) => setDirectPixReceiverName(e.target.value)}
                placeholder="CHANCE PREMIADA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white font-mono text-xs text-[#1D1D1F]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdateAdminConfig({
                  ...adminConfig,
                  paymentMode,
                  directPixKey: directPixKey.trim(),
                  directPixReceiverName: directPixReceiverName.trim(),
                });
                showSavedFeedback('Configuração de Recebimento PIX salva com sucesso!');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs cursor-pointer"
            >
              Salvar Configuração de Pagamento PIX
            </button>
          </div>
        </section>
      </div>

      {/* =====================================================================
          BLOCO 3: REGRA DAS 4 RASPADINHAS (1 A CADA 15 PESSOAS = ZERO PREJUÍZO)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#15803D]" />
              <h2 className="text-base font-bold text-[#1D1D1F]">
                Raspadinha: 4 Ganhadores (1 a cada 15 vendas)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleReshuffleSecretPositions}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#15803D]" /> Sortear Novas Posições
            </button>
          </div>

          <p className="text-xs text-[#6E6E73] leading-relaxed">
            Para ninguém adivinhar quando sai o prêmio e você <strong>nunca ter prejuízo</strong>, o
            sistema sorteia em segredo <strong>1 venda premiada dentro de cada bloco de 15</strong>{' '}
            (entregando +1 Cartela Grátis da própria grade). Os demais ganham descontos de R$ 0,50
            ou R$ 1,00 na próxima compra:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              { label: 'Bloco 1 (1–15)', pos: secretPositions[0] },
              { label: 'Bloco 2 (16–30)', pos: secretPositions[1] },
              { label: 'Bloco 3 (31–45)', pos: secretPositions[2] },
              { label: 'Bloco 4 (46–60)', pos: secretPositions[3] },
            ].map((b) => (
              <div key={b.label} className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06]">
                <span className="text-[10px] text-[#6E6E73] block">{b.label}</span>
                <strong className="text-xs font-mono text-[#15803D]">
                  Venda #{b.pos}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#1D1D1F]">
              Simulador de Teste & Reset da Grade
            </h2>
            <p className="text-xs text-[#6E6E73] mt-1">
              Estes controles ficam visíveis <strong>apenas para você no Admin</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onSimulateIncomingSale()}
              className="py-3 px-4 rounded-xl border border-black/[0.12] hover:bg-[#F5F5F7] text-xs font-semibold text-[#1D1D1F] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#15803D]" /> Simular +1 Compra na Grade
            </button>
            <button
              type="button"
              onClick={() => {
                onResetZeroedEdition();
                setPublishedWinner(null);
              }}
              className="py-3 px-4 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-xs font-semibold text-[#DC2626] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Zerar Tudo para 0/75
            </button>
          </div>
        </section>
      </div>

      {/* =====================================================================
          BLOCO 4: TROCAR VALORES DO PRÊMIO, COTA & BANNER AUTOMÁTICO
      ===================================================================== */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] block">
              Troca Inteligente · Valores + Arte Oficial Automática
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1F]">
              Trocar Valor do Prêmio do Dia, Preço por Ponto e Banner da Home
            </h2>
            <p className="text-xs sm:text-sm text-[#6E6E73] mt-0.5">
              Ao clicar em qualquer faixa abaixo, o sistema muda automaticamente o valor do PIX, os
              combos com desconto e a <strong>imagem oficial exibida na página inicial</strong>!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EDITION_BANNER_PRESETS.map((opt) => {
            const isSelected =
              Math.abs(adminConfig.prizeAmountBRL - opt.prizeAmountBRL) < 0.01 &&
              Math.abs(adminConfig.ticketPriceBRL - opt.ticketPriceBRL) < 0.01;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleApplyPreset(opt.prizeAmountBRL, opt.ticketPriceBRL)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'border-[#16A34A] bg-[#F0FDF4] ring-2 ring-[#16A34A]/30'
                    : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7]'
                }`}
              >
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border border-black/[0.08]">
                    <img
                      src={opt.heroBannerUrl}
                      alt={opt.label}
                      className="w-full h-24 object-cover block"
                    />
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#B5F44A] text-[#063D2B] shadow-xs">
                        ✓ Arte Ativa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-extrabold text-[#1D1D1F]">{opt.label}</span>
                  </div>
                </div>
                <div className="text-[11px] text-[#6E6E73] space-y-0.5 pt-1 border-t border-black/[0.05]">
                  <p>
                    1 Nº: <strong>R$ {opt.ticketPriceBRL.toFixed(2).replace('.', ',')}</strong> · 71
                    pagas:{' '}
                    <strong>R$ {(opt.ticketPriceBRL * 71).toFixed(2).replace('.', ',')}</strong>
                  </p>
                  <p className="text-[10px] text-[#15803D] font-semibold">
                    Combo 5: R$ {opt.combo5PriceBRL.toFixed(2).replace('.', ',')} · Combo 10: R${' '}
                    {opt.combo10PriceBRL.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Preview of Currently Active Banner */}
        {(() => {
          const activeBanner = resolveActiveBannerInfo(
            adminConfig.prizeAmountBRL,
            adminConfig.ticketPriceBRL,
            adminConfig.customBannerUrl
          );
          return (
            <div className="p-3.5 rounded-2xl bg-[#F2F4F7] border border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={activeBanner.heroBannerUrl}
                  alt="Preview do Banner Ativo"
                  className="w-28 h-16 object-cover rounded-xl border border-black/[0.1] shrink-0"
                />
                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#15803D] block">
                    Imagem Ativa Agora na Tela Inicial & Kit dos Vendedores
                  </span>
                  <strong className="text-sm font-extrabold text-[#1D1D1F] block">
                    Prêmio R$ {adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '')} no PIX · 1
                    Ponto = R$ {adminConfig.ticketPriceBRL.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[11px] text-[#6E6E73] block">
                    {activeBanner.matchedPreset
                      ? `Vinculado automaticamente à arte oficial "${activeBanner.matchedPreset.label}".`
                      : 'Usando arte geral (De R$ 50 a R$ 600 no PIX) para valor personalizado.'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeBanner.zapShareBannerUrl}
                  download={`banner-chance-premiada-${adminConfig.prizeAmountBRL}.jpg`}
                  className="px-3 py-2 rounded-xl bg-[#063D2B] hover:bg-[#0B5339] text-[#B5F44A] text-xs font-extrabold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arte WhatsApp</span>
                </a>
                <a
                  href={activeBanner.storiesVerticalBannerUrl}
                  download="banner-stories-9x16-chance-premiada.jpg"
                  className="px-3 py-2 rounded-xl bg-[#D5AC58] hover:bg-[#E2BC6B] text-[#0A1713] text-xs font-extrabold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Stories 9:16</span>
                </a>
              </div>
            </div>
          );
        })()}

        <form
          onSubmit={handleSaveCustomValues}
          className="pt-4 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Prêmio da 1ª Bola (R$)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="1"
                min="10"
                value={customPrize}
                onChange={(e) => setCustomPrize(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white text-sm font-bold text-[#1D1D1F] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Valor de Cada Cartela (R$)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={customTicket}
                onChange={(e) => setCustomTicket(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/[0.12] bg-[#F5F5F7] focus:bg-white text-sm font-bold text-[#1D1D1F] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Salvar Valores
          </button>
        </form>

        <div className="p-4 rounded-2xl bg-[#F5F5F7] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[#6E6E73] block">71 Pagas em Dinheiro</span>
            <strong className="text-sm font-mono text-[#1D1D1F]">
              R$ {grossCashRevenue.toFixed(2).replace('.', ',')}
            </strong>
          </div>
          <div>
            <span className="text-[#6E6E73] block">4 Cartelas Raspadinha</span>
            <strong className="text-sm font-mono text-[#15803D]">
              R$ 0,00 (Custo Zero)
            </strong>
          </div>
          <div>
            <span className="text-[#6E6E73] block">Prêmio 1ª Bola</span>
            <strong className="text-sm font-mono text-[#1D1D1F]">
              - R$ {numPrize.toFixed(2).replace('.', ',')}
            </strong>
          </div>
          <div>
            <span className="text-[#6E6E73] block">Seu Lucro Líquido / Grade</span>
            <strong
              className={`text-sm font-mono ${
                netProfitPerEdition >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
              }`}
            >
              R$ {netProfitPerEdition.toFixed(2).replace('.', ',')}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================================
          BLOCO 4.5: REDE DE COMÉRCIOS & CUPONS DE MARACANAÚ (ESTILO IFOOD / ZÉ DELIVERY ADS)
      ===================================================================== */}
      <section
        className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-5"
        data-testid="admin-partner-stores-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#BBF7D0] mb-1">
              <Store className="w-3.5 h-3.5" /> Ecossistema Local · Maracanaú (Estilo iFood / Zé Delivery)
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">
              Cadastrar Comércios Parceiros & Anúncios Patrocinados ({partnerCoupons.length})
            </h2>
            <p className="text-xs text-[#6E6E73]">
              Digitalize os empreendedores do bairro: cadastre cupons que dão benefício real ao
              comprador e cobre destaque patrocinado das lojas que quiserem ficar no topo.
            </p>
          </div>
        </div>

        {/* Formulário Rápido para Cadastrar Novo Comércio Local */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newStoreName.trim() || !newStoreOfferTitle.trim() || !newStoreWhatsapp.trim()) {
              showSavedFeedback('Preencha Nome da Loja, Oferta e WhatsApp do Comércio.');
              return;
            }
            const createdCoupon: PartnerStoreCoupon = {
              id: `store-${Date.now()}`,
              storeName: newStoreName.trim(),
              neighborhood: newStoreNeighborhood.trim() || 'Maracanaú - CE',
              category: newStoreCategory,
              discountLabel: newStoreDiscountLabel.trim() || 'R$ 10 OFF',
              offerTitle: newStoreOfferTitle.trim(),
              minOrderRule: 'Apresente o código do cupom no WhatsApp da loja',
              couponCode: newStoreCouponCode.trim().toUpperCase() || 'CHANCE10',
              storeWhatsapp: newStoreWhatsapp.replace(/\D/g, ''),
              coinsCost: 25,
              isSponsoredHighlight: newStoreSponsored,
              redemptionsCount: 0,
            };
            onUpdateAdminConfig({
              ...adminConfig,
              partnerCoupons: [createdCoupon, ...partnerCoupons],
            });
            setNewStoreName('');
            setNewStoreOfferTitle('');
            setNewStoreWhatsapp('');
            showSavedFeedback(`Loja "${createdCoupon.storeName}" cadastrada na vitrine do App!`);
          }}
          className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
        >
          <div>
            <label className="block font-semibold text-[#1D1D1F] mb-1">
              Nome do Comércio / Loja
            </label>
            <input
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="Ex: Pizzaria do João"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white text-xs text-[#1D1D1F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1D1D1F] mb-1">
              Bairro / Região (Maracanaú)
            </label>
            <input
              type="text"
              value={newStoreNeighborhood}
              onChange={(e) => setNewStoreNeighborhood(e.target.value)}
              placeholder="Ex: Jereissati I · Maracanaú"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white text-xs text-[#1D1D1F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1D1D1F] mb-1">Categoria</label>
            <select
              value={newStoreCategory}
              onChange={(e) => setNewStoreCategory(e.target.value as PartnerStoreCategory)}
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white text-xs text-[#1D1D1F]"
            >
              <option value="food">Lanches & Pizza</option>
              <option value="drinks_acai">Açaí & Bebidas</option>
              <option value="beauty_barber">Barbearia & Estética</option>
              <option value="services_auto">Lava-Jato & Serviços</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#1D1D1F] mb-1">
              Selo do Desconto (Ex: R$ 12 OFF)
            </label>
            <input
              type="text"
              value={newStoreDiscountLabel}
              onChange={(e) => setNewStoreDiscountLabel(e.target.value)}
              placeholder="R$ 12 OFF"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white font-mono text-xs text-[#1D1D1F]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-[#1D1D1F] mb-1">
              Descrição da Oferta p/ o Cliente
            </label>
            <input
              type="text"
              value={newStoreOfferTitle}
              onChange={(e) => setNewStoreOfferTitle(e.target.value)}
              placeholder="Ex: R$ 12 OFF na Pizza Grande + Refri Grátis"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white text-xs text-[#1D1D1F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1D1D1F] mb-1">
              WhatsApp da Loja (com DDD)
            </label>
            <input
              type="tel"
              value={newStoreWhatsapp}
              onChange={(e) => setNewStoreWhatsapp(e.target.value)}
              placeholder="85988887777"
              className="w-full px-3 py-2 rounded-xl border border-black/[0.12] bg-white font-mono text-xs text-[#1D1D1F]"
            />
          </div>

          <div className="flex flex-col justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={newStoreSponsored}
                onChange={(e) => setNewStoreSponsored(e.target.checked)}
                className="rounded accent-[#16A34A]"
              />
              <span>Destaque Patrocinado (Ads)</span>
            </label>
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs cursor-pointer"
            >
              + Cadastrar Loja & Cupom
            </button>
          </div>
        </form>

        {/* Lista de Lojas Cadastradas + Cliques Enviados p/ o WhatsApp da Loja */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {partnerCoupons.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-2xl border border-black/[0.08] bg-white flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-mono text-[10px] font-bold">
                    {c.discountLabel}
                  </span>
                  <strong className="text-xs font-extrabold text-[#1D1D1F] truncate">
                    {c.storeName}
                  </strong>
                  {c.isSponsoredHighlight && (
                    <span className="text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
                      ADS
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6E6E73] truncate mt-0.5">{c.offerTitle}</p>
                <p className="text-[10px] font-mono text-[#15803D] mt-0.5">
                  Cliques p/ Zap da Loja: <strong>{c.redemptionsCount} clientes enviados</strong>
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateAdminConfig({
                      ...adminConfig,
                      partnerCoupons: partnerCoupons.map((item) =>
                        item.id === c.id
                          ? { ...item, isSponsoredHighlight: !item.isSponsoredHighlight }
                          : item
                      ),
                    });
                    showSavedFeedback('Status de Destaque Patrocinado atualizado!');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[10px] font-bold text-[#1D1D1F] cursor-pointer"
                >
                  {c.isSponsoredHighlight ? 'Tirar Destaque' : 'Destacar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateAdminConfig({
                      ...adminConfig,
                      partnerCoupons: partnerCoupons.filter((item) => item.id !== c.id),
                    });
                    showSavedFeedback(`Loja "${c.storeName}" removida.`);
                  }}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#DC2626] cursor-pointer"
                  title="Remover loja"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          BLOCO 5: LISTA COMPLETA DE COMPRADORES + EXPORTAÇÃO CARTEIRA CRM (CSV)
      ===================================================================== */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#16A34A]" /> Carteira de Clientes & Números Ocupados (
            {soldItems.length}/75)
          </h2>
          {soldItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const header = 'Numero,Status,Nome_Cliente,WhatsApp,PIX_ID,Regiao\n';
                const rows = soldItems
                  .map(
                    (it) =>
                      `${it.formatted},${it.status},"${(it.ownerName || 'Cliente').replace(
                        /"/g,
                        '""'
                      )}",${it.ownerWhatsapp || ''},${it.pixTxId || ''},"${
                        adminConfig.cityRegionLabel || 'Maracanaú - CE'
                      }"`
                  )
                  .join('\n');
                const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `carteira-clientes-maracanau-edicao-${adminConfig.editionNumber}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showSavedFeedback('Carteira de Clientes exportada em CSV com sucesso!');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Exportar Carteira de Clientes (CSV)</span>
            </button>
          )}
        </div>

        {soldItems.length === 0 ? (
          <p className="text-xs text-[#6E6E73] py-6 text-center bg-[#F5F5F7] rounded-2xl">
            Grade 100% zerada (0/75 vendidos).
          </p>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5EA] text-[#6E6E73]">
                  <th className="py-2 px-3">Nº</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Cliente</th>
                  <th className="py-2 px-3">WhatsApp Completo</th>
                  <th className="py-2 px-3">ID PIX</th>
                  <th className="py-2 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F7]">
                {soldItems.map((item) => (
                  <tr key={item.number}>
                    <td className="py-2 px-3 font-mono font-bold text-[#1D1D1F]">
                      Nº {item.formatted}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-semibold">
                        {item.status === 'sold' ? 'Pago' : 'Reservado'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-[#1D1D1F]">
                      {item.ownerName || 'Cliente'}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#6E6E73]">
                      {item.ownerWhatsapp || '—'}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#86868B]">
                      {item.pixTxId || 'PIX-LOCK'}
                    </td>
                    <td className="py-2 px-3 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setManualBallInput(item.formatted);
                          showSavedFeedback(
                            `Nº ${item.formatted} selecionado na Apuração da 1ª Bola!`
                          );
                          const el = document.querySelector(
                            '[data-testid="admin-manual-ball-section"]'
                          );
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold hover:bg-[#BBF7D0] transition-colors cursor-pointer"
                      >
                        Testar como 1ª Bola
                      </button>
                      {onAdminReleaseSingleNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            onAdminReleaseSingleNumber(item.number);
                            showSavedFeedback(`Nº ${item.formatted} estornado e liberado de volta para a grade!`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-[#DC2626] border border-rose-200 text-[11px] font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Estornar / Liberar Nº
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
