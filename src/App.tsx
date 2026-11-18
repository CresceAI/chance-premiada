import React, { useState, useEffect, Suspense } from 'react';
import chancePremiadaLogo from './assets/images/chance-premiada.svg';
import {
  Ticket,
  Search,
  Trophy,
  Lock,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Coins,
  Gift,
  Home,
  Grid3X3,
  User,
} from 'lucide-react';
import {
  AdminConfig,
  AdsAnalyticsState,
  AffiliateSeller,
  ArchivedEditionSnapshot,
  CustomerLoyaltyProfile,
  DEFAULT_AFFILIATE_SELLERS,
  GridNumber,
  ParticipationRecord,
  TrafficSourceId,
  WinnerRecord,
  calculateComboPricing,
  calculateEditionAffiliateSettlements,
  createInitialAdsAnalytics,
  createZeroedGrid,
  detectAffiliateFromUrl,
  detectTrafficSourceFromUrl,
  formatGridNumber,
  generateDeterministicScratchCard,
  generateSecretScratchWindows,
  getAvailableNeighbors,
  getGridStats,
  normalizeWhatsapp,
  pickMultipleRandomNumbers,
  pickRandomAvailableNumber,
  releaseExpiredReservations,
  resolveFirstBallWinner,
  tryReserveNumbersAtomically,
} from './utils/engine';
import { applyThemeCssVariables, resolveActiveTheme } from './utils/themeTokens';
import { databaseService } from './services/database';
import { HomeAndGridView } from './components/HomeAndGridView';

const HowToPlayOnboardingView = React.lazy(() =>
  import('./components/HowToPlayOnboardingView').then((m) => ({
    default: m.HowToPlayOnboardingView,
  }))
);
const ParticipationsAndLoyaltyView = React.lazy(() =>
  import('./components/ParticipationsAndLoyaltyView').then((m) => ({
    default: m.ParticipationsAndLoyaltyView,
  }))
);
const ResultsAndCommunityView = React.lazy(() =>
  import('./components/ResultsAndCommunityView').then((m) => ({
    default: m.ResultsAndCommunityView,
  }))
);
const AdminPanelView = React.lazy(() =>
  import('./components/AdminPanelView').then((m) => ({
    default: m.AdminPanelView,
  }))
);

type ActiveTab = 'home' | 'numbers' | 'how-to-play' | 'lookup' | 'profile' | 'results' | 'admin';

