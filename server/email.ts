import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Mente Financeira <onboarding@resend.dev>';

export async function sendTrialExpiredEmail(to: string, name: string) {
  const plansUrl = 'https://financial-prosperity.replit.app/planos';
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Seu período gratuito expirou — Mente Financeira',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 14px; margin-bottom: 12px;">
              <span style="color: white; font-weight: 800; font-size: 18px; letter-spacing: -1px;">MF</span>
            </div>
            <h1 style="color: #1a1a2e; font-size: 24px; margin: 8px 0 0;">Mente Financeira</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Prosperar é Viver</p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Olá, <strong>${name}</strong>!</p>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            O seu período de avaliação gratuita de <strong>7 dias</strong> do Mente Financeira chegou ao fim.
          </p>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Esperamos que estes dias tenham sido úteis para explorar o Método das 6 Contas e dar os primeiros passos na sua transformação financeira. 🚀
          </p>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
              ⚠️ O acesso às funcionalidades premium foi temporariamente suspenso. Escolha um plano para continuar a sua jornada.
            </p>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Os seus dados estão seguros e aguardam por si. Basta escolher um plano para retomar de onde parou:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${plansUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 14px 36px;
                      border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">
              Ver Planos e Continuar →
            </a>
          </div>

          <div style="background: #f0fdf4; border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
            <p style="color: #166534; font-size: 13px; margin: 0 0 8px; font-weight: 600;">🎯 Planos disponíveis:</p>
            <ul style="color: #374151; font-size: 14px; margin: 0; padding: 0 0 0 20px; line-height: 2;">
              <li><strong>Mente Financeira App</strong> — €47 (pagamento único)</li>
              <li><strong>Método Mente Financeira</strong> — €197 (app + método completo)</li>
              <li><strong>Mentoria Transformação</strong> — €697 (programa premium)</li>
            </ul>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />

          <p style="color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.6;">
            SGS Group — Foco na Solução<br/>
            Este é um email automático enviado uma única vez. Por favor, não responda.<br/>
            <a href="${plansUrl}" style="color: #4F46E5; text-decoration: none;">Aceder aos planos</a>
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('Trial expired email send error:', error);
  }

  return data;
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Redefinir sua senha — Mente Financeira',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Mente Financeira</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Prosperar é Viver</p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Olá, <strong>${name}</strong>!</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta. 
            Clique no botão abaixo para criar uma nova senha:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: #1a1a2e; color: white; padding: 14px 32px; 
                      border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição de senha, 
            ignore este email — sua conta permanece segura.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            SGS Group — Foco na Solução<br/>
            Este é um email automático, por favor não responda.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('Email send error:', error);
    throw new Error('Erro ao enviar email de recuperação');
  }

  return data;
}
