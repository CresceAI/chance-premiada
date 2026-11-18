export interface ComboPricingResult {
  regularTotalBRL: number;
  comboDiscountBRL: number;
  comboTotalBRL: number;
  comboLabel: string | null;
}

interface ComboTierSpec {
  ticketPriceBRL: number;
  price3: number;
  price5: number;
  price10: number;
  formatLabel: (count: number) => string;
}

const COMBO_TIER_SPECS: ComboTierSpec[] = [
  {
    ticketPriceBRL: 1.0,
    price3: 2.5,
    price5: 4.5,
    price10: 8.0,
    formatLabel: (count) =>
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 8,00) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 4,50) Ativo!'
        : 'Combo 3 Nºs (R$ 2,50) Ativo!',
  },
  {
    ticketPriceBRL: 1.5,
    price3: 4.0,
    price5: 7.0,
    price10: 13.0,
    formatLabel: (count) =>
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 13,00) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 7,00) Ativo!'
        : 'Combo 3 Nºs (R$ 4,00) Ativo!',
  },
  {
    ticketPriceBRL: 4.0,
    price3: 10.0,
    price5: 15.0,
    price10: 28.0,
    formatLabel: (count) =>
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 28) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 15) Ativo!'
        : 'Combo 3 Nºs (R$ 10) Ativo!',
  },
  {
    ticketPriceBRL: 10.0,
    price3: 27.0,
    price5: 45.0,
    price10: 85.0,
    formatLabel: (count) =>
      count >= 10
        ? 'Super Combo 10 Nºs (R$ 85,00) Ativo!'
        : count >= 5
        ? 'Combo 5 Nºs (R$ 45,00) Ativo!'
        : 'Combo 3 Nºs (R$ 27,00) Ativo!',
  },
];

function computeTierComboTotal(count: number, spec: ComboTierSpec): number {
  let remaining = count;
  let total = 0;

  if (remaining >= 10) {
    total += Math.floor(remaining / 10) * spec.price10;
    remaining %= 10;
  }
  if (remaining >= 5) {
    total += Math.floor(remaining / 5) * spec.price5;
    remaining %= 5;
  }
  if (remaining >= 3) {
    total += spec.price3 + (remaining - 3) * spec.ticketPriceBRL;
    remaining = 0;
  }
  return total + remaining * spec.ticketPriceBRL;
}

/**
 * Smart Combo Pricing: supports single unit sale (1 Nº) + promotional combos (3, 5, 10 Nºs),
 * closing the 75-number grid up to 4x faster while increasing average order value (AOV).
 */
export function calculateComboPricing(
  count: number,
  ticketPriceBRL: number
): ComboPricingResult {
  const regularTotalBRL = count * ticketPriceBRL;
  if (count < 3) {
    return {
      regularTotalBRL,
      comboDiscountBRL: 0,
      comboTotalBRL: regularTotalBRL,
      comboLabel: null,
    };
  }

  const matchedSpec = COMBO_TIER_SPECS.find(
    (spec) => Math.abs(ticketPriceBRL - spec.ticketPriceBRL) < 0.01
  );

  if (matchedSpec) {
    const comboTotalBRL = computeTierComboTotal(count, matchedSpec);
    return {
      regularTotalBRL,
      comboDiscountBRL: Math.max(0, regularTotalBRL - comboTotalBRL),
      comboTotalBRL,
      comboLabel: matchedSpec.formatLabel(count),
    };
  }

  // Proportional combo discount for custom ticket prices (15% off for 3+, 20% off for 5+, 25% off for 10+)
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

/**
 * Single source of truth for checkout totals with anti-loss discount protection:
 * never stacks scratch-card coupons on top of promotional combos and caps unit discounts at 25%.
 */
export function calculateSafeFinalAmount(
  count: number,
  ticketPriceBRL: number,
  activeDiscountBRL: number
): {
  comboPricing: ComboPricingResult;
  subtotalBRL: number;
  appliedDiscountBRL: number;
  finalAmountBRL: number;
} {
  const comboPricing = calculateComboPricing(count, ticketPriceBRL);
  const subtotalBRL = comboPricing.comboTotalBRL;
  const safeActiveDiscount = Math.max(0, activeDiscountBRL || 0);
  const appliedDiscountBRL =
    comboPricing.comboDiscountBRL > 0
      ? 0
      : Math.min(safeActiveDiscount, subtotalBRL * 0.25);
  const finalAmountBRL = Math.max(0, Math.round((subtotalBRL - appliedDiscountBRL) * 100) / 100);
  return {
    comboPricing,
    subtotalBRL,
    appliedDiscountBRL,
    finalAmountBRL,
  };
}
