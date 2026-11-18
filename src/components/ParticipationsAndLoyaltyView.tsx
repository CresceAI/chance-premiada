import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Smartphone,
  Ticket,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  Coins,
  Gift,
  Sparkles,
  Share2,
  Store,
  MapPin,
  MessageCircle,
  Flame,
  Lock,
  Copy,
  Check,
  Plus,
  ChevronRight,
  Trophy,
  BookOpen,
  Grid3X3,
} from 'lucide-react';
import {
  DEFAULT_PARTNER_COUPONS,
  MARACANAU_NEIGHBORHOODS,
  ParticipationRecord,
  PartnerStoreCategory,
  PartnerStoreCoupon,
  findParticipationsByWhatsapp,
  normalizeShowcasePartnerCoupons,
  normalizeWhatsapp,
} from '../utils/engine';
import { ScratchCardWidget } from './ScratchCardWidget';
import { MARACANAU_CITY_BANNER_URL, resolvePartnerCouponBanner } from '../utils/banners';

interface ParticipationsAndLoyaltyViewProps {
  participations: ParticipationRecord[];
  lastUsedWhatsapp: string;
  coinsBalance: number;
  remarketingDiscountBRL?: number;
  partnerCoupons?: PartnerStoreCoupon[];
  cityRegionLabel?: string;
  supportWhatsapp?: string;
  viewMode?: 'participations' | 'profile';
  onNavigateResults?: () => void;
  onNavigateHowToPlay?: () => void;
  onRedeemPartnerCoupon?: (couponId: string) => void;
  onRegisterPartnerStore?: (newCoupon: PartnerStoreCoupon) => void;
  onScratchRevealed: (participationId: string) => void;
  onNavigateToGrid: () => void;
}

