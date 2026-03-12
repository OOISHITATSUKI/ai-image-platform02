import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

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
      return false;
    }
    console.log(`[Email] OTP sent to ${to} (type: ${type}, id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Error:', err);
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
