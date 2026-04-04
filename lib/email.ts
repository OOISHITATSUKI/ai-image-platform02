import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-server';

let resendInstance: Resend | null = null;
const getResend = () => {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY is missing. Email features will be disabled.');
      return null;
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
};
const FROM = process.env.RESEND_FROM || 'Image Nude <noreply@imagenude.com>';

// ── Email Log Helper ──────────────────────────────────────────
async function logEmail(params: {
  userId?: string | null;
  emailTo: string;
  emailType: string;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage?: string | null;
}) {
  try {
    await supabaseAdmin.from('email_logs').insert({
      user_id: params.userId ?? null,
      email_to: params.emailTo,
      email_type: params.emailType,
      subject: params.subject,
      status: params.status,
      error_message: params.errorMessage ?? null,
    });
  } catch (e) {
    console.error('[Email] Failed to log email:', e);
  }
}

export async function sendOTPEmail(to: string, otp: string, type: 'register' | 'login' | 'reset' | 'verify' = 'register') {
  const subjects: Record<string, string> = {
    register: '【Image Nude】メール認証コード',
    login: '【Image Nude】ログイン認証コード',
    reset: '【Image Nude】パスワードリセット認証コード',
    verify: '【Image Nude】メール認証コード',
  };

  const descriptions: Record<string, string> = {
    register: 'アカウント登録のための認証コードです。',
    login: '新しいデバイスからのログインが検出されました。',
    reset: 'パスワードの再設定がリクエストされました。',
    verify: 'メールアドレスの認証コードです。',
  };

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a1a; padding: 40px 20px;">
      <div style="max-width: 480px; margin: auto; background: #1a1a2e; border-radius: 12px; padding: 40px; border: 1px solid #2a2a4a;">
        <h1 style="color: #c084fc; font-size: 24px; margin: 0 0 8px; text-align: center;">Image Nude</h1>
        <p style="color: #9999ae; font-size: 14px; text-align: center; margin: 0 0 30px;">${descriptions[type]}</p>
        <div style="background: #0f0f23; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ffffff;">${otp}</span>
        </div>
        <p style="color: #6b6b85; font-size: 13px; text-align: center; margin: 0;">
          このコードは10分間有効です。<br>心当たりがない場合はこのメールを無視してください。
        </p>
      </div>
    </div>
  `;

  try {
    const resend = getResend();
    if (!resend) {
      console.error('[Email] Cannot send email: Resend is not initialized.');
      return false;
    }

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: subjects[type],
      html,
    });
    if (error) {
      console.error('[Email] Send failed:', error);
      await logEmail({ emailTo: to, emailType: type === 'reset' ? 'reset_password' : 'verify', subject: subjects[type], status: 'failed', errorMessage: error.message });
      return false;
    }
    console.log(`[Email] OTP sent to ${to} (type: ${type}, id: ${data?.id})`);
    await logEmail({ emailTo: to, emailType: type === 'reset' ? 'reset_password' : 'verify', subject: subjects[type], status: 'sent' });
    return true;
  } catch (err) {
    console.error('[Email] Error:', err);
    await logEmail({ emailTo: to, emailType: type === 'reset' ? 'reset_password' : 'verify', subject: subjects[type], status: 'failed', errorMessage: String(err) });
    return false;
  }
}

// ── Welcome Email ──────────────────────────────────────────────

const WELCOME_CONTENT: Record<string, { subject: string; heading: string; subheading: string; items: string[]; cta: string; privacy: string; footer: string }> = {
  en: {
    subject: 'Welcome to Image Nude — Your 20 Free Credits Are Ready',
    heading: 'Welcome to Image Nude!',
    subheading: "Your account is ready. Here's what you can do:",
    items: [
      '20 free credits loaded',
      'Text to Image — describe anything, AI creates it',
      'Face Swap — swap any face onto any body',
      'Undress AI — remove clothing from any photo',
    ],
    cta: 'Start creating now',
    privacy: 'Your images are automatically deleted within 1 hour for your privacy.',
    footer: 'Questions? Reply to this email.\n— Image Nude Team',
  },
  ja: {
    subject: 'Image Nude へようこそ — 20クレジットをプレゼント',
    heading: 'Image Nude へようこそ！',
    subheading: 'アカウントの準備ができました。',
    items: [
      '20クレジットを付与しました',
      'テキストから画像生成 — 説明するだけでAIが作成',
      'フェイススワップ — 顔を自由に入れ替え',
      'Undress AI — 写真から衣服を除去',
    ],
    cta: '今すぐ始める',
    privacy: 'プライバシー保護のため、画像は1時間以内に自動削除されます。',
    footer: 'ご質問はこのメールに返信してください。\n— Image Nude チーム',
  },
  es: {
    subject: 'Bienvenido a Image Nude — Tus 20 créditos gratuitos están listos',
    heading: '¡Bienvenido a Image Nude!',
    subheading: 'Tu cuenta está lista. Esto es lo que puedes hacer:',
    items: [
      '20 créditos gratuitos cargados',
      'Texto a imagen — describe cualquier cosa, la IA lo crea',
      'Face Swap — cambia cualquier cara en cualquier cuerpo',
      'Undress AI — elimina ropa de cualquier foto',
    ],
    cta: 'Empieza a crear ahora',
    privacy: 'Tus imágenes se eliminan automáticamente en 1 hora para proteger tu privacidad.',
    footer: '¿Preguntas? Responde a este correo.\n— El equipo de Image Nude',
  },
  zh: {
    subject: '欢迎加入 Image Nude — 您的20个免费积分已准备好',
    heading: '欢迎加入 Image Nude！',
    subheading: '您的账户已准备就绪，您可以：',
    items: [
      '已赠送20个免费积分',
      '文字生成图像 — 描述任何内容，AI为您创作',
      '换脸功能 — 将任意脸替换到任意身体上',
      'Undress AI — 去除照片中的衣物',
    ],
    cta: '立即开始创作',
    privacy: '为保护您的隐私，图像将在1小时内自动删除。',
    footer: '如有疑问，请回复此邮件。\n— Image Nude 团队',
  },
  ko: {
    subject: 'Image Nude에 오신 것을 환영합니다 — 20 무료 크레딧이 준비되었습니다',
    heading: 'Image Nude에 오신 것을 환영합니다!',
    subheading: '계정이 준비되었습니다. 다음을 이용하실 수 있습니다:',
    items: [
      '20 무료 크레딧 지급 완료',
      '텍스트로 이미지 생성 — 설명하면 AI가 만들어 드립니다',
      '페이스 스왑 — 어떤 얼굴이든 자유롭게 교체',
      'Undress AI — 사진에서 의류 제거',
    ],
    cta: '지금 바로 시작하기',
    privacy: '개인정보 보호를 위해 이미지는 1시간 이내에 자동 삭제됩니다.',
    footer: '질문이 있으시면 이 이메일에 답장해 주세요.\n— Image Nude 팀',
  },
  pt: {
    subject: 'Bem-vindo ao Image Nude — Seus 20 créditos gratuitos estão prontos',
    heading: 'Bem-vindo ao Image Nude!',
    subheading: 'Sua conta está pronta. Veja o que você pode fazer:',
    items: [
      '20 créditos gratuitos carregados',
      'Texto para Imagem — descreva qualquer coisa, a IA cria',
      'Face Swap — troque qualquer rosto em qualquer corpo',
      'Undress AI — remova roupas de qualquer foto',
    ],
    cta: 'Comece a criar agora',
    privacy: 'Suas imagens são automaticamente excluídas em 1 hora para sua privacidade.',
    footer: 'Dúvidas? Responda a este e-mail.\n— Equipe Image Nude',
  },
};

export async function sendWelcomeEmail(to: string, locale: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = WELCOME_CONTENT[locale] ?? WELCOME_CONTENT['en'];
  const itemRows = content.items
    .map(item => `<tr><td style="padding:6px 0;color:#e0e0ee;font-size:14px;">✅ ${item}</td></tr>`)
    .join('');
  const footerLines = content.footer.split('\n').join('<br>');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a1a;padding:40px 20px;">
      <div style="max-width:520px;margin:auto;background:#1a1a2e;border-radius:12px;padding:40px;border:1px solid #2a2a4a;">
        <h1 style="color:#c084fc;font-size:26px;margin:0 0 8px;text-align:center;">Image Nude</h1>
        <h2 style="color:#ffffff;font-size:18px;margin:0 0 8px;text-align:center;">${content.heading}</h2>
        <p style="color:#9999ae;font-size:14px;text-align:center;margin:0 0 24px;">${content.subheading}</p>
        <div style="background:#0f0f23;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
        </div>
        <div style="text-align:center;margin:0 0 16px;">
          <a href="https://imagenude.com" style="display:inline-block;background:#c084fc;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">${content.cta} →</a>
        </div>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="https://imagenude.com" style="color:#9999ae;font-size:13px;">https://imagenude.com</a>
        </p>
        <p style="color:#6b6b85;font-size:12px;text-align:center;margin:0 0 16px;">${content.privacy}</p>
        <hr style="border:none;border-top:1px solid #2a2a4a;margin:16px 0;" />
        <p style="color:#6b6b85;font-size:12px;text-align:center;margin:0;">${footerLines}</p>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: content.subject,
      html,
    });
    if (error) {
      console.error('[Email] Welcome email failed:', error);
      await logEmail({ emailTo: to, emailType: 'welcome', subject: content.subject, status: 'failed', errorMessage: error.message });
      return false;
    }
    console.log(`[Email] Welcome email sent to ${to} (locale: ${locale}, id: ${data?.id})`);
    await logEmail({ emailTo: to, emailType: 'welcome', subject: content.subject, status: 'sent' });
    return true;
  } catch (err) {
    console.error('[Email] Welcome email error:', err);
    await logEmail({ emailTo: to, emailType: 'welcome', subject: content.subject, status: 'failed', errorMessage: String(err) });
    return false;
  }
}

// ── Admin Milestone Notification ──────────────────────────────
const ADMIN_EMAIL = 'ooisidegesu@gmail.com';
const MILESTONE_FLAG_FILE = path.join(process.cwd(), 'data', 'milestone_100_sent.flag');

export async function checkAndNotifyUserMilestone(activeUserCount: number): Promise<void> {
    if (activeUserCount < 100) return;

    // Only send once
    if (fs.existsSync(MILESTONE_FLAG_FILE)) return;

    try {
        const resend = getResend();
        if (!resend) {
            console.error('[Email] Cannot send milestone notification: Resend not initialized.');
            return;
        }

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a1a; padding: 40px 20px;">
                <div style="max-width: 520px; margin: auto; background: #1a1a2e; border-radius: 12px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #c084fc; font-size: 28px; margin: 0 0 16px; text-align: center;">🎉 Milestone Reached!</h1>
                    <p style="color: #e0e0ee; font-size: 18px; text-align: center; margin: 0 0 24px;">
                        登録ユーザー数が <strong style="color: #22c55e; font-size: 24px;">${activeUserCount}人</strong> に達しました！
                    </p>
                    <div style="background: #0f0f23; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                        <p style="color: #9999ae; font-size: 14px; margin: 0 0 8px;">📊 Next Steps:</p>
                        <ul style="color: #b0b0c8; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                            <li>Supabaseへのデータ移行を検討</li>
                            <li>JSONファイルのパフォーマンス監視</li>
                            <li>スケーリング計画の策定</li>
                        </ul>
                    </div>
                    <p style="color: #6b6b85; font-size: 12px; text-align: center; margin: 0;">
                        Image Nude AI — Admin Notification
                    </p>
                </div>
            </div>
        `;

        const { error } = await resend.emails.send({
            from: FROM,
            to: ADMIN_EMAIL,
            subject: '🎉【Image Nude】登録ユーザー100人達成！',
            html,
        });

        if (error) {
            console.error('[Email] Milestone notification failed:', error);
            return;
        }

        // Write flag file to prevent duplicate sends
        const dir = path.dirname(MILESTONE_FLAG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(MILESTONE_FLAG_FILE, JSON.stringify({
            sentAt: new Date().toISOString(),
            userCount: activeUserCount,
        }));

        console.log(`[Email] Milestone notification sent! Active users: ${activeUserCount}`);
    } catch (err) {
        console.error('[Email] Milestone notification error:', err);
    }
}

