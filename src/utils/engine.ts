export type NumberStatus = 'available' | 'reserved' | 'sold';

export interface GridNumber {
  number: number; // 1 to 75
  formatted: string; // '01' to '75'
  status: NumberStatus;
  ownerName?: string;
  ownerWhatsapp?: string;
  ownerEmail?: string;
  pixTxId?: string;
  reservedUntil?: string;
  affiliateCode?: string;
  affiliateName?: string;
}

export type DailyPrizeOptionId = 'p75' | 'p200' | 'p500' | 'custom';

export interface DailyPrizeOption {
  id: DailyPrizeOptionId;
  label: string;
  prizeAmountBRL: number;
  ticketPriceBRL: number;
  totalPoolRevenueBRL: number;
  description: string;
}

export const DAILY_PRIZE_OPTIONS: DailyPrizeOption[] = [
  {
    id: 'p75',
    label: 'R$ 75 no PIX',
    prizeAmountBRL: 75,
    ticketPriceBRL: 1.5,
    totalPoolRevenueBRL: 112.5,
    description: 'Edição rápida: fechou os 75 números, a 1ª bola que sair leva R$ 75,00 no PIX.',
  },
  {
    id: 'p200',
    label: 'R$ 200 no PIX',
    prizeAmountBRL: 200,
    ticketPriceBRL: 4.0,
    totalPoolRevenueBRL: 300.0,
    description: 'Edição principal: fechou os 75 números, a 1ª bola que sair leva R$ 200,00 no PIX.',
  },
  {
    id: 'p500',
    label: 'R$ 500 no PIX',
    prizeAmountBRL: 500,
    ticketPriceBRL: 10.0,
    totalPoolRevenueBRL: 750.0,
    description: 'Edição especial: fechou os 75 números, a 1ª bola que sair leva R$ 500,00 no PIX.',
  },
];

export interface ScratchPrizeResult {
  pixTxId: string;
  signatureHash: string;
  tier: 'free_number' | 'bonus_coins';
  title: string;
  subtitle: string;
  valueBRL: number;
  bonusNumberAssigned?: string;
  windowBlockLabel?: string;
  scratched: boolean;
}

export interface ParticipationRecord {
  id: string;
  editionNumber: string;
  prizeTitle: string;
  prizeAmountBRL: number;
  customerName: string;
  customerWhatsapp: string; // normalized digits
  customerWhatsappFormatted: string;
  customerEmail?: string;
  numbers: string[];
  amountPaid: number;
  coinsEarned: number;
  date: string;
  status: 'Pagamento em Conferência' | 'Aguardando Fechar 75 Nºs' | 'Sorteio Realizado';
  result: string;
  pixTxId: string;
  scratchCard: ScratchPrizeResult;
  paymentVerified?: boolean;
  affiliateCode?: string;
  affiliateName?: string;
}

export interface AffiliateSeller {
  id: string;
  code: string; // Ex: "lucas", "maria", "barbearia" (usado em ?ind=lucas)
  name: string;
  whatsapp: string;
  commissionPct: number; // Ex: 20 (20% sobre cada venda indicada)
  hotFootBonusBRL: number; // Ex: 10.00 ("Bônus Pé Quente" se o cliente dele ganhar a 1ª Bola!)
  active: boolean;
}

export const DEFAULT_AFFILIATE_SELLERS: AffiliateSeller[] = [
  {
    id: 'aff-lucas',
    code: 'lucas',
    name: 'Lucas Divulgador (Maracanaú)',
    whatsapp: '85999991111',
    commissionPct: 20,
    hotFootBonusBRL: 10,
    active: true,
  },
  {
    id: 'aff-camila',
    code: 'camila',
    name: 'Camila Influencer VIP',
    whatsapp: '85999992222',
    commissionPct: 20,
    hotFootBonusBRL: 10,
    active: true,
  },
];

export interface AffiliateEditionSettlement {
  affiliateId: string;
  affiliateCode: string;
  affiliateName: string;
  affiliateWhatsapp: string;
  editionLabel: string;
  numbersSold: string[];
  salesCount: number;
  grossRevenueBRL: number;
  commissionPct: number;
  commissionBRL: number;
  wonHotFootBonus: boolean;
  hotFootBonusBRL: number;
  totalPayoutBRL: number;
  whatsappReceiptText: string;
}

export interface ArchivedEditionSnapshot {
  editionNumber: number;
  label: string;
  prizeAmountBRL: number;
  ticketPriceBRL: number;
  closedAt: string;
  status: 'awaiting_draw' | 'drawn';
  grid: GridNumber[];
  winner?: WinnerRecord;
  affiliateSettlements?: AffiliateEditionSettlement[];
}

export interface WinnerRecord {
  id: string;
  editionNumber: string;
  date: string;
  firstBallNumber: string;
  ballsSequence: string[]; // Shows the balls as they came out (1st ball is winner)
  winnerName: string;
  winnerWhatsappMasked: string;
  prizeAmountBRL: number;
  pixTxId: string;
}

export type PartnerStoreCategory =
  | 'food'
  | 'drinks_acai'
  | 'beauty_barber'
  | 'services_auto';

export interface PartnerCatalogItem {
  name: string;
  oldPriceBRL?: number;
  promoPriceBRL: number;
}

export interface PartnerStoreCoupon {
  id: string;
  storeName: string;
  neighborhood: string; // Ex: Centro - Maracanaú, Jereissati I, Pajuçara...
  category: PartnerStoreCategory;
  discountLabel: string; // Ex: "R$ 12 OFF" or "Entrega Grátis + Refri"
  offerTitle: string; // Ex: "R$ 12 de Desconto na Pizza Grande + Borda Grátis"
  minOrderRule: string; // Ex: "Pedidos acima de R$ 45 no WhatsApp"
  couponCode: string; // Ex: "CHANCE12"
  storeWhatsapp: string; // Ex: "85999999999"
  coinsCost: number; // Ex: 25 Coins (ganhos automaticamente ao comprar 1 número!)
  bannerImageUrl?: string; // Arte horizontal do parceiro ou exemplo demonstrativo
  isSponsoredHighlight?: boolean; // Anúncio Pago no Topo (Estilo iFood / Zé Delivery Ads)
  isDemoSlot?: boolean; // Vitrine Demonstrativa em Fase de Teste / Buscando Patrocinador e Apoiador
  redemptionsCount: number; // Quantos clientes clicaram para pedir no WhatsApp da loja
  catalogItems?: PartnerCatalogItem[];
}

