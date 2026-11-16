/**
 * ============================================================================
 * GOOGLE APPS SCRIPT — PLANILHA ORGANIZADA AUTOMÁTICA + E-MAIL GRÁTIS
 * ============================================================================
 * COMO USAR (Leva 2 minutos e é 100% Grátis):
 * 1. Crie uma Planilha no Google Sheets (sheets.new).
 * 2. No menu superior, clique em: Extensões -> Apps Script.
 * 3. Apague o que estiver lá, cole este código abaixo e clique em Salvar.
 * 4. Clique no botão azul "Implantar" -> "Nova implantação" (ou "Gerenciar implantações" -> Editar -> Nova versão).
 * 5. Tipo "App da Web", em "Quem pode acessar" marque "Qualquer pessoa" e clique em Implantar.
 * 6. Copie a URL gerada (termina com /exec) e cole na variável VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL na Vercel!
 */

function setupSheetStructure_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    var headers = [
      'Data / Hora',
      'Edição',
      'Status',
      'Números',
      'Cliente',
      'WhatsApp',
      'E-mail',
      'Valor Pago (R$)',
      'ID PIX',
      'Vendedor / Indicação',
      'Prêmio Raspadinha',
    ];
    sheet.appendRow(headers);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground('#063D2B')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter();

    var widths = [150, 110, 170, 140, 200, 140, 220, 120, 160, 160, 240];
    for (var i = 0; i < widths.length; i++) {
      sheet.setColumnWidth(i + 1, widths[i]);
    }
  }
  return sheet;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // Trava de fila para nunca misturar duas compras simultâneas

  try {
    var payload = JSON.parse(e.postData.contents || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var isPending = payload.status === 'Pagamento em Conferência';
    var targetTab = isPending ? 'PIX_Em_Conferencia' : 'Vendas_Confirmadas';
    var sheet = setupSheetStructure_(ss, targetTab);

    var numbersText = Array.isArray(payload.numbers)
      ? payload.numbers.join(', ')
      : String(payload.numbers || '');

    var prizeValue = Number(payload.prizeAmountBRL || 0);
    var prizeLabel =
      payload.prizeTitle ||
      (prizeValue > 0
        ? 'Prêmio R$ ' + prizeValue.toFixed(2).replace('.', ',') + ' no PIX (1ª Bola)'
        : 'Prêmio do Dia no PIX (1ª Bola)');

    var scratchText =
      payload.scratchTitle ||
      payload.scratchRewardLabel ||
      'Disponível no site';

    var amountPaid = Number(payload.amountPaid || 0);

    // 1. Grava linha formatada na aba correta (PIX_Em_Conferencia ou Vendas_Confirmadas)
    sheet.appendRow([
      new Date(),
      payload.editionNumber || 'Edição #01',
      payload.status || 'Confirmado',
      numbersText,
      payload.customerName || 'Cliente',
      payload.customerWhatsapp || '',
      payload.customerEmail || '',
      amountPaid,
      payload.pixTxId || '',
      payload.affiliateName || 'Direto',
      isPending ? 'Bloqueada até conferência' : scratchText,
    ]);

    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange(lastRow, 8).setNumberFormat('R$ #,##0.00');

    // 2. Só envia e-mail de confirmação se o PIX NÃO estiver pendente de conferência
    if (
      !isPending &&
      payload.customerEmail &&
      String(payload.customerEmail).indexOf('@') !== -1
    ) {
      var subject =
        'Comprovante Oficial Chance Premiada — Nº ' +
        numbersText +
        ' (' +
        (payload.editionNumber || 'Edição') +
        ')';

      var htmlBody =
        '<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">' +
        '<h2 style="color: #063D2B; margin-top: 0;">Chance Premiada — Número Confirmado!</h2>' +
        '<p>Olá, <strong>' + (payload.customerName || 'Participante') + '</strong>!</p>' +
        '<p>Seu pagamento PIX foi validado e seus números já estão garantidos na grade:</p>' +
        '<div style="background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 12px; margin: 16px 0;">' +
        '<p style="margin: 0; font-size: 18px; font-weight: bold; color: #063D2B;">Números: Nº ' +
        numbersText +
        '</p>' +
        '<p style="margin: 6px 0 0 0; font-size: 13px; color: #374151;">' +
        prizeLabel +
        ' · Recibo: ' +
        (payload.pixTxId || '') +
        '</p>' +
        '</div>' +
        '<p style="font-size: 13px; color: #4b5563;"><strong>Sua Raspadinha Digital:</strong> ' +
        scratchText +
        '</p>' +
        '<p style="font-size: 12px; color: #6b7280; margin-top: 24px;">Consulte seus bilhetes e o resultado da 1ª bola a qualquer momento digitando apenas seu WhatsApp no site.</p>' +
        '</div>';

      MailApp.sendEmail({
        to: payload.customerEmail,
        subject: subject,
        htmlBody: htmlBody,
      });
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
