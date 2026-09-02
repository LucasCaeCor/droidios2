# Droid2iOS Studio

IDE desktop para migração assistida de projetos Android para iOS.

## O que já funciona

- Aplicativo desktop Electron/React com aparência de IDE.
- Clonagem de repositório Git para workspace isolado.
- Abertura de projeto local.
- Árvore de arquivos, editor Monaco e terminal integrado.
- Análise estática de Kotlin/Java/Compose/Room/Hilt/WorkManager/Firebase/DataStore.
- Estratégia automática inicial de migração.
- Chat com agente que pode ler arquivos e pesquisar o projeto automaticamente.
- Ações propostas de `write_file`, `delete_file` e `run_command` com aprovação do usuário.
- Provedores: OpenRouter, Gemini API e Ollama local.
- Credenciais persistidas localmente com `safeStorage` do Electron quando disponível.
- Geração de scaffold Kotlin Multiplatform + Compose Multiplatform + app iOS.
- Geração automática de `.github/workflows/ios-unsigned.yml`.
- Criação de repositório GitHub, commit, push, disparo de workflow, listagem de runs e download do artifact.
- Workflow próprio para gerar instalador Windows e executável portátil do Droid2iOS Studio.

## Limite importante

O Studio é um ambiente de migração assistida, não um conversor mágico de APK para IPA. Apps podem depender de APIs sem equivalente direto no iOS. O agente trabalha sobre código-fonte, isola dependências Android e cria equivalentes iOS. Decisões específicas de produto/hardware ainda podem exigir revisão humana.

O IPA gerado pelo workflow é **sem assinatura**. A assinatura de instalação em iPhone continua sendo feita fora do Studio com credenciais/provisionamento Apple.

## Desenvolvimento no Windows

Pré-requisitos:

- Node.js 22+
- Git

```powershell
npm install
npm run dev
```

## Gerar EXE localmente

```powershell
npm run dist:win
```

Arquivos em `release/`.

## Gerar EXE pelo GitHub Actions

1. Crie um repositório para este Studio.
2. Faça push deste projeto.
3. Abra **Actions → Build Droid2iOS Studio → Run workflow**.
4. Ao terminar, baixe o artifact **Droid2iOS-Studio-Windows**.

## Uso

1. Abra o Droid2iOS Studio.
2. Cole o repositório Android e clique em **Clonar e abrir workspace**.
3. Clique em **Analisar**.
4. Em **Conversão**, crie a infraestrutura iOS.
5. Configure o agente em **Configurações**.
6. Use o chat para migrar/corrigir o projeto.
7. Em **GitHub**, crie um novo repositório de destino, faça commit/push e dispare **Gerar IPA**.
8. Quando o build estiver verde, baixe o artifact.

Veja `docs/AGENT_SETUP.md` e `docs/IOS_PIPELINE.md`.
