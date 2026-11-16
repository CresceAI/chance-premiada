# Chance Premiada — Documentação da Plataforma & Deploy

> **Visão do Produto:** Aplicação web responsiva (mobile-first) onde o participante escolhe seus números de **01 a 75**, realiza o pagamento via **PIX** sem precisar criar conta ou senha, desbloqueia uma **Raspadinha Digital** instantânea após a confirmação do pagamento e concorre ao prêmio do dia na **1ª bola sorteada**. A plataforma também integra **Clube de Cupons Locais** e **Links de Parceiros Divulgadores**.

---

## 1. Experiência do Cliente (Visão Pública)

A interface foi projetada com estética nativa mobile (Floating Pill Bottom Dock, atalhos rápidos em Squircles, tipografia `tabular-nums` e suporte a `dvh` / `safe-area`) e é dividida em **4 áreas principais**:

### 1.1. Sorteio do Dia (`src/components/HomeAndGridView.tsx`)
- **Banner Dinâmico por Faixa de Valor (`src/utils/banners.ts`):** Exibe automaticamente a arte oficial correspondente à edição ativa (**R$ 50**, **R$ 75**, **R$ 200** ou **R$ 600 no PIX**), sincronizada com os valores unitários e combos promocionais.
- **Atalhos Rápidos & Termômetro Ao Vivo:** Botões de 1 toque (*Surpresinha*, *Combo 5 Nºs*, *Parceiros*, *Divulgar*) e barra de ocupação em tempo real (`Vendidos / 75`) com avatares empilhados.
- **Grade Interativa `01 a 75`:**
  - `Verde` = Disponível para escolha.
  - `Preto / Limão` = Selecionado no carrinho.
  - `Vermelho Suave` = Reservado / Em conferência de PIX.
  - `Cinza` = Pago e validado (bloqueado contra duplicidade).
- **Combos Promocionais & Cercar Vizinhos:** Seleção automática de 1, 3, 5 ou 10 números com cálculo de desconto aplicado diretamente no PIX.
- **Ranking Público Protegido (Bento Leaderboard):** Exibe participantes confirmados com nome abreviado (`Maria A.`), WhatsApp mascarado (`(85) 9****-4321`) e quantidade de cartelas, **sem jamais expor números escolhidos nem dados pessoais**.
- **Checkout Rápido no PIX (Sem Senha) & Kit de Divulgação 9:16:**
  - Solicita apenas **Nome**, **WhatsApp (com DDD)** e **E-mail opcional**.
  - No modo **PIX Direto (Taxa Zero)**, os números ficam reservados em conferência e o cliente envia o comprovante para o WhatsApp do Administrador. A Raspadinha Digital é liberada automaticamente após a validação do pagamento.
  - Modal de divulgação com card vertical 9:16 pronto para Stories/Status e download das artes oficiais.

### 1.2. Como Jogar — Onboarding Interativo (`src/components/HowToPlayOnboardingView.tsx`)
- Guia prático de **30 segundos** dividido em **4 micro-etapas interativas**:
  1. Escolha do número diretamente na grade;
  2. Regra da **1ª Bola** (mini-simulação);
  3. Demonstração da Raspadinha Digital pós-pagamento;
  4. Consulta sem senha pelo WhatsApp e envio direto para o checkout.

### 1.3. Meus Números & Clube de Parceiros (`src/components/ParticipationsAndLoyaltyView.tsx`)
- **Consulta Sem Senha:** O cliente informa apenas o WhatsApp para acompanhar seus bilhetes, status de conferência do PIX, saldo de **Chance Coins** e Raspadinhas liberadas.
- **Clube de Cupons & Vitrine de Parceiros Locais:**
  - Filtro por categoria e bairros, mini-catálogo de ofertas e vitrine com artes modelo (`src/assets/anuncios/`) para captação de patrocinadores e apoiadores locais, além de portal de autoatendimento para cadastro de comércios.

### 1.4. Resultados (`src/components/ResultsAndCommunityView.tsx`)
- Histórico oficial das edições apuradas destacando a **1ª Bola Sorteada**, ganhador mascarado, prêmio no PIX e links para os canais oficiais da comunidade no WhatsApp e Telegram.

---

## 2. Área Restrita do Administrador (`src/components/AdminPanelView.tsx`)

Acessada pelo botão **`Admin`** e protegida por **PIN de Segurança** (`VITE_ADMIN_PIN`), exclusiva para a gestão operacional:

1. **Fila de Aprovação PIX Direto (1 Clique):**
   - Lista os pedidos em `Pagamento em Conferência` para validação rápida contra o extrato bancário: **Aprovar PIX** (confirma os números na grade, libera a Raspadinha e contabiliza a venda) ou **Recusar / Liberar Nº** (devolve os números imediatamente para verde).
2. **Apuração Manual da 1ª Bola & Fila de Edições (`#01 → #02`):**
   - Permite congelar uma grade fechada e abrir imediatamente a próxima edição sem perder histórico.
   - Ao digitar o número da 1ª bola sorteada (`01` a `75`), identifica o comprador na hora e publica o resultado oficial.
