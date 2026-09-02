# Configurando o agente gratuito

O Droid2iOS Studio suporta três modos.

## Opção A — OpenRouter Free Models Router

É a opção padrão do Studio.

1. Crie uma conta no OpenRouter.
2. Crie uma API key.
3. No Droid2iOS Studio abra **Configurações**.
4. Selecione **OpenRouter**.
5. Modelo: `openrouter/free`.
6. Cole a API key.
7. Clique em **Testar agente**.
8. Salve.

O Free Models Router escolhe automaticamente um modelo gratuito disponível. É adequado para testes e baixo volume; os limites gratuitos podem variar.

## Opção B — Gemini API free tier

1. Entre no Google AI Studio.
2. Crie/copiei uma Gemini API key.
3. Abra **Configurações** no Studio.
4. Selecione **Gemini API**.
5. Comece com `gemini-3.7-flash` ou substitua por outro modelo disponível na sua conta.
6. Cole a API key.
7. Clique em **Testar agente**.
8. Salve.

A camada do Studio usa a API `generateContent` e deixa o nome do modelo editável para evitar ficar preso a uma versão.

## Opção C — Ollama local

Não usa API paga nem envia seu código para um provedor remoto.

1. Instale Ollama no Windows.
2. Baixe um modelo de código, por exemplo:

```powershell
ollama pull qwen2.5-coder:7b
```

3. No Studio selecione **Ollama**.
4. URL: `http://localhost:11434`.
5. Modelo: o nome exato instalado.
6. Teste.

Modelos locais exigem memória/RAM/VRAM suficiente e normalmente são menos fortes para migrações grandes do que modelos de nuvem.

## Como o agente atua

O agente recebe:

- análise estática do projeto;
- árvore resumida;
- arquivo atualmente aberto;
- últimas mensagens do chat.

Ele pode solicitar leituras adicionais de arquivo e buscas textuais. Essas leituras são automáticas e limitadas. Alterações no projeto e comandos retornam como ações revisáveis na interface.

### Fluxo recomendado

1. `Analise este projeto e priorize os bloqueadores para iOS.`
2. `Migre primeiro os modelos e regras de negócio para commonMain.`
3. `Agora isole Room/DataStore/Hilt e proponha equivalentes multiplataforma.`
4. `Migre esta tela Compose para commonMain preservando comportamento.`
5. Depois de enviar ao GitHub: `O build iOS falhou com este log: ... Corrija a causa.`

Não cole tokens, senhas ou certificados Apple no chat.
