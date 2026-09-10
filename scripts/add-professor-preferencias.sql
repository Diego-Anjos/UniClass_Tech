-- Preferências do modal "Configurações & Preferências" do professor.
-- Execute no SQL Editor do Supabase (uma vez).

ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS preferencias jsonb DEFAULT '{}'::jsonb;

-- Colunas espelhadas para exibição rápida (ex.: formulário de contato do aluno)
ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS dias_atendimento text[] DEFAULT ARRAY['Segunda','Terça','Quarta','Quinta','Sexta']::text[],
  ADD COLUMN IF NOT EXISTS atendimento_de text DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS atendimento_ate text DEFAULT '18:00';

COMMENT ON COLUMN public.professores.preferencias IS
  'Preferências do docente: tom_ia, regua_evasao, peso_n1, peso_n2, travar_edicao_notas, dias_atendimento, atendimento_de, atendimento_ate, notificar_mensagens, notificar_alertas';
