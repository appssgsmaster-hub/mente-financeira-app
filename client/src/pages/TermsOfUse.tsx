import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2" data-testid="text-terms-title">
          Termos de Uso
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: Março de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao aceder e utilizar a plataforma Mente Financeira, operada pelo SGS Group, você concorda com estes Termos de Uso. Se não concordar com algum destes termos, não deverá utilizar os nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Mente Financeira é uma ferramenta de organização financeira pessoal que oferece funcionalidades como o método das 6 contas, distribuição automatizada de rendimentos, projeções financeiras, e conteúdo educativo sobre finanças pessoais. O serviço é fornecido "tal como está" e destina-se apenas a fins informativos e organizacionais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">3. Conta de Utilizador</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar o serviço, deve criar uma conta fornecendo informações verdadeiras e completas. Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">4. Período de Teste e Pagamentos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Oferecemos um período de teste gratuito de 15 dias. Após este período, é necessário adquirir um dos nossos planos para continuar a utilizar o serviço. Todos os pagamentos são processados de forma segura pelo Stripe. Os planos são pagamentos únicos e não reembolsáveis, excepto nos casos previstos pela legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">5. Responsabilidade Financeira</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">O Mente Financeira é uma ferramenta de organização e educação financeira, não um serviço de consultoria financeira.</strong> As informações e ferramentas fornecidas não constituem aconselhamento financeiro, fiscal ou jurídico. Você é inteiramente responsável pelas suas decisões financeiras. Recomendamos que consulte um profissional qualificado antes de tomar decisões financeiras importantes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo, design, código e metodologias disponíveis na plataforma são propriedade do SGS Group e estão protegidos por direitos de autor. Não é permitida a reprodução, distribuição ou modificação sem autorização prévia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O SGS Group não se responsabiliza por quaisquer perdas financeiras, danos diretos ou indiretos resultantes da utilização da plataforma. O serviço é fornecido sem garantias de qualquer tipo, expressas ou implícitas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">8. Rescisão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de suspender ou encerrar a sua conta caso viole estes termos. Você pode solicitar a eliminação da sua conta a qualquer momento, contactando-nos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">9. Lei Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos são regidos pelas leis da República da Irlanda e da União Europeia, incluindo o RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">10. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para questões sobre estes termos, contacte o SGS Group em: <strong className="text-foreground">info@sgsgroup.ie</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
