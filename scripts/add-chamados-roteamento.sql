-- Roteamento de chamados: escopo admin vs professor
-- Execute no SQL Editor do Supabase (ou via migration).

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS professor_id uuid
    REFERENCES public.professores (id) ON DELETE SET NULL;

-- Alias opcional alinhado ao spec (espelha destinatario_tipo quando existir)
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS tipo_destinatario text;

CREATE INDEX IF NOT EXISTS idx_chamados_professor_id
  ON public.chamados (professor_id);

CREATE INDEX IF NOT EXISTS idx_chamados_destinatario_tipo
  ON public.chamados (destinatario_tipo);

COMMENT ON COLUMN public.chamados.professor_id IS
  'FK do docente destinatário quando destinatario_tipo = professor.';

COMMENT ON COLUMN public.chamados.destinatario_tipo IS
  'Escopo do ticket: admin | professor (legado: Secretaria | Professor).';

COMMENT ON COLUMN public.chamados.tipo_destinatario IS
  'Alias opcional de destinatario_tipo (admin | professor).';

-- Normaliza valores legados para o vocabulário canônico
UPDATE public.chamados
SET destinatario_tipo = 'admin'
WHERE lower(trim(coalesce(destinatario_tipo, ''))) IN ('secretaria', 'suporte', 'admin');

UPDATE public.chamados
SET destinatario_tipo = 'professor'
WHERE lower(trim(coalesce(destinatario_tipo, ''))) IN ('professor');

UPDATE public.chamados
SET tipo_destinatario = destinatario_tipo
WHERE tipo_destinatario IS NULL
  AND destinatario_tipo IS NOT NULL;
