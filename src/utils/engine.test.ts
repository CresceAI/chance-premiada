import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createZeroedGrid,
  getGridStats,
  tryReserveNumbersAtomically,
  generateDeterministicScratchCard,
  generateSecretScratchWindows,
  getPublicParticipantsFeed,
  findParticipationsByWhatsapp,
  resolveFirstBallWinner,
  inspectFirstBallCandidate,
  validateCheckoutInput,
  calculateFinancialProjection,
  DAILY_PRIZE_OPTIONS,
  pickMultipleRandomNumbers,
  generateVisualQrMatrix,
  calculateComboPricing,
  detectTrafficSourceFromUrl,
  detectAffiliateFromUrl,
  calculateEditionAffiliateSettlements,
  DEFAULT_AFFILIATE_SELLERS,
  getAvailableNeighbors,
  releaseExpiredReservations,
  generatePixCopyPasteCode,
  DEFAULT_ADMIN_CONFIG,
  calculateSafeFinalAmount,
} from './engine.ts';
import { DAILY_THEME_PRESETS, resolveActiveTheme } from './themeTokens.ts';

test('zeroed grid starts with all 75 numbers available in green and 0 sold/reserved', () => {
  const grid = createZeroedGrid();
  assert.equal(grid.length, 75);
  const stats = getGridStats(grid);
  assert.equal(stats.available, 75);
  assert.equal(stats.reserved, 0);
  assert.equal(stats.sold, 0);
  assert.equal(stats.remainingToDraw, 75);
});

test('atomic reservation prevents two people from choosing the same number', () => {
  const grid = createZeroedGrid();

  // Maria reserves number 25 first
  const firstAttempt = tryReserveNumbersAtomically(grid, [25], 'Maria', '11988887777');
  assert.equal(firstAttempt.success, true);
  assert.equal(firstAttempt.conflicts.length, 0);

  // João tries to reserve [10, 25] on the updated grid -> must fail atomically because 25 is already taken
  const secondAttempt = tryReserveNumbersAtomically(
    firstAttempt.updatedGrid,
    [10, 25],
    'João',
    '11977776666'
  );
  assert.equal(secondAttempt.success, false);
  assert.deepEqual(secondAttempt.conflicts, ['25']);

  // Number 10 remains available because the conflicting transaction was rolled back
  const cell10 = secondAttempt.updatedGrid.find((c) => c.number === 10);
  assert.equal(cell10?.status, 'available');
});

test('manual 1st ball entry by Admin immediately identifies who bought that number', () => {
  const grid = createZeroedGrid().map((c) =>
    c.number === 25
      ? {
          ...c,
          status: 'sold' as const,
          ownerName: 'Maria Aparecida',
          ownerWhatsapp: '11988887777',
          pixTxId: 'PIX-25',
        }
      : c
  );

  // Admin types 25 -> immediately finds Maria Aparecida
  const check25 = inspectFirstBallCandidate(grid, 25, 200);
  assert.equal(check25.validNumber, true);
  assert.equal(check25.hasBuyer, true);
  assert.equal(check25.buyerName, 'Maria Aparecida');
  assert.equal(check25.buyerWhatsapp, '11988887777');

  // Admin types 14 (unpurchased) -> reports hasBuyer: false
  const check14 = inspectFirstBallCandidate(grid, 14, 200);
  assert.equal(check14.validNumber, true);
  assert.equal(check14.hasBuyer, false);

  const drawResult = resolveFirstBallWinner(grid, 25, 200);
  assert.equal(drawResult.firstBallNumber, 25);
  assert.equal(drawResult.formattedBall, '25');
  assert.equal(drawResult.winnerName, 'Maria Aparecida');
  assert.equal(drawResult.prizeAmountBRL, 200);
  assert.equal(drawResult.ballsSequence[0], '25');
});

