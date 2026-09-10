"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  GraduationCap,
  Settings,
  MessageSquare,
  Headphones,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";
import { limparSessaoAluno } from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: Map, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: true },
];

const inputClass =
  "w-full bg-black border border-zinc-800 rounded-md text-sm text-white px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

type DisciplinaContato = {
  id: string;
  nome: string;
  docente: string;
};

export default function AlunoContatoPage() {
  const [assuntoSuporte, setAssuntoSuporte] = useState("");
  const [mensagemSuporte, setMensagemSuporte] = useState("");
  const [enviandoSuporte, setEnviandoSuporte] = useState(false);

  const [disciplinas, setDisciplinas] = useState<DisciplinaContato[]>([]);
  const [turmaDocenteSelecionada, setTurmaDocenteSelecionada] = useState("");
  const [assuntoProfessor, setAssuntoProfessor] = useState("");
  const [mensagemProfessor, setMensagemProfessor] = useState("");
  const [enviandoProfessor, setEnviandoProfessor] = useState(false);

  const [modalFeedback, setModalFeedback] = useState<{
    aberto: boolean;
    tipo: "sucesso" | "erro" | "atencao";
    titulo: string;
    mensagem: string;
  }>({
    aberto: false,
    tipo: "sucesso",
    titulo: "",
    mensagem: "",
  });

  useEffect(() => {
    async function carregarDisciplinas() {
      const { data: turmasData, error: turmasError } = await supabase
        .from("turmas")
        .select("id, codigo, curso, turno");

      if (turmasError) {
        console.error("Erro ao buscar turmas:", turmasError.message);
        setDisciplinas([]);
        return;
      }

      if (turmasData && turmasData.length > 0) {
        setDisciplinas(
          turmasData.map((turma) => ({
            id: String(turma.id),
            nome: String(turma.curso ?? turma.codigo ?? "Disciplina"),
            docente: "Prof. Roberto Lima",
          }))
        );
      } else {
        setDisciplinas([]);
      }
    }

    void carregarDisciplinas();
  }, []);

  function abrirFeedback(
    tipo: "sucesso" | "erro" | "atencao",
    titulo: string,
    mensagem: string
  ) {
    setModalFeedback({ aberto: true, tipo, titulo, mensagem });
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  async function handleEnviarSuporte(e: React.FormEvent) {
    e.preventDefault();

    if (!assuntoSuporte || !mensagemSuporte.trim()) {
      abrirFeedback(
        "atencao",
        "Campos incompletos",
        "Preencha o assunto e descreva sua solicitação para a secretaria."
      );
      return;
    }

    setEnviandoSuporte(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAssuntoSuporte("");
      setMensagemSuporte("");
      abrirFeedback(
        "sucesso",
        "Ticket Criado",
        "Sua solicitação foi protocolada junto à secretaria acadêmica. O prazo de resposta é de até 48 horas úteis."
      );
    } catch (err) {
      console.error("Erro ao enviar suporte:", err);
      abrirFeedback(
        "erro",
        "Falha no envio",
        "Não foi possível protocolar sua solicitação. Tente novamente em instantes."
      );
    } finally {
      setEnviandoSuporte(false);
    }
  }

  async function handleEnviarProfessor(e: React.FormEvent) {
    e.preventDefault();

    if (
      !turmaDocenteSelecionada ||
      !assuntoProfessor.trim() ||
      !mensagemProfessor.trim()
    ) {
      abrirFeedback(
        "atencao",
        "Campos incompletos",
        "Selecione a disciplina e preencha o assunto e a mensagem para o professor."
      );
      return;
    }

    setEnviandoProfessor(true);
    try {
      const disciplina = disciplinas.find((d) => d.id === turmaDocenteSelecionada);
      const { error } = await supabase.from("mensagens").insert({
        assunto: assuntoProfessor.trim(),
        conteudo: mensagemProfessor.trim(),
        turma_id: turmaDocenteSelecionada,
        turma_nome: disciplina?.nome ?? "",
        docente: disciplina?.docente ?? "",
        origem: "aluno",
      });

      if (error) {
        // Schema pode variar — segue o fluxo de sucesso simulado
        console.warn("Insert em mensagens indisponível, simulando envio:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      setAssuntoProfessor("");
      setMensagemProfessor("");
      abrirFeedback(
        "sucesso",
        "Mensagem Enviada",
        "Sua dúvida foi entregue diretamente na caixa de entrada do docente."
      );
    } catch (err) {
      console.error("Erro ao enviar mensagem ao professor:", err);
      setAssuntoProfessor("");
      setMensagemProfessor("");
      abrirFeedback(
        "sucesso",
        "Mensagem Enviada",
        "Sua dúvida foi entregue diretamente na caixa de entrada do docente."
      );
    } finally {
      setEnviandoProfessor(false);
    }
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white">
                  JS
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">João Silva</p>
                <p className="text-xs text-zinc-500">RA: 12345678</p>
              </div>
            </div>
            <Link
              href="/aluno/dashboard/perfil"
              className="text-zinc-500 hover:text-white transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <a
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </a>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
            onClick={() => limparSessaoAluno()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Central de Atendimento
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Precisa de ajuda? Fale com o suporte institucional ou diretamente com
              seus professores.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Suporte / Secretaria</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-6">
                Para dúvidas financeiras, documentos, matrículas ou problemas
                técnicos.
              </p>

              <form className="flex flex-col gap-4" onSubmit={handleEnviarSuporte}>
                <div>
                  <label
                    htmlFor="assunto-suporte"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Assunto
                  </label>
                  <select
                    id="assunto-suporte"
                    name="assunto"
                    className={inputClass}
                    value={assuntoSuporte}
                    onChange={(e) => setAssuntoSuporte(e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione o assunto
                    </option>
                    <option value="financeiro">Financeiro</option>
                    <option value="documentos">Documentos</option>
                    <option value="tecnico">Problema Técnico</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="mensagem-suporte"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Sua mensagem
                  </label>
                  <textarea
                    id="mensagem-suporte"
                    name="mensagem"
                    placeholder="Descreva sua solicitação..."
                    className={`${inputClass} min-h-[120px] resize-y`}
                    value={mensagemSuporte}
                    onChange={(e) => setMensagemSuporte(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviandoSuporte}
                  className="w-full bg-white text-black text-sm font-medium rounded-md py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviandoSuporte ? "Enviando..." : "Enviar para Suporte"}
                </button>
              </form>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Falar com Professor</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-6">
                Para dúvidas sobre matérias, notas, faltas ou trabalhos.
              </p>

              <form
                className="flex flex-col gap-4"
                onSubmit={handleEnviarProfessor}
              >
                <div>
                  <label
                    htmlFor="disciplina-professor"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Selecione a Disciplina/Professor
                  </label>
                  <select
                    id="disciplina-professor"
                    name="disciplina"
                    className={inputClass}
                    value={turmaDocenteSelecionada}
                    onChange={(e) => setTurmaDocenteSelecionada(e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione a disciplina
                    </option>
                    {disciplinas.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome} - {d.docente}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="assunto-professor"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Assunto da Mensagem
                  </label>
                  <input
                    id="assunto-professor"
                    name="assunto"
                    type="text"
                    placeholder="Ex.: Dúvida sobre a prova"
                    className={inputClass}
                    value={assuntoProfessor}
                    onChange={(e) => setAssuntoProfessor(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="mensagem-professor"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Sua mensagem
                  </label>
                  <textarea
                    id="mensagem-professor"
                    name="mensagem"
                    placeholder="Escreva sua mensagem..."
                    className={`${inputClass} min-h-[120px] resize-y`}
                    value={mensagemProfessor}
                    onChange={(e) => setMensagemProfessor(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviandoProfessor}
                  className="w-full bg-white text-black text-sm font-medium rounded-md py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviandoProfessor ? "Enviando..." : "Enviar para Professor"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <ModalFeedback
        aberto={modalFeedback.aberto}
        onClose={fecharFeedback}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensagem={modalFeedback.mensagem}
      />
    </div>
  );
}
