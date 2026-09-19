# 🎓 UniClassTech

<div align="center">
  <br />
  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
  [![Resend](https://img.shields.io/badge/Resend-000000?style=for-the-badge&logo=resend&logoColor=white)](https://resend.com/)
  <br />
  <br />
</div>

> **Plataforma educacional moderna e unificada** que conecta a Secretaria Acadêmica, Professores e Alunos em um único ecossistema digital — com Inteligência Artificial nativa, automação de e-mails e geração de documentos acadêmicos.

---

## 🎯 Propósito do Sistema

O **UniClassTech** nasceu para eliminar a fragmentação de ferramentas nas instituições de ensino superior. Em vez de sistemas isolados para secretaria, professores e alunos, a plataforma oferece **um único ambiente integrado** onde cada perfil de usuário tem acesso às funcionalidades exatas que precisa.

O grande diferencial técnico é a **integração nativa com Inteligência Artificial** via Google Gemini, que fornece:

- **Insights preditivos de turma** — análise automática de tendências de desempenho e frequência ao longo do semestre.
- **Assistente Pedagógico conversacional** — chat contextualizado por aluno, alimentado com dados reais de notas e frequência do banco de dados.
- **Síntese automática de boletim** — narrativa inteligente gerada pela IA para complementar o boletim escolar em PDF.
- **Esteira de fallback automática** — o sistema nunca para por conta de limite de cota de um único modelo; ele avança automaticamente pela cadeia de modelos disponíveis.

---

## 🛠️ Tech Stack

| Camada | Tecnologia | Versão / Detalhe |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | `16.3.4` |
| **UI Library** | [React](https://react.dev/) | `19.2.8` |
| **Linguagem** | TypeScript | `^5` |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) | `^4` |
| **Backend / Auth / DB** | [Supabase](https://supabase.com/) | PostgreSQL + Auth + Storage |
| **IA Generativa** | [Google Gemini API](https://ai.google.dev/) | Esteira multi-modelo com fallback |
| **E-mails Transacionais** | [Resend](https://resend.com/) + React Email | `^6.28.0` |
| **Geração de PDF** | [@react-pdf/renderer](https://react-pdf.org/) | `^4.9.0` |
| **Gráficos** | [Recharts](https://recharts.org/) | `^3.10.1` |
| **Ícones** | [Lucide React](https://lucide.dev/) | `^1.40.0` |
| **Toast / Notificações** | [Sonner](https://sonner.emilkowal.ski/) | `^2.0.8` |

### 🤖 Esteira de Fallback Gemini

O sistema nunca depende de um único modelo de IA. Em caso de limite de cota (HTTP `429`) ou indisponibilidade (HTTP `503`), a requisição avança automaticamente para o próximo modelo na cadeia:

```
gemini-3.8-flash → gemini-3.7-flash → gemini-3.6-flash → gemini-3.5-flash → gemini-3.1-flash-lite
```

Se todos os modelos falharem, uma resposta JSON segura é retornada sem propagar erro para a interface.

---

## 🏗️ Arquitetura de Módulos

A aplicação é dividida em **três módulos independentes**, cada um com seu próprio fluxo de autenticação, layout e conjunto de funcionalidades.

```
/
├── app/
│   ├── adm/          # 🛡️  Módulo Admin (Secretaria Acadêmica)
│   ├── professor/    # 👨‍🏫  Módulo Professor
│   └── aluno/        # 🎓  Módulo Aluno
└── api/              # Rotas de backend (Next.js Route Handlers)
```

---

### 🛡️ Módulo Admin — Secretaria Acadêmica

> **Rota:** `/adm/dashboard`

O painel administrativo oferece controle global da instituição. É o hub central de gestão e monitoramento de todas as entidades e integrações do sistema.

#### Funcionalidades

| Tela | Descrição |
|---|---|
| **Dashboard** | Visão geral consolidada da instituição — indicadores de alunos, turmas e atividade recente. |
| **Gestão de Alunos** | Cadastro, edição, upload de foto de perfil (Supabase Storage) e visualização de todos os alunos. |
| **Gestão de Professores** | Cadastro e gerenciamento de professores, incluindo área de atuação e dados de acesso. |
| **Turmas** | Criação e gerenciamento de turmas, vinculação de cursos, turnos e professores. |
| **Central de Chamados** | Sistema interno de chamados e comunicação entre a secretaria e os demais perfis. |
| **Mapa de Salas** | Visualização interativa do campus — localização de salas, laboratórios e dependências. |
| **Configurações do Sistema** | Painel de controle de integrações externas com monitoramento em tempo real. |

#### ⚙️ Painel de Configurações — Detalhes

A tela de **Configurações do Sistema** é uma das mais sofisticadas do módulo:

- **Integrações e APIs:** Testa a conectividade em tempo real com Supabase, Google Gemini e Resend. O card do Gemini exibe três estados distintos: `Conectado`, `Conectado (Sem Cota)` e `Desconectado`, refletindo a resposta real da API.
- **Segurança e Logs:** Tabela de auditoria completa que exibe todas as ações sensíveis realizadas no sistema (usuário, ação, IP, data/hora), consultada diretamente da tabela `logs_auditoria` no Supabase.

---

### 👨‍🏫 Módulo Professor

> **Rota:** `/professor/dashboard`

O diário de classe digital do professor. Centraliza o registro de frequência, lançamento de notas, comunicação e análise inteligente de turmas.

#### Funcionalidades

| Tela | Descrição |
|---|---|
| **Visão Geral** | Dashboard com resumo de turmas, próximas atividades e notificações pendentes. |
| **Turmas e Notas** | Lançamento de notas (N1, N2, N3) com **trava de segurança pós-publicação** — notas publicadas não podem ser alteradas sem aprovação, garantindo integridade acadêmica. |
| **Chamada Rápida** | Registro de presença/falta por turma. Após o lançamento, **alertas de frequência são enviados automaticamente por e-mail** (via Resend) para os alunos com alto índice de faltas. |
| **Agenda Semestral** | Calendário de atividades, provas e eventos do semestre letivo. |
| **Mapa de Salas** | Localização de salas e laboratórios do campus. |
| **Insights de IA** | Módulo de análise preditiva — detalhado abaixo. |
| **Mensagens** | Central de mensagens para comunicação com a secretaria e alunos. |
| **Configurações de Perfil** | Modal de configurações para upload de **foto de avatar** (Supabase Storage) e definição de **horários de atendimento** — exibidos automaticamente no módulo de Contato do aluno. |

#### 🧠 Tela de Insights de IA — Detalhes

A tela de Insights combina dados reais do banco com análise do Gemini em dois painéis distintos:

**Raio-X Individual do Aluno:**
- Seleção de turma e aluno via filtros em cascata.
- Exibe média de notas, taxa de presença, total de faltas e um resumo narrativo do engajamento, calculados a partir dos dados reais das tabelas `notas` e `registro_chamada`.

**Assistente Pedagógico (Chat):**
- Interface de chat contextualizada com os dados reais do aluno selecionado.
- O professor pode fazer perguntas abertas sobre o desempenho, engajamento ou estratégias pedagógicas.
- O Gemini responde com base **exclusivamente nos dados fornecidos**, sem inventar métricas.

**Visão Geral de Desempenho (Macro):**
- Gráfico de barras com a **evolução da nota média** da turma por mês no semestre.
- Gráfico de linha com a **tendência de frequência** mensal, filtrado por período real (`data_aula`).
- **Síntese Preditiva** gerada pelo Gemini com análise das tendências da turma selecionada.

---

### 🎓 Módulo Aluno

> **Rota:** `/aluno/dashboard`

O portal acadêmico completo do estudante. Oferece acesso autônomo a todas as informações acadêmicas pessoais, com recursos de geração de documentos e comunicação.

#### Funcionalidades

| Tela | Descrição |
|---|---|
| **Visão Geral** | Dashboard com resumo de notas, frequência, próximos eventos e alertas acadêmicos. |
| **Boletim e Notas** | Visualização detalhada das notas por disciplina (N1, N2, N3, Média Final) com gráficos de desempenho. Permite **gerar e fazer download do Boletim Escolar em PDF** diretamente no navegador, via `@react-pdf/renderer`. |
| **Meu Calendário** | Calendário pessoal com eventos, provas e datas importantes do semestre. |
| **Frequência** | Histórico de presença e faltas por disciplina, com percentuais e alertas de risco. |
| **Grade e Matérias** | Grade curricular completa do curso com **cálculo de progresso em tempo real** — visualiza disciplinas cursadas vs. totais, créditos concluídos e percentual de conclusão do curso. |
| **Mapa de Salas e Labs** | Mapa interativo do campus para localização de salas de aula, laboratórios e outros espaços. |
| **Contato** | Central de contato direcionada automaticamente aos professores vinculados ao aluno, exibindo os **horários de atendimento** configurados por cada professor. |
| **Perfil** | Gerenciamento de dados pessoais e foto de perfil do aluno. |

---

## 🚀 Pré-requisitos e Instalação

### Pré-requisitos

- **Node.js** `>= 18.x`
- **npm** `>= 9.x` (ou `pnpm` / `yarn`)
- Uma conta ativa no **Supabase** com projeto configurado
- Uma chave de API do **Google Gemini** (Google AI Studio)
- Uma chave de API do **Resend** com domínio verificado

### Instalação

**1. Clone o repositório:**

```bash
git clone https://github.com/seu-usuario/uniclasstech.git
cd uniclasstech
```

**2. Instale as dependências:**

```bash
npm install
```

**3. Configure as variáveis de ambiente:**

Crie um arquivo `.env.local` na raiz do projeto (veja a seção abaixo).

**4. Rode o servidor de desenvolvimento:**

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

**5. Build para produção:**

```bash
npm run build
npm run start
```

---

## 🔑 Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto com as seguintes chaves:

```env
# ─── Supabase ────────────────────────────────────────────────────────────────
# URL pública do seu projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=

# Chave anônima (pública) do Supabase — usada no cliente
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# ─── Google Gemini AI ────────────────────────────────────────────────────────
# Chave de API do Google AI Studio (console.cloud.google.com ou ai.google.dev)
GEMINI_API_KEY=

# ─── Resend (E-mails Transacionais) ─────────────────────────────────────────
# Chave de API do Resend com domínio de envio verificado
RESEND_API_KEY=

# E-mail de origem configurado no seu domínio verificado no Resend
RESEND_FROM_EMAIL=

# ─── Autenticação Interna ────────────────────────────────────────────────────
# Segredo para assinar tokens de sessão internos (use uma string longa e aleatória)
AUTH_SECRET=
```

> ⚠️ **Nunca commite o arquivo `.env.local`** no repositório. Ele já deve estar listado no `.gitignore`.

---

## 🗄️ Estrutura do Banco de Dados

O banco de dados é gerenciado pelo **Supabase (PostgreSQL)** com Row Level Security (RLS) habilitado. Abaixo, uma visão geral das principais tabelas e seus relacionamentos:

| Tabela | Descrição |
|---|---|
| `alunos` | Dados cadastrais dos estudantes (nome, RA, curso, semestre, turma, foto_url, n1, etc.) |
| `professores` | Dados dos docentes (nome, área de atuação, e-mail, foto_url, horários de atendimento) |
| `turmas` | Registro de turmas (código, curso, turno, período) |
| `notas` | Lançamento de notas por aluno e disciplina (n1, n2, n3, media_final, ra_aluno) |
| `registro_chamada` | Histórico de chamadas (aluno_ra, turma_curso, data_aula, status: `presente`/`falta`) |
| `calendario` | Eventos e datas importantes do calendário acadêmico |
| `grade_curricular` | Disciplinas do curso com carga horária, créditos e status de conclusão |
| `chamados` | Chamados internos entre secretaria, professores e alunos |
| `configuracoes` | Configurações gerais do sistema acadêmico |
| `logs_auditoria` | Registro de auditoria de ações sensíveis (usuário, ação, IP, timestamp) |

### Relacionamentos Principais

```
alunos ──────┬──── notas           (via ra_aluno / ra)
             └──── registro_chamada (via aluno_ra / ra)

turmas ───────┬──── alunos          (via turma / codigo)
              └──── registro_chamada (via turma_curso / id)

professores ──┬──── turmas          (via area_atuacao / curso)
              └──── preferencias    (horários de atendimento — tabela separada)
```

---

## 📁 Estrutura de Diretórios

```
uniclasstech/
├── app/
│   ├── adm/                    # Módulo Secretaria Acadêmica
│   │   ├── login/
│   │   └── dashboard/
│   │       ├── alunos/
│   │       ├── professores/
│   │       ├── turmas/
│   │       ├── chamados/
│   │       ├── mapa/
│   │       └── configuracoes/
│   ├── professor/              # Módulo Professor
│   │   └── dashboard/
│   │       ├── notas/
│   │       ├── chamada/
│   │       ├── agenda/
│   │       ├── insights/
│   │       ├── mensagens/
│   │       └── mapa/
│   ├── aluno/                  # Módulo Aluno
│   │   └── dashboard/
│   │       ├── notas/
│   │       ├── calendario/
│   │       ├── frequencia/
│   │       ├── grade/
│   │       ├── mapa/
│   │       ├── contato/
│   │       └── perfil/
│   └── api/                    # Route Handlers (backend)
│       ├── auth/               # Autenticação (admin, professor, aluno)
│       ├── email/              # Envio de e-mails via Resend
│       ├── gemini/             # Teste de conectividade Gemini
│       ├── insights/           # Endpoints de IA (chat, turma, aluno, etc.)
│       ├── professores/        # Preferências e configurações do professor
│       └── settings/           # Testes de integração (Resend, etc.)
├── components/
│   ├── adm/                    # Componentes exclusivos do Admin
│   ├── aluno/                  # Componentes exclusivos do Aluno
│   ├── professor/              # Componentes exclusivos do Professor
│   ├── pdf/                    # Gerador de Boletim PDF
│   ├── icons/                  # Ícones customizados (logo UCT, Google)
│   └── ui/                     # Componentes de UI reutilizáveis
├── emails/                     # Templates de e-mail (React Email)
│   └── EmailBoasVindas.tsx
├── lib/
│   ├── supabase.ts             # Cliente Supabase
│   ├── gemini-fallback.ts      # Esteira de redundância Gemini
│   ├── admin-session.ts        # Gerenciamento de sessão Admin
│   ├── professor-session.ts    # Gerenciamento de sessão Professor
│   ├── aluno-session.ts        # Gerenciamento de sessão Aluno
│   ├── professor-preferencias.ts
│   └── mapa-catalogo.ts        # Catálogo de salas e laboratórios
└── public/                     # Assets estáticos
```

---

## 🔒 Autenticação

O sistema utiliza **três fluxos de autenticação independentes**, um por perfil de usuário, todos suportados pelo Supabase Auth:

- **`/adm/login`** → Acesso da Secretaria Acadêmica
- **`/professor`** → Login do corpo docente
- **`/`** → Acesso do estudante (autenticado via RA e senha)

As sessões são validadas em cada Route Handler da API via `lib/api-auth.ts`, garantindo que um perfil não acesse recursos de outro.

---

## 🧪 Como Testar (Credenciais)

### ⚙️ Acesso Administrativo (Secretaria/Root)

| Campo | Valor |
| :--- | :--- |
| E-mail | `admin@uniclass.com` |
| Senha Padrão | `admin123` |

Portal administrativo: `/adm/login`

---

### 👨‍🏫 Acesso Professor (Ambiente de Testes)

> ⚠️ **Atenção:** o banco possui dados fictícios para demonstração. Há segregação de turmas no login.

**Senha Padrão:** `Uniclass@2026`

| Professor | Área de Atuação | E-mail Institucional |
| :--- | :--- | :--- |
| Roberto Lima | Banco de Dados | `roberto.lima@uniclasstech.edu.br` |
| Camila Nogueira | Sistemas de Informação | `camila.nogueira@uniclasstech.edu.br` |
| Marcos Vinicius Dias | Ciência da Computação | `marcos.dias@uniclasstech.edu.br` |
| Juliana Mendes | Redes de Computadores | `juliana.mendes@uniclasstech.edu.br` |

Portal do docente: `/professor`

---

### 🎓 Acesso Aluno (Ambiente de Testes)

| Campo | Valor |
| :--- | :--- |
| Usuário (RA) | `20261001` (Ex: Gabriel Menezes - Banco de Dados) |
| Senha Padrão | `aluno123` |

Portal do aluno: `/`

---

<div align="center">
  <sub>Desenvolvido com ❤️ · UniClassTech &copy; 2026</sub>
</div>