export const MARACANAU_NEIGHBORHOODS = [
  'Todos',
  'Centro',
  'Jereissati',
  'Pajuçara',
  'Cidade Nova',
  'Timbó',
  'Industrial',
  'Novo Maracanaú',
] as const;

export const DEFAULT_PARTNER_COUPONS: PartnerStoreCoupon[] = [
  {
    id: 'store-maracanau-1',
    storeName: 'Burger Top — Hamburgueria',
    neighborhood: 'Av. Central, 1234 · Seu Bairro · Maracanaú',
    category: 'food',
    discountLabel: 'R$ 12 OFF',
    offerTitle: 'O sabor que você já conhece, agora ainda mais perto de você! Hambúrgueres Artesanais & Delivery Rápido.',
    minOrderRule: 'Anúncio modelo demonstrativo (fictício). Seja nosso parceiro oficial e receba clientes direto no seu WhatsApp!',
    couponCode: 'BURGERTOP',
    storeWhatsapp: '85987654321',
    coinsCost: 25,
    isSponsoredHighlight: true,
    isDemoSlot: true,
    redemptionsCount: 14,
    catalogItems: [
      { name: 'Combo 2 Burgers Artesanais + Batata + Refri', oldPriceBRL: 46, promoPriceBRL: 34 },
      { name: 'Smash Duplo Cheddar & Bacon Artesanal', oldPriceBRL: 32, promoPriceBRL: 24 },
      { name: 'Combo Família 4 Burgers + 2L', oldPriceBRL: 78, promoPriceBRL: 64 },
    ],
  },
  {
    id: 'store-maracanau-2',
    storeName: 'Açaí Show — Açaí • Sorvetes • Snacks',
    neighborhood: 'Av. Central, 1234 · Seu Bairro · Maracanaú',
    category: 'drinks_acai',
    discountLabel: 'R$ 8 OFF + Brinde',
    offerTitle: 'Muito mais sabor em cada colherada! Açaí de qualidade, sorvetes variados, sucos naturais e petiscos.',
    minOrderRule: 'Anúncio modelo demonstrativo (fictício). Anuncie sua loja aqui com zero taxa por pedido!',
    couponCode: 'ACAISHOW',
    storeWhatsapp: '85987654321',
    coinsCost: 25,
    isSponsoredHighlight: true,
    isDemoSlot: true,
    redemptionsCount: 19,
    catalogItems: [
      { name: 'Copo Açaí Show 500ml (Morango, Banana & Granola)', oldPriceBRL: 24, promoPriceBRL: 16 },
      { name: 'Barca de Açaí 1 Litro + Creme Ninho', oldPriceBRL: 42, promoPriceBRL: 32 },
      { name: 'Combo 2 Sucos Naturais + Lanche / Petisco', oldPriceBRL: 28, promoPriceBRL: 20 },
    ],
  },
  {
    id: 'store-maracanau-3',
    storeName: 'Studio Bella — Beleza & Estética',
    neighborhood: 'Av. Central, 1234 · Seu Bairro · Maracanaú',
    category: 'beauty_barber',
    discountLabel: 'R$ 15 OFF',
    offerTitle: 'Cuide de você com quem entende de beleza! Cabelos, Manicure e Pedicure, Limpeza de Pele e Estética Corporal.',
    minOrderRule: 'Anúncio modelo demonstrativo (fictício). Atraia clientes da cidade inteira para agendar no seu WhatsApp!',
    couponCode: 'STUDIOBELLA',
    storeWhatsapp: '85987654321',
    coinsCost: 25,
    isSponsoredHighlight: true,
    isDemoSlot: true,
    redemptionsCount: 11,
    catalogItems: [
      { name: 'Escova Modelada + Hidratação Profunda', oldPriceBRL: 65, promoPriceBRL: 50 },
      { name: 'Combo Pé e Mão + Design de Sobrancelha', oldPriceBRL: 55, promoPriceBRL: 40 },
      { name: 'Limpeza de Pele Facial Completa', oldPriceBRL: 85, promoPriceBRL: 70 },
    ],
  },
  {
    id: 'store-maracanau-4',
    storeName: 'Moda Prime Sports — Roupas & Calçados',
    neighborhood: 'Av. Central, 1234 · Seu Bairro · Maracanaú',
    category: 'services_auto',
    discountLabel: '20% OFF no PIX',
    offerTitle: 'Vista sua melhor versão! Roupas Esportivas, Calçados Esportivos, Acessórios Fitness e Qualidade Garantida.',
    minOrderRule: 'Anúncio modelo demonstrativo (fictício). Fale conosco e seja o patrocinador oficial do seu segmento!',
    couponCode: 'MODAPRIME',
    storeWhatsapp: '85987654321',
    coinsCost: 25,
    isSponsoredHighlight: true,
    isDemoSlot: true,
    redemptionsCount: 9,
    catalogItems: [
      { name: 'Camisa Dry-Fit Treino Masculina / Feminina', oldPriceBRL: 59, promoPriceBRL: 45 },
      { name: 'Tênis Running Performance + Coqueteleira', oldPriceBRL: 189, promoPriceBRL: 149 },
      { name: 'Kit 3 Conjuntos Fitness Academia', oldPriceBRL: 149, promoPriceBRL: 119 },
    ],
  },
];

/**
 * Ensures any previously cached default showcase coupons ('store-maracanau-1'..'store-maracanau-4')
 * automatically sync to the official fictional company names (Burger Top, Açaí Show, Studio Bella, Moda Prime Sports),
 * while preserving any custom partner stores added by the Admin.
 */
export function normalizeShowcasePartnerCoupons(
  coupons?: PartnerStoreCoupon[]
): PartnerStoreCoupon[] {
  if (!coupons || coupons.length === 0) return DEFAULT_PARTNER_COUPONS;
  return coupons.map((item) => {
    const defaultMatch = DEFAULT_PARTNER_COUPONS.find((d) => d.id === item.id);
    if (defaultMatch) {
      return defaultMatch;
    }
    return item;
  });
}

export interface AdminConfig {
  editionNumber: number;
  prizeAmountBRL: number;
  ticketPriceBRL: number;
  customBannerUrl?: string;
  scratchEnabled: boolean;
  scratchFreeNumberLimitPerEdition: number;
  secretScratchPositions: [number, number, number, number];
  neighborSecondChanceEnabled?: boolean;
  cityRegionLabel?: string;
  partnerCoupons?: PartnerStoreCoupon[];
  paymentMode?: 'asaas_auto' | 'direct_pix_zero_fee';
  directPixKey?: string;
  directPixReceiverName?: string;
  whatsappGroupUrl: string;
  telegramChannelUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsappSupportNumber: string;
}

