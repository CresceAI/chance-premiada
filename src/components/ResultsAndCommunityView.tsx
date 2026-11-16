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
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header & Rule Explanation */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-3 py-1 rounded-lg border border-[#BBF7D0] mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Transparência Oficial · Regra da 1ª Bola
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
            Resultados Oficiais & Comunidade
          </h1>
          <p className="text-sm text-[#6E6E73] mt-1 leading-relaxed">
            A regra é simples e auditável: quando inicia o sorteio da rodada,{' '}
            <strong className="text-[#1D1D1F]">a 1ª bola que sair (01 a 75)</strong> define o
            ganhador do prêmio integral no PIX.
          </p>
        </div>
      </section>

      {/* COMUNIDADE OFICIAL DE RESULTADOS: WHATSAPP & TELEGRAM */}
      <section
        className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
        data-testid="community-channels-section"
      >
        <div className="space-y-1">
          <span className="text-xs font-bold text-[#15803D] uppercase tracking-wider">
            Acompanhe ao Vivo · Vídeos dos Sorteios & Avisos de Nova Grade
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#1D1D1F]">
            Entre na Comunidade Oficial (WhatsApp & Telegram)
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6E73]">
            Receba no seu celular o vídeo da 1ª bola sorteada, o comprovante PIX do ganhador do dia
            e o alerta assim que abrir uma nova rodada de 75 números:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]/50 hover:from-[#DCFCE7] hover:to-[#BBF7D0]/50 border border-[#BBF7D0] flex items-center justify-between gap-3 transition-all shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-extrabold text-[#1D1D1F] block">
                  Comunidade VIP no WhatsApp
                </span>
                <span className="text-xs text-[#15803D] font-semibold">
                  Resultados da 1ª Bola + Abertura de Rodadas
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#15803D] shrink-0" />
          </a>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE]/50 hover:from-[#E0F2FE] hover:to-[#BAE6FD]/50 border border-[#BAE6FD] flex items-center justify-between gap-3 transition-all shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-extrabold text-[#1D1D1F] block">
                  Canal Oficial no Telegram
                </span>
                <span className="text-xs text-[#0369A1] font-semibold">
                  Histórico de Sorteios + Alertas Instantâneos
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#0369A1] shrink-0" />
          </a>
        </div>
      </section>

      {/* Zeroed State or Published Winners List */}
      {winners.length === 0 ? (
        <section className="bg-white rounded-3xl border border-black/[0.06] p-8 sm:p-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="w-13 h-13 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center mx-auto mb-3 text-[#16A34A]">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-[#1D1D1F]">
            Aguardando Apuração da 1ª Bola
          </h2>
          <p className="text-sm text-[#6E6E73] max-w-md mx-auto mt-1 mb-5">
            Assim que o sorteio da edição for realizado e a 1ª bola for lançada, o número sorteado
            e o nome do ganhador aparecem aqui.
          </p>
          <button
            type="button"
            onClick={onNavigateToGrid}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm transition-colors cursor-pointer shadow-xs"
          >
            Escolher Número na Grade 01–75 <ArrowRight className="w-4 h-4" />
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

      {/* Simple Viral Referral Link Generator */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-7 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" /> Indique Amigos & Feche a Grade Mais Rápido
            </div>
            <h2 className="text-lg font-extrabold text-[#1D1D1F]">
              Compartilhe no WhatsApp e Ganhe Bônus
            </h2>
            <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">
              Digite seu WhatsApp para gerar seu link de convite. Assim você ajuda a fechar os 75
              números mais rápido e acumula bônus no seu número.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-2.5">
            <input
              type="tel"
              value={referralWhatsapp}
              onChange={(e) => setReferralWhatsapp(e.target.value)}
              placeholder="Seu WhatsApp (ex: 11987654321)"
              className="w-full px-4 py-3 rounded-xl border border-black/[0.1] bg-[#F5F5F7]/70 focus:bg-white text-sm text-[#1D1D1F] font-semibold focus:outline-none focus:border-[#16A34A]"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06] font-mono text-xs text-[#6E6E73] truncate">
                {referralUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyRef}
                className="px-4 py-2.5 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> Copiado
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
              className="w-full py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar Convite Direto no WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