test('4-block windowed scratch card generates 1 random winner per 15-person block and zero cash loss', () => {
  const secretWindows = generateSecretScratchWindows(123456);
  assert.equal(secretWindows.length, 4);
  assert.ok(secretWindows[0] >= 1 && secretWindows[0] <= 15);
  assert.ok(secretWindows[1] >= 16 && secretWindows[1] <= 30);
  assert.ok(secretWindows[2] >= 31 && secretWindows[2] <= 45);
  assert.ok(secretWindows[3] >= 46 && secretWindows[3] <= 60);

  // When saleOrderNumber hits a secret window -> wins +1 Free Cartela (R$ 0 cash cost)
  const winningScratch = generateDeterministicScratchCard('PIX-12345-CP', '42', secretWindows[0], secretWindows);
  assert.equal(winningScratch.tier, 'free_number');
  assert.equal(winningScratch.bonusNumberAssigned, '42');

  // When saleOrderNumber does not hit the window -> wins small discount (R$ 0,50 or R$ 1,00)
  const nonWinningOrder = secretWindows[0] === 1 ? 2 : 1;
  const discountScratch = generateDeterministicScratchCard('PIX-12345-CP', '42', nonWinningOrder, secretWindows);
  assert.equal(discountScratch.tier, 'bonus_coins');
  assert.ok(discountScratch.valueBRL === 0.5 || discountScratch.valueBRL === 1.0);
});

test('public participant feed masks names and WhatsApp and never exposes chosen numbers', () => {
  const grid = createZeroedGrid();
  const scratch = generateDeterministicScratchCard('PIX-777', '15', 2, [7, 22, 39, 53]);
  const feed = getPublicParticipantsFeed(grid, [
    {
      id: 'p1',
      editionNumber: 'Edição #01',
      prizeTitle: 'R$ 200 no PIX',
      prizeAmountBRL: 200,
      customerName: 'Maria Aparecida Ferreira',
      customerWhatsapp: '11987654321',
      customerWhatsappFormatted: '(11) 98765-4321',
      customerEmail: 'maria@secreto.com',
      numbers: ['25', '40'],
      amountPaid: 8,
      coinsEarned: 50,
      date: 'Hoje',
      status: 'Aguardando Fechar 75 Nºs',
      result: 'Aguardando',
      pixTxId: 'PIX-777',
      scratchCard: scratch,
    },
  ]);

  assert.equal(feed.length, 1);
  assert.equal(feed[0].maskedName, 'Maria A.');
  assert.equal(feed[0].maskedWhatsapp, '(11) 9****-4321');
  assert.equal(feed[0].cartelasCount, 2);
  // Ensure neither chosen numbers nor email nor raw phone appear in serialized feed item
  const serialized = JSON.stringify(feed[0]);
  assert.equal(serialized.includes('11987654321'), false);
  assert.equal(serialized.includes('maria@secreto.com'), false);
});

test('passwordless lookup finds user participations using only WhatsApp number', () => {
  const scratch = generateDeterministicScratchCard('PIX-999', '15');
  const records = [
    {
      id: '1',
      editionNumber: 'Edição #01',
      prizeTitle: 'R$ 200 no PIX',
      prizeAmountBRL: 200,
      customerName: 'Maria',
      customerWhatsapp: '11987654321',
      customerWhatsappFormatted: '(11) 98765-4321',
      numbers: ['25'],
      amountPaid: 4,
      coinsEarned: 25,
      date: 'Hoje',
      status: 'Aguardando Fechar 75 Nºs' as const,
      result: 'Aguardando 1ª Bola',
      pixTxId: 'PIX-999',
      scratchCard: scratch,
    },
  ];

  const found = findParticipationsByWhatsapp(records, '(11) 98765-4321');
  assert.equal(found.length, 1);
  assert.equal(found[0].customerName, 'Maria');

  const notFound = findParticipationsByWhatsapp(records, '(21) 91111-2222');
  assert.equal(notFound.length, 0);
});

test('daily prize options strictly cover R$ 75, R$ 200, and R$ 500 realistic PIX tiers', () => {
  const amounts = DAILY_PRIZE_OPTIONS.map((o) => o.prizeAmountBRL);
  assert.deepEqual(amounts, [75, 200, 500]);
});

test('financial projection including Raspadinha bonus remains profitable across all user tiers', () => {
  for (const tier of [100, 500, 1000, 5000]) {
    const proj = calculateFinancialProjection(tier);
    assert.ok(proj.netOperatingResultBRL > 0);
    assert.ok(proj.netMarginPct >= 25);
  }
});

