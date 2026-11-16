import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GridNumber,
  AdminConfig,
  formatGridNumber,
  pickRandomAvailableNumber,
} from '../utils/engine';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shuffle,
  ShieldCheck,
  Smartphone,
  Trophy,
  Ticket,
  HelpCircle,
  Zap,
  Gift,
} from 'lucide-react';

interface HowToPlayOnboardingViewProps {
  grid: GridNumber[];
  adminConfig: AdminConfig;
  selectedNumbers: number[];
  onSelectNumberForCheckout: (num: number) => void;
  onStartPlayingNow: (chosenNum?: number) => void;
}

const SAMPLE_NUMBERS = [7, 13, 25, 38, 50, 72];

export const HowToPlayOnboardingView: React.FC<HowToPlayOnboardingViewProps> = ({
  grid,
  adminConfig,
  selectedNumbers,
  onSelectNumberForCheckout,
  onStartPlayingNow,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 interactive state: chosen number
  const initialCandidate =
    selectedNumbers[0] ||
    grid.find((item) => SAMPLE_NUMBERS.includes(item.number) && item.status === 'available')
      ?.number ||
    pickRandomAvailableNumber(grid, []) ||
    25;

  const [pickedNumber, setPickedNumber] = useState<number>(initialCandidate);
  const [hasInteractedStep1, setHasInteractedStep1] = useState<boolean>(false);

  // Step 2 interactive state: 1st-ball mini-quiz
  const [quizAnswer, setQuizAnswer] = useState<'ball1' | 'ball2' | 'all' | null>(null);

  // Step 3 interactive state: interactive scratch simulation
  const [demoScratched, setDemoScratched] = useState<boolean>(false);

  // Step 4 interactive state: simulated WhatsApp lookup check
  const [verifiedRule, setVerifiedRule] = useState<boolean>(true);

  const totalSteps = 4;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);
  const formattedPicked = formatGridNumber(pickedNumber);
  const prizeFormatted = adminConfig.prizeAmountBRL.toFixed(2).replace('.00', '');
  const ticketFormatted = adminConfig.ticketPriceBRL.toFixed(2).replace('.', ',');

  // Get 6 real available numbers from the live grid for the interactive demo
  const availableDemoNumbers = grid
    .filter((item) => item.status === 'available')
    .slice(0, 12)
    .filter((_, idx) => idx % 2 === 0)
    .slice(0, 6);

  const handlePickDemoNumber = (num: number) => {
    setPickedNumber(num);
    setHasInteractedStep1(true);
  };

  const handleRandomDemoNumber = () => {
    const randomNum = pickRandomAvailableNumber(grid, [pickedNumber]);
    if (randomNum !== null) {
      setPickedNumber(randomNum);
      setHasInteractedStep1(true);
    }
  };

  const handleBuyPickedNumberNow = () => {
    onSelectNumberForCheckout(pickedNumber);
    onStartPlayingNow(pickedNumber);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Top Progress Header — Duolingo-inspired Micro-Journey */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#6E6E73]">
              <span className="font-bold text-[#15803D] bg-[#F0FDF4] px-2.5 py-0.5 rounded-md border border-[#BBF7D0] inline-flex items-center gap-1">
                <Zap className="w-3 h-3" /> Guia Interativo em 30 Segundos
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#1D1D1F]">
                Passo {currentStep} de {totalSteps}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{progressPercent}% concluído</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1F] tracking-tight">
              Aprenda jogando: como ganhar R$ {prizeFormatted} no PIX com 1 número
            </h1>
          </div>

          <button
            type="button"
            onClick={() => onStartPlayingNow()}
            className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Pular para a Grade (01–75)
          </button>
        </div>

        {/* Smooth Progress Bar + Step Selector Buttons */}
        <div className="mt-4 space-y-3">
          <div className="w-full h-2.5 bg-[#F5F5F7] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#16A34A] to-[#22C55E] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            role="tablist"
            aria-label="Etapas de como jogar"
          >
            {[
              { step: 1, label: '1. Escolha seu Nº' },
              { step: 2, label: '2. Regra da 1ª Bola' },
              { step: 3, label: '3. Raspadinha Bônus' },
              { step: 4, label: '4. Compra em 10s' },
            ].map((item) => {
              const isCurrent = currentStep === item.step;
              const isCompleted = currentStep > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  onClick={() => setCurrentStep(item.step)}
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#1D1D1F] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main 2-Column Layout: Left = Interactive Step Card, Right = Live Ticket Preview & Instant Buy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Interactive Step Experience */}
        <section
          className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
          data-testid="onboarding-step-card"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* STEP 1: CHOOSE YOUR NUMBER */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-[#15803D] uppercase tracking-wider">
                      Lição 1 de 4 · Apenas 75 números no total
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1F]">
                      Toque em um número verde para testar sua escolha
                    </h2>
                    <p className="text-sm text-[#6E6E73] leading-relaxed">
                      Diferente de loterias com milhões de combinações, aqui existem apenas{' '}
                      <strong className="text-[#1D1D1F]">75 números (01 a 75)</strong>. Quando você
                      escolhe um número, ele fica reservado só para você — ninguém mais pode comprar
                      o mesmo número.
                    </p>
                  </div>

                  {/* Interactive Mini-Grid linked to real available numbers */}
                  <div className="bg-[#F5F5F7] rounded-2xl p-4 sm:p-5 space-y-4 border border-black/[0.04]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#1D1D1F]">
                        Experimente: toque em um número disponível abaixo
                      </span>
                      <button
                        type="button"
                        onClick={handleRandomDemoNumber}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-bold flex items-center gap-1.5 border border-black/[0.08] transition-colors cursor-pointer shadow-2xs"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>Surpresinha</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                      {availableDemoNumbers.map((item) => {
                        const isPicked = pickedNumber === item.number;
                        return (
                          <button
                            key={item.number}
                            type="button"
                            onClick={() => handlePickDemoNumber(item.number)}
                            className={`h-14 rounded-2xl font-mono text-base font-extrabold flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isPicked
                                ? 'bg-[#1D1D1F] text-white ring-2 ring-[#16A34A] ring-offset-2 scale-[1.04] shadow-md'
                                : 'bg-gradient-to-b from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] text-white shadow-[0_2px_0_#14532D] active:scale-95'
                            }`}
                          >
                            <span>{item.formatted}</span>
                            <span className="text-[10px] font-sans font-semibold opacity-90">
                              {isPicked ? 'Seu Nº ✓' : 'Livre'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Instant encouragement feedback */}
                    <div className="bg-white rounded-2xl p-4 border border-[#BBF7D0] flex items-start gap-3 shadow-2xs">
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-[#1D1D1F]">
                          {hasInteractedStep1
                            ? `Perfeito! Você selecionou o Nº ${formattedPicked}.`
                            : `O Nº ${formattedPicked} está livre agora na grade oficial!`}
                        </p>
                        <p className="text-[#6E6E73] leading-relaxed">
                          Cada número custa apenas{' '}
                          <strong className="text-[#1D1D1F]">R$ {ticketFormatted}</strong>. Se você
                          quiser, já pode continuar com o{' '}
                          <strong className="text-[#15803D]">Nº {formattedPicked}</strong> até o
                          final deste guia ou ir direto para o PIX.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: THE 1ST BALL RULE (INTERACTIVE QUIZ) */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-[#15803D] uppercase tracking-wider">
                      Lição 2 de 4 · Regra transparente da 1ª Bola
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1F]">
                      Como sabemos quem ganhou os R$ {prizeFormatted} no PIX?
                    </h2>
                    <p className="text-sm text-[#6E6E73] leading-relaxed">
                      Assim que os 75 números fecham, acontece o sorteio do dia. Vale{' '}
                      <strong className="text-[#1D1D1F]">exclusivamente a 1ª bola sorteada</strong>{' '}
                      no globo. Sem pegadinhas e sem dividir prêmio.
                    </p>
                  </div>

                  {/* Interactive Quiz Simulation */}
                  <div className="bg-[#F5F5F7] rounded-2xl p-4 sm:p-5 space-y-4 border border-black/[0.04]">
                    <div className="text-xs font-bold text-[#6E6E73]">
                      Simulação prática: imagine que saíram estas bolas no sorteio de hoje:
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-md ring-2 ring-[#86EFAC]">
                        <div className="w-10 h-10 rounded-full bg-white text-[#15803D] font-mono text-lg font-extrabold flex items-center justify-center shadow-inner">
                          {formattedPicked}
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                            1ª Bola (Valendo!)
                          </div>
                          <div className="text-xs font-extrabold">Prêmio R$ {prizeFormatted}</div>
                        </div>
                      </div>

                      <div className="bg-white text-[#6E6E73] px-3.5 py-2.5 rounded-2xl border border-black/[0.06] font-mono text-sm">
                        2ª Bola: 09
                      </div>
                      <div className="bg-white text-[#6E6E73] px-3.5 py-2.5 rounded-2xl border border-black/[0.06] font-mono text-sm">
                        3ª Bola: 64
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-bold text-[#1D1D1F]">
                        Toque na resposta certa: quem ganha os R$ {prizeFormatted} no PIX?
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setQuizAnswer('ball1')}
                          className={`p-3.5 rounded-2xl text-left text-xs font-bold border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            quizAnswer === 'ball1'
                              ? 'bg-[#F0FDF4] border-[#16A34A] text-[#15803D] ring-2 ring-[#16A34A]/20'
                              : 'bg-white border-black/[0.08] text-[#1D1D1F] hover:bg-white/80'
                          }`}
                        >
                          <span>Quem escolheu o Nº {formattedPicked} (a 1ª Bola)</span>
                          {quizAnswer === 'ball1' && (
                            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuizAnswer('ball2')}
                          className={`p-3.5 rounded-2xl text-left text-xs font-bold border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            quizAnswer === 'ball2'
                              ? 'bg-[#FEF2F2] border-[#DC2626] text-[#B91C1C]'
                              : 'bg-white border-black/[0.08] text-[#1D1D1F] hover:bg-white/80'
                          }`}
                        >
                          <span>Precisa acertar 6 números juntos</span>
                        </button>
                      </div>
                    </div>

                    {quizAnswer === 'ball1' && (
                      <div className="bg-white rounded-2xl p-4 border border-[#BBF7D0] flex items-start gap-3">
                        <Trophy className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-[#15803D]">
                            Exatamente! Acertou na 1ª bola, levou R$ {prizeFormatted} no PIX!
                          </p>
                          <p className="text-[#6E6E73]">
                            Você só precisa acertar 1 único número entre 75. Quando a 1ª bola sai, o
                            sistema identifica o dono do número na hora.
                          </p>
                        </div>
                      </div>
                    )}

                    {quizAnswer === 'ball2' && (
                      <div className="bg-white rounded-2xl p-4 border border-[#FECACA] text-xs text-[#B91C1C] space-y-1">
                        <p className="font-bold">Muito mais fácil que isso!</p>
                        <p>
                          Aqui você NÃO precisa acertar vários números. Basta o seu número (ex: Nº{' '}
                          {formattedPicked}) ser a <strong>1ª bola</strong> a sair no sorteio!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: RASPADINHA INSTANTÂNEA */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-[#15803D] uppercase tracking-wider">
                      Lição 3 de 4 · Bônus imediato após o PIX
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1F]">
                      Comprou, ganhou uma Raspadinha Digital na hora
                    </h2>
                    <p className="text-sm text-[#6E6E73] leading-relaxed">
                      Além de concorrer aos{' '}
                      <strong className="text-[#1D1D1F]">R$ {prizeFormatted}</strong> no sorteio do
                      dia, toda compra libera uma{' '}
                      <strong className="text-[#15803D]">Raspadinha Digital instantânea</strong>.
                      Raspe na tela logo após o PIX para descobrir se ganhou{' '}
                      <strong className="text-[#1D1D1F]">+1 Cartela Extra Grátis</strong> ou bônus
                      de desconto imediato!
                    </p>
                  </div>

                  {/* Interactive Demo Scratch Box */}
                  <div className="bg-[#F5F5F7] rounded-2xl p-4 sm:p-5 space-y-4 border border-black/[0.04]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1D1D1F]">
                        Teste agora como funciona a Raspadinha pós-compra:
                      </span>
                      {demoScratched && (
                        <button
                          type="button"
                          onClick={() => setDemoScratched(false)}
                          className="text-xs font-bold text-[#15803D] hover:underline cursor-pointer"
                        >
                          Testar novamente
                        </button>
                      )}
                    </div>

                    {!demoScratched ? (
                      <button
                        type="button"
                        onClick={() => setDemoScratched(true)}
                        className="w-full py-7 px-4 rounded-2xl bg-gradient-to-r from-[#1D1D1F] via-[#27272A] to-[#1D1D1F] hover:from-black hover:to-black text-white flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99]"
                      >
                        <Sparkles className="w-6 h-6 text-[#4ADE80]" />
                        <span className="text-sm font-extrabold">
                          Toque aqui para raspar o cartão de demonstração
                        </span>
                        <span className="text-xs text-white/75">
                          Descubra o que pode vir junto com o seu número
                        </span>
                      </button>
                    ) : (
                      <div className="bg-gradient-to-br from-[#F0FDF4] to-white rounded-2xl p-5 border-2 border-[#86EFAC] space-y-2 text-center shadow-xs">
                        <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#15803D] bg-[#DCFCE7] px-3 py-1 rounded-full">
                          <Sparkles className="w-3.5 h-3.5" /> Raspadinha Revelada!
                        </div>
                        <p className="text-lg font-extrabold text-[#1D1D1F] inline-flex items-center justify-center gap-2">
                          <Gift className="size-5 text-[#16A34A] shrink-0" />
                          <span>+1 Número Extra Grátis ou Desconto Imediato no PIX</span>
                        </p>
                        <p className="text-xs text-[#6E6E73] max-w-md mx-auto leading-relaxed">
                          Quando sua Raspadinha vem premiada com Cartela Grátis, o sistema adiciona
                          automaticamente um <strong>2º número extra</strong> ao seu comprovante na
                          hora!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: NO PASSWORD / INSTANT CHECKOUT */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-[#15803D] uppercase tracking-wider">
                      Lição 4 de 4 · Sem senha e sem burocracia
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1F]">
                      Seu WhatsApp é a sua chave (zero cadastro chato)
                    </h2>
                    <p className="text-sm text-[#6E6E73] leading-relaxed">
                      Você não precisa criar conta nem decorar senha. Para comprar, basta informar{' '}
                      <strong className="text-[#1D1D1F]">Nome + WhatsApp</strong> (e e-mail opcional
                      se quiser receber o comprovante oficial no e-mail).
                    </p>
                  </div>

                  <div className="bg-[#F5F5F7] rounded-2xl p-4 sm:p-5 space-y-3 border border-black/[0.04]">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white rounded-2xl p-3.5 border border-black/[0.06] space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D1D1F]">
                          <Ticket className="w-4 h-4 text-[#16A34A]" /> 1. Escolha o Nº
                        </div>
                        <p className="text-xs text-[#6E6E73]">
                          Toque no Nº {formattedPicked} (ou quantos quiser) na grade verde.
                        </p>
                      </div>

                      <div className="bg-white rounded-2xl p-3.5 border border-black/[0.06] space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D1D1F]">
                          <Smartphone className="w-4 h-4 text-[#16A34A]" /> 2. Pague no PIX
                        </div>
                        <p className="text-xs text-[#6E6E73]">
                          Copie o código PIX de R$ {ticketFormatted} e confirme no seu banco.
                        </p>
                      </div>

                      <div className="bg-white rounded-2xl p-3.5 border border-black/[0.06] space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D1D1F]">
                          <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> 3. Consulte Sempre
                        </div>
                        <p className="text-xs text-[#6E6E73]">
                          Na aba &ldquo;Meus Números&rdquo;, digite seu WhatsApp para ver suas
                          cartelas.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={verifiedRule}
                        onChange={(e) => setVerifiedRule(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#16A34A]"
                      />
                      <span className="text-xs font-bold text-[#1D1D1F]">
                        Entendi! Quero garantir meu Nº {formattedPicked} por R$ {ticketFormatted}{' '}
                        agora.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Step Footer Navigation Buttons */}
          <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(totalSteps, prev + 1))}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <span>Continuar ({currentStep}/{totalSteps})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBuyPickedNumberNow}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <span>Garantir Nº {formattedPicked} no PIX Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Sticky Live Ticket Summary & 1-Click Direct Purchase */}
        <aside className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6 space-y-5 lg:sticky lg:top-20 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3.5">
            <div>
              <span className="text-xs text-[#6E6E73] font-medium block">
                Sua Simulação em Tempo Real
              </span>
              <h3 className="text-base font-extrabold text-[#1D1D1F]">
                Edição #{String(adminConfig.editionNumber).padStart(2, '0')} · 1ª Bola
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white font-mono text-base font-extrabold flex items-center justify-center shadow-sm">
              {formattedPicked}
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-[#6E6E73]">Número selecionado no guia</span>
              <span className="font-mono font-bold text-[#1D1D1F]">Nº {formattedPicked}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#6E6E73]">Valor da cartela</span>
              <span className="font-mono font-bold text-[#1D1D1F]">R$ {ticketFormatted}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#6E6E73]">Prêmio se sair na 1ª Bola</span>
              <span className="font-mono font-extrabold text-[#15803D]">
                R$ {prizeFormatted} no PIX
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#6E6E73]">Bônus incluso na compra</span>
              <span className="font-bold text-[#1D1D1F]">1 Raspadinha Digital</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleBuyPickedNumberNow}
              className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Comprar Nº {formattedPicked} por R$ {ticketFormatted}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onStartPlayingNow()}
              className="w-full min-h-[42px] py-2.5 px-4 rounded-2xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs transition-colors cursor-pointer"
            >
              Ver todos os 75 números na grade
            </button>
          </div>

          {/* Quick FAQ Summary */}
          <div className="pt-3 border-t border-black/[0.06] space-y-2 text-xs text-[#6E6E73]">
            <div className="flex items-center gap-1.5 font-bold text-[#1D1D1F]">
              <HelpCircle className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Resumo rápido em 3 pontos:</span>
            </div>
            <p>1. Só existem 75 números (01 a 75) por sorteio.</p>
            <p>2. Fechou os 75 números, a 1ª bola sorteada ganha R$ {prizeFormatted} no PIX.</p>
            <p>
              3. Toda compra libera 1 Raspadinha Digital na hora para concorrer a Cartela Grátis ou
              desconto no PIX.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