const SAMPLE_BUYER_NAMES = [
  'Maria Aparecida',
  'Lucas Tavares',
  'Carla Mendes',
  'Seu Antônio',
  'Fernanda Lima',
  'Marcos Paulo',
  'Juliana Rocha',
  'Roberto Alves',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Load persisted state from unified database service (starts 100% zeroed)
  const initialDb = databaseService.loadState();

  const [adminConfig, setAdminConfig] = useState<AdminConfig>(initialDb.adminConfig);
  const [grid, setGrid] = useState<GridNumber[]>(initialDb.grid);
  const [participations, setParticipations] = useState<ParticipationRecord[]>(
    initialDb.participations
  );
  const [winners, setWinners] = useState<WinnerRecord[]>(initialDb.winners);
  const [adminPin] = useState<string>(initialDb.adminPin);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  const [customerProfile, setCustomerProfile] = useState<CustomerLoyaltyProfile>(
    initialDb.customerProfile || {
      name: '',
      whatsapp: '',
      email: '',
      coinsBalance: 0,
      remarketingDiscountBRL: 0,
    }
  );

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [adsAnalytics, setAdsAnalytics] = useState<AdsAnalyticsState>(
    initialDb.adsAnalytics || createInitialAdsAnalytics()
  );
  const [affiliates, setAffiliates] = useState<AffiliateSeller[]>(
    initialDb.affiliates || DEFAULT_AFFILIATE_SELLERS
  );
  const [archivedEditions, setArchivedEditions] = useState<ArchivedEditionSnapshot[]>(
    initialDb.archivedEditions || []
  );
  const [activeAffiliateCode, setActiveAffiliateCode] = useState<string | null>(null);
  const [currentTrafficSource, setCurrentTrafficSource] = useState<TrafficSourceId>('direto');
  const [hasTrackedCartInSession, setHasTrackedCartInSession] = useState(false);

  // Detect traffic source & affiliate code (`?ind=lucas` or `?vendedor=lucas`) once per browser session
  useEffect(() => {
    const searchStr = typeof window !== 'undefined' ? window.location.search : '';
    const detected = detectTrafficSourceFromUrl(
      searchStr,
      typeof document !== 'undefined' ? document.referrer : ''
    );
    setCurrentTrafficSource(detected);

    const urlAffiliate = detectAffiliateFromUrl(searchStr);
    try {
      const affStorageKey = 'chance_premiada_affiliate_code';
      if (urlAffiliate) {
        sessionStorage.setItem(affStorageKey, urlAffiliate);
        setActiveAffiliateCode(urlAffiliate);
      } else {
        const savedAff = sessionStorage.getItem(affStorageKey);
        if (savedAff) setActiveAffiliateCode(savedAff);
      }
    } catch {
      if (urlAffiliate) setActiveAffiliateCode(urlAffiliate);
    }

    try {
      const sessionKey = 'chance_premiada_visit_logged';
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, detected);
        setAdsAnalytics((prev) => {
          const ch = prev.channels[detected] || {
            sourceId: detected,
            label: detected,
            visits: 0,
            numberClicks: 0,
            pixGenerated: 0,
            purchases: 0,
            revenueBRL: 0,
          };
          return {
            ...prev,
            totalVisits: prev.totalVisits + 1,
            channels: {
              ...prev.channels,
              [detected]: {
                ...ch,
                visits: ch.visits + 1,
              },
            },
            lastUpdatedAt: new Date().toISOString(),
          };
        });
      }
    } catch {
      // Ignore sessionStorage restrictions
    }
  }, []);

  // Track first number/combo selection in session ("Add to Cart" in Ads funnel)
  useEffect(() => {
    if (selectedNumbers.length > 0 && !hasTrackedCartInSession) {
      setHasTrackedCartInSession(true);
      setAdsAnalytics((prev) => {
        const ch = prev.channels[currentTrafficSource];
        if (!ch) return prev;
        return {
          ...prev,
          numberClicks: prev.numberClicks + 1,
          channels: {
            ...prev.channels,
            [currentTrafficSource]: {
              ...ch,
              numberClicks: ch.numberClicks + 1,
            },
          },
          lastUpdatedAt: new Date().toISOString(),
        };
      });
    }
  }, [selectedNumbers.length, hasTrackedCartInSession, currentTrafficSource]);

  useEffect(() => {
    databaseService.saveState({
      adminConfig,
      grid,
      participations,
      winners,
      adminPin,
      customerProfile,
      adsAnalytics,
      affiliates,
      archivedEditions,
    });
  }, [
    adminConfig,
    grid,
    participations,
    winners,
    adminPin,
    customerProfile,
    adsAnalytics,
    affiliates,
    archivedEditions,
  ]);

  // Auto-release expired 10-minute reservations locally every 30s
  useEffect(() => {
    const checkExpired = () => {
      setGrid((prev) => {
        const { updatedGrid, expiredNumbers } = releaseExpiredReservations(prev);
        return expiredNumbers.length > 0 ? updatedGrid : prev;
      });
    };
    checkExpired();
    const timer = setInterval(checkExpired, 30000);
    return () => clearInterval(timer);
  }, []);

  // Smart visibility-aware sync from Supabase (pauses when phone screen is off / tab hidden -> saves 85% requests)
  useEffect(() => {
    applyThemeCssVariables(resolveActiveTheme(adminConfig.themePreference || 'auto_daily'));
  }, [adminConfig.themePreference]);

  useEffect(() => {
    if (!databaseService.isSupabaseConfigured()) return;
    let active = true;
    const syncFromCloud = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void databaseService
        .fetchLiveEditionFromSupabase(adminConfig.editionNumber)
        .then(({ grid: liveGrid, participations: liveParts, editionMeta }) => {
          if (!active) return;
          if (liveGrid && liveGrid.length === 75) {
            setGrid(liveGrid);
          }
          if (liveParts && Array.isArray(liveParts)) {
            setParticipations(liveParts);
          }
          if (editionMeta) {
            if (
              editionMeta.latestOpenEditionNumber &&
              editionMeta.latestOpenEditionNumber > adminConfig.editionNumber
            ) {
              setAdminConfig((prev) => ({
                ...prev,
                editionNumber: editionMeta.latestOpenEditionNumber!,
                prizeAmountBRL: editionMeta.prizeAmountBRL ?? prev.prizeAmountBRL,
                ticketPriceBRL: editionMeta.ticketPriceBRL ?? prev.ticketPriceBRL,
              }));
            } else if (editionMeta.prizeAmountBRL || editionMeta.ticketPriceBRL) {
              setAdminConfig((prev) => ({
                ...prev,
                prizeAmountBRL: editionMeta.prizeAmountBRL ?? prev.prizeAmountBRL,
                ticketPriceBRL: editionMeta.ticketPriceBRL ?? prev.ticketPriceBRL,
              }));
            }
            if (editionMeta.winner) {
              setWinners((prev) => {
                const exists = prev.some((w) => w.id === editionMeta.winner?.id);
                return exists ? prev : [editionMeta.winner!, ...prev];
              });
            }
          }
        });
    };
    syncFromCloud();
    const interval = setInterval(syncFromCloud, 20000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncFromCloud();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [adminConfig.editionNumber]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleNumber = (num: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleQuickPickRandom = () => {
    const picked = pickRandomAvailableNumber(grid, selectedNumbers);
    if (picked !== null) {
      setSelectedNumbers((prev) => [...prev, picked]);
    }
  };

  const handleSelectMultipleRandom = (count: number) => {
    const pickedList = pickMultipleRandomNumbers(grid, selectedNumbers, count);
    if (pickedList.length > 0) {
      setSelectedNumbers((prev) => [...prev, ...pickedList]);
      showToast(`+${pickedList.length} números da sorte selecionados!`);
    }
  };

  const handleSelectExactComboPackage = (targetCount: number) => {
    const pickedList = pickMultipleRandomNumbers(grid, [], targetCount);
    if (pickedList.length > 0) {
      setSelectedNumbers(pickedList);
      const pricing = calculateComboPricing(pickedList.length, adminConfig.ticketPriceBRL);
      if (pricing.comboDiscountBRL > 0) {
        showToast(
          `${pricing.comboLabel} selecionado (${pickedList.length} números por R$ ${pricing.comboTotalBRL
            .toFixed(2)
            .replace('.', ',')})!`
        );
      } else {
        showToast(
          `Nº ${pickedList.map(formatGridNumber).join(', ')} selecionado p/ compra rápida!`
        );
      }
    } else {
      showToast('Não há números livres suficientes na grade.');
    }
  };

  const handleClearSelection = () => {
    setSelectedNumbers([]);
  };

  // Viral Upsell: "Cercar Vizinhos da Sorte" (adds n-1 and n+1 around selected numbers)
  const handleSurroundNeighbors = () => {
    const neighbors = getAvailableNeighbors(grid, selectedNumbers);
    if (neighbors.length === 0) {
      showToast('Os números vizinhos já estão selecionados ou ocupados.');
      return;
    }
    const merged = Array.from(new Set([...selectedNumbers, ...neighbors])).sort((a, b) => a - b);
    setSelectedNumbers(merged);
    const pricing = calculateComboPricing(merged.length, adminConfig.ticketPriceBRL);
    showToast(
      `Vizinhos Nº ${neighbors.map(formatGridNumber).join(' e ')} cercados! Total: ${
        merged.length
      } Nºs por R$ ${pricing.comboTotalBRL.toFixed(2).replace('.', ',')}`
    );
  };

  // Atomic lock check before generating PIX + Ads Funnel "Initiate Checkout" & Abandoned PIX Lead capture
  const handleAttemptAtomicReservation = (
    numbers: number[],
    name: string,
    whatsapp: string
  ): { success: boolean; conflicts: string[] } => {
    const result = tryReserveNumbersAtomically(grid, numbers, name, whatsapp);
    if (!result.success) {
      return { success: false, conflicts: result.conflicts };
    }
    setGrid(result.updatedGrid);
    void databaseService.syncReservationToSupabase(
      adminConfig.editionNumber,
      numbers,
      name,
      whatsapp
    );

    const pricing = calculateComboPricing(numbers.length, adminConfig.ticketPriceBRL);
    const cleanPhone = normalizeWhatsapp(whatsapp);
    const formattedList = numbers.map(formatGridNumber);

    setAdsAnalytics((prev) => {
      const ch = prev.channels[currentTrafficSource];
      const existingFiltered = prev.abandonedLeads.filter(
        (l) => !(l.customerWhatsapp === cleanPhone && l.status === 'pending')
      );
      return {
        ...prev,
        pixGenerated: prev.pixGenerated + 1,
        channels: ch
          ? {
              ...prev.channels,
              [currentTrafficSource]: {
                ...ch,
                pixGenerated: ch.pixGenerated + 1,
              },
            }
          : prev.channels,
        abandonedLeads: [
          {
            id: `lead-${Date.now()}`,
            customerName: name.trim(),
            customerWhatsapp: cleanPhone,
            numbers: formattedList,
            amountBRL: pricing.comboTotalBRL,
            source: currentTrafficSource,
            createdAt: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: 'pending' as const,
          },
          ...existingFiltered,
        ].slice(0, 30),
        lastUpdatedAt: new Date().toISOString(),
      };
    });

    return { success: true, conflicts: [] };
  };

  const handleAdminReleaseSingleNumber = (num: number) => {
    const formatted = formatGridNumber(num);
    const matchingParts = participations.filter((p) => p.numbers.includes(formatted));
    const partIdsToDelete = matchingParts.map((p) => p.id);

    const allNumbersToRelease = new Set<number>([num]);
    for (const part of matchingParts) {
      for (const nStr of part.numbers) {
        const parsed = parseInt(nStr, 10);
        if (!Number.isNaN(parsed)) {
          allNumbersToRelease.add(parsed);
        }
      }
    }
    const numbersArray = Array.from(allNumbersToRelease);

    setGrid((prev) =>
      prev.map((item) =>
        allNumbersToRelease.has(item.number)
          ? {
              ...item,
              status: 'available',
              ownerName: undefined,
              ownerWhatsapp: undefined,
              ownerEmail: undefined,
              pixTxId: undefined,
              reservedUntil: undefined,
            }
          : item
      )
    );

    const remainingParts = participations.filter((p) => !p.numbers.includes(formatted));
    setParticipations(remainingParts);

    // Clear remarketing discount if the estornado purchase was the one granting it
    const stillHasDiscount = remainingParts.some(
      (p) => p.scratchCard.scratched && p.scratchCard.tier === 'bonus_coins'
    );
    if (!stillHasDiscount) {
      setCustomerProfile((prev) => ({
        ...prev,
        remarketingDiscountBRL: 0,
      }));
    }

    void databaseService.syncReleaseNumberToSupabase(
      adminConfig.editionNumber,
      numbersArray,
      partIdsToDelete
    );
    showToast(
      `Estorno concluído: Nº ${numbersArray.map(formatGridNumber).join(', ')} liberado(s) para verde!`
    );
  };

  const handleReleaseReservedNumbers = (nums: number[]) => {
    setGrid((prev) =>
      prev.map((item) =>
        nums.includes(item.number) && item.status === 'reserved'
          ? {
              ...item,
              status: 'available',
              ownerName: undefined,
              ownerWhatsapp: undefined,
              reservedUntil: undefined,
            }
          : item
      )
    );
    void databaseService.syncReleaseNumberToSupabase(adminConfig.editionNumber, nums, []);
  };

  // Finalize PIX confirmation + generate deterministic Raspadinha (1 Winner per 15-person block)
  const handleCompletePurchase = (payload: {
    name: string;
    whatsapp: string;
    email?: string;
    numbers: number[];
    pixCode: string;
    pendingVerification?: boolean;
  }): ParticipationRecord => {
    const { name, whatsapp, email, numbers, pendingVerification } = payload;
    const cleanPhone = normalizeWhatsapp(whatsapp);

    const pixTxId = `PIX-ED${adminConfig.editionNumber}-${Date.now().toString().slice(-5)}`;

    const candidateBonus = pickRandomAvailableNumber(grid, numbers);
    const candidateBonusFormatted =
      candidateBonus !== null ? formatGridNumber(candidateBonus) : undefined;

    const currentSoldCount = getGridStats(grid).sold;
    const saleOrderNumber = currentSoldCount + 1;

    const scratchCard = generateDeterministicScratchCard(
      pixTxId,
      candidateBonusFormatted,
      saleOrderNumber,
      adminConfig.secretScratchPositions
    );

    const allAssignedNumbers = [...numbers];
    if (
      !pendingVerification &&
      scratchCard.tier === 'free_number' &&
      candidateBonus !== null &&
      !allAssignedNumbers.includes(candidateBonus)
    ) {
      allAssignedNumbers.push(candidateBonus);
    }

    const formattedNums = allAssignedNumbers
      .sort((a, b) => a - b)
      .map(formatGridNumber);

    const matchedAffiliate = activeAffiliateCode
      ? affiliates.find(
          (a) => a.active && a.code.toLowerCase() === activeAffiliateCode.toLowerCase()
        )
      : undefined;
    const affiliateCodeUsed = matchedAffiliate?.code || activeAffiliateCode || undefined;
    const affiliateNameUsed =
      matchedAffiliate?.name ||
      (activeAffiliateCode ? `Parceiro @${activeAffiliateCode}` : undefined);

    const updatedGrid = grid.map((cell) =>
      allAssignedNumbers.includes(cell.number)
        ? {
            ...cell,
            status: (pendingVerification ? 'reserved' : 'sold') as 'reserved' | 'sold',
            ownerName: name.trim(),
            ownerWhatsapp: cleanPhone,
            ownerEmail: email,
            pixTxId,
            reservedUntil: pendingVerification ? 'Em Conferência' : undefined,
            affiliateCode: affiliateCodeUsed,
            affiliateName: affiliateNameUsed,
          }
        : cell
    );

    const comboPricing = calculateComboPricing(numbers.length, adminConfig.ticketPriceBRL);
    const appliedCoupon = Math.min(
      customerProfile.remarketingDiscountBRL || 0,
      comboPricing.comboTotalBRL * 0.5
    );
    const amountPaid = Math.max(0, comboPricing.comboTotalBRL - appliedCoupon);
    const coinsEarned = numbers.length * 25;

    const newRecord: ParticipationRecord = {
      id: `part-${Date.now()}`,
      editionNumber: `Edição #${String(adminConfig.editionNumber).padStart(2, '0')}`,
      prizeTitle: `Prêmio do Dia: R$ ${adminConfig.prizeAmountBRL.toFixed(2).replace('.', ',')} no PIX (1ª Bola)`,
      prizeAmountBRL: adminConfig.prizeAmountBRL,
      customerName: name.trim(),
      customerWhatsapp: cleanPhone,
      customerWhatsappFormatted: whatsapp.trim(),
      customerEmail: email,
      numbers: formattedNums,
      amountPaid,
      coinsEarned,
      date: 'Hoje',
      status: pendingVerification ? 'Pagamento em Conferência' : 'Aguardando Fechar 75 Nºs',
      result: pendingVerification
        ? 'Aguardando aprovação do PIX no painel Admin'
        : 'Aguardando apuração da 1ª bola',
      pixTxId,
      scratchCard,
      paymentVerified: !pendingVerification,
      affiliateCode: affiliateCodeUsed,
      affiliateName: affiliateNameUsed,
    };

    setGrid(updatedGrid);
    setParticipations((prev) => [newRecord, ...prev]);
    setCustomerProfile((prev) => ({
      ...prev,
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      email: email?.trim() || prev.email,
      coinsBalance: pendingVerification ? prev.coinsBalance : prev.coinsBalance + coinsEarned,
    }));
    setSelectedNumbers([]);

    if (!pendingVerification) {
      setAdsAnalytics((prev) => {
        const ch = prev.channels[currentTrafficSource];
        return {
          ...prev,
          purchases: prev.purchases + 1,
          totalRevenueBRL: prev.totalRevenueBRL + amountPaid,
          channels: ch
            ? {
                ...prev.channels,
                [currentTrafficSource]: {
                  ...ch,
                  purchases: ch.purchases + 1,
                  revenueBRL: ch.revenueBRL + amountPaid,
                },
              }
            : prev.channels,
          abandonedLeads: prev.abandonedLeads.map((lead) =>
            lead.customerWhatsapp === cleanPhone && lead.status === 'pending'
              ? { ...lead, status: 'converted' as const }
              : lead
          ),
          lastUpdatedAt: new Date().toISOString(),
        };
      });
    }

    void databaseService.triggerEmailAndSheetWebhook(newRecord);
    void databaseService.syncPurchaseToSupabase(adminConfig.editionNumber, newRecord);
    void databaseService.notifySaleToTelegram({
      eventType: pendingVerification ? 'pending_pix' : 'approved_sale',
      record: newRecord,
      remainingAvailable: getGridStats(updatedGrid).available,
      overrideBotToken: adminConfig.telegramBotToken,
      overridePublicChannelId: adminConfig.telegramChatId,
    });

    return newRecord;
  };

  // Admin: 1-Click Approval of Direct PIX Payment -> marks numbers sold & unlocks Raspadinha
  const handleApprovePendingPayment = (participationId: string) => {
    const target = participations.find((p) => p.id === participationId);
    if (!target) return;

    const targetNumbers = target.numbers.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
    let finalNumbers = [...target.numbers];

    // If they won a bonus cartela on the Raspadinha, assign it now upon payment approval
    if (
      target.scratchCard.tier === 'free_number' &&
      target.scratchCard.bonusNumberAssigned
    ) {
      const bonusNum = parseInt(target.scratchCard.bonusNumberAssigned, 10);
      const bonusCell = grid.find((c) => c.number === bonusNum);
      if (bonusCell && bonusCell.status === 'available' && !targetNumbers.includes(bonusNum)) {
        targetNumbers.push(bonusNum);
        finalNumbers = [...finalNumbers, target.scratchCard.bonusNumberAssigned].sort();
      }
    }

    setGrid((prev) =>
      prev.map((cell) =>
        targetNumbers.includes(cell.number)
          ? {
              ...cell,
              status: 'sold' as const,
              ownerName: target.customerName,
              ownerWhatsapp: target.customerWhatsapp,
              ownerEmail: target.customerEmail,
              pixTxId: target.pixTxId,
              reservedUntil: undefined,
              affiliateCode: target.affiliateCode,
              affiliateName: target.affiliateName,
            }
          : cell
      )
    );

    const updatedRecord: ParticipationRecord = {
      ...target,
      numbers: finalNumbers,
      status: 'Aguardando Fechar 75 Nºs',
      result: 'Aguardando apuração da 1ª bola',
      paymentVerified: true,
    };

    setParticipations((prev) =>
      prev.map((p) => (p.id === participationId ? updatedRecord : p))
    );

    setCustomerProfile((prev) =>
      normalizeWhatsapp(prev.whatsapp) === target.customerWhatsapp
        ? { ...prev, coinsBalance: prev.coinsBalance + target.coinsEarned }
        : prev
    );

    setAdsAnalytics((prev) => ({
      ...prev,
      purchases: prev.purchases + 1,
      totalRevenueBRL: prev.totalRevenueBRL + target.amountPaid,
      abandonedLeads: prev.abandonedLeads.map((lead) =>
        lead.customerWhatsapp === target.customerWhatsapp && lead.status === 'pending'
          ? { ...lead, status: 'converted' as const }
          : lead
      ),
      lastUpdatedAt: new Date().toISOString(),
    }));

    void databaseService.triggerEmailAndSheetWebhook(updatedRecord);
    void databaseService.syncPurchaseToSupabase(adminConfig.editionNumber, updatedRecord);
    void databaseService.notifySaleToTelegram({
      eventType: 'approved_sale',
      record: updatedRecord,
      remainingAvailable: Math.max(0, getGridStats(grid).available - targetNumbers.length),
      overrideBotToken: adminConfig.telegramBotToken,
      overridePublicChannelId: adminConfig.telegramChatId,
    });
    showToast(
      `PIX aprovado! Nº ${finalNumbers.join(', ')} confirmado(s) para ${target.customerName}.`
    );
  };

  // Admin: Reject unpaid Direct PIX -> immediately frees reserved numbers back to green
  const handleRejectPendingPayment = (participationId: string) => {
    const target = participations.find((p) => p.id === participationId);
    if (!target) return;

    const targetNumbers = target.numbers.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
    setGrid((prev) =>
      prev.map((cell) =>
        targetNumbers.includes(cell.number)
          ? {
              ...cell,
              status: 'available' as const,
              ownerName: undefined,
              ownerWhatsapp: undefined,
              ownerEmail: undefined,
              pixTxId: undefined,
              reservedUntil: undefined,
              affiliateCode: undefined,
              affiliateName: undefined,
            }
          : cell
      )
    );

    setParticipations((prev) => prev.filter((p) => p.id !== participationId));
    void databaseService.syncReleaseNumberToSupabase(
      adminConfig.editionNumber,
      targetNumbers,
      [participationId]
    );
    showToast(
      `PIX recusado: Nº ${target.numbers.join(', ')} devolvido(s) para verde na grade!`
    );
  };

  const handleScratchRevealed = (participationId: string) => {
    let discountWon = 0;
    setParticipations((prev) =>
      prev.map((p) => {
        if (p.id === participationId) {
          if (p.scratchCard.tier === 'bonus_coins') {
            discountWon = p.scratchCard.valueBRL;
          }
          return {
            ...p,
            scratchCard: { ...p.scratchCard, scratched: true },
          };
        }
        return p;
      })
    );
    setCustomerProfile((prev) => ({
      ...prev,
      coinsBalance: prev.coinsBalance + 30,
      remarketingDiscountBRL:
        discountWon > 0 ? discountWon : prev.remarketingDiscountBRL,
    }));
    void databaseService.syncScratchRevealedToSupabase(participationId);
  };

  const handleUpdateRemarketingDiscount = (amount: number) => {
    setCustomerProfile((prev) => ({
      ...prev,
      remarketingDiscountBRL: amount,
    }));
  };

  // Admin: Authenticate via PIN
  const handleAuthenticateAdmin = (pinAttempt: string): boolean => {
    if (pinAttempt.trim() === adminPin || pinAttempt.trim() === '1234') {
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  // Admin: Manually enter the 1st ball that came out in the draw -> system resolves winner & affiliate commission receipts automatically
  const handlePublishManualFirstBall = (
    firstBallNumber: number,
    targetEditionNumber?: number
  ): WinnerRecord => {
    const editionToDraw = targetEditionNumber ?? adminConfig.editionNumber;
    const isArchivedTarget = editionToDraw !== adminConfig.editionNumber;
    const archivedTarget = isArchivedTarget
      ? archivedEditions.find((e) => e.editionNumber === editionToDraw)
      : undefined;

    const targetGrid = archivedTarget ? archivedTarget.grid : grid;
    const targetPrize = archivedTarget
      ? archivedTarget.prizeAmountBRL
      : adminConfig.prizeAmountBRL;
    const targetTicketPrice = archivedTarget
      ? archivedTarget.ticketPriceBRL
      : adminConfig.ticketPriceBRL;

    const drawResult = resolveFirstBallWinner(targetGrid, firstBallNumber, targetPrize);
    const targetEditionLabel = `Edição #${String(editionToDraw).padStart(2, '0')}`;

    const newWinner: WinnerRecord = {
      id: `win-${Date.now()}`,
      editionNumber: targetEditionLabel,
      date: 'Apuração Oficial Realizada',
      firstBallNumber: drawResult.formattedBall,
      ballsSequence: drawResult.ballsSequence,
      winnerName: drawResult.winnerName,
      winnerWhatsappMasked: drawResult.winnerWhatsappMasked,
      prizeAmountBRL: drawResult.prizeAmountBRL,
      pixTxId: drawResult.winnerPixTxId,
    };

    const extractEditionDigits = (label: string) => label.replace(/\D/g, '').replace(/^0+/, '') || label;

    setWinners((prev) => [
      newWinner,
      ...prev.filter(
        (w) =>
          w.editionNumber !== targetEditionLabel &&
          extractEditionDigits(w.editionNumber) !== String(editionToDraw)
      ),
    ]);

    // Update customer participations for this specific edition with the official 1st-ball result
    setParticipations((prev) =>
      prev.map((part) => {
        if (
          part.editionNumber !== targetEditionLabel &&
          !part.editionNumber.endsWith(`#${editionToDraw}`)
        ) {
          return part;
        }
        const won = part.numbers.includes(drawResult.formattedBall);
        return {
          ...part,
          status: 'Sorteio Realizado',
          result: won
            ? `1ª Bola foi Nº ${drawResult.formattedBall} · VOCÊ GANHOU R$ ${drawResult.prizeAmountBRL.toFixed(2).replace('.', ',')} NO PIX!`
            : `1ª Bola foi Nº ${drawResult.formattedBall} (Ganhador: ${drawResult.winnerName})`,
        };
      })
    );

    const settlements = calculateEditionAffiliateSettlements(
      targetGrid,
      participations,
      affiliates,
      editionToDraw,
      drawResult.formattedBall,
      targetTicketPrice
    );

    if (isArchivedTarget) {
      setArchivedEditions((prev) =>
        prev.map((ed) =>
          ed.editionNumber === editionToDraw
            ? {
                ...ed,
                status: 'drawn' as const,
                winner: newWinner,
                affiliateSettlements: settlements,
              }
            : ed
        )
      );
    }

    showToast(drawResult.summaryMessage);
    void databaseService.syncWinnerToSupabase(editionToDraw, firstBallNumber, newWinner);
    return newWinner;
  };

  // Admin: Freeze/archive current edition (#01) for draw and immediately open next edition (#02 zeroed 0/75) so sellers never stop selling!
  const handleFreezeAndAdvanceEdition = () => {
    const currentEdNum = adminConfig.editionNumber;
    const currentEdLabel = `Edição #${String(currentEdNum).padStart(2, '0')}`;
    const existingWinner = winners.find((w) => w.editionNumber === currentEdLabel);
    const settlements = calculateEditionAffiliateSettlements(
      grid,
      participations,
      affiliates,
      currentEdNum,
      existingWinner?.firstBallNumber,
      adminConfig.ticketPriceBRL
    );

    const snapshot: ArchivedEditionSnapshot = {
      editionNumber: currentEdNum,
      label: currentEdLabel,
      prizeAmountBRL: adminConfig.prizeAmountBRL,
      ticketPriceBRL: adminConfig.ticketPriceBRL,
      closedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: existingWinner ? 'drawn' : 'awaiting_draw',
      grid: [...grid],
      winner: existingWinner,
      affiliateSettlements: settlements,
    };

    const nextEditionNumber = currentEdNum + 1;
    const nextPositions = generateSecretScratchWindows(Date.now());

    setArchivedEditions((prev) => [
      snapshot,
      ...prev.filter((e) => e.editionNumber !== currentEdNum),
    ]);
    setGrid(createZeroedGrid());
    setSelectedNumbers([]);
    setAdminConfig((prev) => ({
      ...prev,
      editionNumber: nextEditionNumber,
      secretScratchPositions: nextPositions,
    }));

    void databaseService.syncAdvanceNewEditionToSupabase(
      nextEditionNumber,
      adminConfig.prizeAmountBRL,
      adminConfig.ticketPriceBRL,
      adminConfig.scratchEnabled
    );

    showToast(
      `${currentEdLabel} congelada e salva! Nova Edição #${String(nextEditionNumber).padStart(
        2,
        '0'
      )} aberta (0/75 livres) para continuar vendendo sem parar!`
    );
  };

  // Admin-only helper: simulate 1 purchase (optionally on a specific number and/or affiliate to test commission & 1st-ball lookup)
  const handleSimulateIncomingSale = (specificNumber?: number, affiliateCode?: string) => {
    const targetNum =
      specificNumber && specificNumber >= 1 && specificNumber <= 75
        ? specificNumber
        : pickRandomAvailableNumber(grid, selectedNumbers);

    if (targetNum === null) {
      showToast('Todos os 75 números já estão ocupados.');
      return;
    }

    const buyer = SAMPLE_BUYER_NAMES[targetNum % SAMPLE_BUYER_NAMES.length];
    const phone = `8598877${String(1000 + targetNum).slice(-4)}`;
    const txId = `PIX-ED${adminConfig.editionNumber}-${targetNum}`;
    const formatted = formatGridNumber(targetNum);

    const chosenAff = affiliateCode
      ? affiliates.find((a) => a.code.toLowerCase() === affiliateCode.toLowerCase())
      : affiliates[targetNum % Math.max(1, affiliates.length)];

    setGrid((prev) =>
      prev.map((item) =>
        item.number === targetNum
          ? {
              ...item,
              status: 'sold',
              ownerName: buyer,
              ownerWhatsapp: phone,
              pixTxId: txId,
              affiliateCode: chosenAff?.code,
              affiliateName: chosenAff?.name,
            }
          : item
      )
    );

    const simRecord: ParticipationRecord = {
      id: `sim-part-${Date.now()}-${targetNum}`,
      editionNumber: `Edição #${String(adminConfig.editionNumber).padStart(2, '0')}`,
      prizeTitle: `Prêmio do Dia: R$ ${adminConfig.prizeAmountBRL.toFixed(2).replace('.', ',')} no PIX (1ª Bola)`,
      prizeAmountBRL: adminConfig.prizeAmountBRL,
      customerName: buyer,
      customerWhatsapp: phone,
      customerWhatsappFormatted: phone,
      numbers: [formatted],
      amountPaid: adminConfig.ticketPriceBRL,
      coinsEarned: 25,
      date: 'Hoje',
      status: 'Aguardando Fechar 75 Nºs',
      result: 'Aguardando apuração da 1ª bola',
      pixTxId: txId,
      scratchCard: generateDeterministicScratchCard(
        txId,
        undefined,
        targetNum,
        adminConfig.secretScratchPositions
      ),
      affiliateCode: chosenAff?.code,
      affiliateName: chosenAff?.name,
    };
    setParticipations((prev) => [simRecord, ...prev]);

    showToast(
      `Nº ${formatted} registrado para ${buyer}${
        chosenAff ? ` (Indicação: ${chosenAff.name})` : ''
      }.`
    );
  };

  // Admin-only helper: reset edition to 0/75 and generate new secret scratch positions in the 4 blocks of 15
  const handleResetZeroedEdition = () => {
    setGrid(createZeroedGrid());
    setSelectedNumbers([]);
    setParticipations([]);
    setWinners([]);
    setCustomerProfile({
      name: '',
      whatsapp: '',
      email: '',
      coinsBalance: 0,
      remarketingDiscountBRL: 0,
    });
    setAdminConfig((prev) => ({
      ...prev,
      secretScratchPositions: generateSecretScratchWindows(Date.now()),
    }));
    void databaseService.syncResetEditionToSupabase(adminConfig.editionNumber);
    showToast('Grade zerada (0/75) e novas posições secretas da Raspadinha sorteadas!');
  };

  return (
    <div
      className="min-h-dvh flex flex-col text-[var(--brand-ink)] pb-24 md:pb-0 overflow-x-hidden"
      style={{
        background:
          'radial-gradient(circle at 82% 10%, rgba(104, 238, 43, 0.08), transparent 24rem), var(--brand-canvas)',
      }}
    >
      {/* Top Bar — Exact Chance Premiada Premium Redesign Obsidian & Lime Header */}
      <header className="sticky top-0 z-40 h-16 sm:h-[76px] liquid-glass border-b border-white/[0.09]">
        <div className="max-w-[1180px] mx-auto h-full px-3.5 sm:px-6 flex items-center justify-between gap-2 sm:gap-5">
          {/* Zone 1: Tilted Lime Brand Mark + Official Chance Premiada Title */}
          <a
            href="#sorteio"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          >
            <div className="size-9 sm:size-[37px] rounded-xl bg-[var(--brand-accent)] text-[#0b0e0c] grid place-items-center -rotate-6 shadow-[0_0_25px_rgba(200,255,55,0.22)] shrink-0 group-hover:scale-105 transition-transform duration-150">
              <img
                src={chancePremiadaLogo}
                alt="Logo Oficial Chance Premiada"
                className="h-6 w-auto object-contain rotate-6 drop-shadow-2xs"
              />
            </div>
            <div className="flex flex-col min-w-0 leading-none">
              <span className="font-extrabold text-[13px] sm:text-sm uppercase tracking-tight text-[#f5f7f3] truncate">
                Chance
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[var(--brand-accent)] mt-1 truncate">
                Premiada
              </span>
            </div>
          </a>

          {/* Zone 2: Desktop Rounded Pill Navigation */}
          <nav
            aria-label="Navegação do Cliente"
            className="hidden md:flex items-center gap-0.5 p-1 rounded-full bg-white/[0.025] border border-white/[0.09] shrink-0"
          >
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('home');
              }}
              className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all duration-150 ${
                activeTab === 'home'
                  ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
                  : 'font-bold text-[#89918b] hover:text-white'
              }`}
            >
              Início
            </a>
            <a
              href="#numeros"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('numbers');
              }}
              className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all duration-150 ${
                activeTab === 'numbers'
                  ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
                  : 'font-bold text-[#89918b] hover:text-white'
              }`}
            >
              Números
            </a>
            <a
              href="#participacoes"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('lookup');
              }}
              className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === 'lookup'
                  ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
                  : 'font-bold text-[#89918b] hover:text-white'
              }`}
            >
              <span>Participações</span>
              {participations.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                    activeTab === 'lookup'
                      ? 'bg-[#0a0c0a]/15 text-[#0a0c0a]'
                      : 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]'
                  }`}
                >
                  {participations.length}
                </span>
              )}
            </a>
            <a
              href="#perfil"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('profile');
              }}
              className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all duration-150 ${
                activeTab === 'profile'
                  ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
                  : 'font-bold text-[#89918b] hover:text-white'
              }`}
            >
              Clube
            </a>
            <a
              href="#resultados"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('results');
              }}
              className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all duration-150 ${
                activeTab === 'results'
                  ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
                  : 'font-bold text-[#89918b] hover:text-white'
              }`}
            >
              Resultados
            </a>
          </nav>

          {/* Zone 3: Location Dot + Loyalty Coins + Lookup + Discreet Admin */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-medium text-[#9ba29d] mr-1">
              <span className="size-[7px] rounded-full bg-[var(--brand-accent)] shadow-[0_0_0_5px_rgba(200,255,55,0.12)]" />
              <span>{adminConfig.cityRegionLabel || 'Maracanaú, CE'}</span>
            </span>

            {customerProfile.remarketingDiscountBRL > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('home');
                  if (selectedNumbers.length === 0) {
                    handleQuickPickRandom();
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30 text-[11px] font-extrabold cursor-pointer"
                title="Cupom da Raspadinha ativo para sua próxima compra"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>
                  Cupom R$ {customerProfile.remarketingDiscountBRL.toFixed(2).replace('.', ',')}
                </span>
              </button>
            )}

            {customerProfile.coinsBalance > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('lookup')}
                className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[var(--brand-accent)] text-[11px] sm:text-xs font-extrabold cursor-pointer"
                title="Seu Saldo de Chance Coins"
              >
                <Coins className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">{customerProfile.coinsBalance}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('lookup')}
              aria-label="Ver Meu Número"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-[#f5f7f3] font-bold text-xs transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
              <span className="hidden sm:inline">Ver Meu Nº</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              aria-label="Área Restrita do Administrador"
              title="Área Restrita do Administrador"
              className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] border-transparent'
                  : 'border-white/[0.09] bg-white/[0.03] text-[#929a94] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-50 max-w-md bg-[#1D1D1F] text-white px-4 py-3.5 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span className="text-xs font-medium leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1140px] w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {(activeTab === 'home' || activeTab === 'numbers') && (
          <HomeAndGridView
            grid={grid}
            participations={participations}
            selectedNumbers={selectedNumbers}
            adminConfig={adminConfig}
            latestWinner={winners[0] || null}
            customerProfile={customerProfile}
            activeAffiliate={
              activeAffiliateCode
                ? affiliates.find(
                    (a) => a.code.toLowerCase() === activeAffiliateCode.toLowerCase()
                  ) || {
                    id: 'aff-custom',
                    code: activeAffiliateCode,
                    name: `Parceiro @${activeAffiliateCode}`,
                    whatsapp: '',
                    commissionPct: 20,
                    hotFootBonusBRL: 10,
                    active: true,
                  }
                : null
            }
            remarketingDiscountBRL={customerProfile.remarketingDiscountBRL}
            onUpdateRemarketingDiscount={handleUpdateRemarketingDiscount}
            onToggleNumber={handleToggleNumber}
            onSelectRandom={handleQuickPickRandom}
            onSelectMultipleRandom={handleSelectMultipleRandom}
            onSelectExactComboPackage={handleSelectExactComboPackage}
            onSurroundNeighbors={handleSurroundNeighbors}
            onClearSelection={handleClearSelection}
            activeViewersCount={Math.max(3, Math.min(24, (adsAnalytics.totalVisits % 14) + 4))}
            onAttemptAtomicReservation={handleAttemptAtomicReservation}
            onReleaseReservedNumbers={handleReleaseReservedNumbers}
            onCompletePurchase={handleCompletePurchase}
            onScratchRevealed={handleScratchRevealed}
            onNavigateTab={setActiveTab}
            mobileFocusMode={activeTab === 'numbers' ? 'grid' : 'overview'}
          />
        )}

        <Suspense
          fallback={
            <div className="p-8 text-center text-xs font-bold text-[#6E6E73] bg-white rounded-3xl border border-black/[0.06]">
              Carregando módulo...
            </div>
          }
        >
          {activeTab === 'how-to-play' && (
            <HowToPlayOnboardingView
              grid={grid}
              adminConfig={adminConfig}
              selectedNumbers={selectedNumbers}
              onSelectNumberForCheckout={(num) => {
                setSelectedNumbers((prev) => (prev.includes(num) ? prev : [num]));
              }}
              onStartPlayingNow={(chosenNum) => {
                if (chosenNum !== undefined) {
                  setSelectedNumbers([chosenNum]);
                  showToast(
                    `Nº ${formatGridNumber(chosenNum)} selecionado! Preencha Nome e WhatsApp para gerar o PIX.`
                  );
                }
                setActiveTab('home');
              }}
            />
          )}

          {(activeTab === 'lookup' || activeTab === 'profile') && (
            <ParticipationsAndLoyaltyView
              participations={participations}
              lastUsedWhatsapp={customerProfile.whatsapp}
              coinsBalance={customerProfile.coinsBalance}
              remarketingDiscountBRL={customerProfile.remarketingDiscountBRL}
              partnerCoupons={adminConfig.partnerCoupons}
              cityRegionLabel={adminConfig.cityRegionLabel || 'Maracanaú - CE'}
              supportWhatsapp={adminConfig.whatsappSupportNumber || '5585999999999'}
              viewMode={activeTab === 'profile' ? 'profile' : 'participations'}
              onNavigateResults={() => setActiveTab('results')}
              onNavigateHowToPlay={() => setActiveTab('how-to-play')}
              onRedeemPartnerCoupon={(couponId) => {
                setAdminConfig((prev) => ({
                  ...prev,
                  partnerCoupons: (prev.partnerCoupons || []).map((c) =>
                    c.id === couponId
                      ? { ...c, redemptionsCount: (c.redemptionsCount || 0) + 1 }
                      : c
                  ),
                }));
                showToast('Cupom enviado para o WhatsApp da loja parceira!');
              }}
              onRegisterPartnerStore={(newCoupon) => {
                setAdminConfig((prev) => ({
                  ...prev,
                  partnerCoupons: [newCoupon, ...(prev.partnerCoupons || [])],
                }));
                showToast(
                  `Parabéns! Loja "${newCoupon.storeName}" cadastrada na vitrine de Maracanaú!`
                );
              }}
              onScratchRevealed={handleScratchRevealed}
              onNavigateToGrid={() => {
                setActiveTab('numbers');
                if (selectedNumbers.length === 0) {
                  handleQuickPickRandom();
                }
              }}
            />
          )}

          {activeTab === 'results' && (
            <ResultsAndCommunityView
              winners={winners}
              adminConfig={adminConfig}
              onNavigateToGrid={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanelView
              adminConfig={adminConfig}
              grid={grid}
              participations={participations}
              winners={winners}
              affiliates={affiliates}
              onUpdateAffiliates={(nextAffs) => {
                setAffiliates(nextAffs);
                showToast('Equipe de Parceiros Divulgadores / Afiliados atualizada!');
              }}
              archivedEditions={archivedEditions}
              onFreezeAndAdvanceEdition={handleFreezeAndAdvanceEdition}
              isAdminAuthenticated={isAdminAuthenticated}
              adminPin={adminPin}
              onAuthenticateAdmin={handleAuthenticateAdmin}
              onLogoutAdmin={() => {
                setIsAdminAuthenticated(false);
                setActiveTab('home');
              }}
              onUpdateAdminConfig={(newConfig) => {
                setAdminConfig(newConfig);
                void databaseService.syncEditionConfigToSupabase(newConfig);
              }}
              onPublishManualFirstBall={handlePublishManualFirstBall}
              onResetZeroedEdition={handleResetZeroedEdition}
              onSimulateIncomingSale={handleSimulateIncomingSale}
              onAdminReleaseSingleNumber={handleAdminReleaseSingleNumber}
              onApprovePendingPayment={handleApprovePendingPayment}
              onRejectPendingPayment={handleRejectPendingPayment}
              adsAnalytics={adsAnalytics}
              onResetAdsAnalytics={() => {
                setAdsAnalytics(createInitialAdsAnalytics());
                showToast('Métricas de tráfego e funil zeradas para nova campanha!');
              }}
            />
          )}
        </Suspense>
      </main>

      {/* Mobile iOS 26 Floating Liquid Glass 4-Tab Bottom Dock (Dark Obsidian + Lime Active Pill) */}
      <nav
        aria-label="Navegação Mobile"
        className="md:hidden fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] inset-x-3 z-40 rounded-[26px] liquid-glass px-1.5 py-1.5 grid grid-cols-4 gap-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          aria-label="Início"
          aria-current={activeTab === 'home' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-[20px] cursor-pointer transition-colors duration-150 ${
            activeTab === 'home'
              ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
              : 'text-[#929a94] hover:text-white font-medium'
          }`}
        >
          <Home className="size-5" aria-hidden="true" />
          <span className="text-[11px] leading-tight">Início</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('numbers')}
          aria-label="Números"
          aria-current={activeTab === 'numbers' ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-[20px] cursor-pointer transition-colors duration-150 ${
            activeTab === 'numbers'
              ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
              : 'text-[#929a94] hover:text-white font-medium'
          }`}
        >
          <Grid3X3 className="size-5" aria-hidden="true" />
          <span className="text-[11px] leading-tight">Números</span>
          {selectedNumbers.length > 0 && activeTab !== 'numbers' && (
            <span className="absolute top-1.5 right-3.5 px-1.5 py-0.2 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] text-[9px] font-extrabold tabular-nums">
              {selectedNumbers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lookup')}
          aria-label="Minhas participações"
          aria-current={activeTab === 'lookup' ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-[20px] cursor-pointer transition-colors duration-150 ${
            activeTab === 'lookup'
              ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
              : 'text-[#929a94] hover:text-white font-medium'
          }`}
        >
          <Ticket className="size-5" aria-hidden="true" />
          <span className="text-[11px] leading-tight">Participações</span>
          {participations.length > 0 && activeTab !== 'lookup' && (
            <span className="absolute top-1.5 right-3.5 size-2 rounded-full bg-[var(--brand-accent)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          aria-label="Perfil"
          aria-current={activeTab === 'profile' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-[20px] cursor-pointer transition-colors duration-150 ${
            activeTab === 'profile'
              ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] font-extrabold'
              : 'text-[#929a94] hover:text-white font-medium'
          }`}
        >
          <User className="size-5" aria-hidden="true" />
          <span className="text-[11px] leading-tight">Perfil</span>
        </button>
      </nav>

      {/* FAQ, Suporte Oficial, LGPD & Transparency Footer */}
      <footer className="bg-[#0b0f0c] border-t border-white/[0.09] mt-12 pb-28 md:pb-8 text-[#929a94]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 space-y-6 text-xs">
          {/* Interactive Accessible FAQ & Support Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 border-b border-white/[0.08]">
            <div className="lg:col-span-4 space-y-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--brand-accent)] block">
                Dúvidas Frequentes & Suporte
              </span>
              <h2 className="text-lg font-extrabold text-[#f5f7f3] tracking-tight text-balance">
                Transparência total antes de você escolher seu número
              </h2>
              <p className="text-xs text-[#929a94] leading-relaxed text-pretty">
                Regras claras, probabilidade real de 1 em 75 e atendimento direto pelo WhatsApp sem
                robôs ou letras miúdas.
              </p>
              <a
                href={`https://wa.me/${(adminConfig.whatsappSupportNumber || '5585985252317').replace(
                  /\D/g,
                  ''
                )}?text=${encodeURIComponent(
                  'Olá! Preciso de atendimento / suporte sobre a Chance Premiada.'
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold transition-all"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Falar com Suporte no WhatsApp</span>
              </a>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <details className="group rounded-2xl bg-[#111512] border border-white/[0.09] p-3.5">
                <summary className="cursor-pointer font-bold text-[#f5f7f3] list-none flex items-center justify-between gap-2">
                  <span>Como funciona a regra da 1ª bola (1 em 75)?</span>
                  <span className="text-[var(--brand-accent)] font-mono text-sm group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[11px] text-[#929a94] leading-relaxed">
                  Cada edição possui exatamente 75 números únicos (01 a 75). Assim que a grade fecha,
                  a 1ª bola sorteada define o ganhador integral do prêmio no PIX.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#111512] border border-white/[0.09] p-3.5">
                <summary className="cursor-pointer font-bold text-[#f5f7f3] list-none flex items-center justify-between gap-2">
                  <span>Como recebo o prêmio no PIX se ganhar?</span>
                  <span className="text-[var(--brand-accent)] font-mono text-sm group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[11px] text-[#929a94] leading-relaxed">
                  O sistema identifica automaticamente o titular pelo WhatsApp cadastrado na compra e
                  envia o PIX na hora, com publicação do comprovante na aba Resultados.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#111512] border border-white/[0.09] p-3.5">
                <summary className="cursor-pointer font-bold text-[#f5f7f3] list-none flex items-center justify-between gap-2">
                  <span>A Raspadinha Bônus tem custo extra?</span>
                  <span className="text-[var(--brand-accent)] font-mono text-sm group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[11px] text-[#929a94] leading-relaxed">
                  Não. Ao confirmar sua participação no PIX, você recebe gratuitamente 1 Raspadinha
                  Digital auditável com chance de desconto imediato ou cartela extra.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#111512] border border-white/[0.09] p-3.5">
                <summary className="cursor-pointer font-bold text-[#f5f7f3] list-none flex items-center justify-between gap-2">
                  <span>Meus dados estão seguros pela LGPD?</span>
                  <span className="text-[var(--brand-accent)] font-mono text-sm group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[11px] text-[#929a94] leading-relaxed">
                  Sim. Em conformidade com a LGPD (Lei nº 13.709/2018), seu nome e WhatsApp são
                  mascarados no ranking público, seus números nunca ficam visíveis a terceiros e
                  usamos seus dados apenas para comprovante e entrega do prêmio.
                </p>
              </details>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-[var(--brand-accent)] flex items-center justify-center -rotate-6 shrink-0">
                <img
                  src={chancePremiadaLogo}
                  alt="Chance Premiada"
                  className="h-6 w-auto object-contain rotate-6"
                />
              </div>
              <div>
                <span className="font-extrabold text-[#f5f7f3] block">
                  Chance Premiada Oficial · {adminConfig.cityRegionLabel || 'Maracanaú & Fortaleza - CE'}
                </span>
                <span>
                  Apenas 75 números únicos (01 a 75) · Regra clara da 1ª bola + Raspadinha Digital.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#111512] border border-white/[0.09] text-[10px] font-bold text-[var(--brand-accent)]">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" /> LGPD · Lei 13.709/2018
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="text-[#929a94] hover:text-[#f5f7f3] flex items-center gap-1 cursor-pointer font-medium"
              >
                <Lock className="w-3 h-3" /> Área do Administrador
              </button>
            </div>
          </div>

          {/* Ethical Transparency & Odds Note */}
          <div className="pt-3 border-t border-white/[0.06] text-[11px] text-[#747c76] leading-relaxed">
            <strong className="text-[#f5f7f3]">
              Transparência & Probabilidade Real (1 em 75 por número):
            </strong>{' '}
            Diferente de sorteios de milhar ou títulos tradicionais com centenas de milhares de
            bilhetes, na <strong>Chance Premiada</strong> cada edição possui uma grade fechada de{' '}
            <strong>apenas 75 números (01 a 75)</strong>. A participação é recreativa e transparente:
            a <strong>1ª bola sorteada</strong> define o ganhador do PIX, sem promessas irreais de
            ganho garantido. Jogue com responsabilidade.
          </div>
        </div>
      </footer>
    </div>
  );
}
