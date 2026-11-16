// Vercel Serverless Function: POST /api/notify-telegram
// Sends real-time sale alerts to the Admin's private Telegram (and optional privacy-safe public channel)
// keeping TELEGRAM_BOT_TOKEN secure on the server side.

function escapeMarkdown(text: string): string {
  return String(text || '').replace(/([_*`\[])/g, '\\$1');
}

function maskPublicName(fullName: string): string {
  const parts = String(fullName || '').trim().split(/\s+/);
  if (!parts[0]) return 'Participante';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const botToken = (
    process.env.TELEGRAM_BOT_TOKEN ||
    req.body?.overrideBotToken ||
    ''
  )
    .trim()
    .replace(/^['"]|['"]$/g, '');

  const adminChatId = (
    process.env.TELEGRAM_ADMIN_CHAT_ID ||
    req.body?.overrideAdminChatId ||
    ''
  )
    .trim()
    .replace(/^['"]|['"]$/g, '');

  const publicChannelId = (
    process.env.TELEGRAM_PUBLIC_CHANNEL_ID ||
    req.body?.overridePublicChannelId ||
    ''
  )
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!botToken || botToken.includes('SEU_TOKEN')) {
    return res.status(200).json({
      sent: false,
      skipped: true,
      reason: 'TELEGRAM_BOT_TOKEN not configured on server',
    });
  }

  const {
    eventType = 'pending_pix',
    editionNumber = 'Edição #01',
    customerName = 'Cliente',
    customerWhatsappFormatted = '',
    numbers = [],
    amountBRL = 0,
    pixTxId = '',
    affiliateName = '',
    remainingAvailable,
  } = req.body || {};

  const formattedAmount = Number(amountBRL || 0)
    .toFixed(2)
    .replace('.', ',');
  const numbersList = Array.isArray(numbers) ? numbers.join(', ') : String(numbers || '');

  const sendMessage = async (chatId: string, text: string) => {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    return response.json();
  };

  try {
    const results: Record<string, unknown> = {};

    // 1. Private Admin Notification (Full details for quick bank reconciliation)
    if (adminChatId) {
      const header =
        eventType === 'pending_pix'
          ? `🔔 *NOVO PIX AGUARDANDO APROVAÇÃO*`
          : `✅ *VENDA CONFIRMADA E VALIDADA*`;

      const adminMessage = [
        header,
        ``,
        `🎟 *${escapeMarkdown(editionNumber)}*`,
        `👤 *Cliente:* ${escapeMarkdown(customerName)}`,
        `📱 *WhatsApp:* \`${escapeMarkdown(customerWhatsappFormatted)}\``,
        `🔢 *Números:* \`${escapeMarkdown(numbersList)}\``,
        `💰 *Valor:* *R$ ${formattedAmount}*`,
        `🧾 *Código:* \`${escapeMarkdown(pixTxId)}\``,
        affiliateName ? `🤝 *Vendedor:* ${escapeMarkdown(affiliateName)}` : null,
        typeof remainingAvailable === 'number'
          ? `🟢 *Restam na grade:* ${remainingAvailable} de 75`
          : null,
        eventType === 'pending_pix'
          ? `\n👉 Confira seu banco e toque em *Aprovar PIX* no Painel Admin.`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      results.admin = await sendMessage(adminChatId, adminMessage);
    }

    // 2. Optional Public Channel Social Proof (Only on approved sales, NEVER exposes phone or numbers)
    if (eventType === 'approved_sale' && publicChannelId) {
      const count = Array.isArray(numbers) ? numbers.length : 1;
      const publicMessage = [
        `🎟 *${escapeMarkdown(editionNumber)} — Nova Participação Confirmada!*`,
        ``,
        `👤 *${escapeMarkdown(maskPublicName(customerName))}* garantiu *${count} ${
          count === 1 ? 'número' : 'números'
        }* na grade!`,
        typeof remainingAvailable === 'number'
          ? `⏳ Restam apenas *${remainingAvailable} números livres* para fechar e sortear na 1ª Bola!`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      results.publicChannel = await sendMessage(publicChannelId, publicMessage);
    }

    return res.status(200).json({ sent: true, results });
  } catch (err) {
    return res.status(500).json({
      sent: false,
      error: err instanceof Error ? err.message : 'Telegram request failed',
    });
  }
}
