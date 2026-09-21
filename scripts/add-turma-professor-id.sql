-- Vínculo relacional turma ↔ professor (substitui filtro por nome textual).
-- Execute no SQL Editor do Supabase (uma vez).

ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.professores (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_turmas_professor_id
  ON public.turmas (professor_id);

COMMENT ON COLUMN public.turmas.professor_id IS
  'FK para public.professores.id — fonte de verdade do vínculo docente/turma.';

-- Backfill opcional: casa o texto legado `professor` com o nome em `professores`.
UPDATE public.turmas t
SET professor_id = p.id
FROM public.professores p
WHERE t.professor_id IS NULL
  AND t.professor IS NOT NULL
  AND trim(t.professor) <> ''
  AND lower(trim(t.professor)) = lower(trim(p.nome));
