type FinancialContext = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  transactionCount: number;
  accountCount: number;
  savingsRatio: number;
  hasCommitments: boolean;
  alertCount: number;
  userName: string;
  dayOfWeek: number;
  hour: number;
};

const WELCOME_NEW_USER = [
  "Toda grande jornada começa com o primeiro passo. Bem-vindo ao seu ecossistema!",
  "Organizar suas finanças é o primeiro ato de amor próprio. Vamos juntos!",
  "Você já está à frente de 90% das pessoas só por estar aqui. Vamos começar!",
  "A prosperidade começa com clareza. Registre sua primeira entrada hoje.",
  "Seu futuro financeiro começa agora. Cada centavo no lugar certo faz diferença.",
];

const HIGH_SAVINGS = [
  "Excelente disciplina! Você está guardando mais do que gasta. Continue assim!",
  "Seu ecossistema está forte. A consistência é o segredo dos que prosperam.",
  "Parabéns pela gestão! Quem controla o dinheiro, controla o destino.",
  "Seus números mostram maturidade financeira. Você é inspiração!",
  "Reservas saudáveis, mente tranquila. Você está no caminho certo!",
];

const BALANCED = [
  "Equilíbrio é sabedoria. Continue acompanhando seus números de perto.",
  "Seu ecossistema está estável. Pequenos ajustes levam a grandes resultados.",
  "Manter o controle já é uma vitória. Agora foque em aumentar suas entradas.",
  "Você está gerenciando bem. Busque oportunidades para fortalecer suas reservas.",
  "Consistência é a chave. Cada mês no controle é um passo rumo à liberdade financeira.",
];

const HIGH_EXPENSES = [
  "Atenção: suas saídas estão altas este mês. Revise seus gastos com calma.",
  "Momento de recalcular a rota. Identifique gastos que podem ser cortados.",
  "Foco na solução! Analise onde seu dinheiro está indo e redirecione.",
  "Gastos altos não são o fim — são um sinal para agir. Você tem o controle.",
  "Respire fundo. Todo ajuste financeiro começa com consciência, e você já tem isso.",
];

const HAS_ALERTS = [
  "Você tem compromissos próximos. Organize-se para honrá-los com tranquilidade.",
  "Compromissos chegando! Planejamento é o que separa o estresse da paz financeira.",
  "Olho nos prazos! Antecipar pagamentos evita juros e mantém seu score saudável.",
];

const MONDAY_MOTIVATION = [
  "Nova semana, novas oportunidades! Revise seus números e planeje sua semana.",
  "Segunda-feira é dia de foco. Seu ecossistema financeiro merece atenção.",
  "Comece a semana com propósito. Cada decisão financeira conta.",
];

const FRIDAY_REFLECTION = [
  "Sexta-feira! Hora de celebrar as conquistas da semana e planejar o descanso.",
  "Final de semana chegando. Revise seus gastos da semana antes de relaxar.",
  "Parabéns por mais uma semana de controle financeiro! Você merece.",
];

const MORNING_ENERGY = [
  "Manhã de possibilidades! Seu ecossistema financeiro está esperando por você.",
  "Bom dia, estrategista! Cada manhã é uma chance de prosperar.",
  "O amanhecer traz clareza. Aproveite para revisar seu planejamento.",
];

const EVENING_CALM = [
  "Noite de reflexão. Como foi seu dia financeiro? Registre antes de descansar.",
  "Encerre o dia com consciência. Suas finanças agradecem a atenção.",
  "Boa noite! Lembre-se: quem dorme com as contas em dia, descansa melhor.",
];

const GENERAL_WISDOM = [
  "Dinheiro é ferramenta, não destino. Use-o para construir a vida que deseja.",
  "Prosperidade não é sorte — é método, disciplina e visão. Você tem os três.",
  "O SGS Group acredita: Foco na Solução. Seus números são a bússola.",
  "Riqueza se constrói em silêncio, com hábitos diários. Continue firme.",
  "Não é sobre quanto você ganha, é sobre quanto você mantém e multiplica.",
  "Sua mente financeira é seu maior ativo. Cuide dela todos os dias.",
  "Quem domina suas finanças, domina sua liberdade.",
  "Pequenas decisões diárias criam grandes resultados anuais.",
  "A verdadeira riqueza é ter escolhas. Continue construindo as suas.",
  "Cada real no lugar certo é um tijolo na sua fortaleza financeira.",
];

function pickRandom(arr: string[]): string {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = seed % arr.length;
  return arr[index];
}

export function getMentorMessage(ctx: FinancialContext): string {
  if (ctx.transactionCount === 0) {
    return pickRandom(WELCOME_NEW_USER);
  }

  if (ctx.alertCount > 0) {
    if (Math.random() > 0.5) return pickRandom(HAS_ALERTS);
  }

  if (ctx.dayOfWeek === 1) {
    if (Math.random() > 0.6) return pickRandom(MONDAY_MOTIVATION);
  }

  if (ctx.dayOfWeek === 5) {
    if (Math.random() > 0.6) return pickRandom(FRIDAY_REFLECTION);
  }

  if (ctx.hour < 12) {
    if (Math.random() > 0.7) return pickRandom(MORNING_ENERGY);
  }

  if (ctx.hour >= 20) {
    if (Math.random() > 0.7) return pickRandom(EVENING_CALM);
  }

  if (ctx.monthlyIncome > 0 && ctx.monthlyExpense > 0) {
    const ratio = ctx.monthlyExpense / ctx.monthlyIncome;
    if (ratio < 0.5) return pickRandom(HIGH_SAVINGS);
    if (ratio < 0.8) return pickRandom(BALANCED);
    return pickRandom(HIGH_EXPENSES);
  }

  if (ctx.totalBalance > 0 && ctx.monthlyIncome === 0 && ctx.monthlyExpense === 0) {
    return pickRandom(BALANCED);
  }

  return pickRandom(GENERAL_WISDOM);
}
