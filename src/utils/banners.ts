import bannerPix50 from '../assets/banners/banner-pix-50.jpg';
import bannerPix75 from '../assets/banners/banner-pix-75.jpg';
import bannerPix75Zap from '../assets/banners/banner-pix75-zap.jpg';
import bannerPix200 from '../assets/banners/banner-pix-200.jpg';
import bannerPix600 from '../assets/banners/banner-pix-600.jpg';
import bannerPixInstagramGeral from '../assets/banners/banner-pix-instagram-vendas-geral.jpg';

// Official Demo / Showcase Partner Ad Banners from src/assets/anuncios
import bannerAnuncioHamburguer from '../assets/anuncios/banner-hamburguer.jpg';
import bannerAnuncioAcai from '../assets/anuncios/banner-açai.jpg';
import bannerAnuncioSalao from '../assets/anuncios/banner-salao.jpg';
import bannerAnuncioLojaEsportiva from '../assets/anuncios/banner-lojaesportiva.jpg';
import bannerCidadeMaracanau from '../assets/anuncios/cidade-maracanau.jpg';

export interface EditionBannerPreset {
  id: 'p50' | 'p75' | 'p200' | 'p600';
  label: string;
  prizeAmountBRL: number;
  ticketPriceBRL: number;
  totalPoolRevenueBRL: number;
  heroBannerUrl: string;
  zapShareBannerUrl: string;
  storiesVerticalBannerUrl: string;
  combo5PriceBRL: number;
  combo5SavingsBRL: number;
  combo10PriceBRL: number;
  combo10SavingsBRL: number;
  /**
   * The 4 widescreen 16:9 AI-generated banners contain a small typo at the top-center
   * ("uma chance real de branca sua vida!"). When true, the UI renders a seamless
   * emerald & gold badge over that exact spot reading "uma chance real de transformar sua vida!".
   */
  fixTopHeadlineOverlay: boolean;
  description: string;
}

export const EDITION_BANNER_PRESETS: EditionBannerPreset[] = [
  {
    id: 'p50',
    label: 'R$ 50 no PIX (Ponto R$ 1,00)',
    prizeAmountBRL: 50,
    ticketPriceBRL: 1.0,
    totalPoolRevenueBRL: 75.0,
    heroBannerUrl: bannerPix50,
    zapShareBannerUrl: bannerPix50,
    storiesVerticalBannerUrl: bannerPixInstagramGeral,
    combo5PriceBRL: 4.5,
    combo5SavingsBRL: 0.5,
    combo10PriceBRL: 8.0,
    combo10SavingsBRL: 2.0,
    fixTopHeadlineOverlay: true,
    description: 'Edição Popular R$ 1,00: fechou os 75 números, a 1ª bola leva R$ 50,00 no PIX.',
  },
  {
    id: 'p75',
    label: 'R$ 75 no PIX (Ponto R$ 1,50)',
    prizeAmountBRL: 75,
    ticketPriceBRL: 1.5,
    totalPoolRevenueBRL: 112.5,
    heroBannerUrl: bannerPix75,
    zapShareBannerUrl: bannerPix75Zap,
    storiesVerticalBannerUrl: bannerPixInstagramGeral,
    combo5PriceBRL: 7.0,
    combo5SavingsBRL: 0.5,
    combo10PriceBRL: 13.0,
    combo10SavingsBRL: 2.0,
    fixTopHeadlineOverlay: true,
    description: 'Edição Rápida R$ 1,50: fechou os 75 números, a 1ª bola leva R$ 75,00 no PIX.',
  },
  {
    id: 'p200',
    label: 'R$ 200 no PIX (Ponto R$ 4,00)',
    prizeAmountBRL: 200,
    ticketPriceBRL: 4.0,
    totalPoolRevenueBRL: 300.0,
    heroBannerUrl: bannerPix200,
    zapShareBannerUrl: bannerPix200,
    storiesVerticalBannerUrl: bannerPixInstagramGeral,
    combo5PriceBRL: 15.0,
    combo5SavingsBRL: 5.0,
    combo10PriceBRL: 28.0,
    combo10SavingsBRL: 12.0,
    fixTopHeadlineOverlay: true,
    description: 'Edição Principal R$ 4,00: fechou os 75 números, a 1ª bola leva R$ 200,00 no PIX.',
  },
  {
    id: 'p600',
    label: 'R$ 600 no PIX (Ponto R$ 10,00)',
    prizeAmountBRL: 600,
    ticketPriceBRL: 10.0,
    totalPoolRevenueBRL: 750.0,
    heroBannerUrl: bannerPix600,
    zapShareBannerUrl: bannerPix600,
    storiesVerticalBannerUrl: bannerPixInstagramGeral,
    combo5PriceBRL: 45.0,
    combo5SavingsBRL: 5.0,
    combo10PriceBRL: 85.0,
    combo10SavingsBRL: 15.0,
    fixTopHeadlineOverlay: true,
    description: 'Edição Especial R$ 10,00: fechou os 75 números, a 1ª bola leva R$ 600,00 no PIX.',
  },
];

export const ALL_OFFICIAL_BANNERS = {
  bannerPix50,
  bannerPix75,
  bannerPix75Zap,
  bannerPix200,
  bannerPix600,
  bannerPixInstagramGeral,
};

export interface ActiveBannerResolution {
  hasExactHorizontalBanner: boolean;
  heroBannerUrl: string;
  zapShareBannerUrl: string;
  storiesVerticalBannerUrl: string;
  fixTopHeadlineOverlay: boolean;
  matchedPreset?: EditionBannerPreset;
}

