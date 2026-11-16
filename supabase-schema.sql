-- =============================================================================
-- CHANCE PREMIADA — SCHEMA SQL COMPLETO (SUPABASE / POSTGRESQL GRATUITO)
-- Pronto para colar no SQL Editor do Supabase (Free Tier)
-- =============================================================================

-- 1. Tabela de Configuração das Edições Diárias
CREATE TABLE IF NOT EXISTS editions (
  id SERIAL PRIMARY KEY,
  edition_number INT NOT NULL UNIQUE,
  prize_amount_brl NUMERIC(10, 2) NOT NULL DEFAULT 200.00,
  ticket_price_brl NUMERIC(10, 2) NOT NULL DEFAULT 4.00,
  scratch_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  scratch_pix5_limit INT NOT NULL DEFAULT 2,
  scratch_free_num_limit INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed' | 'drawn'
  first_ball_drawn INT CHECK (first_ball_drawn BETWEEN 1 AND 75),
  winner_name TEXT,
  winner_whatsapp TEXT,
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Grade de Números 01 a 75 com TRAVA FÍSICA DE UNICIDADE
-- A PRIMARY KEY (edition_number, number) garante que NUNCA existam números duplicados na mesma edição.
-- Observação: pix_tx_id NÃO tem UNIQUE aqui porque um Combo (3, 5 ou 10 números) compartilha o mesmo PIX!
CREATE TABLE IF NOT EXISTS edition_numbers (
  edition_number INT NOT NULL,
  number INT NOT NULL CHECK (number BETWEEN 1 AND 75),
  formatted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'reserved' | 'sold'
  owner_name TEXT,
  owner_whatsapp TEXT,
  pix_tx_id TEXT,
  reserved_until TIMESTAMPTZ,
  affiliate_code TEXT,
  affiliate_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (edition_number, number)
);

-- Migração segura caso você já tenha rodado a versão anterior deste script no seu Supabase:
ALTER TABLE edition_numbers DROP CONSTRAINT IF EXISTS edition_numbers_pix_tx_id_key;
ALTER TABLE edition_numbers ADD COLUMN IF NOT EXISTS affiliate_code TEXT;
ALTER TABLE edition_numbers ADD COLUMN IF NOT EXISTS affiliate_name TEXT;

-- Índice para busca instantânea pelo WhatsApp do cliente (Sem Cadastro / Sem Senha)
CREATE INDEX IF NOT EXISTS idx_edition_numbers_whatsapp
  ON edition_numbers (owner_whatsapp);

CREATE INDEX IF NOT EXISTS idx_edition_numbers_affiliate
  ON edition_numbers (edition_number, affiliate_code);

-- 3. Tabela de Participações, Afiliados e Raspadinhas Premiadas (Assinadas no Servidor)
CREATE TABLE IF NOT EXISTS participations (
  id TEXT PRIMARY KEY,
  edition_number INT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  numbers TEXT[] NOT NULL,
  amount_paid_brl NUMERIC(10, 2) NOT NULL,
  pix_tx_id TEXT NOT NULL UNIQUE,
  scratch_signature_hash TEXT NOT NULL,
  scratch_tier TEXT NOT NULL, -- 'free_number' | 'instant_pix_5' | 'bonus_coins'
  scratch_title TEXT NOT NULL,
  scratch_value_brl NUMERIC(10, 2) NOT NULL DEFAULT 0,
  scratch_bonus_number TEXT,
  scratch_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Aguardando Sorteio',
  result_summary TEXT,
  affiliate_code TEXT,
  affiliate_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração segura para adicionar suporte a Afiliados em tabela já existente:
ALTER TABLE participations ADD COLUMN IF NOT EXISTS affiliate_code TEXT;
ALTER TABLE participations ADD COLUMN IF NOT EXISTS affiliate_name TEXT;

CREATE INDEX IF NOT EXISTS idx_participations_whatsapp
  ON participations (customer_whatsapp);

CREATE INDEX IF NOT EXISTS idx_participations_edition
  ON participations (edition_number, created_at DESC);

-- 4. Função Atômica Anti-Duplicidade (Evita 2 clientes reservarem o mesmo número)
CREATE OR REPLACE FUNCTION reserve_numbers_atomically(
  p_edition_number INT,
  p_numbers INT[],
  p_customer_name TEXT,
  p_customer_whatsapp TEXT
)
RETURNS TABLE(reserved_number INT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE edition_numbers
  SET status = 'reserved',
      owner_name = p_customer_name,
      owner_whatsapp = p_customer_whatsapp,
      reserved_until = NOW() + INTERVAL '10 minutes',
      updated_at = NOW()
  WHERE edition_number = p_edition_number
    AND number = ANY(p_numbers)
    AND (status = 'available' OR (status = 'reserved' AND reserved_until < NOW()))
  RETURNING number;
END;
$$;

-- 5. Função de Apuração Manual da 1ª Bola pelo Admin
-- Você digita a 1ª bola que saiu no sorteio e o banco já identifica o ganhador na hora
CREATE OR REPLACE FUNCTION publish_first_ball_result(
  p_edition_number INT,
  p_first_ball INT
)
RETURNS TABLE(
  winning_number INT,
  winner_name TEXT,
  winner_whatsapp TEXT,
  pix_tx_id TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE editions
  SET status = 'drawn',
      first_ball_drawn = p_first_ball,
      drawn_at = NOW()
  WHERE edition_number = p_edition_number;

  RETURN QUERY
  SELECT en.number, en.owner_name, en.owner_whatsapp, en.pix_tx_id
  FROM edition_numbers en
  WHERE en.edition_number = p_edition_number
    AND en.number = p_first_ball;
END;
$$;

-- 6. Função para Inicializar/Zerar os 75 Números (01 a 75) de uma Edição
CREATE OR REPLACE FUNCTION init_edition_75_numbers(p_edition_number INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO editions (edition_number, prize_amount_brl, ticket_price_brl)
  VALUES (p_edition_number, 200.00, 4.00)
  ON CONFLICT (edition_number) DO NOTHING;

  FOR i IN 1..75 LOOP
    INSERT INTO edition_numbers (edition_number, number, formatted, status)
    VALUES (p_edition_number, i, LPAD(i::TEXT, 2, '0'), 'available')
    ON CONFLICT (edition_number, number) DO UPDATE
    SET status = 'available',
        owner_name = NULL,
        owner_whatsapp = NULL,
        pix_tx_id = NULL,
        reserved_until = NULL,
        affiliate_code = NULL,
        affiliate_name = NULL,
        updated_at = NOW();
  END LOOP;
END;
$$;

-- Inicializa automaticamente a Edição #1 com os números 01 a 75 livres:
SELECT init_edition_75_numbers(1);

-- 7. Permissões de Acesso (Row Level Security) para a chave pública anon
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access editions" ON editions;
CREATE POLICY "Public access editions" ON editions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access edition_numbers" ON edition_numbers;
CREATE POLICY "Public access edition_numbers" ON edition_numbers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access participations" ON participations;
CREATE POLICY "Public access participations" ON participations FOR ALL USING (true) WITH CHECK (true);