test('combo quick-pick selects distinct available numbers and visual QR matrix renders 21x21', () => {
  const grid = createZeroedGrid();
  const combo = pickMultipleRandomNumbers(grid, [5, 10], 5);
  assert.equal(combo.length, 5);
  assert.equal(new Set(combo).size, 5);
  assert.equal(combo.includes(5), false);
  assert.equal(combo.includes(10), false);

  const matrix = generateVisualQrMatrix('00020126580014br.gov.bcb.pix');
  assert.equal(matrix.length, 21);
  assert.equal(matrix[0].length, 21);

  const unit1 = calculateComboPricing(1, 4);
  assert.equal(unit1.comboTotalBRL, 4);
  assert.equal(unit1.comboDiscountBRL, 0);

  const combo3 = calculateComboPricing(3, 4);
  assert.equal(combo3.comboTotalBRL, 10);
  assert.equal(combo3.comboDiscountBRL, 2);

  const combo5 = calculateComboPricing(5, 4);
  assert.equal(combo5.comboTotalBRL, 15);
  assert.equal(combo5.comboDiscountBRL, 5);

  const combo10 = calculateComboPricing(10, 4);
  assert.equal(combo10.comboTotalBRL, 28);
  assert.equal(combo10.comboDiscountBRL, 12);

  // Verify exact banner combo pricing for R$ 1.00 (R$ 50 PIX), R$ 1.50 (R$ 75 PIX), and R$ 10.00 (R$ 600 PIX)
  assert.equal(calculateComboPricing(5, 1).comboTotalBRL, 4.5);
  assert.equal(calculateComboPricing(10, 1).comboTotalBRL, 8.0);
  assert.equal(calculateComboPricing(5, 1.5).comboTotalBRL, 7.0);
  assert.equal(calculateComboPricing(10, 1.5).comboTotalBRL, 13.0);
  assert.equal(calculateComboPricing(5, 10).comboTotalBRL, 45.0);
  assert.equal(calculateComboPricing(10, 10).comboTotalBRL, 85.0);
});

test('traffic source detector, neighbor upsell finder, and 10-min reservation auto-expiry work deterministically', () => {
  assert.equal(detectTrafficSourceFromUrl('?src=status_zap', ''), 'status_zap');
  assert.equal(detectTrafficSourceFromUrl('?src=instagram', ''), 'instagram');
  assert.equal(detectTrafficSourceFromUrl('', 'https://t.me/chancepremiada'), 'telegram');
  assert.equal(detectTrafficSourceFromUrl('', ''), 'direto');

  const grid = createZeroedGrid();
  const neighbors = getAvailableNeighbors(grid, [25]);
  assert.deepEqual(neighbors, [24, 26]);

  const pastIso = new Date(Date.now() - 60_000).toISOString();
  const futureIso = new Date(Date.now() + 300_000).toISOString();
  const gridWithLocks = grid.map((c) => {
    if (c.number === 10) return { ...c, status: 'reserved' as const, reservedUntil: pastIso };
    if (c.number === 11) return { ...c, status: 'reserved' as const, reservedUntil: futureIso };
    return c;
  });

  const { updatedGrid, expiredNumbers } = releaseExpiredReservations(gridWithLocks);
  assert.deepEqual(expiredNumbers, [10]);
  assert.equal(updatedGrid.find((c) => c.number === 10)?.status, 'available');
  assert.equal(updatedGrid.find((c) => c.number === 11)?.status, 'reserved');
});

