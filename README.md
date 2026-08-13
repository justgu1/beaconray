# 1. 📡 beaconray (v2.0.0-alpha)

> Plataforma visual híbrida e motor de compilação distribuído para engenharia de componentes agnósticos de interface. Projete via Drag & Drop (Layout Engine) e Painel Atômico (Design Engine), compile em sandbox assíncrona para React/Vue3/Astro via Mitosis, e consuma sob demanda via CLI proprietária integrada a um ecossistema privado auto-hospedado (Symfony + PostgreSQL + Redis + MinIO).

---

## 1.1. 🎯 Visão do Ecossistema

O Beaconray rejeita o modelo tradicional de bibliotecas de terceiros monolíticas. Ele opera como um **Compilador Visual Distribuído**. 

O desenvolvedor projeta interfaces complexas visualmente através de uma árvore semântica rigorosa. O motor traduz essa árvore em uma **AST (Abstract Syntax Tree)** abstrata, compila para código nativo e disponibiliza o artefato imediatamente no terminal através de um registro de pacotes privado e escopado, garantindo performance bruta ($\le800\text{ms}$ em tempo de execução) e conformidade automatizada WCAG 2.1 AA.

---

## 1.2. 🛠️ Arquitetura de Tecnologia Avançada

Use o código com cuidado.┌──────────────────────────────────────┐│         STUUDIO UI (Next/Inertia)   │└──────────────────┬───────────────────┘│ (Payload AST JSONB)▼┌──────────────────────────────────────┐│         SYMFONY CORE API             │└─┬────────────────┬─────────────────┬─┘│                │                 │▼ (Cache/Jobs)   ▼ (Metadata)      ▼ (Artefatos)┌─────────┐     ┌────────────┐    ┌───────────┐│  REDIS  │     │ POSTGRESQL │    │   MINIO   │└────┬────┘     └────────────┘    └─────▲─────┘│                                  │▼ (Spawn Workers)                  │ (Upload)┌────────────────────────────┐          ││  COMPILER ISOLATED ENGINE  ├──────────┘│  (Node.js / Mitosis)       │└────────────────────────────┘
### 1.2.1. 🧠 Core de Compilação & UI
*   **AST Parser:** Mecanismo customizado em TypeScript que valida se a árvore gerada pelo construtor visual mapeia perfeitamente para nós válidos do Mitosis (`.lite.tsx`).
*   **Multi-Framework Target:** Compilação nativa para React (componentes funcionais com Hooks), Vue 3 (Composition API estruturada com `<script setup>`) e Astro (componentes estáticos puros).
*   **Tailwind Engine v4.0:** Injeção dinâmica de tokens CSS e variáveis via `@theme`. Acoplado com `tailwind-merge` e `clsx` dinâmicos compilados diretamente nos atributos de classe do componente alvo.
*   **Acessibilidade Semântica:** Uso obrigatório de `@dnd-kit/core` modificado para manter foco de teclado e leitura de ARIA Live regions durante a reordenação de nós no layout.

### 1.2.2. 🛡️ Infraestrutura & Segurança Backend
*   **Gateway de APIs:** Symfony atuando como orquestrador stateless, gerenciando controle de acesso RBAC, cotas de compilação e versionamento SemVer automático.
*   **Storage de Pacotes:** MinIO operando em cluster privado distribuído. Armazena os blobs comprimidos (`.tar.gz`) que contêm os códigos-fonte gerados para cada framework.
*   **Mensageria e Filas:** Redis Enterprise para desacoplamento de chamadas concorrentes de compilação pesadas, utilizando filas prioritárias (`high`, `default`, `low`) e controle de Throttling/Rate Limiting.

---

## 1.3. 🚀 Protocolo CLI e Handshake Técnico

### 1.3.1. Inicialização de Sessão com Handshake Criptográfico
Gera um par de chaves e autentica o terminal local contra o servidor central via protocolo seguro, armazenando o token JWT/Sanctum de forma segura no chaveiro do sistema operacional ou em diretório de configuração restrito (`0600`):
```bash
npx beaconray login
```

### 1.3.2. Consumo de Pacotes Escopados
Injeta a dependência diretamente na arquitetura do projeto. A CLI lê o arquivo local de configuração (`beaconray.json`), identifica o framework do projeto alvo e requisita apenas o binário específico para o Laravel API:
```bash
npx beaconray add @beaconray/justgu1-async-select --version=1.2.0
```

### 1.3.3. Pipeline de Sincronização Local (Continuous Integration)
Para desenvolvedores avançados que alteram a especificação JSON localmente e desejam atualizar o Studio diretamente do terminal:
```bash
npx beaconray push ./src/components/button.json --force
```

---

## 1.4. 🧭 Governança de Desenvolvimento (Harness Spec-Driven)

O desenvolvimento do Beaconray segue um harness spec-driven: `AGENTS.md` (raiz) define as regras obrigatórias pra qualquer agente/dev atuando no repo, carregando `.specs/SPECS.md` (índice de specs), `.specs/SKILLS.md` (índice de skills/checklists) e `.specs/ADRS.md` (decisões de arquitetura registradas) antes de qualquer tarefa. Nenhuma mudança de código entra sem spec correspondente, e toda sessão de trabalho atualiza o `CHANGELOG.md` da raiz.

## 1.5. ⚖️ Governança de Licenciamento

O núcleo do projeto, incluindo a CLI de extração e o compilador base, é distribuído sob a **Licença MIT**. Módulos proprietários e estruturas de dados de usuários armazenadas nas tabelas privadas são protegidos e criptografados em repouso no PostgreSQL através de criptografia nativa de coluna (pgcrypto).