// ── Weekly Backup Report Email ──────────────────────────────
export async function sendWeeklyBackupReport(report: {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    totalTransactions: number;
    totalRevenue: number;
    totalCreditsUsed: number;
    backupFiles: string[];
    backupTotalSize: string;
    dataFiles: { name: string; size: string }[];
}): Promise<boolean> {
    try {
        const resend = getResend();
        if (!resend) {
            console.error('[Email] Cannot send backup report: Resend not initialized.');
            return false;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

        const dataFileRows = report.dataFiles
            .map(f => `<tr><td style="padding:6px 12px;color:#b0b0c8;border-bottom:1px solid #2a2a4a;">${f.name}</td><td style="padding:6px 12px;color:#b0b0c8;border-bottom:1px solid #2a2a4a;text-align:right;">${f.size}</td></tr>`)
            .join('');

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a1a; padding: 40px 20px;">
                <div style="max-width: 560px; margin: auto; background: #1a1a2e; border-radius: 12px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #c084fc; font-size: 22px; margin: 0 0 6px; text-align: center;">📦 Weekly Backup Report</h1>
                    <p style="color: #6b6b85; font-size: 13px; text-align: center; margin: 0 0 28px;">${dateStr} — Image Nude</p>

                    <h2 style="color: #e0e0ee; font-size: 15px; margin: 0 0 12px;">👥 Users</h2>
                    <div style="background: #0f0f23; border-radius: 8px; padding: 16px; margin: 0 0 20px; display: flex; justify-content: space-around;">
                        <div style="text-align: center;">
                            <div style="color: #22c55e; font-size: 24px; font-weight: bold;">${report.totalUsers}</div>
                            <div style="color: #6b6b85; font-size: 12px;">Total</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #3b82f6; font-size: 24px; font-weight: bold;">${report.activeUsers}</div>
                            <div style="color: #6b6b85; font-size: 12px;">Active</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #ef4444; font-size: 24px; font-weight: bold;">${report.bannedUsers}</div>
                            <div style="color: #6b6b85; font-size: 12px;">Banned</div>
                        </div>
                    </div>

                    <h2 style="color: #e0e0ee; font-size: 15px; margin: 0 0 12px;">💰 Billing</h2>
                    <div style="background: #0f0f23; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
                        <p style="color: #b0b0c8; font-size: 14px; margin: 0 0 6px;">Transactions: <strong style="color:#fff;">${report.totalTransactions}</strong></p>
                        <p style="color: #b0b0c8; font-size: 14px; margin: 0 0 6px;">Total Revenue: <strong style="color:#22c55e;">$${report.totalRevenue.toFixed(2)}</strong></p>
                        <p style="color: #b0b0c8; font-size: 14px; margin: 0;">Credits Used: <strong style="color:#fff;">${report.totalCreditsUsed}</strong></p>
                    </div>

                    <h2 style="color: #e0e0ee; font-size: 15px; margin: 0 0 12px;">💾 Data Files</h2>
                    <table style="width: 100%; border-collapse: collapse; background: #0f0f23; border-radius: 8px; overflow: hidden; margin: 0 0 20px;">
                        <thead><tr>
                            <th style="padding:8px 12px; color:#6b6b85; text-align:left; font-size:12px; border-bottom:1px solid #2a2a4a;">File</th>
                            <th style="padding:8px 12px; color:#6b6b85; text-align:right; font-size:12px; border-bottom:1px solid #2a2a4a;">Size</th>
                        </tr></thead>
                        <tbody>${dataFileRows}</tbody>
                    </table>

                    <h2 style="color: #e0e0ee; font-size: 15px; margin: 0 0 12px;">🗂 Backups</h2>
                    <div style="background: #0f0f23; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
                        <p style="color: #b0b0c8; font-size: 14px; margin: 0 0 6px;">Backup files this week: <strong style="color:#fff;">${report.backupFiles.length}</strong></p>
                        <p style="color: #b0b0c8; font-size: 14px; margin: 0;">Total size: <strong style="color:#fff;">${report.backupTotalSize}</strong></p>
                    </div>

                    <div style="background: #0d2818; border: 1px solid #16a34a44; border-radius: 8px; padding: 12px 16px; text-align: center;">
                        <p style="color: #4ade80; font-size: 14px; margin: 0;">✅ All user data is backed up and secure.</p>
                    </div>

                    <p style="color: #6b6b85; font-size: 11px; text-align: center; margin: 20px 0 0;">
                        Image Nude AI — Automated Backup Report
                    </p>
                </div>
            </div>
        `;

        const { error } = await resend.emails.send({
            from: FROM,
            to: ADMIN_EMAIL,
            subject: `📦【Image Nude】週次バックアップレポート (${dateStr})`,
            html,
        });

        if (error) {
            console.error('[Email] Weekly backup report failed:', error);
            return false;
        }

        console.log('[Email] Weekly backup report sent successfully.');
        return true;
    } catch (err) {
        console.error('[Email] Weekly backup report error:', err);
        return false;
    }
}

// ── Admin → User Custom Email ──────────────────────────────
export async function sendCustomEmail(to: string, subject: string, body: string, emailType: string = 'manual'): Promise<boolean> {
    try {
        const resend = getResend();
        if (!resend) {
            console.error('[Email] Cannot send custom email: Resend not initialized.');
            return false;
        }

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a1a; padding: 40px 20px;">
                <div style="max-width: 520px; margin: auto; background: #1a1a2e; border-radius: 12px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #c084fc; font-size: 22px; margin: 0 0 20px; text-align: center;">Image Nude</h1>
                    <div style="color: #e0e0ee; font-size: 15px; line-height: 1.7;">
                        ${body}
                    </div>
                    <hr style="border: none; border-top: 1px solid #2a2a4a; margin: 30px 0;" />
                    <p style="color: #6b6b85; font-size: 12px; text-align: center; margin: 0;">
                        Image Nude AI — Support
                    </p>
                </div>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject,
            html,
        });

        if (error) {
            console.error('[Email] Custom email send failed:', error);
            await logEmail({ emailTo: to, emailType, subject, status: 'failed', errorMessage: error.message });
            return false;
        }

        console.log(`[Email] Custom email sent to ${to} (id: ${data?.id})`);
        await logEmail({ emailTo: to, emailType, subject, status: 'sent' });
        return true;
    } catch (err) {
        console.error('[Email] Custom email error:', err);
        await logEmail({ emailTo: to, emailType, subject, status: 'failed', errorMessage: String(err) });
        return false;
    }
}
