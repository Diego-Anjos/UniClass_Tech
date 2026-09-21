"use client";

import { useState } from "react";
import { X } from "lucide-react";

type AbaLegal = "termos" | "privacidade";

export function LegalConsentFooter() {
  const [modalLegalAberto, setModalLegalAberto] = useState(false);
  const [abaLegalAtiva, setAbaLegalAtiva] = useState<AbaLegal>("termos");

  function abrirModalLegal(aba: AbaLegal) {
    setAbaLegalAtiva(aba);
    setModalLegalAberto(true);
  }

  return (
    <>
      <p className="text-center text-xs text-zinc-600 mt-8">
        Ao continuar, você concorda com nossos{" "}
        <button
          type="button"
          onClick={() => abrirModalLegal("termos")}
          className="underline text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          Termos de Serviço
        </button>{" "}
        e{" "}
        <button
          type="button"
          onClick={() => abrirModalLegal("privacidade")}
          className="underline text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          Política de Privacidade
        </button>
        .
      </p>

      {modalLegalAberto ? (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModalLegalAberto(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-legal-titulo"
            className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 border-b border-zinc-800">
              <h2
                id="modal-legal-titulo"
                className="text-lg font-semibold tracking-tight text-white"
              >
                Termos e Privacidade
              </h2>
              <button
                type="button"
                onClick={() => setModalLegalAberto(false)}
                className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="flex gap-1 px-6 border-b border-zinc-800"
              role="tablist"
              aria-label="Documentos legais"
            >
              {(
                [
                  ["termos", "Termos de Serviço"],
                  ["privacidade", "Política de Privacidade"],
                ] as const
              ).map(([aba, label]) => (
                <button
                  key={aba}
                  type="button"
                  role="tab"
                  aria-selected={abaLegalAtiva === aba}
                  onClick={() => setAbaLegalAtiva(aba)}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    abaLegalAtiva === aba
                      ? "border-white text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-6 text-sm text-zinc-400 space-y-4">
              {abaLegalAtiva === "termos" ? (
                <>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">1. Aceitação</h3>
                    <p>
                      Ao acessar ou utilizar o UniClassTech, ERP educacional
                      destinado a alunos, docentes e administração acadêmica,
                      você declara ter lido, compreendido e concordado com estes
                      Termos de Serviço. Se não concordar, não utilize a
                      plataforma.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      2. Uso da Plataforma
                    </h3>
                    <p>
                      A conta é pessoal e intransferível. Você é responsável por
                      manter a confidencialidade de suas credenciais e por toda
                      atividade realizada sob seu acesso. O compartilhamento de
                      senhas, o uso de contas de terceiros ou qualquer tentativa
                      de acesso não autorizado é expressamente proibido e pode
                      resultar em suspensão imediata da conta.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      3. Integridade Acadêmica
                    </h3>
                    <p>
                      O UniClassTech apoia processos acadêmicos legítimos.
                      Fraude acadêmica, manipulação indevida de notas, falsidade
                      de presença, adulteração de registros ou qualquer conduta
                      que comprometa a integridade educacional poderá resultar
                      em suspensão da conta e comunicação às autoridades
                      acadêmicas competentes.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      4. Propriedade Intelectual
                    </h3>
                    <p>
                      Marcas, interface, código, conteúdos institucionais e
                      demais materiais disponibilizados na plataforma são
                      protegidos por direitos de propriedade intelectual. É
                      vedada a reprodução, distribuição ou engenharia reversa
                      sem autorização prévia da instituição ou do UniClassTech,
                      conforme aplicável.
                    </p>
                  </section>
                </>
              ) : (
                <>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      1. Coleta de Dados
                    </h3>
                    <p>
                      Em conformidade com a Lei Geral de Proteção de Dados
                      (LGPD — Lei nº 13.709/2018), coletamos dados necessários
                      à prestação do serviço educacional, tais como
                      identificação acadêmica, credenciais de acesso, registros
                      de notas, frequência e comunicações internas, sempre com
                      base legal adequada (execução de contrato, obrigação legal
                      ou legítimo interesse institucional).
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      2. Uso de Inteligência Artificial
                    </h3>
                    <p>
                      Recursos de IA do UniClassTech analisam dados acadêmicos
                      exclusivamente para gerar insights de aprendizagem,
                      engajamento e retenção. Essas análises destinam-se a
                      apoiar decisões pedagógicas e administrativas — não a
                      tomar decisões automatizadas definitivas sem supervisão
                      humana quando a lei exigir.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      3. Compartilhamento
                    </h3>
                    <p>
                      Dados acadêmicos não são vendidos a terceiros. O
                      compartilhamento ocorre apenas quando necessário à
                      operação da plataforma (provedores sob contrato), por
                      exigência legal ou com autorização do titular, sempre com
                      salvaguardas contratuais e técnicas apropriadas.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">4. Segurança</h3>
                    <p>
                      Adotamos medidas técnicas e organizacionais para proteger
                      os dados contra acesso não autorizado, perda ou alteração
                      indevida. Você pode exercer direitos de titular (acesso,
                      correção, exclusão e outros previstos na LGPD) por meio
                      dos canais institucionais disponibilizados pela
                      instituição de ensino.
                    </p>
                  </section>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setModalLegalAberto(false)}
                className="px-4 py-2 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
