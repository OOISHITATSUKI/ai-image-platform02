import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'Image Nude <noreply@send.imagenude.com>';

export async function sendOTPEmail(to: string, otp: string, type: 'register' | 'login' | 'reset' = 'register') {
  const subjects: Record<string, string> = {
    register: '【Image Nude】メール認証コード',
    login: '【Image Nude】ログイン認証コード',
    reset: '【Image Nude】パスワードリセット認証コード',
  };

  const descriptions: Record<string, string> = {
    register: 'アカウント登録のための認証コードです。',
    login: '新しいデバイスからのログインが検出されました。',
    reset: 'パスワードの再設定がリクエストされました。',
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
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: subjects[type],
      html,
    });
    if (error) {
      console.error('[Email] Send failed:', error);
      return false;
    }
    console.log(`[Email] OTP sent to ${to} (type: ${type}, id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Error:', err);
    return false;
  }
}
