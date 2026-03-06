import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2" data-testid="text-privacy-title">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: Março de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Mente Financeira ("nós", "nosso"), operada pelo SGS Group, respeita a sua privacidade e está comprometida em proteger os seus dados pessoais. Esta política descreve como recolhemos, utilizamos, armazenamos e protegemos as suas informações em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD/GDPR) da União Europeia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">2. Dados que Recolhemos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Recolhemos apenas os dados necessários para fornecer os nossos serviços de organização financeira:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li><strong className="text-foreground">Dados de conta:</strong> Nome, endereço de email</li>
              <li><strong className="text-foreground">Dados de autenticação:</strong> Senha (armazenada com hash seguro bcrypt, nunca em texto simples)</li>
              <li><strong className="text-foreground">Dados financeiros:</strong> Contas, transações, projeções e compromissos que você insere no app</li>
              <li><strong className="text-foreground">Dados de pagamento:</strong> Processados diretamente pelo Stripe — não armazenamos dados de cartão</li>
              <li><strong className="text-foreground">Dados de sessão:</strong> Informações técnicas de login para manter a sua sessão ativa</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">3. Como Utilizamos os Seus Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Os seus dados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li>Fornecer e manter os serviços de organização financeira</li>
              <li>Autenticar o seu acesso à plataforma</li>
              <li>Processar pagamentos através do Stripe</li>
              <li>Enviar comunicações essenciais sobre a sua conta</li>
              <li>Melhorar a qualidade dos nossos serviços</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">4. Partilha de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Nunca vendemos os seus dados pessoais a terceiros.</strong> Os seus dados só são partilhados com o Stripe para processamento de pagamentos. Não partilhamos, vendemos ou alugamos as suas informações pessoais a nenhuma outra entidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas e organizacionais para proteger os seus dados, incluindo: encriptação de senhas com bcrypt (12 rounds), sessões seguras com cookies HTTPOnly, conexões HTTPS encriptadas, e acesso restrito à base de dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">6. Os Seus Direitos (RGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Nos termos do RGPD, você tem os seguintes direitos:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li><strong className="text-foreground">Acesso:</strong> Solicitar uma cópia dos seus dados pessoais</li>
              <li><strong className="text-foreground">Retificação:</strong> Corrigir dados incorretos ou incompletos</li>
              <li><strong className="text-foreground">Eliminação:</strong> Solicitar a eliminação dos seus dados ("direito ao esquecimento")</li>
              <li><strong className="text-foreground">Portabilidade:</strong> Receber os seus dados num formato estruturado</li>
              <li><strong className="text-foreground">Oposição:</strong> Opor-se ao processamento dos seus dados</li>
              <li><strong className="text-foreground">Retirada de consentimento:</strong> Retirar o consentimento a qualquer momento</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Para exercer qualquer um destes direitos, contacte-nos em: <strong className="text-foreground">info@sgsgroup.ie</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">7. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os seus dados são mantidos enquanto a sua conta estiver ativa. Após a eliminação da conta, os seus dados pessoais serão removidos no prazo de 30 dias, excepto quando a lei exigir a sua retenção.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">8. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para questões sobre esta política ou sobre os seus dados pessoais, contacte o SGS Group em: <strong className="text-foreground">info@sgsgroup.ie</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