export const ParticipationsAndLoyaltyView: React.FC<ParticipationsAndLoyaltyViewProps> = ({
  participations,
  lastUsedWhatsapp,
  coinsBalance,
  remarketingDiscountBRL = 0,
  partnerCoupons = DEFAULT_PARTNER_COUPONS,
  cityRegionLabel = 'Maracanaú - CE',
  supportWhatsapp = '5585985252317',
  viewMode = 'participations',
  onNavigateResults,
  onNavigateHowToPlay,
  onRedeemPartnerCoupon,
  onRegisterPartnerStore,
  onScratchRevealed,
  onNavigateToGrid,
}) => {
  const [whatsappQuery, setWhatsappQuery] = useState(lastUsedWhatsapp || '');
  const [searchedPhone, setSearchedPhone] = useState(lastUsedWhatsapp || '');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | PartnerStoreCategory>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('Todos');

  // Merchant Self-Service Registration & Digital Marketing Kit State
  const [showMerchantPortal, setShowMerchantPortal] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [merchantNeighborhood, setMerchantNeighborhood] = useState('Centro');
  const [merchantCategory, setMerchantCategory] = useState<PartnerStoreCategory>('food');
  const [merchantDiscount, setMerchantDiscount] = useState('R$ 10 OFF');
  const [merchantOffer, setMerchantOffer] = useState('');
  const [merchantWhatsapp, setMerchantWhatsapp] = useState('');
  const [merchantItem1Name, setMerchantItem1Name] = useState('');
  const [merchantItem1OldPrice, setMerchantItem1OldPrice] = useState('45');
  const [merchantItem1PromoPrice, setMerchantItem1PromoPrice] = useState('35');
  const [registeredStoreKit, setRegisteredStoreKit] = useState<PartnerStoreCoupon | null>(null);
  const [copiedMerchantKit, setCopiedMerchantKit] = useState(false);

  useEffect(() => {
    if (lastUsedWhatsapp && !whatsappQuery) {
      setWhatsappQuery(lastUsedWhatsapp);
      setSearchedPhone(lastUsedWhatsapp);
    }
  }, [lastUsedWhatsapp, whatsappQuery]);

  const matchedRecords = searchedPhone
    ? findParticipationsByWhatsapp(participations, searchedPhone)
    : participations;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchedPhone(whatsappQuery);
    setTimeout(() => setIsSearching(false), 220);
  };

  const nextMilestone = 150;
  const loyaltyPct = Math.min(100, Math.round((coinsBalance / nextMilestone) * 100));
  const unscratchedCount = matchedRecords.filter((r) => !r.scratchCard.scratched).length;
  const hasUnlockedClub = coinsBalance >= 25 || matchedRecords.length > 0 || participations.length > 0;

  const normalizedCoupons = normalizeShowcasePartnerCoupons(partnerCoupons);
  const filteredCoupons = normalizedCoupons.filter((c) => {
    const matchCategory = selectedCategory === 'all' ? true : c.category === selectedCategory;
    const matchNeighborhood =
      selectedNeighborhood === 'Todos'
        ? true
        : c.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase());
    return matchCategory && matchNeighborhood;
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header & Zero-Registration Lookup Card + VIP Loyalty Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section
          className={`${
            viewMode === 'profile' ? 'hidden md:flex' : 'flex'
          } lg:col-span-8 bg-[#111512] rounded-3xl border border-white/[0.09] p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.3)] flex-col justify-between`}
        >
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/25 px-3 py-1 rounded-lg mb-3">
              <Smartphone className="w-3.5 h-3.5" /> Carteira Digital · Sem Senha
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5f7f3] tracking-tight">
              Minhas Participações
            </h1>
            <p className="text-sm text-[#929a94] mt-1.5 leading-relaxed max-w-2xl">
              Digite o mesmo WhatsApp usado no PIX para consultar seus números, acompanhar a
              aprovação e raspar sua Raspadinha Digital.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#929a94] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                aria-label="WhatsApp com DDD"
                value={whatsappQuery}
                onChange={(e) => {
                  setWhatsappQuery(e.target.value);
                  setSearchedPhone(e.target.value);
                }}
                placeholder="WhatsApp com DDD (ex: 85 98765-4321)"
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-white/[0.1] bg-[#171c18] focus:bg-[#1c231d] text-sm text-[#f5f7f3] placeholder:text-[#5e6660] font-semibold focus:outline-none focus:border-[var(--brand-accent)]"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] font-extrabold text-sm transition-all cursor-pointer shrink-0 inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <Search className="size-4" />
              <span>Buscar Números</span>
            </button>
          </form>

          {/* How passwordless works */}
          <div className="mt-5 pt-4 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#6E6E73]">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1D1D1F]">Vínculo Automático:</strong> Seu número da grade
                fica atrelado ao seu WhatsApp + ID da transação PIX.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1D1D1F]">Aviso no Celular:</strong> Quando fechar os 75
                números e sair a 1ª bola, você recebe o resultado.
              </span>
            </div>
          </div>
        </section>

        {/* VIP Loyalty & Chance Coins Club Card */}
        <aside
          className={`${
            viewMode === 'participations' ? 'hidden md:flex' : 'flex'
          } lg:col-span-4 bg-[#111512] border border-white/[0.09] text-[#f5f7f3] rounded-3xl p-5 sm:p-6 flex-col justify-between space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-colors duration-300`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4ADE80] bg-white/10 px-2.5 py-1 rounded-lg">
                <Coins className="w-3.5 h-3.5 text-[#FBBF24]" /> Clube Fidelidade VIP
              </span>
              <span className="font-mono text-xs text-white/70">
                {matchedRecords.length} {matchedRecords.length === 1 ? 'compra' : 'compras'}
              </span>
            </div>

            <div className="pt-1">
              <span className="text-xs text-white/70 block">Seu Saldo Acumulado</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white tabular-nums">
                  {coinsBalance}
                </span>
                <span className="text-xs font-bold text-[#FBBF24]">Chance Coins</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-white/80">
                <span>Progresso p/ Bônus Fidelidade</span>
                <span className="font-mono">{loyaltyPct}%</span>
              </div>
              <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#22C55E] to-[#FBBF24] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(6, loyaltyPct)}%` }}
                />
              </div>
              <p className="text-[11px] text-white/65">
                Você ganha <strong>+25 Coins</strong> por número comprado e{' '}
                <strong>+30 Coins</strong> ao raspar cada Raspadinha.
              </p>
            </div>
          </div>

          {remarketingDiscountBRL > 0 ? (
            <div className="p-3.5 rounded-2xl bg-[#171c18] border border-[var(--brand-accent)]/30 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand-accent)]">
                <Gift className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  Cupom de R$ {remarketingDiscountBRL.toFixed(2).replace('.', ',')} Disponível!
                </span>
              </div>
              <button
                type="button"
                onClick={onNavigateToGrid}
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] font-extrabold text-xs transition-all cursor-pointer"
              >
                Usar Meu Desconto na Grade →
              </button>
            </div>
          ) : unscratchedCount > 0 ? (
            <div className="p-3 rounded-2xl bg-white/10 text-xs text-white/90 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4ADE80] shrink-0" />
              <span>
                Você tem <strong>{unscratchedCount} Raspadinha(s)</strong> pronta(s) para raspar
                abaixo!
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onNavigateToGrid}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Escolher +1 Número da Sorte</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </aside>
      </div>

      {/* MOBILE PROFILE SETTINGS-STYLE GROUPED NAVIGATION (Dark Obsidian + Lime Redesign) */}
      {viewMode === 'profile' && (
        <section
          aria-label="Atalhos da Conta"
          className="md:hidden bg-[#111512] rounded-3xl border border-white/[0.09] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.3)] divide-y divide-white/[0.07]"
        >
          {onNavigateResults && (
            <button
              type="button"
              onClick={onNavigateResults}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#171c18] active:bg-[#1e261f] text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-9 rounded-full bg-[#171c18] border border-white/[0.09] text-[var(--brand-accent)] flex items-center justify-center shrink-0">
                  <Trophy className="size-4" />
                </span>
                <div className="min-w-0">
                  <strong className="text-sm font-bold text-[#f5f7f3] block truncate">
                    Resultados Oficiais
                  </strong>
                  <span className="text-[11px] text-[#929a94] block truncate">
                    Ver ganhadores da 1ª bola
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-[#929a94] shrink-0" />
            </button>
          )}
          {onNavigateHowToPlay && (
            <button
              type="button"
              onClick={onNavigateHowToPlay}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#171c18] active:bg-[#1e261f] text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-9 rounded-full bg-[#171c18] border border-white/[0.09] text-[var(--brand-accent)] flex items-center justify-center shrink-0">
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0">
                  <strong className="text-sm font-bold text-[#f5f7f3] block truncate">
                    Tutorial Como Jogar
                  </strong>
                  <span className="text-[11px] text-[#929a94] block truncate">
                    Aprenda em 30 segundos
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-[#929a94] shrink-0" />
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToGrid}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#171c18] active:bg-[#1e261f] text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="size-9 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] flex items-center justify-center shrink-0">
                <Grid3X3 className="size-4" />
              </span>
              <div className="min-w-0">
                <strong className="text-sm font-bold text-[#f5f7f3] block truncate">
                  Escolher Números (01–75)
                </strong>
                <span className="text-[11px] text-[#929a94] block truncate">
                  Ir direto para a grade ativa
                </span>
              </div>
            </div>
            <ChevronRight className="size-4 text-[#929a94] shrink-0" />
          </button>
        </section>
      )}

      {/* Results List */}
      <div className={viewMode === 'profile' ? 'hidden md:block' : 'block'}>
      {isSearching ? (
        <div className="space-y-4" aria-busy="true" aria-label="Buscando participações">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="bg-[#111512] rounded-3xl border border-white/[0.08] p-5 sm:p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-36 rounded-lg bg-[#171c18]" />
                  <div className="h-5 w-56 rounded-lg bg-[#171c18]" />
                </div>
                <div className="h-8 w-24 rounded-xl bg-[#171c18]" />
              </div>
              <div className="h-24 w-full rounded-2xl bg-[#171c18]" />
            </div>
          ))}
        </div>
      ) : matchedRecords.length === 0 ? (
        <div className="bg-[#111512] rounded-3xl border border-white/[0.09] p-8 sm:p-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <div className="size-13 rounded-2xl bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/25 flex items-center justify-center mx-auto mb-3 text-[var(--brand-accent)]">
            <Ticket className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-[#f5f7f3]">
            {normalizeWhatsapp(searchedPhone).length >= 8
              ? 'Nenhuma participação encontrada para este WhatsApp'
              : 'Tudo zerado! Nenhuma compra realizada ainda'}
          </h2>
          <p className="text-sm text-[#929a94] max-w-md mx-auto mt-1 mb-5">
            {normalizeWhatsapp(searchedPhone).length >= 8
              ? 'Verifique os dígitos do DDD + número ou escolha um número verde na grade 01 a 75 para testar agora.'
              : 'O sistema iniciou 100% zerado (0/75 vendidos). Escolha um número na grade principal e faça um teste para ver seu comprovante e sua Raspadinha aparecerem aqui.'}
          </p>
          <button
            onClick={onNavigateToGrid}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm transition-colors cursor-pointer shadow-xs"
          >
            Escolher Número na Grade 01–75 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-[#f5f7f3]">
              Participações Localizadas ({matchedRecords.length})
            </h2>
            <span className="text-xs font-semibold text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 px-2.5 py-1 rounded-lg border border-[var(--brand-accent)]/25 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Protegido por Trava Única PIX
            </span>
          </div>

          {matchedRecords.map((part, idx) => (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#111512] rounded-3xl border border-white/[0.09] p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.3)] space-y-4 overflow-hidden"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-[#f5f7f3] bg-[#171c18] border border-white/[0.08] px-2.5 py-1 rounded-lg">
                      {part.editionNumber}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        part.status === 'Aguardando Fechar 75 Nºs'
                          ? 'bg-[#D9B85D]/15 text-[#D9B85D] border border-[#D9B85D]/25'
                          : 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] border border-[var(--brand-accent)]/25'
                      }`}
                    >
                      {part.status === 'Aguardando Fechar 75 Nºs' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {part.status}
                    </span>
                    <span className="text-[11px] font-bold text-[#D9B85D] bg-[#D9B85D]/15 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Coins className="w-3 h-3" /> +{part.coinsEarned} Coins
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#f5f7f3] mt-2">
                    {part.prizeTitle}
                  </h3>
                  <p className="text-xs text-[#929a94] mt-0.5">
                    Titular: <strong className="text-[#f5f7f3]">{part.customerName}</strong> ·
                    WhatsApp: <span className="font-mono">{part.customerWhatsappFormatted}</span> ·{' '}
                    {part.date}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-semibold text-[#929a94]">Seus Números Únicos</p>
                  <div className="flex flex-wrap gap-1.5 justify-end mt-1">
                    {part.numbers.map((n) => (
                      <span
                        key={n}
                        className="px-3 py-1 rounded-xl bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-mono font-extrabold text-sm shadow-xs"
                      >
                        Nº {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Perforated Ticket Divider */}
              <div className="ticket-divider pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#929a94]">
                  Status do Sorteio: <strong className="text-[#f5f7f3]">{part.result}</strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-[#747c76]">
                    Comprovante: {part.pixTxId} · R$ {part.amountPaid.toFixed(2).replace('.', ',')}
                  </span>
                  <a
                    href={`https://wa.me/55${part.customerWhatsapp}?text=${encodeURIComponent(
                      `✅ *MEU BILHETE OFICIAL — CHANCE PREMIADA*\n🎟 ${part.editionNumber}\n🔢 Números: Nº ${part.numbers.join(
                        ', '
                      )}\n🧾 Comprovante: ${part.pixTxId}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--brand-accent)] font-bold hover:underline"
                  >
                    <Share2 className="w-3 h-3" /> Salvar no WhatsApp
                  </a>
                </div>
              </div>

              {/* Scratch card attached to this purchase (Locked while Pagamento em Conferência) */}
              <div className="pt-1">
                {part.status === 'Pagamento em Conferência' ? (
                  <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="size-8 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                        <Lock className="size-4" />
                      </div>
                      <div>
                        <strong className="text-[#151515] block">
                          Raspadinha bloqueada até a conferência do PIX
                        </strong>
                        <span className="text-[#6E6E73] text-[11px]">
                          Envie seu comprovante no WhatsApp para o Administrador validar na hora.
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${supportWhatsapp.replace(
                        /\D/g,
                        ''
                      )}?text=${encodeURIComponent(
                        `Olá! Fiz o PIX de R$ ${part.amountPaid
                          .toFixed(2)
                          .replace('.', ',')} na ${part.editionNumber} (${part.customerName} · Nº ${part.numbers.join(
                          ', '
                        )} · Código ${part.pixTxId}). Segue meu comprovante:`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-accent)] text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>Enviar Comprovante</span>
                    </a>
                  </div>
                ) : (
                  <ScratchCardWidget
                    scratch={part.scratchCard}
                    onRevealComplete={() => onScratchRevealed(part.id)}
                    onUseDiscountNow={onNavigateToGrid}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>

      {/* =====================================================================
          CLUBE DE CUPONS & COMÉRCIOS PARCEIROS DE MARACANAÚ
      ===================================================================== */}
      <section
        className={`${
          viewMode === 'participations' ? 'hidden md:block' : 'block'
        } bg-[#111512] rounded-3xl border border-white/[0.09] p-4 sm:p-7 space-y-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)]`}
        data-testid="partner-coupons-club-section"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 px-3 py-1 rounded-full border border-[var(--brand-accent)]/25">
              <Store className="w-3.5 h-3.5" /> Clube Chance+ · {cityRegionLabel}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#f5f7f3] tracking-tight leading-snug text-balance">
              Seu número vale mais, mesmo depois do sorteio.
            </h2>
            <p className="text-xs sm:text-sm text-[#929a94] leading-relaxed text-pretty">
              Benefícios exclusivos em negócios de {cityRegionLabel} para quem participa da Chance
              Premiada — feche parceria para receber clientes direto no WhatsApp com{' '}
              <strong className="text-[var(--brand-accent)]">zero taxa por pedido</strong>.
            </p>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-[#171c18] border border-white/[0.09] text-left sm:text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#929a94] block">
              Vitrine Comercial
            </span>
            <span className="text-xs font-extrabold text-[var(--brand-accent)] inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Captação de Parceiros
            </span>
          </div>
        </div>

        {/* HIGH-CONVERTING SPONSOR & PARTNER CALLOUT BANNER WITH MARACANAÚ AERIAL PHOTO */}
        <div className="relative overflow-hidden rounded-3xl border border-[#D5AC58]/50 shadow-lg">
          <img
            src={MARACANAU_CITY_BANNER_URL}
            alt={`Vista aérea de ${cityRegionLabel} - Feira Center e Centro Comercial`}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#063D2B]/95 via-[#063D2B]/88 to-[#0A1713]/75" />

          <div className="relative p-5 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#B5F44A] text-[#063D2B] text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                <Store className="size-3 shrink-0" /> Vitrine Oficial de {cityRegionLabel} · Seja Nosso Parceiro & Patrocinador
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Veja abaixo os 4 Exemplos de Anúncios — Quer um Banner Igual para Sua Empresa?
              </h3>
              <p className="text-xs text-white/90 leading-relaxed">
                As artes abaixo (<strong>Burger Top</strong>, <strong>Açaí Show</strong>,{' '}
                <strong>Studio Bella</strong> e <strong>Moda Prime Sports</strong>) são{' '}
                <strong className="text-[#D5AC58]">exemplos demonstrativos</strong> para mostrar
                como sua marca aparece em destaque no app! Fechando parceria conosco, nós criamos a
                arte da sua loja no mesmo padrão e enviamos clientes direto para o seu WhatsApp com{' '}
                <strong>zero taxa por pedido</strong>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`https://wa.me/${supportWhatsapp.replace(
                  /\D/g,
                  ''
                )}?text=${encodeURIComponent(
                  `Olá! Vi os Exemplos de Anúncios no Chance Premiada (${cityRegionLabel}) e quero fazer um Banner Igual para minha empresa e ser Parceiro / Patrocinador Oficial!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#B5F44A] hover:bg-[#c5f86b] text-[#063D2B] text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Quero Um Anúncio Igual p/ Minha Empresa</span>
              </a>
              <button
                type="button"
                onClick={() => setShowMerchantPortal((prev) => !prev)}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-xs text-white border border-white/25 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#B5F44A]" />
                <span>Testar Cadastro da Minha Loja</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (iFood / Zé Delivery Style) + Neighborhood Map Filter */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Todos os Anúncios' },
              { id: 'food', label: 'Burger Top (Hamburgueria)' },
              { id: 'drinks_acai', label: 'Açaí Show (Sorvetes)' },
              { id: 'beauty_barber', label: 'Studio Bella (Beleza)' },
              { id: 'services_auto', label: 'Moda Prime Sports' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as 'all' | PartnerStoreCategory)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)]'
                    : 'bg-[#171c18] text-[#929a94] hover:text-white border border-white/[0.08]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-[#6E6E73] inline-flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5 text-[#16A34A]" /> Mapa de Bairros ({cityRegionLabel}):
            </span>
            {MARACANAU_NEIGHBORHOODS.map((nb) => (
              <button
                key={nb}
                type="button"
                onClick={() => setSelectedNeighborhood(nb)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  selectedNeighborhood === nb
                    ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                    : 'bg-white border border-black/[0.06] text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {nb}
              </button>
            ))}
          </div>
        </div>

        {/* Partner Store Coupons + Mini-Catalog Grid (Redesign Obsidian Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between gap-3 transition-colors bg-[#171c18] ${
                coupon.isSponsoredHighlight
                  ? 'border-[var(--brand-accent)]/35'
                  : 'border-white/[0.09]'
              }`}
            >
              <div className="space-y-3">
                {/* Official 16:9 Partner Ad Banner (Showcase or Real Partner) */}
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.09] group">
                  <img
                    src={resolvePartnerCouponBanner(coupon)}
                    alt={`Anúncio ${coupon.storeName}`}
                    className="w-full h-auto object-cover block transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                  {coupon.isDemoSlot && (
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-[#080b09]/85 backdrop-blur-xs border border-white/15 text-[var(--brand-accent)] text-[10px] font-bold shadow-sm">
                      Exemplo Demonstrativo
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-mono text-xs font-extrabold">
                      {coupon.discountLabel}
                    </span>
                    {coupon.isDemoSlot ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#D9B85D]/15 text-[#D9B85D] border border-[#D9B85D]/30 text-[10px] font-extrabold inline-flex items-center gap-1">
                        <Flame className="w-3 h-3" /> Anúncio Modelo
                      </span>
                    ) : (
                      coupon.isSponsoredHighlight && (
                        <span className="px-2 py-0.5 rounded-md bg-[#D9B85D]/15 text-[#D9B85D] border border-[#D9B85D]/30 text-[10px] font-bold inline-flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Parceiro Destaque
                        </span>
                      )
                    )}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#D9B85D] bg-white/[0.06] px-2 py-0.5 rounded-md">
                    {coupon.isDemoSlot ? 'Espaço Aberto' : `${coupon.coinsCost} Coins`}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#f5f7f3]">{coupon.storeName}</h3>
                  <p className="text-[11px] text-[#929a94] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[var(--brand-accent)] shrink-0" />
                    <span>{coupon.neighborhood}</span>
                  </p>
                </div>

                <p className="text-xs sm:text-sm font-bold text-[var(--brand-accent)] leading-snug">
                  {coupon.offerTitle}
                </p>

                {/* Mini-Catálogo de Produtos com Desconto */}
                {coupon.catalogItems && coupon.catalogItems.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#111512] border border-white/[0.07] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#929a94] block">
                      {coupon.isDemoSlot
                        ? 'Exemplo de Catálogo no App:'
                        : 'Catálogo Rápido no App:'}
                    </span>
                    {coupon.catalogItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-xs py-0.5 border-b last:border-b-0 border-white/[0.06]"
                      >
                        <span className="font-medium text-[#f5f7f3] truncate">{item.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums">
                          {item.oldPriceBRL && (
                            <span className="text-[10px] line-through text-[#747c76]">
                              R$ {item.oldPriceBRL}
                            </span>
                          )}
                          <strong className="text-xs font-extrabold text-[var(--brand-accent)]">
                            R$ {item.promoPriceBRL}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-[#929a94]">{coupon.minOrderRule}</p>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-[#929a94]">
                  {coupon.isDemoSlot ? (
                    <span className="font-bold text-[#D9B85D] inline-flex items-center gap-1">
                      <Store className="size-3.5 shrink-0" /> Espaço disponível p/ sua empresa
                    </span>
                  ) : (
                    <>
                      Código:{' '}
                      <strong className="font-mono text-[#f5f7f3] bg-[#111512] px-2 py-0.5 rounded border border-white/[0.1] inline-flex items-center gap-1">
                        {hasUnlockedClub ? (
                          coupon.couponCode
                        ) : (
                          <>
                            <Lock className="size-3" /> BLOQUEADO
                          </>
                        )}
                      </strong>
                    </>
                  )}
                </div>

                {coupon.isDemoSlot ? (
                  <a
                    href={`https://wa.me/${supportWhatsapp.replace(
                      /\D/g,
                      ''
                    )}?text=${encodeURIComponent(
                      `Olá! Vi a vitrine em teste de "${coupon.storeName}" no Chance Premiada (${cityRegionLabel}) e quero ser Patrocinador / Parceiro Oficial para colocar minha empresa e aumentar minhas vendas!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Quero Ser Parceiro</span>
                  </a>
                ) : hasUnlockedClub ? (
                  <a
                    href={`https://wa.me/55${coupon.storeWhatsapp.replace(
                      /\D/g,
                      ''
                    )}?text=${encodeURIComponent(
                      `Olá ${coupon.storeName}! Sou membro da Carteira Digital Chance Premiada (${cityRegionLabel}) e quero pedir usando meu Cupom Oficial *${coupon.couponCode}* (${coupon.offerTitle})!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onRedeemPartnerCoupon?.(coupon.id)}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Resgatar no WhatsApp</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateToGrid}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f7f3] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Comprar 1 Nº p/ Liberar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* B2B Callout + Self-Service Merchant Portal & Digital Marketing Kit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1D1D1F] via-[#27272A] to-[#1D1D1F] text-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4ADE80] block">
                Impulsionando os Empreendedores de {cityRegionLabel} · Zero Taxa por Pedido
              </span>
              <h3 className="text-sm sm:text-base font-extrabold">
                Tem um comércio, delivery ou serviço em {cityRegionLabel}?
              </h3>
              <p className="text-xs text-white/80">
                Cadastre sua loja e seu catálogo gratuitamente em 1 minuto, receba clientes direto
                no seu WhatsApp e ganhe um <strong>Kit Pronto de Divulgação Digital</strong>!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMerchantPortal((prev) => !prev)}
                className="px-4 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#1D1D1F] text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {showMerchantPortal
                    ? 'Fechar Cadastro de Lojista'
                    : 'Cadastrar Meu Comércio Grátis'}
                </span>
              </button>
              <a
                href={`https://wa.me/${supportWhatsapp.replace(
                  /\D/g,
                  ''
                )}?text=${encodeURIComponent(
                  `Olá! Tenho um comércio em ${cityRegionLabel} e quero saber sobre o Destaque Patrocinado no Chance Premiada!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span>Falar c/ Consultor</span>
              </a>
            </div>
          </div>

          {showMerchantPortal && (
            <div className="pt-4 border-t border-white/15 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!merchantName.trim() || !merchantOffer.trim() || !merchantWhatsapp.trim()) {
                    return;
                  }
                  const created: PartnerStoreCoupon = {
                    id: `merchant-${Date.now()}`,
                    storeName: merchantName.trim(),
                    neighborhood: `${merchantNeighborhood} · Maracanaú`,
                    category: merchantCategory,
                    discountLabel: merchantDiscount.trim() || 'R$ 10 OFF',
                    offerTitle: merchantOffer.trim(),
                    minOrderRule: 'Apresente o código do cupom no WhatsApp da loja',
                    couponCode:
                      merchantName
                        .trim()
                        .replace(/[^a-zA-Z0-9]/g, '')
                        .slice(0, 6)
                        .toUpperCase() + '10',
                    storeWhatsapp: merchantWhatsapp.replace(/\D/g, ''),
                    coinsCost: 25,
                    isSponsoredHighlight: false,
                    redemptionsCount: 1,
                    catalogItems: merchantItem1Name.trim()
                      ? [
                          {
                            name: merchantItem1Name.trim(),
                            oldPriceBRL: Number(merchantItem1OldPrice) || undefined,
                            promoPriceBRL: Number(merchantItem1PromoPrice) || 25,
                          },
                        ]
                      : undefined,
                  };
                  onRegisterPartnerStore?.(created);
                  setRegisteredStoreKit(created);
                  setMerchantName('');
                  setMerchantOffer('');
                  setMerchantWhatsapp('');
                  setMerchantItem1Name('');
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-white/90 mb-1">
                    Nome do Seu Comércio
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="Ex: Lanchonete Sabor Real"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 text-xs focus:outline-none focus:border-[#4ADE80]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/90 mb-1">
                    Bairro em Maracanaú
                  </label>
                  <select
                    value={merchantNeighborhood}
                    onChange={(e) => setMerchantNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/15 text-white text-xs focus:outline-none"
                  >
                    {MARACANAU_NEIGHBORHOODS.filter((n) => n !== 'Todos').map((nb) => (
                      <option key={nb} value={nb}>
                        {nb}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/90 mb-1">Categoria</label>
                  <select
                    value={merchantCategory}
                    onChange={(e) => setMerchantCategory(e.target.value as PartnerStoreCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/15 text-white text-xs focus:outline-none"
                  >
                    <option value="food">Lanches & Pizza</option>
                    <option value="drinks_acai">Açaí & Bebidas</option>
                    <option value="beauty_barber">Barbearia & Estética</option>
                    <option value="services_auto">Lava-Jato & Serviços</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/90 mb-1">
                    WhatsApp de Pedidos (DDD)
                  </label>
                  <input
                    type="tel"
                    required
                    value={merchantWhatsapp}
                    onChange={(e) => setMerchantWhatsapp(e.target.value)}
                    placeholder="85988887777"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 font-mono text-xs focus:outline-none focus:border-[#4ADE80]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/90 mb-1">
                    Desconto p/ Clientes (Ex: R$ 10 OFF)
                  </label>
                  <input
                    type="text"
                    value={merchantDiscount}
                    onChange={(e) => setMerchantDiscount(e.target.value)}
                    placeholder="R$ 10 OFF"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-white/90 mb-1">
                    Qual benefício/oferta o cliente ganha na sua loja?
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantOffer}
                    onChange={(e) => setMerchantOffer(e.target.value)}
                    placeholder="Ex: R$ 10 OFF no Combo Casal + Entrega Grátis no bairro"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/90 mb-1">
                    Produto Principal (Catálogo)
                  </label>
                  <input
                    type="text"
                    value={merchantItem1Name}
                    onChange={(e) => setMerchantItem1Name(e.target.value)}
                    placeholder="Ex: Combo X-Tudo Duplo (R$ 29)"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4 flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#1D1D1F] font-extrabold text-xs cursor-pointer"
                  >
                    Publicar Minha Loja Grátis + Gerar Kit de Divulgação →
                  </button>
                </div>
              </form>

              {registeredStoreKit && (
                <div className="p-4 rounded-2xl bg-white/10 border border-[#4ADE80]/40 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-[#4ADE80] text-sm inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 shrink-0" /> Loja "{registeredStoreKit.storeName}" Publicada! Aqui está seu Kit de
                      Vendas no WhatsApp:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const kitText = `🔥 Pessoal de ${registeredStoreKit.neighborhood}! Nossa loja *${registeredStoreKit.storeName}* agora é parceira oficial do Clube Chance Premiada!\n🎁 Quem pegar nosso cupom *${registeredStoreKit.couponCode}* no app ganha *${registeredStoreKit.offerTitle}* pelo WhatsApp e ainda concorre a R$ 200 no PIX!\n👉 Acesse nosso cupom aqui: ${
                          typeof window !== 'undefined'
                            ? window.location.origin
                            : 'https://chancepremiada.com.br'
                        }/?src=indicacao`;
                        navigator.clipboard?.writeText(kitText).catch(() => {});
                        setCopiedMerchantKit(true);
                        setTimeout(() => setCopiedMerchantKit(false), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#22C55E] text-[#1D1D1F] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedMerchantKit ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copiado p/ Status!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Post p/ Status & Instagram da Loja
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    <strong>Dica de Ouro para Bombar suas Vendas Hoje:</strong> Poste o texto
                    acima no Status do WhatsApp da sua loja! Seus clientes entram para pegar o seu
                    cupom, conhecem sua oferta do dia e fazem pedidos direto no seu WhatsApp sem
                    você pagar taxa de aplicativo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
