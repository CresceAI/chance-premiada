import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';
import { WinnerRecord, AdminConfig } from '../utils/engine';

interface ResultsAndCommunityViewProps {
  winners: WinnerRecord[];
  adminConfig?: AdminConfig;
  onNavigateToGrid: () => void;
}

export const ResultsAndCommunityView: React.FC<ResultsAndCommunityViewProps> = ({
  winners,
  adminConfig,
  onNavigateToGrid,
}) => {
  const [referralWhatsapp, setReferralWhatsapp] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const cleanRef = referralWhatsapp.replace(/\D/g, '') || 'seu-whatsapp';
  const referralUrl = `https://chancepremiada.com.br/?ref=${cleanRef}`;
  const whatsappUrl =
    adminConfig?.whatsappGroupUrl || 'https://chat.whatsapp.com/chancepremiada-vip';
  const telegramUrl =
    adminConfig?.telegramChannelUrl || 'https://t.me/chancepremiada_oficial';

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(referralUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const whatsappShareInviteUrl = `https://wa.me/?text=${encodeURIComponent(
    `🎯 Já escolheu seu número hoje na Chance Premiada? São apenas 75 números (01 a 75) e quem acertar a 1ª bola leva o PIX do dia + 1 Raspadinha Bônus na hora!\n👉 Escolha seu número verde aqui: ${referralUrl}`
  )}`;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Header & Rule Explanation */}
      <section className="bg-[#111512] rounded-3xl border border-white/[0.09] p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 px-3 py-1 rounded-lg border border-[var(--brand-accent)]/25 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Transparência Oficial · Regra da 1ª Bola
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5f7f3] tracking-tight text-balance">
            Resultados Oficiais & Comunidade
          </h1>
          <p className="text-sm text-[#929a94] mt-1 leading-relaxed text-pretty">
            A regra é simples e auditável: quando inicia o sorteio da rodada,{' '}
            <strong className="text-[#f5f7f3]">a 1ª bola que sair (01 a 75)</strong> define o
            ganhador do prêmio integral no PIX.
          </p>
        </div>
      </section>

      {/* COMUNIDADE OFICIAL DE RESULTADOS: WHATSAPP & TELEGRAM */}
      <section
        className="bg-[#111512] rounded-3xl border border-white/[0.09] p-5 sm:p-7 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
        data-testid="community-channels-section"
      >
        <div className="space-y-1">
          <span className="text-xs font-bold text-[var(--brand-accent)] uppercase tracking-wider">
            Acompanhe ao Vivo · Vídeos dos Sorteios & Avisos de Nova Grade
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#f5f7f3]">
            Entre na Comunidade Oficial (WhatsApp & Telegram)
          </h2>
          <p className="text-xs sm:text-sm text-[#929a94]">
            Receba no seu celular o vídeo da 1ª bola sorteada, o comprovante PIX do ganhador do dia
            e o alerta assim que abrir uma nova rodada de 75 números:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-[#171c18] hover:bg-[#1c231d] border border-white/[0.09] flex items-center justify-between gap-3 transition-colors duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-ink)] flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-extrabold text-[#f5f7f3] block truncate">
                  Comunidade VIP no WhatsApp
                </span>
                <span className="text-xs text-[var(--brand-accent)] font-semibold block truncate">
                  Resultados da 1ª Bola + Abertura de Rodadas
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#929a94] shrink-0" aria-hidden="true" />
          </a>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-[#171c18] hover:bg-[#1c231d] border border-white/[0.09] flex items-center justify-between gap-3 transition-colors duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-full bg-[#0284C7] text-white flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-extrabold text-[#f5f7f3] block truncate">
                  Canal Oficial no Telegram
                </span>
                <span className="text-xs text-[#38BDF8] font-semibold block truncate">
                  Histórico de Sorteios + Alertas Instantâneos
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#929a94] shrink-0" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Zeroed State or Published Winners List */}
      {winners.length === 0 ? (
        <section className="bg-[#111512] rounded-3xl border border-white/[0.09] p-8 sm:p-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <div className="size-13 rounded-2xl bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/25 flex items-center justify-center mx-auto mb-3 text-[var(--brand-accent)]">
            <Trophy className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-extrabold text-[#f5f7f3] text-balance">
            Aguardando Apuração da 1ª Bola
          </h2>
          <p className="text-sm text-[#929a94] max-w-md mx-auto mt-1 mb-5 text-pretty">
            Assim que o sorteio da edição for realizado e a 1ª bola for lançada, o número sorteado
            e o nome do ganhador aparecem aqui.
          </p>
          <button
            type="button"
            onClick={onNavigateToGrid}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] font-extrabold text-sm transition-all duration-150 cursor-pointer shadow-xs"
          >
            <span>Escolher Número na Grade 01–75</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          {winners.map((win, idx) => (
            <motion.div
              key={win.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl border border-black/[0.08] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              data-testid="winner-result-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F5F5F7]">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[#1D1D1F] text-white text-xs font-extrabold">
                    {win.editionNumber}
                  </span>
                  <span className="text-xs font-medium text-[#6E6E73]">{win.date}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#15803D] bg-[#DCFCE7] px-3 py-1 rounded-lg border border-[#BBF7D0]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Prêmio: R${' '}
                  {win.prizeAmountBRL.toFixed(2).replace('.', ',')} no PIX
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 items-center">
                {/* 1st Ball Highlight */}
                <div className="md:col-span-5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white font-mono font-extrabold flex flex-col items-center justify-center ring-4 ring-[#BBF7D0] shrink-0 shadow-md">
                    <span className="text-[9px] uppercase font-sans tracking-wider">1ª Bola</span>
                    <span className="text-2xl leading-none mt-0.5">{win.firstBallNumber}</span>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#15803D]">
                      Número Sorteado
                    </p>
                    <p className="text-base font-extrabold text-[#1D1D1F]">
                      Bola Nº {win.firstBallNumber}
                    </p>
                    <p className="text-xs text-[#6E6E73]">
                      Quem escolheu o Nº {win.firstBallNumber} levou o prêmio
                    </p>
                    {Array.isArray(win.ballsSequence) && win.ballsSequence.length > 1 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] text-[#6E6E73]">Sequência:</span>
                        {win.ballsSequence.slice(0, 4).map((b, i) => (
                          <span
                            key={b}
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              i === 0
                                ? 'bg-[#16A34A] text-white font-bold'
                                : 'bg-[#F5F5F7] text-[#6E6E73]'
                            }`}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Winner Info */}
                <div className="md:col-span-7 bg-[#F5F5F7] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-black/[0.04]">
                  <div>
                    <p className="text-[11px] font-medium text-[#6E6E73]">
                      Ganhador(a) identificado no sistema
                    </p>
                    <p className="text-base font-extrabold text-[#1D1D1F]">{win.winnerName}</p>
                    <p className="text-xs text-[#6E6E73] font-mono mt-0.5">
                      WhatsApp: {win.winnerWhatsappMasked}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[#6E6E73]">
                      PIX do Dia
                    </p>
                    <p className="text-xl font-extrabold text-[#16A34A] font-mono">
                      R$ {win.prizeAmountBRL.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-[10px] font-mono text-[#86868B] mt-0.5">{win.pixTxId}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ethical Viral Referral Link Generator (Obsidian & Lime) */}
      <section className="bg-[#111512] rounded-3xl border border-white/[0.09] p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-7 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D9B85D] bg-[#D9B85D]/15 border border-[#D9B85D]/25 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Indique Amigos & Feche a Grade Mais Rápido
            </div>
            <h2 className="text-lg font-extrabold text-[#f5f7f3] text-balance">
              Compartilhe com amigos e acelere o sorteio de hoje
            </h2>
            <p className="text-xs sm:text-sm text-[#929a94] leading-relaxed text-pretty">
              Gere seu link pessoal com WhatsApp: quanto mais rápido os 75 números forem
              preenchidos, mais cedo a 1ª bola é sorteada — com total transparência e zero spam.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-2.5">
            <input
              type="tel"
              aria-label="Seu WhatsApp para gerar link de convite"
              value={referralWhatsapp}
              onChange={(e) => setReferralWhatsapp(e.target.value)}
              placeholder="Seu WhatsApp com DDD (ex: 85987654321)"
              className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-[#171c18] focus:bg-[#1e261f] text-sm text-[#f5f7f3] placeholder:text-[#747c76] font-semibold focus:outline-none focus:border-[var(--brand-accent)]"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-[#171c18] border border-white/[0.08] font-mono text-xs text-[#929a94] truncate">
                {referralUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyRef}
                className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f7f3] text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--brand-accent)]" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </>
                )}
              </button>
            </div>
            <a
              href={whatsappShareInviteUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-accent)] hover:brightness-105 text-[var(--brand-accent-ink)] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Enviar Convite Direto no WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
