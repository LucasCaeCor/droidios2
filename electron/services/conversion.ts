import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject } from './analyzer';
import { getWorkspaceRoot, writeFile } from './workspace';

function yamlWorkflow() {
  return `name: iOS - Unsigned IPA

on:
  workflow_dispatch:
  push:
    branches: [ main, master ]
    paths:
      - 'ios-converted/**'
      - 'iosApp/**'
      - '.github/workflows/ios-unsigned.yml'

jobs:
  build-ios:
    runs-on: macos-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '9.5.0'

      - name: Install XcodeGen
        run: brew install xcodegen

      - name: Build Kotlin framework for iPhone
        working-directory: ios-converted
        run: gradle :composeApp:linkDebugFrameworkIosArm64 --stacktrace

      - name: Generate Xcode project
        working-directory: iosApp
        run: xcodegen generate

      - name: Build iOS app without signing
        run: |
          xcodebuild \\
            -project iosApp/UsinagemConverted.xcodeproj \\
            -scheme UsinagemConverted \\
            -configuration Debug \\
            -sdk iphoneos \\
            -destination 'generic/platform=iOS' \\
            CODE_SIGNING_ALLOWED=NO \\
            CODE_SIGNING_REQUIRED=NO \\
            CODE_SIGN_IDENTITY='' \\
            CONFIGURATION_BUILD_DIR="$PWD/build/iphoneos" \\
            build

      - name: Package unsigned IPA
        run: |
          APP_PATH=$(find "$PWD/build/iphoneos" -maxdepth 1 -name '*.app' -type d | head -1)
          test -n "$APP_PATH"
          mkdir -p Payload
          cp -R "$APP_PATH" Payload/
          ditto -c -k --sequesterRsrc --keepParent Payload Droid2iOS-unsigned.ipa

      - uses: actions/upload-artifact@v4
        with:
          name: droid2ios-unsigned-ipa
          path: Droid2iOS-unsigned.ipa
          retention-days: 14
`;
}