export type TrafficSourceId =
  | 'status_zap'
  | 'grupo_vip'
  | 'instagram'
  | 'telegram'
  | 'indicacao'
  | 'direto';

export interface TrafficChannelStats {
  sourceId: TrafficSourceId;
  label: string;
  visits: number;
  numberClicks: number;
  pixGenerated: number;
  purchases: number;
  revenueBRL: number;
}

export interface AbandonedPixLead {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  numbers: string[];
  amountBRL: number;
  source: TrafficSourceId;
  createdAt: string;
  status: 'pending' | 'converted';
}

export interface AdsAnalyticsState {
  totalVisits: number;
  numberClicks: number;
  pixGenerated: number;
  purchases: number;
  totalRevenueBRL: number;
  channels: Record<TrafficSourceId, TrafficChannelStats>;
  abandonedLeads: AbandonedPixLead[];
  lastUpdatedAt: string;
}

export function createInitialAdsAnalytics(): AdsAnalyticsState {
  return {
    totalVisits: 0,
    numberClicks: 0,
    pixGenerated: 0,
    purchases: 0,
    totalRevenueBRL: 0,
    channels: {
      status_zap: {
        sourceId: 'status_zap',
        label: 'Status do WhatsApp',
        visits: 0,
        numberClicks: 0,
        pixGenerated: 0,
        purchases: 0,
        revenueBRL: 0,
      },
      grupo_vip: {
        sourceId: 'grupo_vip',
        label: 'Grupo VIP WhatsApp',
        visits: 0,
        numberClicks: 0,
        pixGenerated: 0,
        purchases: 0,
        revenueBRL: 0,
      },
      instagram: {
        sourceId: 'instagram',
        label: 'Instagram Stories / Bio',
        visits: 0,
        numberClicks: 0,
        pixGenerated: 0,
        purchases: 0,
        revenueBRL: 0,
      },
      telegram: {
        sourceId: 'telegram',
        label: 'Canal do Telegram',
        visits: 0,
        numberClicks: 0,
        pixGenerated: 0,
        purchases: 0,
        revenueBRL: 0,
      },
      indicacao: {
        sourceId: 'indicacao',
        label: 'Indicação de Clientes',
        visits: 0,
        numberClicks: 0,
        pixGenerated: 0,
        purchases: 0,
        revenueBRL: 0,
      },
      direto: {
        sourceId: 'direto',
        label: 'Link Direto / Orgânico',
        visits: 0,
        numberClicks: 0,
        pixGenerated: 0,
        purchases: 0,
        revenueBRL: 0,
      },
    },
    abandonedLeads: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function detectTrafficSourceFromUrl(
  search: string = '',
  referrer: string = ''
): TrafficSourceId {
  const params = new URLSearchParams(search);
  const rawSrc = (
    params.get('src') ||
    params.get('utm_source') ||
    params.get('ref') ||
    ''
  ).toLowerCase();

  if (rawSrc.includes('status')) return 'status_zap';
  if (rawSrc.includes('grupo') || rawSrc.includes('vip') || rawSrc.includes('zap') || rawSrc.includes('whats'))
    return 'grupo_vip';
  if (rawSrc.includes('insta') || rawSrc.includes('ig') || rawSrc.includes('stories'))
    return 'instagram';
  if (rawSrc.includes('tele') || rawSrc.includes('tg')) return 'telegram';
  if (rawSrc.includes('indica') || rawSrc.includes('amigo') || rawSrc.includes('share'))
    return 'indicacao';

  const cleanRef = referrer.toLowerCase();
  if (cleanRef.includes('instagram.com')) return 'instagram';
  if (cleanRef.includes('t.me') || cleanRef.includes('telegram')) return 'telegram';
  if (cleanRef.includes('whatsapp.com') || cleanRef.includes('wa.me')) return 'grupo_vip';

  return 'direto';
}

/**
 * Detects an Affiliate / Partner Seller referral code from URL query string
 * (`?ind=lucas`, `?vendedor=lucas`, `?afiliado=lucas`, or `?parceiro=lucas`).
 */
export function detectAffiliateFromUrl(search: string = ''): string | null {
  const params = new URLSearchParams(search);
  const raw = (
    params.get('ind') ||
    params.get('vendedor') ||
    params.get('afiliado') ||
    params.get('parceiro') ||
    ''
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return raw.length >= 2 ? raw : null;
}

/**
 * Automatically calculates each Affiliate/Seller's commission, numbers sold,
 * "Pé Quente" bonus (if the 1st ball winner bought through their link!), and generates
 * the official closing WhatsApp receipt when an edition finishes or is drawn.
 */
export function calculateEditionAffiliateSettlements(
  grid: GridNumber[],
  participations: ParticipationRecord[],
  affiliates: AffiliateSeller[],
  editionNumber: number,
  winningBallFormatted?: string,
  ticketPriceBRL: number = 4.0
): AffiliateEditionSettlement[] {
  const editionLabel = `Edição #${String(editionNumber).padStart(2, '0')}`;
  const targetEditionParts = participations.filter(
    (p) => p.editionNumber === editionLabel || p.editionNumber.endsWith(`#${editionNumber}`)
  );

  // Determine which affiliate sold the winning 1st ball (if any)
  let winningAffiliateCode: string | undefined;
  if (winningBallFormatted) {
    const winningCell = grid.find((g) => g.formatted === winningBallFormatted);
    if (winningCell?.affiliateCode) {
      winningAffiliateCode = winningCell.affiliateCode.toLowerCase();
    } else {
      const winningPart = targetEditionParts.find((p) =>
        p.numbers.includes(winningBallFormatted)
      );
      if (winningPart?.affiliateCode) {
        winningAffiliateCode = winningPart.affiliateCode.toLowerCase();
      }
    }
  }

  return affiliates.map((aff) => {
    const code = aff.code.toLowerCase();
    const matchingParts = targetEditionParts.filter(
      (p) => (p.affiliateCode || '').toLowerCase() === code
    );

    const soldSet = new Set<string>();
    let grossRevenueBRL = 0;

    for (const part of matchingParts) {
      grossRevenueBRL += part.amountPaid;
      for (const n of part.numbers) {
        soldSet.add(n);
      }
    }

    // Also include any grid numbers tagged directly with affiliateCode not in matchingParts
    for (const cell of grid) {
      if (
        (cell.status === 'sold' || cell.status === 'reserved') &&
        (cell.affiliateCode || '').toLowerCase() === code &&
        !soldSet.has(cell.formatted)
      ) {
        soldSet.add(cell.formatted);
        grossRevenueBRL += ticketPriceBRL;
      }
    }

    const numbersSold = Array.from(soldSet).sort();
    const salesCount = numbersSold.length;
    const commissionBRL =
      Math.round(grossRevenueBRL * (aff.commissionPct / 100) * 100) / 100;
    const wonHotFootBonus = Boolean(
      winningBallFormatted && winningAffiliateCode === code && salesCount > 0
    );
    const hotFootBonusBRL = wonHotFootBonus ? aff.hotFootBonusBRL : 0;
    const totalPayoutBRL = Math.round((commissionBRL + hotFootBonusBRL) * 100) / 100;

    const receiptLines = [
      `🧾 *COMPROVANTE DE COMISSÃO — CHANCE PREMIADA*`,
      `🏆 *${editionLabel}* ${
        winningBallFormatted ? `(1ª Bola: Nº ${winningBallFormatted})` : '( Parcial em Andamento )'
      }`,
      `👤 *Parceiro Divulgador:* ${aff.name} (?ind=${aff.code})`,
      ``,
      `🔢 *Números Vendidos pelo seu Link (${salesCount}):* ${
        numbersSold.length > 0 ? `Nº ${numbersSold.join(', ')}` : 'Nenhum número nesta edição'
      }`,
      `💰 *Volume Vendido:* R$ ${grossRevenueBRL.toFixed(2).replace('.', ',')}`,
      `📈 *Sua Comissão (${aff.commissionPct}%):* R$ ${commissionBRL.toFixed(2).replace('.', ',')}`,
    ];

    if (wonHotFootBonus) {
      receiptLines.push(
        `🔥 *BÔNUS PÉ QUENTE (Seu cliente ganhou a 1ª Bola Nº ${winningBallFormatted}!):* + R$ ${hotFootBonusBRL
          .toFixed(2)
          .replace('.', ',')}`
      );
    }

    receiptLines.push(
      `✅ *TOTAL A RECEBER NO PIX:* *R$ ${totalPayoutBRL.toFixed(2).replace('.', ',')}*`,
      ``,
      `🚀 *A próxima grade já está aberta! Continue divulgando seu link exclusivo:*`,
      `https://chancepremiada.com.br/?ind=${aff.code}`
    );

    return {
      affiliateId: aff.id,
      affiliateCode: aff.code,
      affiliateName: aff.name,
      affiliateWhatsapp: aff.whatsapp,
      editionLabel,
      numbersSold,
      salesCount,
      grossRevenueBRL,
      commissionPct: aff.commissionPct,
      commissionBRL,
      wonHotFootBonus,
      hotFootBonusBRL,
      totalPayoutBRL,
      whatsappReceiptText: receiptLines.join('\n'),
    };
  });
}

/**
 * Generates 1 random secret winning position inside each of the 4 blocks of 15 sales:
 * Block 1: 1..15
 * Block 2: 16..30
 * Block 3: 31..45
 * Block 4: 46..60
 * Total = 4 Free Cartela winners per 75-number edition (never fixed on 15, 30, 45, 60!).
 */
export function generateSecretScratchWindows(
  seed: number = Date.now()
): [number, number, number, number] {
  const s = Math.abs(Math.floor(seed));
  const pos1 = 1 + ((s * 7 + 3) % 15); // 1 to 15
  const pos2 = 16 + ((s * 11 + 5) % 15); // 16 to 30
  const pos3 = 31 + ((s * 13 + 9) % 15); // 31 to 45
  const pos4 = 46 + ((s * 17 + 11) % 15); // 46 to 60
  return [pos1, pos2, pos3, pos4];
}

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  editionNumber: 1,
  prizeAmountBRL: 200,
  ticketPriceBRL: 4.0,
  scratchEnabled: true,
  scratchFreeNumberLimitPerEdition: 4,
  secretScratchPositions: [7, 22, 39, 53],
  neighborSecondChanceEnabled: true,
  cityRegionLabel: 'Maracanaú - CE',
  partnerCoupons: DEFAULT_PARTNER_COUPONS,
  paymentMode: 'direct_pix_zero_fee',
  directPixKey: import.meta.env?.VITE_DIRECT_PIX_KEY || 'chancepremiada@pix.com.br',
  directPixReceiverName: import.meta.env?.VITE_DIRECT_PIX_RECEIVER || 'CHANCE PREMIADA',
  whatsappGroupUrl: 'https://chat.whatsapp.com/chancepremiada-vip',
  telegramChannelUrl: 'https://t.me/chancepremiada_oficial',
  telegramBotToken: '',
  telegramChatId: '@chancepremiada_oficial',
  whatsappSupportNumber: '5585999999999',
};

export function formatGridNumber(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function normalizeWhatsapp(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function maskPublicWhatsapp(phone: string): string {
  const digits = normalizeWhatsapp(phone);
  if (digits.length < 8) return '(**) 9****-****';
  const ddd = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${ddd}) 9****-${last4}`;
}

/**
 * Masks participant's full name for LGPD & privacy on the public participant list.
 * Example: "Maria Aparecida Ferreira" -> "Maria A."
 */
export function maskParticipantName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Participante';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

export interface PublicParticipantEntry {
  id: string;
  maskedName: string;
  maskedWhatsapp: string;
  cartelasCount: number;
  timeLabel: string;
  wonBonusCartela: boolean;
}

/**
 * Builds the privacy-safe list of who is participating in the current edition.
 * NEVER exposes chosen numbers (01-75), full phone numbers, or email addresses.
 */
export function getPublicParticipantsFeed(
  grid: GridNumber[],
  participations: ParticipationRecord[]
): PublicParticipantEntry[] {
  const feed: PublicParticipantEntry[] = [];
  const seenPhones = new Set<string>();

  for (const part of participations) {
    seenPhones.add(part.customerWhatsapp);
    feed.push({
      id: part.id,
      maskedName: maskParticipantName(part.customerName),
      maskedWhatsapp: maskPublicWhatsapp(part.customerWhatsapp),
      cartelasCount: part.numbers.length,
      timeLabel: part.date,
      wonBonusCartela: part.scratchCard.tier === 'free_number',
    });
  }

  // Also include any grid buyers added via Admin test/manual entry not yet in participations
  const byBuyer = new Map<string, { name: string; phone: string; count: number }>();
  for (const cell of grid) {
    if ((cell.status === 'sold' || cell.status === 'reserved') && cell.ownerName && cell.ownerWhatsapp) {
      if (seenPhones.has(cell.ownerWhatsapp)) continue;
      const existing = byBuyer.get(cell.ownerWhatsapp);
      if (existing) {
        existing.count += 1;
      } else {
        byBuyer.set(cell.ownerWhatsapp, {
          name: cell.ownerName,
          phone: cell.ownerWhatsapp,
          count: 1,
        });
      }
    }
  }

  for (const [phone, info] of byBuyer.entries()) {
    feed.push({
      id: `grid-buyer-${phone}`,
      maskedName: maskParticipantName(info.name),
      maskedWhatsapp: maskPublicWhatsapp(info.phone),
      cartelasCount: info.count,
      timeLabel: 'Confirmado via PIX',
      wonBonusCartela: false,
    });
  }

  return feed;
}

/**
 * Starts 100% zeroed (all 75 numbers available in green, 0 sold, 0 reserved)
 */
export function createZeroedGrid(): GridNumber[] {
  const grid: GridNumber[] = [];
  for (let i = 1; i <= 75; i++) {
    grid.push({
      number: i,
      formatted: formatGridNumber(i),
      status: 'available',
    });
  }
  return grid;
}

// Keep alias for compatibility with unit tests
export function createInitialGrid(): GridNumber[] {
  return createZeroedGrid();
}

export function getGridStats(grid: GridNumber[]) {
  let available = 0;
  let reserved = 0;
  let sold = 0;
  for (const item of grid) {
    if (item.status === 'available') available++;
    else if (item.status === 'reserved') reserved++;
    else if (item.status === 'sold') sold++;
  }
  return {
    total: grid.length,
    available,
    reserved,
    sold,
    remainingToDraw: grid.length - sold,
    occupancyPct: Math.round((sold / grid.length) * 100),
  };
}

/**
 * Atomic reservation check: prevents duplicate selection or race conditions.
 * If ANY requested number is no longer 'available', the reservation is rejected
 * and returns the conflicting numbers.
 */
export function tryReserveNumbersAtomically(
  grid: GridNumber[],
  requestedNumbers: number[],
  customerName: string,
  customerWhatsapp: string
): {
  success: boolean;
  conflicts: string[];
  updatedGrid: GridNumber[];
} {
  const conflicts: string[] = [];
  for (const num of requestedNumbers) {
    const cell = grid.find((g) => g.number === num);
    if (!cell || cell.status !== 'available') {
      conflicts.push(formatGridNumber(num));
    }
  }

  if (conflicts.length > 0) {
    return {
      success: false,
      conflicts,
      updatedGrid: grid,
    };
  }

  const cleanPhone = normalizeWhatsapp(customerWhatsapp);
  const updatedGrid = grid.map((item) =>
    requestedNumbers.includes(item.number)
      ? {
          ...item,
          status: 'reserved' as NumberStatus,
          ownerName: customerName.trim(),
          ownerWhatsapp: cleanPhone,
          reservedUntil: '10 min',
        }
      : item
  );

  return {
    success: true,
    conflicts: [],
    updatedGrid,
  };
}

/**
 * Windowed Scratch Card Logic (1 Winner every 15 people = 4 Free Cartelas per Edition):
 * - Checks if the current sale number (1..75) matches one of the 4 secret random positions
 *   inside the blocks [1-15], [16-30], [31-45], [46-60].
 * - If it matches -> awards +1 Cartela / Número Extra Grátis (zero cash loss!).
 * - Otherwise -> awards a small Remarketing Discount (R$ 0,50 or R$ 1,00 off the next cartela)
 *   so the owner NEVER loses money and drives repeat sales!
 */
export function generateDeterministicScratchCard(
  pixTxId: string,
  freeBonusNumberFormatted?: string,
  saleOrderNumber?: number,
  secretPositions: [number, number, number, number] = [7, 22, 39, 53]
): ScratchPrizeResult {
  let hash = 0;
  for (let i = 0; i < pixTxId.length; i++) {
    hash = (hash * 31 + pixTxId.charCodeAt(i)) % 100000;
  }
  const signatureHash = `SIG-${Math.abs(hash).toString(16).toUpperCase().padStart(5, '0')}`;

  const validSecretPositions =
    Array.isArray(secretPositions) && secretPositions.length === 4
      ? secretPositions
      : [7, 22, 39, 53];

  // Determine if this sale hit one of the 4 secret positions (1 per block of 15 people)
  const hitSecretWindow =
    typeof saleOrderNumber === 'number'
      ? validSecretPositions.includes(saleOrderNumber)
      : Math.abs(hash) % 15 === 0;

  if (hitSecretWindow && freeBonusNumberFormatted) {
    return {
      pixTxId,
      signatureHash,
      tier: 'free_number',
      title: `PARABÉNS! GANHOU +1 CARTELA GRÁTIS (Nº ${freeBonusNumberFormatted})!`,
      subtitle: 'Sorte grande! Seu número extra já foi garantido gratuitamente nesta rodada!',
      valueBRL: 0,
      bonusNumberAssigned: freeBonusNumberFormatted,
      scratched: false,
    };
  }

  // Remarketing small discount (R$ 0,50 or R$ 1,00 on next cartela) -> 0 cash loss!
  const smallDiscount = Math.abs(hash) % 2 === 0 ? 0.5 : 1.0;
  return {
    pixTxId,
    signatureHash,
    tier: 'bonus_coins',
    title: `GANHOU R$ ${smallDiscount.toFixed(2).replace('.', ',')} DE DESCONTO NA PRÓXIMA CARTELA!`,
    subtitle: 'Use agora para escolher +1 número nesta rodada com desconto imediato no PIX.',
    valueBRL: smallDiscount,
    scratched: false,
  };
}

/**
 * Passwordless / Registration-free lookup by WhatsApp digits
 */
export function findParticipationsByWhatsapp(
  participations: ParticipationRecord[],
  whatsappInput: string
): ParticipationRecord[] {
  const clean = normalizeWhatsapp(whatsappInput);
  if (clean.length < 8) return [];
  return participations.filter(
    (p) => p.customerWhatsapp.endsWith(clean.slice(-8)) || p.customerWhatsapp === clean
  );
}

export interface FirstBallCandidateInspection {
  validNumber: boolean;
  ballNumber: number;
  formattedBall: string;
  status: NumberStatus;
  hasBuyer: boolean;
  buyerName: string | null;
  buyerWhatsapp: string | null;
  buyerWhatsappMasked: string | null;
  pixTxId: string | null;
  prizeAmountBRL: number;
}

/**
 * Real-time lookup when the Admin manually types the 1st ball number (01 to 75).
 * Instantly identifies who bought that number in the current edition.
 */
export function inspectFirstBallCandidate(
  grid: GridNumber[],
  ballInput: number,
  prizeAmountBRL: number
): FirstBallCandidateInspection {
  if (!Number.isInteger(ballInput) || ballInput < 1 || ballInput > 75) {
    return {
      validNumber: false,
      ballNumber: ballInput,
      formattedBall: '--',
      status: 'available',
      hasBuyer: false,
      buyerName: null,
      buyerWhatsapp: null,
      buyerWhatsappMasked: null,
      pixTxId: null,
      prizeAmountBRL,
    };
  }

  const formattedBall = formatGridNumber(ballInput);
  const cell = grid.find((item) => item.number === ballInput);
  const hasBuyer = Boolean(cell && (cell.status === 'sold' || cell.status === 'reserved') && cell.ownerName);

  return {
    validNumber: true,
    ballNumber: ballInput,
    formattedBall,
    status: cell?.status || 'available',
    hasBuyer,
    buyerName: cell?.ownerName || null,
    buyerWhatsapp: cell?.ownerWhatsapp || null,
    buyerWhatsappMasked: cell?.ownerWhatsapp ? maskPublicWhatsapp(cell.ownerWhatsapp) : null,
    pixTxId: cell?.pixTxId || null,
    prizeAmountBRL,
  };
}

export interface FirstBallDrawResult {
  firstBallNumber: number;
  formattedBall: string;
  ballsSequence: string[];
  hasBuyer: boolean;
  winnerName: string;
  winnerWhatsappRaw: string;
  winnerWhatsappMasked: string;
  winnerPixTxId: string;
  prizeAmountBRL: number;
  summaryMessage: string;
}

export function resolveFirstBallWinner(
  grid: GridNumber[],
  firstBallNumber: number,
  prizeAmountBRL: number
): FirstBallDrawResult {
  const formattedBall = formatGridNumber(firstBallNumber);
  const found = grid.find((item) => item.number === firstBallNumber);
  const hasBuyer = Boolean(found && found.ownerName);
  const winnerName = found?.ownerName || 'Número sem comprador (Acumulado / Repescagem)';
  const winnerWhatsappRaw = found?.ownerWhatsapp || '';
  const winnerWhatsappMasked = found?.ownerWhatsapp
    ? maskPublicWhatsapp(found.ownerWhatsapp)
    : 'Sem cadastro';
  const winnerPixTxId = found?.pixTxId || `APURACAO-BOLA-${formattedBall}`;

  // Generate 5 drawn balls sequence where the 1st ball is firstBallNumber
  const sequence: number[] = [firstBallNumber];
  for (const offset of [17, 31, 44, 58]) {
    const nextBall = ((firstBallNumber + offset - 1) % 75) + 1;
    if (!sequence.includes(nextBall)) sequence.push(nextBall);
  }

  return {
    firstBallNumber,
    formattedBall,
    ballsSequence: sequence.map(formatGridNumber),
    hasBuyer,
    winnerName,
    winnerWhatsappRaw,
    winnerWhatsappMasked,
    winnerPixTxId,
    prizeAmountBRL,
    summaryMessage: hasBuyer
      ? `1ª bola sorteada: Nº ${formattedBall}. ${winnerName} escolheu o número ${formattedBall} e ganhou R$ ${prizeAmountBRL.toFixed(2).replace('.', ',')} no PIX!`
      : `1ª bola sorteada: Nº ${formattedBall}. Este número estava livre na grade.`,
  };
}

export function pickRandomAvailableNumber(
  grid: GridNumber[],
  currentlySelected: number[]
): number | null {
  const candidates = grid.filter(
    (item) => item.status === 'available' && !currentlySelected.includes(item.number)
  );
  if (candidates.length === 0) return null;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index].number;
}

export function pickMultipleRandomNumbers(
  grid: GridNumber[],
  currentlySelected: number[],
  count: number
): number[] {
  const picked: number[] = [];
  const pool = grid
    .filter((item) => item.status === 'available' && !currentlySelected.includes(item.number))
    .map((item) => item.number);

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/**
 * Returns available neighbor numbers (n - 1 and n + 1) around the currently selected numbers.
 * Powers the "Cercar Vizinhos da Sorte" viral upsell to boost 1-number buyers into 3-number combos!
 */
export function getAvailableNeighbors(
  grid: GridNumber[],
  selectedNumbers: number[]
): number[] {
  if (selectedNumbers.length === 0) return [];
  const candidateSet = new Set<number>();
  for (const num of selectedNumbers) {
    if (num > 1) candidateSet.add(num - 1);
    if (num < 75) candidateSet.add(num + 1);
  }
  const availableSet = new Set(
    grid.filter((g) => g.status === 'available').map((g) => g.number)
  );
  return Array.from(candidateSet)
    .filter((n) => !selectedNumbers.includes(n) && availableSet.has(n))
    .sort((a, b) => a - b);
}

/**
 * Auto-expires unpaid 'reserved' numbers whose 10-minute lock has elapsed so abandoned checkouts never block the grid.
 */
export function releaseExpiredReservations(
  grid: GridNumber[],
  nowMs: number = Date.now()
): { updatedGrid: GridNumber[]; expiredNumbers: number[] } {
  const expiredNumbers: number[] = [];
  const updatedGrid = grid.map((item) => {
    if (item.status === 'reserved' && item.reservedUntil) {
      const expiresAt = Date.parse(item.reservedUntil);
      if (!Number.isNaN(expiresAt) && expiresAt <= nowMs) {
        expiredNumbers.push(item.number);
        return {
          ...item,
          status: 'available' as const,
          ownerName: undefined,
          ownerWhatsapp: undefined,
          ownerEmail: undefined,
          reservedUntil: undefined,
        };
      }
    }
    return item;
  });
  return { updatedGrid, expiredNumbers };
}

/**
 * Smart Combo Pricing: supports single unit sale (1 Nº) + promotional combos (3, 5, 10 Nºs),
 * closing the 75-number grid up to 4x faster while increasing average order value (AOV).
 */
export function calculateComboPricing(
  count: number,
  ticketPriceBRL: number
): {
  regularTotalBRL: number;
  comboDiscountBRL: number;
  comboTotalBRL: number;
  comboLabel: string | null;
} {
  const regularTotalBRL = count * ticketPriceBRL;
  if (count < 3) {
    return {
      regularTotalBRL,
      comboDiscountBRL: 0,
      comboTotalBRL: regularTotalBRL,
      comboLabel: null,
    };
  }

  // Exact banner combos for R$ 1.00 ticket (Prêmio R$ 50 no PIX - banner-pix-50.jpg):
  // 1 por R$ 1,00 | 3 por R$ 2,50 | 5 por R$ 4,50 (Economize R$ 0,50) | 10 por R$ 8,00 (Economize R$ 2,00)
  if (Math.abs(ticketPriceBRL - 1) < 0.01) {
    let remaining = count;
    let comboTotalBRL = 0;

    if (remaining >= 10) {
      const blocksOf10 = Math.floor(remaining / 10);
      comboTotalBRL += blocksOf10 * 8.0;
      remaining = remaining % 10;
    }
    if (remaining >= 5) {
      const blocksOf5 = Math.floor(remaining / 5);
      comboTotalBRL += blocksOf5 * 4.5;
      remaining = remaining % 5;
    }
    if (remaining >= 3) {
      comboTotalBRL += 2.5 + (remaining - 3) * 1.0;
      remaining = 0;
    }
    comboTotalBRL += remaining * 1.0;

    const label =
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 8,00) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 4,50) Ativo!'
        : 'Combo 3 Nºs (R$ 2,50) Ativo!';

    return {
      regularTotalBRL,
      comboDiscountBRL: Math.max(0, regularTotalBRL - comboTotalBRL),
      comboTotalBRL,
      comboLabel: label,
    };
  }

  // Exact banner combos for R$ 1.50 ticket (Prêmio R$ 75 no PIX - banner-pix-75.jpg):
  // 1 por R$ 1,50 | 3 por R$ 4,00 | 5 por R$ 7,00 (Economize R$ 0,50) | 10 por R$ 13,00 (Economize R$ 2,00)
  if (Math.abs(ticketPriceBRL - 1.5) < 0.01) {
    let remaining = count;
    let comboTotalBRL = 0;

    if (remaining >= 10) {
      const blocksOf10 = Math.floor(remaining / 10);
      comboTotalBRL += blocksOf10 * 13.0;
      remaining = remaining % 10;
    }
    if (remaining >= 5) {
      const blocksOf5 = Math.floor(remaining / 5);
      comboTotalBRL += blocksOf5 * 7.0;
      remaining = remaining % 5;
    }
    if (remaining >= 3) {
      comboTotalBRL += 4.0 + (remaining - 3) * 1.5;
      remaining = 0;
    }
    comboTotalBRL += remaining * 1.5;

    const label =
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 13,00) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 7,00) Ativo!'
        : 'Combo 3 Nºs (R$ 4,00) Ativo!';

    return {
      regularTotalBRL,
      comboDiscountBRL: Math.max(0, regularTotalBRL - comboTotalBRL),
      comboTotalBRL,
      comboLabel: label,
    };
  }

  // Exact round-number combos for the standard R$ 4.00 ticket:
  // 1 por R$ 4 | 3 por R$ 10 | 5 por R$ 15 | 10 por R$ 28
  if (Math.abs(ticketPriceBRL - 4) < 0.01) {
    let remaining = count;
    let comboTotalBRL = 0;

    if (remaining >= 10) {
      const blocksOf10 = Math.floor(remaining / 10);
      comboTotalBRL += blocksOf10 * 28;
      remaining = remaining % 10;
    }
    if (remaining >= 5) {
      const blocksOf5 = Math.floor(remaining / 5);
      comboTotalBRL += blocksOf5 * 15;
      remaining = remaining % 5;
    }
    if (remaining >= 3) {
      comboTotalBRL += 10 + (remaining - 3) * 4;
      remaining = 0;
    }
    comboTotalBRL += remaining * 4;

    const label =
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 28) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 15) Ativo!'
        : 'Combo 3 Nºs (R$ 10) Ativo!';

    return {
      regularTotalBRL,
      comboDiscountBRL: Math.max(0, regularTotalBRL - comboTotalBRL),
      comboTotalBRL,
      comboLabel: label,
    };
  }

  // Exact banner combos for R$ 10.00 ticket (Prêmio R$ 600 no PIX - banner-pix-600.jpg):
  // 1 por R$ 10,00 | 3 por R$ 27,00 | 5 por R$ 45,00 (Economize R$ 5,00) | 10 por R$ 85,00 (Economize R$ 15,00)
  if (Math.abs(ticketPriceBRL - 10) < 0.01) {
    let remaining = count;
    let comboTotalBRL = 0;

    if (remaining >= 10) {
      const blocksOf10 = Math.floor(remaining / 10);
      comboTotalBRL += blocksOf10 * 85.0;
      remaining = remaining % 10;
    }
    if (remaining >= 5) {
      const blocksOf5 = Math.floor(remaining / 5);
      comboTotalBRL += blocksOf5 * 45.0;
      remaining = remaining % 5;
    }
    if (remaining >= 3) {
      comboTotalBRL += 27.0 + (remaining - 3) * 10.0;
      remaining = 0;
    }
    comboTotalBRL += remaining * 10.0;

    const label =
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 85,00) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 45,00) Ativo!'
        : 'Combo 3 Nºs (R$ 27,00) Ativo!';

    return {
      regularTotalBRL,
      comboDiscountBRL: Math.max(0, regularTotalBRL - comboTotalBRL),
      comboTotalBRL,
      comboLabel: label,
    };
  }

  // Proportional combo discount for other ticket prices (15% off for 3+, 20% off for 5+, 25% off for 10+)
  const pctOff = count >= 10 ? 0.25 : count >= 5 ? 0.2 : 0.15;
  const comboDiscountBRL = Math.round(regularTotalBRL * pctOff * 2) / 2;
  const comboTotalBRL = Math.max(ticketPriceBRL, regularTotalBRL - comboDiscountBRL);
  return {
    regularTotalBRL,
    comboDiscountBRL,
    comboTotalBRL,
    comboLabel:
      count >= 10
        ? 'Super Combo 10+ Nºs Ativo!'
        : count >= 5
        ? 'Combo 5+ Nºs Ativo!'
        : 'Combo 3+ Nºs Ativo!',
  };
}

export interface CustomerLoyaltyProfile {
  name: string;
  whatsapp: string;
  email: string;
  coinsBalance: number;
  remarketingDiscountBRL: number;
}

/**
 * Generates a realistic 21x21 QR Code visual boolean matrix from the EMV payload string
 * with authentic QR finder patterns in the 3 corners so local/direct PIX looks like a real bank QR.
 */
export function generateVisualQrMatrix(payload: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft || r === 6 || c === 6) continue;
      const charCode = payload.charCodeAt((r * size + c) % Math.max(1, payload.length)) || 65;
      matrix[r][c] = ((charCode + r * 7 + c * 13 + Math.abs(hash)) % 3) !== 0;
    }
  }

  return matrix;
}

export interface CheckoutValidationResult {
  valid: boolean;
  errors: {
    name?: string;
    whatsapp?: string;
    numbers?: string;
  };
}

export function validateCheckoutInput(input: {
  name: string;
  whatsapp: string;
  selectedNumbers: number[];
}): CheckoutValidationResult {
  const errors: CheckoutValidationResult['errors'] = {};
  const trimmedName = input.name.trim();
  if (trimmedName.length < 2) {
    errors.name = 'Digite seu nome para identificar seu número.';
  }

  const digitsOnly = normalizeWhatsapp(input.whatsapp);
  if (digitsOnly.length < 10 || digitsOnly.length > 11) {
    errors.whatsapp = 'Digite seu WhatsApp com DDD (ex: 11 98765-4321).';
  }

  if (!input.selectedNumbers || input.selectedNumbers.length === 0) {
    errors.numbers = 'Toque em pelo menos 1 número verde na grade 01 a 75.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Official Central Bank of Brazil (BACEN) EMV BRCode CRC16-CCITT (0xFFFF, polynomial 0x1021)
 */
export function computeEmvCrc16(payloadWithoutCrcValue: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadWithoutCrcValue.length; i++) {
    crc ^= payloadWithoutCrcValue.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates an official Banco Central EMV BRCode (PIX Copia e Cola) with mathematical CRC16-CCITT checksum.
 * Works directly with any Brazilian PIX Key (InfinitePay, Nubank, Inter, Asaas, CPF, CNPJ, E-mail, Phone, EVP).
 */
export function generatePixCopyPasteCode(
  numbers: number[],
  amountBRL: number,
  editionId: string = 'ED01',
  pixKey: string = 'chancepremiada@pix.com.br',
  receiverName: string = 'CHANCE PREMIADA'
): string {
  const cleanKey = (pixKey || 'chancepremiada@pix.com.br').trim();
  const cleanName = (receiverName || 'CHANCE PREMIADA')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 25);

  const numStr = numbers.map(formatGridNumber).join('');
  const txId = `${editionId.replace(/[^A-Za-z0-9]/g, '')}N${numStr}`.slice(0, 25) || 'CHANCE01';
  const amtFixed = Math.max(0.01, amountBRL).toFixed(2);

  const gui = formatEmvField('00', 'br.gov.bcb.pix');
  const keyField = formatEmvField('01', cleanKey);
  const merchantAccountInfo = formatEmvField('26', `${gui}${keyField}`);
  const merchantCategoryCode = '52040000';
  const transactionCurrency = '5303986';
  const transactionAmount = formatEmvField('54', amtFixed);
  const countryCode = '5802BR';
  const merchantName = formatEmvField('59', cleanName);
  const merchantCity = formatEmvField('60', 'SAO PAULO');
  const additionalDataField = formatEmvField('62', formatEmvField('05', txId));

  const basePayload =
    '000201' +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantName +
    merchantCity +
    additionalDataField +
    '6304';

  const crc = computeEmvCrc16(basePayload);
  return `${basePayload}${crc}`;
}

export function formatCommunityResultAnnouncement(
  winner: WinnerRecord,
  nextPrizeBRL: number,
  ticketPriceBRL: number
): string {
  return (
    `🏆 *RESULTADO OFICIAL — ${winner.editionNumber.toUpperCase()}*\n\n` +
    `🎱 *1ª Bola Sorteada:* Nº ${winner.firstBallNumber}\n` +
    `👤 *Ganhador(a):* ${winner.winnerName} (${winner.winnerWhatsappMasked})\n` +
    `💰 *Prêmio Pago no PIX:* R$ ${winner.prizeAmountBRL.toFixed(2).replace('.', ',')}\n` +
    `🧾 *Comprovante:* ${winner.pixTxId}\n\n` +
    `🚀 *NOVA GRADE ABERTA (01 a 75)!*\n` +
    `Prêmio de R$ ${nextPrizeBRL.toFixed(2).replace('.00', '')} no PIX por apenas R$ ${ticketPriceBRL.toFixed(2).replace('.', ',')} cada número!\n` +
    `👉 Garanta seu número da sorte agora: https://chancepremiada.com.br`
  );
}

export interface FinancialProjection {
  activeUsers: number;
  avgTicketsPerUserMonth: number;
  ticketPriceBRL: number;
  totalTicketsMonth: number;
  editionsClosedPerMonth: number;
  grossRevenueBRL: number;
  dailyPrizesCostBRL: number;
  scratchBonusCostBRL: number;
  pixGatewayFeeBRL: number;
  totalCostsBRL: number;
  netOperatingResultBRL: number;
  netMarginPct: number;
}

export function calculateFinancialProjection(
  activeUsers: number,
  avgTicketsPerUserMonth: number = 6,
  ticketPriceBRL: number = 4.0
): FinancialProjection {
  const totalTicketsMonth = activeUsers * avgTicketsPerUserMonth;
  const editionsClosedPerMonth = Math.max(1, Math.floor(totalTicketsMonth / 75));
  const grossRevenueBRL = totalTicketsMonth * ticketPriceBRL;

  // Main 1st-ball prize (~66.6% of pool, e.g. R$ 200 out of R$ 300 pool)
  const prizePerEdition = Math.round(ticketPriceBRL * 75 * 0.666);
  const dailyPrizesCostBRL = editionsClosedPerMonth * prizePerEdition;

  // Controlled Raspadinha cash cost: only 2 PIX of R$ 5 per 75 tickets = R$ 10 per edition (3.3% of revenue)
  const scratchBonusCostBRL = editionsClosedPerMonth * 10;
  const pixGatewayFeeBRL = Math.round(grossRevenueBRL * 0.0099);

  const totalCostsBRL = dailyPrizesCostBRL + scratchBonusCostBRL + pixGatewayFeeBRL;
  const netOperatingResultBRL = grossRevenueBRL - totalCostsBRL;
  const netMarginPct =
    grossRevenueBRL > 0 ? Math.round((netOperatingResultBRL / grossRevenueBRL) * 100) : 0;

  return {
    activeUsers,
    avgTicketsPerUserMonth,
    ticketPriceBRL,
    totalTicketsMonth,
    editionsClosedPerMonth,
    grossRevenueBRL,
    dailyPrizesCostBRL,
    scratchBonusCostBRL,
    pixGatewayFeeBRL,
    totalCostsBRL,
    netOperatingResultBRL,
    netMarginPct,
  };
}
