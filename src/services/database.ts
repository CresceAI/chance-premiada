import {
  AdminConfig,
  AdsAnalyticsState,
  AffiliateSeller,
  ArchivedEditionSnapshot,
  CustomerLoyaltyProfile,
  DEFAULT_ADMIN_CONFIG,
  DEFAULT_AFFILIATE_SELLERS,
  DEFAULT_PARTNER_COUPONS,
  GridNumber,
  ParticipationRecord,
  WinnerRecord,
  createInitialAdsAnalytics,
  createZeroedGrid,
  formatGridNumber,
} from '../utils/engine';

const STORAGE_KEY = 'chance_premiada_db_v4';
const LEGACY_STORAGE_KEY = 'chance_premiada_db_v3';

export interface PersistedDatabaseState {
  adminConfig: AdminConfig;
  grid: GridNumber[];
  participations: ParticipationRecord[];
  winners: WinnerRecord[];
  adminPin: string;
  customerProfile?: CustomerLoyaltyProfile;
  adsAnalytics?: AdsAnalyticsState;
  affiliates?: AffiliateSeller[];
  archivedEditions?: ArchivedEditionSnapshot[];
}

const DEFAULT_CUSTOMER_PROFILE: CustomerLoyaltyProfile = {
  name: '',
  whatsapp: '',
  email: '',
  coinsBalance: 0,
  remarketingDiscountBRL: 0,
};

function getSupabaseCredentials(): { url: string; key: string } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  if (!url || !key || url.includes('SEU_PROJETO') || key.includes('sua_chave')) {
    return null;
  }
  return { url, key };
}

