-- Calendário acadêmico / agenda semestrtral do professor.
-- Execute no SQL Editor do Supabase (uma vez).

CREATE TABLE IF NOT EXISTS public.calendario_academico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo_evento text NOT NULL,
  data_evento date NOT NULL,
  descricao text,
  turma text NOT NULL,
  disciplina text,
  professor_id uuid REFERENCES public.professores (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendario_academico_turma_data_idx
  ON public.calendario_academico (turma, data_evento);

COMMENT ON TABLE public.calendario_academico IS
  'Eventos acadêmicos (provas, entregas, reforços) por turma.';
