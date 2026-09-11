-- Distribuição de pontos das avaliações (N1) por professor.
-- Execute no SQL Editor do Supabase (uma vez).

ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS pesos jsonb DEFAULT '{"atv1":2,"atv2":1,"atv3":1,"atv4":1,"prova":5}'::jsonb;

COMMENT ON COLUMN public.professores.pesos IS
  'Pesos da composição N1: atv1, atv2, atv3, atv4, prova (soma deve ser 10).';
