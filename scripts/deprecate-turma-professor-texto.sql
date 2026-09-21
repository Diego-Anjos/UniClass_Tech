-- Deprecia o texto denormalizado `turmas.professor`.
-- O vínculo canônico é `professor_id` → `professores(id)`.
-- Execute no SQL Editor do Supabase após confirmar que todas as turmas
-- possuem professor_id preenchido (ver scripts/add-turma-professor-id.sql).

-- 1) Backfill residual (nome legado → FK)
UPDATE public.turmas t
SET professor_id = p.id
FROM public.professores p
WHERE t.professor_id IS NULL
  AND t.professor IS NOT NULL
  AND trim(t.professor) <> ''
  AND lower(trim(t.professor)) = lower(trim(p.nome));

-- 2) (Opcional) Limpar o texto denormalizado para evitar divergência futura.
-- Descomente após validar joins no front:
-- UPDATE public.turmas SET professor = NULL WHERE professor_id IS NOT NULL;

-- 3) (Opcional, definitivo) Remover a coluna textual.
-- ALTER TABLE public.turmas DROP COLUMN IF EXISTS professor;

COMMENT ON COLUMN public.turmas.professor IS
  'LEGADO / DEPRECATED — use professor_id + join em professores(nome). Não atualizar via app.';
