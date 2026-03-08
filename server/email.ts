import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Mente Financeira <onboarding@resend.dev>';

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