/**
 * Automatically selects the right official artwork based on the current prizeAmountBRL and ticketPriceBRL,
 * or uses customBannerUrl if configured in the Admin Panel.
 */
export function resolveActiveBannerInfo(
  prizeAmountBRL: number,
  ticketPriceBRL: number,
  customBannerUrl?: string
): ActiveBannerResolution {
  if (customBannerUrl && customBannerUrl.trim().length > 0) {
    return {
      hasExactHorizontalBanner: true,
      heroBannerUrl: customBannerUrl.trim(),
      zapShareBannerUrl: customBannerUrl.trim(),
      storiesVerticalBannerUrl: bannerPixInstagramGeral,
      fixTopHeadlineOverlay: false,
    };
  }

  // 1. Exact match by prize + ticket
  const exact = EDITION_BANNER_PRESETS.find(
    (p) =>
      Math.abs(p.prizeAmountBRL - prizeAmountBRL) < 0.01 &&
      Math.abs(p.ticketPriceBRL - ticketPriceBRL) < 0.01
  );
  if (exact) {
    return {
      hasExactHorizontalBanner: true,
      heroBannerUrl: exact.heroBannerUrl,
      zapShareBannerUrl: exact.zapShareBannerUrl,
      storiesVerticalBannerUrl: exact.storiesVerticalBannerUrl,
      fixTopHeadlineOverlay: exact.fixTopHeadlineOverlay,
      matchedPreset: exact,
    };
  }

  // 2. Match by prizeAmountBRL (50, 75, 200, 600, or 500 -> maps to 600/10.00 tier if ticket is 10)
  const byPrize = EDITION_BANNER_PRESETS.find(
    (p) => Math.abs(p.prizeAmountBRL - prizeAmountBRL) < 0.01
  );
  if (byPrize) {
    return {
      hasExactHorizontalBanner: true,
      heroBannerUrl: byPrize.heroBannerUrl,
      zapShareBannerUrl: byPrize.zapShareBannerUrl,
      storiesVerticalBannerUrl: byPrize.storiesVerticalBannerUrl,
      fixTopHeadlineOverlay: byPrize.fixTopHeadlineOverlay,
      matchedPreset: byPrize,
    };
  }

  // 3. Match by ticketPriceBRL (1.00 -> 50, 1.50 -> 75, 4.00 -> 200, 10.00 -> 600)
  const byTicket = EDITION_BANNER_PRESETS.find(
    (p) => Math.abs(p.ticketPriceBRL - ticketPriceBRL) < 0.01
  );
  if (byTicket) {
    return {
      hasExactHorizontalBanner: true,
      heroBannerUrl: byTicket.heroBannerUrl,
      zapShareBannerUrl: byTicket.zapShareBannerUrl,
      storiesVerticalBannerUrl: byTicket.storiesVerticalBannerUrl,
      fixTopHeadlineOverlay: byTicket.fixTopHeadlineOverlay,
      matchedPreset: byTicket,
    };
  }

  // 4. Fallback for custom values: use the general campaign artwork (De R$ 50 a R$ 600)
  return {
    hasExactHorizontalBanner: false,
    heroBannerUrl: bannerPixInstagramGeral,
    zapShareBannerUrl: bannerPix75Zap,
    storiesVerticalBannerUrl: bannerPixInstagramGeral,
    fixTopHeadlineOverlay: false,
  };
}

export const MARACANAU_CITY_BANNER_URL = bannerCidadeMaracanau;

export const PARTNER_AD_SHOWCASE_BANNERS = [
  {
    id: 'store-maracanau-1',
    category: 'food',
    title: 'Burger Top Hamburgueria',
    segment: '🍕 Lanches, Hambúrguer & Pizza',
    imageUrl: bannerAnuncioHamburguer,
  },
  {
    id: 'store-maracanau-2',
    category: 'drinks_acai',
    title: 'Açaí Show · Sorvetes & Snacks',
    segment: '🍨 Açaí, Sorvetes & Bebidas',
    imageUrl: bannerAnuncioAcai,
  },
  {
    id: 'store-maracanau-3',
    category: 'beauty_barber',
    title: 'Studio Bella · Beleza & Estética',
    segment: '💇‍♀️ Salão, Barbearia & Estética',
    imageUrl: bannerAnuncioSalao,
  },
  {
    id: 'store-maracanau-4',
    category: 'services_auto',
    title: 'Moda Prime Sports',
    segment: '👟 Moda, Esportes, Lojas & Serviços',
    imageUrl: bannerAnuncioLojaEsportiva,
  },
] as const;

export function resolvePartnerCouponBanner(coupon: {
  id: string;
  category: string;
  bannerImageUrl?: string;
}): string {
  if (coupon.bannerImageUrl && coupon.bannerImageUrl.trim().length > 0) {
    return coupon.bannerImageUrl.trim();
  }
  if (coupon.id === 'store-maracanau-1' || coupon.category === 'food') {
    return bannerAnuncioHamburguer;
  }
  if (coupon.id === 'store-maracanau-2' || coupon.category === 'drinks_acai') {
    return bannerAnuncioAcai;
  }
  if (coupon.id === 'store-maracanau-3' || coupon.category === 'beauty_barber') {
    return bannerAnuncioSalao;
  }
  return bannerAnuncioLojaEsportiva;
}

