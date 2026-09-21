"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  CalendarDays,
  BookOpen,
  Map,
  LogOut,
  Camera,
  GraduationCap,
  Settings,
  User,
  MapPin,
  MessageSquare,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AlunoAvatar } from "@/components/aluno/aluno-avatar";
import { ModalFeedback } from "@/components/ModalFeedback";
import { toast } from "sonner";
import { urlComCacheBust } from "@/lib/utils";
import {
  atualizarSessaoAlunoLocal,
  limparSessaoAluno,
  lerSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const inputClass =
  "w-full bg-black border border-zinc-800 rounded-md text-sm text-white px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

const labelClass = "block text-xs text-zinc-500 uppercase tracking-widest mb-1.5";

function formatarEndereco(row: Record<string, unknown>): string {
  const enderecoDireto = String(row.endereco ?? "").trim();
  if (enderecoDireto) return enderecoDireto;

  const logradouro = String(row.logradouro ?? "").trim();
  const bairro = String(row.bairro ?? "").trim();
  const cidade = String(row.cidade ?? "").trim();
  const estado = String(row.estado ?? "").trim();
  const cep = String(row.cep ?? "").trim();

  const cidadeEstado = [cidade, estado].filter(Boolean).join("/");
  const local = [bairro, cidadeEstado].filter(Boolean).join(", ");
  const partes = [
    logradouro,
    local,
    cep ? `CEP: ${cep}` : "",
  ].filter(Boolean);

  return partes.join(" – ");
}

/**
 * Normaliza semestre vindo do banco/sessão.
 * Aceita: 1 | "1" | "1º" | "1º Semestre" | "1 Semestre" → "1º Semestre"
 */
function formatarSemestre(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const texto = String(raw).trim();
  if (!texto) return "";

  if (/semestre/i.test(texto)) {
    // Já veio completo — só evita "ºº"
    return texto.replace(/ºº+/g, "º");
  }

  // Remove símbolo de ordinal duplicado e monta "Nº Semestre"
  const numero = texto.replace(/º/g, "").trim();
  if (!numero) return "";
  return `${numero}º Semestre`;
}

function formatarDataNascimento(raw: unknown): string {
  const valor = String(raw ?? "").trim();
  if (!valor) return "";
  const iso = valor.slice(0, 10);
  const [ano, mes, dia] = iso.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  return valor;
}

function textoOuFallback(valor: string | null | undefined) {
  const limpo = String(valor ?? "").trim();
  return limpo || "Não informado";
}

function lerFotoUrl(row: Record<string, unknown>): string | null {
  const foto =
    String(row.foto_url ?? "").trim() ||
    String(row.avatar_url ?? "").trim();
  return foto || null;
}

function caminhoArquivoNoBucket(fotoUrl: string): string | null {
  try {
    const marker = "/avatares/";
    const idx = fotoUrl.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(
        fotoUrl.slice(idx + marker.length).split("?")[0] || ""
      );
    }
    const nome = fotoUrl.split("/").pop()?.split("?")[0];
    return nome ? decodeURIComponent(nome) : null;
  } catch {
    return null;
  }
}

type AlunoPerfil = {
  id?: string;
  nome: string;
  ra: string;
  curso: string;
  semestre: string;
  modalidade: string;
  campus: string;
  data_nascimento: string;
  cpf: string;
  email_institucional: string;
  telefone: string;
  email_pessoal: string;
  endereco: string;
  foto_url: string | null;
};

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",            active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas",      active: false },
  { icon: CalendarDays,    label: "Meu Calendário",       href: "/aluno/dashboard/calendario", active: false },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",      active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",       active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

