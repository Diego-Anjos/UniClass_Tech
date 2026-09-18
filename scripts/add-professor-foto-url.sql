-- Foto de perfil do docente (aba "Perfil Docente" nas configurações).
-- Execute no SQL Editor do Supabase (uma vez).
-- Bucket de imagens: reutiliza "avatares" (mesmo dos alunos).

ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS foto_url text;

COMMENT ON COLUMN public.professores.foto_url IS
  'URL pública da foto de perfil no Storage (bucket avatares).';
