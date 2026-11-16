export const HERO_PRIZE_IMAGE = '/src/assets/images/hero_daily_prize_1794082205155.jpg';
export const WINNER_MARIA_IMAGE = '/src/assets/images/winner_proof_maria_1794082208257.jpg';
export const WINNER_LUCAS_IMAGE = '/src/assets/images/winner_proof_lucas_1794082209229.jpg';
export const BRAND_SHOWCASE_IMAGE = '/src/assets/images/brand_concept_showcase_1794082209316.jpg';

export interface ReferralEntry {
  id: string;
  rank: number;
  name: string;
  city: string;
  handle: string;
  validatedInvites: number;
  points: number;
  creditsBRL: number;
  isCurrentUser?: boolean;
}

export interface ContentDayItem {
  day: number;
  channel: 'Instagram' | 'WhatsApp' | 'TikTok' | 'YouTube';
  pillar: 'Transparência' | 'Ganhador Real' | 'Remarketing & Escassez' | 'Bastidores & Sorteio';
  title: string;
  hook: string;
  cta: string;
}

export interface RemarketingFlowStep {
  id: string;
  trigger: string;
  timing: string;
  channel: string;
  copyTemplate: string;
  conversionGoal: string;
}

export const REMARKETING_AUTOMATION_FLOWS: RemarketingFlowStep[] = [
  {
    id: 'rmk-1',
    trigger: 'Reservou número mas não pagou o PIX',
    timing: '5 minutos após reservar',
    channel: 'WhatsApp Automático (API Oficial / Evolution API Grátis)',
    copyTemplate:
      'Oi {{nome}}! Seu número Nº {{numero}} na rodada de R$ {{premio}} ainda está reservado por mais 5 minutos. Vai deixar outra pessoa pegar seu número da sorte? Toque aqui para copiar seu PIX de R$ {{valor_cota}} e liberar sua Raspadinha grátis!',
    conversionGoal: 'Recupera 42% dos PIX gerados e não pagos antes de expirar os 10 minutos.',
  },
  {
    id: 'rmk-2',
    trigger: 'Gatilho de Escassez (Faltam 10 números para fechar 75/75)',
    timing: 'Disparo automático quando chega em 65/75 vendidos',
    channel: 'Status do WhatsApp + Lista de Transmissão VIP',
    copyTemplate:
      '🚨 FALTAM SÓ 10 NÚMEROS! A grade da Edição #{{edicao}} (Prêmio R$ {{premio}} no PIX) está em 65/75! Assim que o último número sair, já rodamos a 1ª bola ao vivo. Garanta um dos últimos verdes por R$ {{valor_cota}}!',
    conversionGoal: 'Fecha os últimos 15% da grade em menos de 12 minutos.',
  },
  {
    id: 'rmk-3',
    trigger: 'Pós-Sorteio + Raspadinha com Bônus Ativo',
    timing: '2 minutos após sair a 1ª bola da edição',
    channel: 'WhatsApp Individual para os 74 participantes que não levaram a 1ª bola',
    copyTemplate:
      'Resultado Oficial Edição #{{edicao}}: A 1ª bola sorteada foi a Nº {{bola_1}} ({{ganhador}} levou R$ {{premio}} no PIX!). Mas você ganhou R$ 1,50 de desconto na sua Raspadinha! Use agora na Edição #{{proxima_edicao}} antes que expire hoje.',
    conversionGoal: 'Recompra imediata de 35% a 50% dos participantes para a próxima grade.',
  },
];

export const THIRTY_DAY_CALENDAR: ContentDayItem[] = [
  { day: 1, channel: 'Instagram', pillar: 'Transparência', title: 'Regra Simples: 75 Números e a 1ª Bola Ganha', hook: 'Sem complicação: fechou os 75 números, a 1ª bola que sair leva o PIX do dia!', cta: 'Escolha seu número na bio' },
  { day: 2, channel: 'TikTok', pillar: 'Bastidores & Sorteio', title: 'Exemplo real: Saiu a bola 25, a Maria ganhou R$ 200!', hook: 'Mostrando na prática como funciona o sorteio assim que fecha a grade.', cta: 'Participe hoje a partir de R$ 1,50' },
  { day: 3, channel: 'WhatsApp', pillar: 'Ganhador Real', title: 'Comprovante PIX pago 1 minuto após a 1ª bola', hook: 'Grade fechou, 1ª bola sorteada saiu e o PIX caiu na hora!', cta: 'Nova grade de R$ 200 aberta' },
  { day: 4, channel: 'YouTube', pillar: 'Transparência', title: 'Por que fazemos prêmios de R$ 75, R$ 200 e R$ 500?', hook: 'Transparência total: prêmios reais, rápidos e sustentáveis todos os dias.', cta: 'Veja os resultados auditados' },
  { day: 5, channel: 'Instagram', pillar: 'Remarketing & Escassez', title: 'Comprou seu número? Raspe sua Raspadinha na hora!', hook: 'Todo número confirmado no PIX libera 1 Raspadinha instantânea no celular.', cta: 'Toque para escolher seu número' },
  { day: 6, channel: 'TikTok', pillar: 'Ganhador Real', title: 'Sorteio da 1ª Bola ao vivo: R$ 500 no PIX', hook: 'Veja as bolas saindo ao vivo assim que fechou 75/75.', cta: 'Faltam poucos números para fechar' },
  { day: 7, channel: 'WhatsApp', pillar: 'Remarketing & Escassez', title: 'Faltam apenas 8 números verdes na grade!', hook: 'Quem pegar os últimos 8 números já destrava o sorteio de hoje!', cta: 'Garantir último número' },
  { day: 8, channel: 'Instagram', pillar: 'Bastidores & Sorteio', title: 'Como consultar seu número só com o WhatsApp (Sem Senha)', hook: 'Não precisa criar conta nem lembrar senha: digite seu WhatsApp e veja tudo.', cta: 'Teste agora no site' },
];