export default function AlunoPerfilPage() {
  const router = useRouter();
  const { alunoLogado: sessaoAluno, carregandoSessao } = useAlunoSession();
  const alunoRa = sessaoAluno?.ra ?? "";
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [alunoLogado, setAlunoLogado] = useState<AlunoPerfil | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [loadingRemocao, setLoadingRemocao] = useState(false);

  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [telefoneEdit, setTelefoneEdit] = useState("");
  const [emailPessoalEdit, setEmailPessoalEdit] = useState("");
  const [enderecoEdit, setEnderecoEdit] = useState("");
  const [salvando, setSalvando] = useState(false);

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

  const fotoUrl = alunoLogado?.foto_url || sessaoAluno?.foto_url || null;

  const dadosAcademicos = [
    { label: "RA", valor: textoOuFallback(alunoLogado?.ra) },
    { label: "Curso", valor: textoOuFallback(alunoLogado?.curso) },
    {
      label: "Semestre Atual",
      valor: textoOuFallback(alunoLogado?.semestre),
    },
    {
      label: "Modalidade",
      valor: textoOuFallback(alunoLogado?.modalidade),
    },
    { label: "Campus", valor: textoOuFallback(alunoLogado?.campus) },
  ];

  const dadosPessoais = [
    {
      label: "Nome Completo",
      valor: textoOuFallback(alunoLogado?.nome),
    },
    {
      label: "Data de Nascimento",
      valor: textoOuFallback(alunoLogado?.data_nascimento),
    },
    { label: "CPF", valor: textoOuFallback(alunoLogado?.cpf) },
    {
      label: "E-mail Institucional",
      valor: textoOuFallback(alunoLogado?.email_institucional),
    },
  ];

  const dadosContato = [
    {
      label: "Celular",
      valor: textoOuFallback(alunoLogado?.telefone),
    },
    {
      label: "E-mail Pessoal",
      valor: textoOuFallback(alunoLogado?.email_pessoal),
    },
    {
      label: "Endereço",
      valor: textoOuFallback(alunoLogado?.endereco),
    },
  ];

  // Uma única busca por RA — evita flicker/loops com objeto de sessão nas deps
  useEffect(() => {
    if (carregandoSessao || !alunoRa) return;

    let cancelado = false;

    async function carregarAluno() {
      setCarregandoPerfil(true);
      try {
        const { data, error } = await supabase
          .from("alunos")
          .select("*")
          .eq("ra", alunoRa)
          .maybeSingle();

        if (cancelado) return;

        if (error || !data) {
          console.error(
            "Erro ao carregar perfil:",
            error?.message ?? "sem dados"
          );
          toast.error("Não foi possível carregar o perfil.");
          setCarregandoPerfil(false);
          return;
        }

        aplicarLinhaAluno(data as Record<string, unknown>);
      } catch (err) {
        if (cancelado) return;
        console.error("Falha ao carregar perfil:", err);
        toast.error("Não foi possível carregar o perfil.");
      } finally {
        if (!cancelado) setCarregandoPerfil(false);
      }
    }

    function aplicarLinhaAluno(row: Record<string, unknown>) {
      const foto = lerFotoUrl(row);
      const perfil: AlunoPerfil = {
        id: row.id != null ? String(row.id) : undefined,
        nome: String(row.nome ?? sessaoAluno?.nome ?? ""),
        ra: String(row.ra ?? alunoRa),
        curso: String(row.curso ?? sessaoAluno?.curso ?? ""),
        semestre: formatarSemestre(
          row.semestre_atual ?? row.semestre ?? sessaoAluno?.semestreAtual ?? ""
        ),
        modalidade: String(
          row.modalidade ?? row.modalidade_curso ?? row.tipo_ensino ?? ""
        ).trim(),
        campus: String(
          row.campus ?? row.unidade ?? row.polo ?? ""
        ).trim(),
        data_nascimento: formatarDataNascimento(row.data_nascimento),
        cpf: String(row.cpf ?? "").trim(),
        email_institucional: String(
          row.email_institucional ?? row.email ?? ""
        ).trim(),
        telefone: String(row.telefone ?? row.celular ?? "").trim(),
        email_pessoal: String(row.email_pessoal ?? "").trim(),
        endereco: formatarEndereco(row),
        foto_url: foto,
      };

      setAlunoLogado(perfil);

      // Mantém sessão alinhada com a foto do banco
      const sessao = lerSessaoAluno();
      if (sessao && foto !== (sessao.foto_url ?? null)) {
        atualizarSessaoAlunoLocal(sessao, { foto_url: foto });
      }
    }

    void carregarAluno();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apenas RA estável
  }, [carregandoSessao, alunoRa]);

  function abrirModalEditar() {
    setTelefoneEdit(alunoLogado?.telefone || "");
    setEmailPessoalEdit(alunoLogado?.email_pessoal || "");
    setEnderecoEdit(alunoLogado?.endereco || "");
    setModalEditarAberto(true);
  }

  function fecharModalEditar() {
    if (salvando) return;
    setModalEditarAberto(false);
  }

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

  async function salvarContato() {
    if (!alunoLogado?.ra) {
      toast.error("Sessão inválida. Faça login novamente.");
      abrirFeedback(
        "atencao",
        "Sessão inválida",
        "Não foi possível identificar o aluno logado. Faça login novamente."
      );
      return;
    }

    const telefone = telefoneEdit.trim();
    const email_pessoal = emailPessoalEdit.trim();
    const endereco = enderecoEdit.trim();

    setSalvando(true);
    try {
      // Preferência: coluna `endereco`; fallback para `logradouro` (schema admin)
      let { error } = await supabase
        .from("alunos")
        .update({
          telefone,
          email_pessoal,
          endereco,
        })
        .eq("ra", alunoLogado.ra);

      if (error && /endereco/i.test(error.message)) {
        const retry = await supabase
          .from("alunos")
          .update({
            telefone,
            email_pessoal,
            logradouro: endereco,
          })
          .eq("ra", alunoLogado.ra);
        error = retry.error;
      }

      if (error) {
        console.error("Erro ao salvar contato:", error.message);
        toast.error("Não foi possível atualizar seus dados de contato.");
        abrirFeedback(
          "erro",
          "Falha ao salvar",
          "Não foi possível atualizar seus dados de contato. Tente novamente."
        );
        return;
      }

      setAlunoLogado((prev) =>
        prev
          ? {
              ...prev,
              telefone,
              email_pessoal,
              endereco,
            }
          : prev
      );
      setModalEditarAberto(false);
      toast.success("Dados de contato atualizados.");
      abrirFeedback(
        "sucesso",
        "Dados atualizados",
        "Seus dados de contato foram salvos com sucesso."
      );
    } catch (err) {
      console.error("Falha ao salvar contato:", err);
      toast.error("Não foi possível atualizar seus dados de contato.");
      abrirFeedback(
        "erro",
        "Falha ao salvar",
        "Não foi possível atualizar seus dados de contato. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  function abrirSeletorFoto() {
    if (uploadingFoto || loadingRemocao) return;
    inputFotoRef.current?.click();
  }

  async function persistirFotoUrl(novaUrl: string | null) {
    if (!alunoLogado?.ra) {
      throw new Error("RA do aluno indisponível.");
    }

    let { error } = await supabase
      .from("alunos")
      .update({ foto_url: novaUrl })
      .eq("ra", alunoLogado.ra);

    if (error && /foto_url/i.test(error.message)) {
      const retry = await supabase
        .from("alunos")
        .update({ avatar_url: novaUrl })
        .eq("ra", alunoLogado.ra);
      error = retry.error;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleRemoverFoto() {
    if (!alunoLogado?.foto_url || !alunoLogado.ra) return;

    const caminho = caminhoArquivoNoBucket(alunoLogado.foto_url);
    if (!caminho) {
      toast.error("Não foi possível identificar o arquivo da foto.");
      abrirFeedback(
        "erro",
        "Falha ao remover",
        "Não foi possível identificar o arquivo da foto de perfil."
      );
      return;
    }

    setLoadingRemocao(true);
    try {
      const { error: storageError } = await supabase.storage
        .from("avatares")
        .remove([caminho]);

      if (storageError) {
        toast.error("Não foi possível remover a foto do armazenamento.");
        abrirFeedback(
          "erro",
          "Falha ao remover",
          "Não foi possível remover a foto do armazenamento."
        );
        return;
      }

      await persistirFotoUrl(null);

      setAlunoLogado((prev) => (prev ? { ...prev, foto_url: null } : prev));

      const sessao = lerSessaoAluno();
      if (sessao) {
        atualizarSessaoAlunoLocal(sessao, { foto_url: null });
      }

      router.refresh();

      toast.success("Foto de perfil removida.");
      abrirFeedback(
        "sucesso",
        "Foto removida",
        "Sua foto de perfil foi removida com sucesso."
      );
    } catch (err) {
      console.error("Falha ao remover foto:", err);
      toast.error("Não foi possível remover a foto de perfil.");
      abrirFeedback(
        "erro",
        "Falha ao remover",
        "Não foi possível remover a foto de perfil. Tente novamente."
      );
    } finally {
      setLoadingRemocao(false);
    }
  }

  async function handleUploadFoto(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem.");
      abrirFeedback(
        "atencao",
        "Arquivo inválido",
        "Selecione apenas arquivos de imagem (JPG, PNG, WEBP, etc.)."
      );
      return;
    }

    if (!alunoLogado?.ra) {
      toast.error("Sessão inválida. Faça login novamente.");
      abrirFeedback(
        "atencao",
        "Sessão inválida",
        "Não foi possível identificar o aluno logado. Faça login novamente."
      );
      return;
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const nomeArquivo = `perfil-${alunoLogado.ra}-${Date.now()}.${fileExt}`;

    setUploadingFoto(true);
    try {
      const { error } = await supabase.storage
        .from("avatares")
        .upload(nomeArquivo, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (error) {
        toast.error("Não foi possível enviar a foto.");
        abrirFeedback(
          "erro",
          "Falha no upload",
          "Não foi possível enviar a foto. Verifique o bucket e tente novamente."
        );
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("avatares")
        .getPublicUrl(nomeArquivo);

      // Cache bust: força o navegador a buscar a imagem nova
      const novaUrl = urlComCacheBust(publicUrl.publicUrl);

      await persistirFotoUrl(novaUrl);

      setAlunoLogado((prev) =>
        prev ? { ...prev, foto_url: novaUrl } : prev
      );

      const sessao = lerSessaoAluno();
      if (sessao) {
        atualizarSessaoAlunoLocal(sessao, { foto_url: novaUrl });
      }

      router.refresh();

      toast.success("Foto de perfil atualizada.");
      abrirFeedback(
        "sucesso",
        "Foto atualizada",
        "Sua foto de perfil foi alterada com sucesso."
      );
    } catch (err) {
      console.error("Falha no upload da foto:", err);
      toast.error("Não foi possível enviar a foto.");
      abrirFeedback(
        "erro",
        "Falha no upload",
        "Não foi possível enviar a foto. Tente novamente."
      );
    } finally {
      setUploadingFoto(false);
    }
  }

  if (carregandoSessao || !sessaoAluno) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

  const nomeExibicao = alunoLogado?.nome || sessaoAluno.nome || "Carregando...";
  const raExibicao = alunoLogado?.ra || sessaoAluno.ra || "---";

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
                <button
                  type="button"
                  onClick={abrirSeletorFoto}
                  disabled={uploadingFoto || loadingRemocao}
                  className="rounded-full cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                  aria-label="Trocar foto de perfil"
                >
                  <AlunoAvatar
                    nome={nomeExibicao}
                    fotoUrl={fotoUrl}
                    className="w-10 h-10 text-base"
                    fallback="UN"
                  />
                </button>
                <button
                  type="button"
                  onClick={abrirSeletorFoto}
                  disabled={uploadingFoto || loadingRemocao}
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors disabled:opacity-50"
                  aria-label="Trocar foto de perfil"
                >
                  {uploadingFoto ? (
                    <Loader2 className="w-2.5 h-2.5 text-zinc-300 animate-spin" />
                  ) : (
                    <Camera className="w-2.5 h-2.5 text-zinc-300" />
                  )}
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nomeExibicao}</p>
                <p className="text-xs text-zinc-500">RA: {raExibicao}</p>
              </div>
            </div>
            <Link href="/aluno/dashboard/perfil" className="text-zinc-500 hover:text-white transition-colors shrink-0">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Gerencie suas informações pessoais e acadêmicas.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirModalEditar}
              disabled={carregandoPerfil || !alunoLogado}
              className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2 disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" />
              Editar Dados
            </button>
          </div>

          {carregandoPerfil && !alunoLogado ? (
            <p className="text-sm text-zinc-500 py-10">Carregando perfil...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4 text-zinc-300" />
                    </div>
                    <h2 className="text-sm font-semibold">Dados Acadêmicos</h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    {dadosAcademicos.map((d) => (
                      <div key={d.label}>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{d.label}</p>
                        <p className="text-sm text-white">{d.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-zinc-300" />
                    </div>
                    <h2 className="text-sm font-semibold">Informações Pessoais</h2>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={abrirSeletorFoto}
                        disabled={uploadingFoto || loadingRemocao}
                        className="rounded-full cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                        aria-label="Trocar foto de perfil"
                      >
                        <AlunoAvatar
                          nome={nomeExibicao}
                          fotoUrl={fotoUrl}
                          className="w-16 h-16 text-2xl"
                          fallback="UN"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={abrirSeletorFoto}
                        disabled={uploadingFoto || loadingRemocao}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors disabled:opacity-50"
                        aria-label="Trocar foto de perfil"
                      >
                        {uploadingFoto || loadingRemocao ? (
                          <Loader2 className="w-3 h-3 text-zinc-300 animate-spin" />
                        ) : (
                          <Camera className="w-3 h-3 text-zinc-300" />
                        )}
                      </button>
                    </div>
                    <input
                      ref={inputFotoRef}
                      type="file"
                      id="upload-foto"
                      accept="image/*"
                      hidden
                      onChange={handleUploadFoto}
                    />
                    <div className="flex flex-col items-start gap-2">
                      <button
                        type="button"
                        onClick={abrirSeletorFoto}
                        disabled={uploadingFoto || loadingRemocao}
                        className="text-xs border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors rounded-lg px-3 py-1.5 disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {uploadingFoto ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Trocar Foto"
                        )}
                      </button>
                      {alunoLogado?.foto_url && (
                        <button
                          type="button"
                          onClick={() => void handleRemoverFoto()}
                          disabled={loadingRemocao || uploadingFoto}
                          className="text-red-400 hover:text-red-300 text-sm hover:underline bg-transparent border-none disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {loadingRemocao ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Removendo...
                            </>
                          ) : (
                            "Remover Foto"
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {dadosPessoais.map((d) => (
                      <div key={d.label}>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{d.label}</p>
                        <p className="text-sm text-white">{d.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-zinc-300" />
                  </div>
                  <h2 className="text-sm font-semibold">Endereço e Contato</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {dadosContato.map((d) => (
                    <div key={d.label} className={d.label === "Endereço" ? "sm:col-span-3" : ""}>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{d.label}</p>
                      <p className="text-sm text-white">{d.valor}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {modalEditarAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-editar-contato-titulo"
            className="bg-[#0f1117] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-800">
              <div>
                <h2
                  id="modal-editar-contato-titulo"
                  className="text-lg font-semibold text-white tracking-tight"
                >
                  Editar Dados de Contato
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Atualize telefone, e-mail pessoal e endereço.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModalEditar}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
                aria-label="Fechar modal"
                disabled={salvando}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelClass} htmlFor="telefone-edit">
                  Telefone
                </label>
                <input
                  id="telefone-edit"
                  type="text"
                  inputMode="tel"
                  value={telefoneEdit}
                  onChange={(e) => setTelefoneEdit(e.target.value)}
                  className={inputClass}
                  placeholder="(00) 00000-0000"
                  disabled={salvando}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="email-pessoal-edit">
                  E-mail Pessoal
                </label>
                <input
                  id="email-pessoal-edit"
                  type="email"
                  value={emailPessoalEdit}
                  onChange={(e) => setEmailPessoalEdit(e.target.value)}
                  className={inputClass}
                  placeholder="email@exemplo.com"
                  disabled={salvando}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="endereco-edit">
                  Endereço
                </label>
                <input
                  id="endereco-edit"
                  type="text"
                  value={enderecoEdit}
                  onChange={(e) => setEnderecoEdit(e.target.value)}
                  className={inputClass}
                  placeholder="Rua, número – Bairro, Cidade/UF – CEP"
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                type="button"
                onClick={fecharModalEditar}
                disabled={salvando}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-800 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvarContato()}
                disabled={salvando}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