3. **Troca Rápida de Valores & Banner Automático:**
   - Alterna entre as faixas pré-configuradas (**R$ 50**, **R$ 75**, **R$ 200**, **R$ 600**) ou valores personalizados, atualizando automaticamente o banner da tela inicial e os combos.
4. **Gestão de Parceiros Divulgadores (`?ind=codigo`) & Patrocinadores:**
   - Cadastro de vendedores parceiros com link exclusivo rastreável e emissão de comprovante de fechamento por edição.
   - Cadastro de comércios parceiros, anúncios em destaque e acompanhamento de cliques.
5. **Auditoria, Exportação CSV e Alertas Telegram / Planilha:**
   - Exportação da carteira de clientes em CSV e integração automática com Supabase, Google Sheets e Telegram.

---

## 3. Segurança, SEO e Integridade

- **Trava Atômica de Números (`tryReserveNumbersAtomically` / `supabase-schema.sql`):** Impede que duas pessoas comprem o mesmo número na mesma edição (`PRIMARY KEY (edition_number, number_chosen)`).
- **Segredos Isolados no Servidor (`api/`):** Tokens de pagamento (Asaas) e do Bot do Telegram (`TELEGRAM_BOT_TOKEN`) ficam exclusivamente em variáveis de ambiente server-side na Vercel, nunca expostos ao navegador.
- **SEO & Identidade Visual:** Favicon oficial (`public/favicon.svg`), Open Graph e dados estruturados JSON-LD (`WebApplication` + `FAQPage`) configurados em `index.html`.

---

## 4. Estrutura de Arquivos do Projeto

| Arquivo | Responsabilidade |
| :--- | :--- |
| `src/App.tsx` | Shell da aplicação, roteamento de abas, Dock mobile, fila de edições e fluxo de aprovação PIX. |
| `src/components/HomeAndGridView.tsx` | Banner dinâmico, atalhos rápidos, grade `01–75`, combos, leaderboard público e checkout PIX. |
| `src/components/HowToPlayOnboardingView.tsx` | Onboarding interativo em 4 passos integrado ao carrinho. |
| `src/components/ParticipationsAndLoyaltyView.tsx` | Consulta por WhatsApp, Raspadinhas e Clube de Cupons / Vitrine de Parceiros. |
| `src/components/ResultsAndCommunityView.tsx` | Histórico oficial de resultados da 1ª bola e comunidade. |
| `src/components/ScratchCardWidget.tsx` | Raspadinha digital em `<canvas>` liberada após validação do PIX. |
| `src/components/AdminPanelView.tsx` | Painel administrativo (fila de aprovação PIX, apuração da 1ª bola, valores, parceiros e CSV). |
| `src/utils/engine.ts` | Regras de negócio, gerador EMV CRC16 (PIX Banco Central), combos, máscaras de privacidade e apuração. |
| `src/utils/banners.ts` | Mapeamento automático das artes oficiais por faixa de prêmio/cota e vitrine de anúncios. |
| `src/services/database.ts` | Persistência local + sincronização com Supabase PostgreSQL, APIs `/api/*` e webhooks. |
| `api/create-pix.ts` & `api/check-pix.ts` | Funções Serverless Vercel para cobrança e verificação automática via Asaas API v3 (com fallback PIX Direto). |
| `api/notify-telegram.ts` | Função Serverless Vercel para alertas privados de venda ao Admin e postagens mascaradas no canal público. |
| `supabase-schema.sql` | Schema PostgreSQL (tabelas de edições, participações, afiliados, vencedores e trava atômica). |
| `google-apps-script-email.js` | Script opcional para registro em Google Sheets e envio de comprovante por e-mail. |
| `vercel.json` & `.env.example` | Configuração de deploy e modelo seguro de variáveis de ambiente. |

---

## 5. Variáveis de Ambiente para Deploy na Vercel

Configure em **Project Settings → Environment Variables** na Vercel (nunca commite o arquivo `.env` real):

| Variável | Descrição |
| :--- | :--- |
| `ASAAS_API_KEY` | *(Opcional — Pagamento Automático)* Chave de API do Asaas (`$aact_...`) para cobrança e baixa automática. |
| `ASAAS_ENVIRONMENT` | `production` ou `sandbox`. |
| `VITE_DIRECT_PIX_KEY` | *(PIX Direto Taxa Zero)* Chave PIX recebedora para geração de QR Code oficial Banco Central (EMV CRC16). |
| `VITE_DIRECT_PIX_RECEIVER` | Nome exibido como recebedor no PIX Copia e Cola. |
| `VITE_SUPABASE_URL` | URL do projeto no Supabase (`https://...supabase.co`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (`publishable` / `anon`) do Supabase. |
| `VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL` | *(Opcional)* URL `/exec` do Google Apps Script para backup em planilha e e-mail. |
| `VITE_ADMIN_PIN` | PIN secreto para acesso ao painel `Admin`. |
| `TELEGRAM_BOT_TOKEN` | Token do Bot do Telegram (apenas server-side). |
| `TELEGRAM_ADMIN_CHAT_ID` | ID do chat privado do Administrador para alertas de conferência de PIX. |
| `TELEGRAM_PUBLIC_CHANNEL_ID` | *(Opcional)* `@canal` público para publicação mascarada de participações aprovadas. |
