# Pipeline iOS

## Arquitetura

```text
Android original (não alterado)
        |
        | git clone
        v
Workspace Droid2iOS
        |
        +-- Android existente
        +-- ios-converted/       Kotlin/Compose Multiplatform
        +-- iosApp/              shell Xcode/Swift
        +-- .github/workflows/ios-unsigned.yml
        |
        v
Novo repositório GitHub
        |
        v
GitHub Actions / macOS / Xcode
        |
        v
Droid2iOS-unsigned.ipa
        |
        v
assinatura/provisionamento manual
        |
        v
iPhone
```

## O que o scaffold faz

Para projetos Kotlin/Compose, o scaffold cria um projeto KMP separado usando Kotlin 2.4.10 e Compose Multiplatform 1.11.0. Ele não move automaticamente todo o app na primeira etapa. O agente passa a migrar componentes reais de maneira incremental e revisável.

O workflow:

1. checkout;
2. Java 17;
3. instala XcodeGen;
4. compila framework Kotlin/Native `iosArm64`;
5. gera projeto Xcode;
6. compila para `iphoneos` com code signing desativado;
7. empacota `Payload/*.app` como IPA;
8. publica artifact no GitHub Actions.

## Ciclo de correção

Quando o Actions falhar:

1. Abra o run no GitHub e copie o trecho relevante do erro.
2. Cole no chat do Droid2iOS Studio.
3. Peça: `Corrija este build iOS sem quebrar o Android.`
4. Revise/aplique as ações propostas.
5. Commit + push.
6. Rode novamente.

Esse ciclo é o núcleo do sistema de migração assistida.
