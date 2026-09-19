-- Coluna de classificação para filtrar Logs Recentes no painel Admin.
-- Execute no SQL Editor do Supabase (uma vez).

ALTER TABLE public.logs_auditoria
  ADD COLUMN IF NOT EXISTS tipo_acao text;

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_tipo_acao
  ON public.logs_auditoria (tipo_acao);

COMMENT ON COLUMN public.logs_auditoria.tipo_acao IS
  'Classificação da ação: LANCAMENTO_NOTA | REGISTRO_CHAMADA (e futuros tipos).';
