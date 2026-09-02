# Token do GitHub

O Studio usa o token apenas para operações solicitadas por você: criar o repositório de conversão, fazer push, disparar GitHub Actions, consultar runs/logs e baixar artifacts.

## Fine-grained token recomendado

No GitHub, crie um Fine-grained Personal Access Token para seu próprio usuário. Para o fluxo completo do Studio, permita acesso aos repositórios de conversão e habilite, quando disponível:

- **Administration: write** — necessário para criar repositório via API.
- **Contents: write** — necessário para enviar conteúdo ao repositório.
- **Actions: write** — necessário para disparar `workflow_dispatch`.
- **Actions: read** — para consultar runs, logs e artifacts (write normalmente inclui read).
- **Metadata: read** — acesso básico ao repositório.

Se preferir um token classic, o escopo `repo` é o caminho mais simples para repositório privado, mas concede acesso mais amplo. Prefira Fine-grained e limite o token ao necessário.

## Segurança

O token é salvo nas configurações locais do aplicativo. O Studio tenta usar `safeStorage` do Electron para criptografá-lo com o mecanismo do sistema operacional. O token não deve ser colocado em `.env`, código-fonte, chat do agente ou GitHub Secrets para este fluxo.

Você também pode não configurar token algum e usar Git/GitHub manualmente pelo terminal integrado.