export function createConversionScaffold() {
  const root = getWorkspaceRoot();
  if (!root) throw new Error('Nenhum projeto aberto.');
  const analysis = analyzeProject();
  const iosRoot = path.join(root, 'ios-converted');
  fs.mkdirSync(iosRoot, { recursive: true });

  writeFile('.droid2ios/project.json', JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    strategy: analysis.recommendedStrategy,
    sourceProject: analysis.projectName,
    analysis
  }, null, 2));

  writeFile('MIGRATION_PLAN.md', `# Droid2iOS Migration Plan\n\nProjeto: **${analysis.projectName}**\n\nEstratégia: **${analysis.recommendedStrategy}**\n\nCompatibilidade inicial: **${analysis.migrationScore}%**\n\n## Sinais detectados\n${analysis.androidSignals.map(x => `- ${x}`).join('\n') || '- Nenhum sinal Android específico catalogado.'}\n\n## Bloqueadores iOS\n${analysis.iosBlockers.map(x => `- [ ] ${x}`).join('\n') || '- [x] Nenhum bloqueador estático detectado.'}\n\n## Plano do agente\n1. Manter o projeto Android de origem intacto no repositório original.\n2. Extrair modelos, regras de negócio e estado para commonMain.\n3. Migrar UI Compose reutilizável para commonMain.\n4. Isolar android.* e bibliotecas Android-only.\n5. Criar implementações equivalentes em iosMain.\n6. Fazer o workflow macOS compilar até ficar verde.\n7. Gerar IPA sem assinatura para sideload manual.\n`);

  writeFile('ios-converted/settings.gradle.kts', `pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name = "Droid2iOSConverted"\ninclude(":composeApp")\n`);
  writeFile('ios-converted/build.gradle.kts', `plugins {\n    kotlin("multiplatform") version "2.4.10" apply false\n    id("org.jetbrains.compose") version "1.11.0" apply false\n    id("org.jetbrains.kotlin.plugin.compose") version "2.4.10" apply false\n}\n`);
  writeFile('ios-converted/gradle.properties', `org.gradle.jvmargs=-Xmx4g -Dfile.encoding=UTF-8\nkotlin.code.style=official\nkotlin.mpp.enableCInteropCommonization=true\n`);
  writeFile('ios-converted/composeApp/build.gradle.kts', `plugins {\n    kotlin("multiplatform")\n    id("org.jetbrains.compose")\n    id("org.jetbrains.kotlin.plugin.compose")\n}\n\nkotlin {\n    iosArm64()\n    iosSimulatorArm64()\n    sourceSets {\n        commonMain.dependencies {\n            implementation(compose.runtime)\n            implementation(compose.foundation)\n            implementation(compose.material3)\n            implementation(compose.ui)\n        }\n    }\n    targets.withType<org.jetbrains.kotlin.gradle.plugin.mpp.KotlinNativeTarget>().configureEach {\n        binaries.framework { baseName = "Shared"; isStatic = true }\n    }\n}\n`);
  writeFile('ios-converted/composeApp/src/commonMain/kotlin/App.kt', `import androidx.compose.foundation.layout.*\nimport androidx.compose.material3.*\nimport androidx.compose.runtime.*\nimport androidx.compose.ui.Alignment\nimport androidx.compose.ui.Modifier\nimport androidx.compose.ui.unit.dp\n\n@Composable\nfun App() {\n    MaterialTheme {\n        Surface(Modifier.fillMaxSize()) {\n            Column(\n                modifier = Modifier.fillMaxSize().padding(24.dp),\n                verticalArrangement = Arrangement.Center,\n                horizontalAlignment = Alignment.CenterHorizontally\n            ) {\n                Text("Droid2iOS conversion ready", style = MaterialTheme.typography.headlineSmall)\n                Spacer(Modifier.height(12.dp))\n                Text("Use o agente do Studio para migrar as telas e regras do app Android para commonMain.")\n            }\n        }\n    }\n}\n`);
  writeFile('ios-converted/composeApp/src/iosMain/kotlin/MainViewController.kt', `import androidx.compose.ui.window.ComposeUIViewController\n\nfun MainViewController() = ComposeUIViewController { App() }\n`);

  writeFile('iosApp/project.yml', `name: UsinagemConverted\noptions:\n  bundleIdPrefix: dev.droid2ios\ntargets:\n  UsinagemConverted:\n    type: application\n    platform: iOS\n    deploymentTarget: "14.0"\n    sources:\n      - path: UsinagemConverted\n    dependencies:\n      - framework: ../ios-converted/composeApp/build/bin/iosArm64/debugFramework/Shared.framework\n        embed: true\n    settings:\n      base:\n        PRODUCT_BUNDLE_IDENTIFIER: dev.droid2ios.converted\n        SWIFT_VERSION: 5.0\n        TARGETED_DEVICE_FAMILY: "1,2"\n        CODE_SIGN_STYLE: Automatic\n        INFOPLIST_FILE: UsinagemConverted/Info.plist\n        GENERATE_INFOPLIST_FILE: NO\n`);
  writeFile('iosApp/UsinagemConverted/AppDelegate.swift', `import UIKit\nimport Shared\n\n@main\nclass AppDelegate: UIResponder, UIApplicationDelegate {\n    var window: UIWindow?\n\n    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {\n        let window = UIWindow(frame: UIScreen.main.bounds)\n        window.rootViewController = MainViewControllerKt.MainViewController()\n        window.makeKeyAndVisible()\n        self.window = window\n        return true\n    }\n}\n`);
  writeFile('iosApp/UsinagemConverted/Info.plist', `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n<key>CFBundleDisplayName</key><string>Droid2iOS App</string>\n<key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>\n<key>CFBundleName</key><string>$(PRODUCT_NAME)</string>\n<key>CFBundlePackageType</key><string>APPL</string>\n<key>CFBundleShortVersionString</key><string>1.0</string>\n<key>CFBundleVersion</key><string>1</string>\n<key>UILaunchScreen</key><dict/>\n<key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string><string>UIInterfaceOrientationLandscapeLeft</string><string>UIInterfaceOrientationLandscapeRight</string></array>\n</dict></plist>\n`);

  writeFile('.github/workflows/ios-unsigned.yml', yamlWorkflow());
  writeFile('ios-converted/README.md', `# iOS Converted Workspace\n\nEste diretório é gerenciado pelo Droid2iOS Studio. A primeira versão é um shell Compose Multiplatform compilável. O agente deve migrar gradualmente código Android para commonMain/iosMain e manter o workflow verde.\n`);
  return { analysis, created: ['.droid2ios/project.json', 'MIGRATION_PLAN.md', 'ios-converted/', 'iosApp/', '.github/workflows/ios-unsigned.yml'] };
}