test('affiliate URL tracker and automatic commission + hot-foot bonus receipt generator work accurately', () => {
  assert.equal(detectAffiliateFromUrl('?ind=lucas'), 'lucas');
  assert.equal(detectAffiliateFromUrl('?vendedor=Camila_01'), 'camila_01');
  assert.equal(detectAffiliateFromUrl(''), null);

  const scratch = generateDeterministicScratchCard('PIX-AFF-1', '12');
  const grid = createZeroedGrid().map((c) =>
    c.number === 25 || c.number === 26
      ? {
          ...c,
          status: 'sold' as const,
          ownerName: 'Cliente do Lucas',
          ownerWhatsapp: '85988887777',
          affiliateCode: 'lucas',
          affiliateName: 'Lucas Divulgador (Maracanaú)',
        }
      : c
  );

  const participations = [
    {
      id: 'p-aff-1',
      editionNumber: 'Edição #01',
      prizeTitle: 'R$ 200 no PIX',
      prizeAmountBRL: 200,
      customerName: 'Cliente do Lucas',
      customerWhatsapp: '85988887777',
      customerWhatsappFormatted: '(85) 98888-7777',
      numbers: ['25', '26'],
      amountPaid: 8,
      coinsEarned: 50,
      date: 'Hoje',
      status: 'Sorteio Realizado' as const,
      result: 'Ganhou',
      pixTxId: 'PIX-AFF-1',
      scratchCard: scratch,
      affiliateCode: 'lucas',
      affiliateName: 'Lucas Divulgador (Maracanaú)',
    },
  ];

  // Suppose 1st ball drawn is '25' (sold by Lucas -> earns 20% of R$ 8 = R$ 1.60 + R$ 10 Hot Foot Bonus = R$ 11.60!)
  const settlements = calculateEditionAffiliateSettlements(
    grid,
    participations,
    DEFAULT_AFFILIATE_SELLERS,
    1,
    '25',
    4
  );

  const lucasSettlement = settlements.find((s) => s.affiliateCode === 'lucas');
  assert.ok(lucasSettlement);
  assert.equal(lucasSettlement.salesCount, 2);
  assert.equal(lucasSettlement.grossRevenueBRL, 8);
  assert.equal(lucasSettlement.commissionBRL, 1.6);
  assert.equal(lucasSettlement.wonHotFootBonus, true);
  assert.equal(lucasSettlement.hotFootBonusBRL, 10);
  assert.equal(lucasSettlement.totalPayoutBRL, 11.6);
  assert.ok(lucasSettlement.whatsappReceiptText.includes('COMPROVANTE DE COMISSÃO'));
  assert.ok(lucasSettlement.whatsappReceiptText.includes('R$ 11,60'));
});

test('checkout validation rejects invalid inputs and generates valid EMV PIX copy-paste payload', () => {
  const bad = validateCheckoutInput({ name: 'A', whatsapp: '123', selectedNumbers: [] });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.whatsapp);
  assert.ok(bad.errors.numbers);

  const ok = validateCheckoutInput({
    name: 'Maria Silva',
    whatsapp: '(85) 98765-4321',
    selectedNumbers: [7, 25],
  });
  assert.equal(ok.valid, true);

  const pix = generatePixCopyPasteCode([7, 25], 8, 'ED24', 'chancepremiada@pix.com.br', 'CHANCE PREMIADA');
  assert.ok(pix.startsWith('000201'));
  assert.ok(pix.toLowerCase().includes('br.gov.bcb.pix'));
  assert.ok(pix.includes('8.00'));
});

test('daily theme rotation resolves deterministically across days and honors fixed presets', () => {
  assert.equal(DAILY_THEME_PRESETS.length, 4);

  const day1 = resolveActiveTheme('auto_daily', new Date('2026-11-18T12:00:00Z'));
  const day2 = resolveActiveTheme('auto_daily', new Date('2026-11-19T12:00:00Z'));
  assert.notEqual(day1.id, day2.id);

  const fixed = resolveActiveTheme('gold_obsidian', new Date('2026-11-18T12:00:00Z'));
  assert.equal(fixed.id, 'gold_obsidian');
  assert.equal(fixed.accent, '#D9B85D');
  assert.equal(DEFAULT_ADMIN_CONFIG.whatsappSupportNumber, '5585985252317');
});

test('anti-loss discount guard caps unit discount at 25% and blocks stacking on combos', () => {
  const unitSafe = calculateSafeFinalAmount(1, 4.0, 2.0);
  assert.equal(unitSafe.appliedDiscountBRL, 1.0); // 25% cap of R$ 4.00
  assert.equal(unitSafe.finalAmountBRL, 3.0);

  const comboSafe = calculateSafeFinalAmount(5, 4.0, 2.0);
  assert.equal(comboSafe.comboPricing.comboTotalBRL, 15.0);
  assert.equal(comboSafe.appliedDiscountBRL, 0); // never stacks on combo
  assert.equal(comboSafe.finalAmountBRL, 15.0);
});
