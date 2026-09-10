<div align="center">

# 🎓 UniClassTech - Sistema de Gestão Educacional

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)

</div>

<br />

**UniClassTech** é um ERP educacional moderno focado em **realismo operacional**, **UX premium (Dark Theme)** e **automação via Inteligência Artificial** (Llama 3 via Groq). A plataforma conecta secretaria, docentes e alunos em um fluxo único, com interfaces escuras elegantes e insights gerados por IA em tempo real.

---

## ✨ Funcionalidades Principais

### 🏛️ Módulo Administrativo (Secretaria)

- Matrículas corporativas em **3 etapas** (dados do aluno, vínculo acadêmico e confirmação)
- Gestão completa de **turmas**, professores e alunos
- **Insights de IA** para apoiar decisões da secretaria
- Painel de **vagas** e acompanhamento operacional do semestre

### 👨‍🏫 Portal do Docente

- **Login isolado** com sessão própria (`uniclass_prof_session`)
- Listagem **paginada** de notas por turma
- **Chamada rápida** com registro de presença/falta
- Isolamento de dados: cada professor visualiza apenas seus alunos

---

## 🛠️ Tecnologias Utilizadas

| Camada | Stack |
| :--- | :--- |
| **Frontend** | Next.js (App Router), React, Tailwind CSS, Lucide React |
| **Backend / Database** | Supabase (Auth, Postgres, Storage) |
| **IA** | Groq SDK (Llama 3 / GPT) |

---

## 🚀 Como Instalar e Rodar Localmente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/UniClassTech.git
cd UniClassTech
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
GROQ_API_KEY=sua_chave_da_api_groq
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

---

## 🧪 Como Testar (Login de Professores)

> ⚠️ **Atenção:** o banco possui **dados fictícios** para demonstração. Há **segregação de turmas no login** — cada docente enxerga apenas os alunos vinculados à sua área/titulação.

### 🔑 Senha Padrão de Testes

```
Uniclass@2026
```

### 📋 Credenciais de Teste

| Professor | Área de Atuação | E-mail Institucional |
| :--- | :--- | :--- |
| Roberto Lima | Banco de Dados | `roberto.lima@uniclasstech.edu.br` |
| Camila Nogueira | Sistemas de Informação | `camila.nogueira@uniclasstech.edu.br` |
| Marcos Vinicius Dias | Ciência da Computação | `marcos.dias@uniclasstech.edu.br` |
| Juliana Mendes | Redes de Computadores | `juliana.mendes@uniclasstech.edu.br` |

Portal do docente: [`/professor`](http://localhost:3000/professor)

### 🎓 Acesso Aluno (Ambiente de Testes)

Para testar o portal do aluno, o sistema está configurado com uma senha padrão universal. O painel se adapta dinamicamente às disciplinas, professores e notas do RA logado.

| Campo | Valor |
| :--- | :--- |
| Usuário (RA) | `20261001` (Ex: Gabriel Menezes - Banco de Dados) |
| Senha Padrão | `aluno123` |

Portal do aluno: [`/`](http://localhost:3000/)

---

<div align="center">

**Desenvolvido com 💜 e tecnologia.**

</div>