function encodePixTxIdWithAffiliate(pixTxId: string, affiliateCode?: string): string {
  if (!affiliateCode || pixTxId.includes('__ind_')) return pixTxId;
  return `${pixTxId}__ind_${affiliateCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
}

function decodeAffiliateFromPixTxId(rawPixTxId?: string): {
  cleanPixTxId: string;
  affiliateCode?: string;
} {
  if (!rawPixTxId) return { cleanPixTxId: '' };
  const parts = String(rawPixTxId).split('__ind_');
  if (parts.length === 2 && parts[1]) {
    return {
      cleanPixTxId: parts[0],
      affiliateCode: parts[1].toLowerCase(),
    };
  }
  return { cleanPixTxId: String(rawPixTxId) };
}

/**
 * Unified Database Repository Layer.
 * Persists atomically in localStorage AND syncs with Supabase PostgreSQL when configured.
 */
export const databaseService = {
  isSupabaseConfigured(): boolean {
    return getSupabaseCredentials() !== null;
  },

  loadState(): PersistedDatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const envDirectKey = import.meta.env?.VITE_DIRECT_PIX_KEY;
        const savedDirectKey = parsed.adminConfig?.directPixKey;
        const resolvedDirectKey =
          envDirectKey && (!savedDirectKey || savedDirectKey === 'chancepremiada@pix.com.br')
            ? envDirectKey
            : savedDirectKey || DEFAULT_ADMIN_CONFIG.directPixKey;

        const mergedConfig: AdminConfig = {
          ...DEFAULT_ADMIN_CONFIG,
          ...(parsed.adminConfig || {}),
          paymentMode: parsed.adminConfig?.paymentMode || 'direct_pix_zero_fee',
          directPixKey: resolvedDirectKey,
          partnerCoupons:
            Array.isArray(parsed.adminConfig?.partnerCoupons) &&
            parsed.adminConfig.partnerCoupons.length > 0
              ? parsed.adminConfig.partnerCoupons
              : DEFAULT_PARTNER_COUPONS,
          secretScratchPositions:
            Array.isArray(parsed.adminConfig?.secretScratchPositions) &&
            parsed.adminConfig.secretScratchPositions.length === 4
              ? parsed.adminConfig.secretScratchPositions
              : DEFAULT_ADMIN_CONFIG.secretScratchPositions,
        };
        return {
          adminConfig: mergedConfig,
          grid:
            Array.isArray(parsed.grid) && parsed.grid.length === 75
              ? parsed.grid
              : createZeroedGrid(),
          participations: Array.isArray(parsed.participations) ? parsed.participations : [],
          winners: Array.isArray(parsed.winners) ? parsed.winners : [],
          adminPin: import.meta.env.VITE_ADMIN_PIN || parsed.adminPin || '1234',
          customerProfile: {
            ...DEFAULT_CUSTOMER_PROFILE,
            ...(parsed.customerProfile || {}),
          },
          adsAnalytics: parsed.adsAnalytics
            ? {
                ...createInitialAdsAnalytics(),
                ...parsed.adsAnalytics,
                channels: {
                  ...createInitialAdsAnalytics().channels,
                  ...(parsed.adsAnalytics.channels || {}),
                },
                abandonedLeads: Array.isArray(parsed.adsAnalytics.abandonedLeads)
                  ? parsed.adsAnalytics.abandonedLeads
                  : [],
              }
            : createInitialAdsAnalytics(),
          affiliates:
            Array.isArray(parsed.affiliates) && parsed.affiliates.length > 0
              ? parsed.affiliates
              : DEFAULT_AFFILIATE_SELLERS,
          archivedEditions: Array.isArray(parsed.archivedEditions) ? parsed.archivedEditions : [],
        };
      }
    } catch {
      // Fallback to clean zeroed state
    }
    return {
      adminConfig: DEFAULT_ADMIN_CONFIG,
      grid: createZeroedGrid(),
      participations: [],
      winners: [],
      adminPin: import.meta.env.VITE_ADMIN_PIN || '1234',
      customerProfile: DEFAULT_CUSTOMER_PROFILE,
      adsAnalytics: createInitialAdsAnalytics(),
      affiliates: DEFAULT_AFFILIATE_SELLERS,
      archivedEditions: [],
    };
  },

  saveState(state: PersistedDatabaseState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors in restricted browsing modes
    }
  },

  /**
   * Fetches the real-time 01-75 grid and participations from Supabase so all customers on different phones
   * see the exact same available/reserved/sold numbers with zero duplication.
   */
  async fetchLiveEditionFromSupabase(editionNumber: number): Promise<{
    grid: GridNumber[] | null;
    participations: ParticipationRecord[] | null;
    editionMeta?: {
      latestOpenEditionNumber?: number;
      prizeAmountBRL?: number;
      ticketPriceBRL?: number;
      winner?: WinnerRecord | null;
    } | null;
  }> {
    const creds = getSupabaseCredentials();
    if (!creds) return { grid: null, participations: null, editionMeta: null };

    const headers = {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      'Content-Type': 'application/json',
    };

    try {
      const [gridRes, partRes, edRes] = await Promise.all([
        fetch(
          `${creds.url}/rest/v1/edition_numbers?edition_number=eq.${editionNumber}&order=number.asc`,
          { headers }
        ),
        fetch(
          `${creds.url}/rest/v1/participations?order=created_at.desc&limit=150`,
          { headers }
        ),
        fetch(
          `${creds.url}/rest/v1/editions?order=edition_number.desc&limit=5`,
          { headers }
        ),
      ]);

      let liveGrid: GridNumber[] | null = null;
      const expiredNumsToRelease: number[] = [];
      const nowMs = Date.now();
      if (gridRes.ok) {
        const rows = await gridRes.json();
        if (Array.isArray(rows) && rows.length === 75) {
          liveGrid = rows.map((r: any) => {
            const num = Number(r.number);
            const isExpiredReservation =
              r.status === 'reserved' &&
              r.reserved_until &&
              !Number.isNaN(Date.parse(r.reserved_until)) &&
              Date.parse(r.reserved_until) <= nowMs;

            if (isExpiredReservation) {
              expiredNumsToRelease.push(num);
              return {
                number: num,
                formatted: r.formatted || formatGridNumber(num),
                status: 'available',
              };
            }

            const decodedTx = decodeAffiliateFromPixTxId(r.pix_tx_id);
            const resolvedAffCode = r.affiliate_code || decodedTx.affiliateCode || undefined;

            return {
              number: num,
              formatted: r.formatted || formatGridNumber(num),
              status:
                r.status === 'sold' || r.status === 'reserved' ? r.status : 'available',
              ownerName: r.owner_name || undefined,
              ownerWhatsapp: r.owner_whatsapp || undefined,
              pixTxId: decodedTx.cleanPixTxId || undefined,
              reservedUntil: r.reserved_until || undefined,
              affiliateCode: resolvedAffCode,
              affiliateName: r.affiliate_name || undefined,
            };
          });
        }
      }

      if (expiredNumsToRelease.length > 0) {
        void this.syncReleaseNumberToSupabase(editionNumber, expiredNumsToRelease, []);
      }

      let liveParts: ParticipationRecord[] | null = null;
      if (partRes.ok) {
        const pRows = await partRes.json();
        if (Array.isArray(pRows)) {
          liveParts = pRows.map((p: any) => {
            const decodedTx = decodeAffiliateFromPixTxId(p.pix_tx_id);
            const resolvedAffCode = p.affiliate_code || decodedTx.affiliateCode || undefined;
            return {
              id: String(p.id),
              editionNumber: `Edição #${String(p.edition_number).padStart(2, '0')}`,
              prizeTitle: 'Prêmio do Dia no PIX (1ª Bola)',
              prizeAmountBRL: 200,
              customerName: String(p.customer_name || 'Cliente'),
              customerWhatsapp: String(p.customer_whatsapp || ''),
              customerWhatsappFormatted: String(p.customer_whatsapp || ''),
              numbers: Array.isArray(p.numbers) ? p.numbers : [],
              amountPaid: Number(p.amount_paid_brl || 0),
              coinsEarned: (Array.isArray(p.numbers) ? p.numbers.length : 1) * 25,
              date: 'Hoje',
              status: p.status || 'Aguardando Fechar 75 Nºs',
              result: p.result_summary || 'Aguardando apuração da 1ª bola',
              pixTxId: decodedTx.cleanPixTxId,
              affiliateCode: resolvedAffCode,
              affiliateName: p.affiliate_name || undefined,
              scratchCard: {
                pixTxId: decodedTx.cleanPixTxId,
                signatureHash: String(p.scratch_signature_hash || 'SIG-VERIFIED'),
                tier: p.scratch_tier === 'free_number' ? 'free_number' : 'bonus_coins',
                title: String(p.scratch_title || 'Raspadinha Bônus'),
                subtitle: 'Resultado assinado no servidor',
                valueBRL: Number(p.scratch_value_brl || 0.5),
                bonusNumberAssigned: p.scratch_bonus_number || undefined,
                scratched: Boolean(p.scratch_revealed),
              },
            };
          });
        }
      }

      let editionMeta: {
        latestOpenEditionNumber?: number;
        prizeAmountBRL?: number;
        ticketPriceBRL?: number;
        winner?: WinnerRecord | null;
      } | null = null;

      if (edRes.ok) {
        const edRows = await edRes.json();
        if (Array.isArray(edRows) && edRows.length > 0) {
          const latestOpenRow = edRows.find((r: any) => r.status === 'open') || edRows[0];
          const currentEdRow =
            edRows.find((r: any) => Number(r.edition_number) === editionNumber) || edRows[0];
          const drawnRow =
            edRows.find((r: any) => r.status === 'drawn' && Number(r.first_ball_drawn) >= 1) ||
            currentEdRow;

          const firstBall = Number(drawnRow.first_ball_drawn);
          const drawnEdNum = Number(drawnRow.edition_number || editionNumber);
          let cloudWinner: WinnerRecord | null = null;
          if (drawnRow.status === 'drawn' && firstBall >= 1 && firstBall <= 75) {
            const fbFormatted = formatGridNumber(firstBall);
            cloudWinner = {
              id: `win-ed-${drawnEdNum}-${firstBall}`,
              editionNumber: `Edição #${String(drawnEdNum).padStart(2, '0')}`,
              date: 'Apuração Oficial Realizada',
              firstBallNumber: fbFormatted,
              ballsSequence: [
                fbFormatted,
                formatGridNumber(((firstBall + 16) % 75) + 1),
                formatGridNumber(((firstBall + 30) % 75) + 1),
                formatGridNumber(((firstBall + 43) % 75) + 1),
                formatGridNumber(((firstBall + 57) % 75) + 1),
              ],
              winnerName: drawnRow.winner_name || 'Ganhador Oficial',
              winnerWhatsappMasked: drawnRow.winner_whatsapp || 'Verificado',
              prizeAmountBRL: Number(drawnRow.prize_amount_brl || 200),
              pixTxId: `APURACAO-BOLA-${fbFormatted}`,
            };
          }
          editionMeta = {
            latestOpenEditionNumber: latestOpenRow
              ? Number(latestOpenRow.edition_number)
              : undefined,
            prizeAmountBRL: currentEdRow.prize_amount_brl
              ? Number(currentEdRow.prize_amount_brl)
              : undefined,
            ticketPriceBRL: currentEdRow.ticket_price_brl
              ? Number(currentEdRow.ticket_price_brl)
              : undefined,
            winner: cloudWinner,
          };
        }
      }

      return { grid: liveGrid, participations: liveParts, editionMeta };
    } catch {
      return { grid: null, participations: null, editionMeta: null };
    }
  },

  /**
   * Reserves numbers atomically in Supabase in a SINGLE batched HTTP request (using `in.(...)`)
   * with a 10-minute expiration timestamp so abandoned checkouts automatically release back to green.
   */
  async syncReservationToSupabase(
    editionNumber: number,
    numbers: number[],
    customerName: string,
    customerWhatsapp: string
  ): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds || numbers.length === 0) return;

    const headers = {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    };

    try {
      const numList = numbers.join(',');
      const reservedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await fetch(
        `${creds.url}/rest/v1/edition_numbers?edition_number=eq.${editionNumber}&number=in.(${numList})&status=eq.available`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'reserved',
            owner_name: customerName.trim(),
            owner_whatsapp: customerWhatsapp.replace(/\D/g, ''),
            reserved_until: reservedUntil,
          }),
        }
      );
    } catch {
      // Non-blocking
    }
  },

  /**
   * Releases a single number (or list of numbers) back to 'available' in Supabase in a single batched request.
   */
  async syncReleaseNumberToSupabase(
    editionNumber: number,
    numbers: number[],
    participationIdsToDelete: string[] = []
  ): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds) return;

    const headers = {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    };

    try {
      if (numbers.length > 0) {
        const numList = numbers.join(',');
        await fetch(
          `${creds.url}/rest/v1/edition_numbers?edition_number=eq.${editionNumber}&number=in.(${numList})`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'available',
              owner_name: null,
              owner_whatsapp: null,
              pix_tx_id: null,
              reserved_until: null,
            }),
          }
        );
      }

      if (participationIdsToDelete.length > 0) {
        const idList = participationIdsToDelete.map((id) => `"${id}"`).join(',');
        await fetch(
          `${creds.url}/rest/v1/participations?id=in.(${encodeURIComponent(idList)})`,
          {
            method: 'DELETE',
            headers,
          }
        );
      }
    } catch {
      // Non-blocking
    }
  },

  /**
   * Resets the entire 75-number edition in Supabase to 0/75 available.
   */
  async syncResetEditionToSupabase(editionNumber: number): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds) return;

    const headers = {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    };

    try {
      await Promise.all([
        fetch(
          `${creds.url}/rest/v1/edition_numbers?edition_number=eq.${editionNumber}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'available',
              owner_name: null,
              owner_whatsapp: null,
              pix_tx_id: null,
              reserved_until: null,
            }),
          }
        ),
        fetch(
          `${creds.url}/rest/v1/participations?edition_number=eq.${editionNumber}`,
          {
            method: 'DELETE',
            headers,
          }
        ),
        fetch(
          `${creds.url}/rest/v1/editions?edition_number=eq.${editionNumber}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'open',
              first_ball_drawn: null,
              winner_name: null,
              winner_whatsapp: null,
              drawn_at: null,
            }),
          }
        ),
      ]);
    } catch {
      // Non-blocking
    }
  },

  /**
   * Freezes the previous edition in Supabase and initializes a brand-new 75-number edition (`#02`, `#03`, ...)
   * so sellers and customers can immediately buy on the new grid without losing any history from the previous edition!
   */
  async syncAdvanceNewEditionToSupabase(
    newEditionNumber: number,
    prizeAmountBRL: number,
    ticketPriceBRL: number,
    scratchEnabled: boolean = true
  ): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds) return;

    const headers = {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    };

    try {
      await fetch(`${creds.url}/rest/v1/editions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          edition_number: newEditionNumber,
          prize_amount_brl: prizeAmountBRL,
          ticket_price_brl: ticketPriceBRL,
          scratch_enabled: scratchEnabled,
          status: 'open',
        }),
      });

      const rows = Array.from({ length: 75 }, (_, idx) => {
        const num = idx + 1;
        return {
          edition_number: newEditionNumber,
          number: num,
          formatted: formatGridNumber(num),
          status: 'available',
          owner_name: null,
          owner_whatsapp: null,
          pix_tx_id: null,
          reserved_until: null,
        };
      });

      await fetch(`${creds.url}/rest/v1/edition_numbers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rows),
      });
    } catch {
      // Non-blocking
    }
  },

  /**
   * Syncs prize amount & ticket price to the `editions` table in Supabase so all phones see the same values.
   */
  async syncEditionConfigToSupabase(config: AdminConfig): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds) return;

    try {
      await fetch(
        `${creds.url}/rest/v1/editions?edition_number=eq.${config.editionNumber}`,
        {
          method: 'PATCH',
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            prize_amount_brl: config.prizeAmountBRL,
            ticket_price_brl: config.ticketPriceBRL,
            scratch_enabled: config.scratchEnabled,
          }),
        }
      );
    } catch {
      // Non-blocking
    }
  },

  /**
   * Syncs the published 1st ball winner to the `editions` table in Supabase so all phones see the winner banner immediately.
   */
  async syncWinnerToSupabase(
    editionNumber: number,
    firstBallNumber: number,
    winner: WinnerRecord
  ): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds) return;

    try {
      await fetch(
        `${creds.url}/rest/v1/editions?edition_number=eq.${editionNumber}`,
        {
          method: 'PATCH',
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            status: 'drawn',
            first_ball_drawn: firstBallNumber,
            winner_name: winner.winnerName,
            winner_whatsapp: winner.winnerWhatsappMasked,
            drawn_at: new Date().toISOString(),
          }),
        }
      );
    } catch {
      // Non-blocking
    }
  },

  /**
   * Persists scratch card reveal state in Supabase.
   */
  async syncScratchRevealedToSupabase(participationId: string): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds) return;

    try {
      await fetch(
        `${creds.url}/rest/v1/participations?id=eq.${encodeURIComponent(participationId)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ scratch_revealed: true }),
        }
      );
    } catch {
      // Non-blocking
    }
  },

  /**
   * Fires a non-blocking POST webhook to Google Apps Script (if VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL is configured)
   * to record the sale in Google Sheets and send the official HTML receipt e-mail for free.
   */
  async triggerEmailAndSheetWebhook(record: ParticipationRecord): Promise<void> {
    const webhookUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl.includes('SEU_SCRIPT_ID')) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          editionNumber: record.editionNumber,
          status: record.status,
          numbers: record.numbers,
          customerName: record.customerName,
          customerWhatsapp: record.customerWhatsappFormatted,
          customerEmail: record.customerEmail || '',
          amountPaid: record.amountPaid,
          prizeAmountBRL: record.prizeAmountBRL,
          prizeTitle: record.prizeTitle,
          pixTxId: record.pixTxId,
          affiliateName: record.affiliateName || '',
          scratchTitle: record.scratchCard.title,
          scratchRewardLabel: record.scratchCard.title,
        }),
      });
    } catch {
      // Non-blocking webhook call
    }
  },

  /**
   * Syncs a confirmed purchase to Supabase PostgreSQL when VITE_SUPABASE_URL & Key are set.
   */
  async syncPurchaseToSupabase(editionNumber: number, record: ParticipationRecord): Promise<void> {
    const creds = getSupabaseCredentials();
    if (!creds) return;

    const headers = {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    };

    try {
      const encodedPixTxId = encodePixTxIdWithAffiliate(record.pixTxId, record.affiliateCode);
      const basePartPayload = {
        id: record.id,
        edition_number: editionNumber,
        customer_name: record.customerName,
        customer_whatsapp: record.customerWhatsapp,
        numbers: record.numbers,
        amount_paid_brl: record.amountPaid,
        pix_tx_id: encodedPixTxId,
        scratch_signature_hash: record.scratchCard.signatureHash,
        scratch_tier: record.scratchCard.tier,
        scratch_title: record.scratchCard.title,
        scratch_value_brl: record.scratchCard.valueBRL,
        scratch_bonus_number: record.scratchCard.bonusNumberAssigned || null,
        scratch_revealed: record.scratchCard.scratched,
        status: record.status,
        result_summary: record.result,
      };

      const partRes = await fetch(`${creds.url}/rest/v1/participations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...basePartPayload,
          ...(record.affiliateCode
            ? {
                affiliate_code: record.affiliateCode,
                affiliate_name: record.affiliateName || null,
              }
            : {}),
        }),
      });

      // Fallback if user hasn't run the new ALTER TABLE SQL yet (encodedPixTxId still preserves affiliate!)
      if (!partRes.ok && record.affiliateCode) {
        await fetch(`${creds.url}/rest/v1/participations`, {
          method: 'POST',
          headers,
          body: JSON.stringify(basePartPayload),
        });
      }

      const targetGridStatus =
        record.status === 'Pagamento em Conferência' ? 'reserved' : 'sold';
      const intNums = record.numbers
        .map((n) => parseInt(n, 10))
        .filter((n) => !Number.isNaN(n));
      if (intNums.length > 0) {
        const baseGridPatch = {
          status: targetGridStatus,
          owner_name: record.customerName,
          owner_whatsapp: record.customerWhatsapp,
          pix_tx_id: encodedPixTxId,
          reserved_until: null,
        };
        const gridPatchRes = await fetch(
          `${creds.url}/rest/v1/edition_numbers?edition_number=eq.${editionNumber}&number=in.(${intNums.join(',')})`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              ...baseGridPatch,
              ...(record.affiliateCode
                ? {
                    affiliate_code: record.affiliateCode,
                    affiliate_name: record.affiliateName || null,
                  }
                : {}),
            }),
          }
        );
        if (!gridPatchRes.ok && record.affiliateCode) {
          await fetch(
            `${creds.url}/rest/v1/edition_numbers?edition_number=eq.${editionNumber}&number=in.(${intNums.join(',')})`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify(baseGridPatch),
            }
          );
        }
      }
    } catch {
      // Fallback to localStorage state if offline
    }
  },

  async createPixCharge(payload: {
    amountBRL: number;
    numbers: number[];
    customerName: string;
    customerWhatsapp: string;
    customerEmail?: string;
    editionNumber: number;
  }): Promise<{
    mode: 'asaas_live' | 'direct_pix_fallback';
    isSandbox?: boolean;
    paymentId: string;
    pixCopyPaste?: string;
    qrCodeBase64?: string;
  }> {
    try {
      const res = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return { mode: 'direct_pix_fallback', paymentId: `DIRECT-${Date.now()}` };
      }
      const data = await res.json();
      if (data.mode === 'asaas_live' && data.pixCopyPaste) {
        return {
          mode: 'asaas_live',
          isSandbox: Boolean(data.isSandbox),
          paymentId: String(data.paymentId),
          pixCopyPaste: data.pixCopyPaste,
          qrCodeBase64: data.qrCodeBase64,
        };
      }
      return { mode: 'direct_pix_fallback', paymentId: data.paymentId || `DIRECT-${Date.now()}` };
    } catch {
      return { mode: 'direct_pix_fallback', paymentId: `DIRECT-${Date.now()}` };
    }
  },

  async checkPixChargeStatus(
    paymentId: string,
    simulate: boolean = false
  ): Promise<{ approved: boolean; isSandbox?: boolean; status?: string }> {
    if (!paymentId || paymentId.startsWith('DIRECT-') || paymentId.startsWith('SIM-')) {
      return { approved: true };
    }
    try {
      const url = `/api/check-pix?id=${encodeURIComponent(paymentId)}${
        simulate ? '&simulate=true' : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) return { approved: simulate };
      const data = await res.json();
      return {
        approved: Boolean(data.approved) || simulate,
        isSandbox: Boolean(data.isSandbox),
        status: data.status,
      };
    } catch {
      return { approved: simulate };
    }
  },

  async broadcastResultToTelegram(
    botToken: string,
    chatId: string,
    messageText: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (!botToken || !chatId) {
      return { ok: false, error: 'Configure o Token do Bot e o @canal do Telegram.' };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: messageText,
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.description || 'Falha ao enviar para o Telegram.' };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de conexão com a API do Telegram.' };
    }
  },

  async notifySaleToTelegram(payload: {
    eventType: 'pending_pix' | 'approved_sale';
    record: ParticipationRecord;
    remainingAvailable?: number;
    overrideBotToken?: string;
    overrideAdminChatId?: string;
    overridePublicChannelId?: string;
  }): Promise<void> {
    try {
      await fetch('/api/notify-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: payload.eventType,
          editionNumber: payload.record.editionNumber,
          customerName: payload.record.customerName,
          customerWhatsappFormatted: payload.record.customerWhatsappFormatted,
          numbers: payload.record.numbers,
          amountBRL: payload.record.amountPaid,
          pixTxId: payload.record.pixTxId,
          affiliateName: payload.record.affiliateName,
          remainingAvailable: payload.remainingAvailable,
          overrideBotToken: payload.overrideBotToken,
          overrideAdminChatId: payload.overrideAdminChatId,
          overridePublicChannelId: payload.overridePublicChannelId,
        }),
      });
    } catch {
      // Non-blocking notification
    }
  },
};
