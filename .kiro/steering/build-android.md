---
inclusion: manual
---

# Build & Install Android APK

Guia para gerar e instalar APKs no dispositivo conectado via USB.

## Variáveis de Ambiente (obrigatórias)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\gutao\AppData\Local\Android\Sdk"
```

## Caminho do ADB

```
C:\Users\gutao\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

## Diretório do Projeto

```
c:\app\organizador\gg-economy-mobile
```

---

## Build de RELEASE (Produção)

Package: `com.ggeconomy.mobile`  
Substitui o app principal no celular.

### Passos

1. **Prebuild com APP_ENV=production**

   ```powershell
   cd c:\app\organizador\gg-economy-mobile
   $env:APP_ENV = "production"
   npx expo prebuild --platform android --clean
   ```

2. **Configurar local.properties**
   Criar/atualizar `android/local.properties`:

   ```
   sdk.dir=C:\\Users\\gutao\\AppData\\Local\\Android\\Sdk
   ```

3. **Adicionar lint config no build.gradle**
   Em `android/app/build.gradle`, dentro do bloco `android { }`, após `androidResources`, adicionar:

   ```groovy
   lint {
       checkReleaseBuilds false
       abortOnError false
   }
   ```

4. **Buildar APK**

   ```powershell
   cd c:\app\organizador\gg-economy-mobile\android
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   $env:ANDROID_HOME = "C:\Users\gutao\AppData\Local\Android\Sdk"
   .\gradlew.bat assembleRelease
   ```

5. **Instalar no dispositivo**
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "C:\app\organizador\gg-economy-mobile\android\app\build\outputs\apk\release\app-release.apk"
   ```

---

## Build de DEV (Desenvolvimento)

Package: `com.ggeconomy.mobile.dev`  
Instala como app separado — permite ter dev e prod no mesmo celular.

### Passos

1. **Prebuild sem APP_ENV (default = dev)**

   ```powershell
   cd c:\app\organizador\gg-economy-mobile
   $env:APP_ENV = $null
   npx expo prebuild --platform android --clean
   ```

2. **Configurar local.properties**
   Criar/atualizar `android/local.properties`:

   ```
   sdk.dir=C:\\Users\\gutao\\AppData\\Local\\Android\\Sdk
   ```

3. **Adicionar lint config no build.gradle**
   Em `android/app/build.gradle`, dentro do bloco `android { }`, após `androidResources`, adicionar:

   ```groovy
   lint {
       checkReleaseBuilds false
       abortOnError false
   }
   ```

4. **Buildar APK (debug)**

   ```powershell
   cd c:\app\organizador\gg-economy-mobile\android
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   $env:ANDROID_HOME = "C:\Users\gutao\AppData\Local\Android\Sdk"
   .\gradlew.bat assembleDebug
   ```

5. **Instalar no dispositivo**
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "C:\app\organizador\gg-economy-mobile\android\app\build\outputs\apk\debug\app-debug.apk"
   ```

---

## Troubleshooting

### Erro: "JAVA_HOME is not set"

Definir a variável antes de rodar o Gradle:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

### Erro: "SDK location not found"

Criar o arquivo `android/local.properties` com:

```
sdk.dir=C:\\Users\\gutao\\AppData\\Local\\Android\\Sdk
```

### Erro: Lint (lintVitalRelease / checkReleaseBuilds)

Adicionar no `android/app/build.gradle` dentro do bloco `android`:

```groovy
lint {
    checkReleaseBuilds false
    abortOnError false
}
```

### Erro: "Unable to delete file" (file lock)

O daemon do Gradle pode estar travando arquivos. Solução:

```powershell
cd c:\app\organizador\gg-economy-mobile\android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat --stop
Start-Sleep -Seconds 3
.\gradlew.bat assembleRelease
```

### Erro: Caches sujos de node_modules (NoSuchFileException, AAPT errors)

Quando alterna entre builds dev e release, os caches nativos dos node_modules ficam sujos. Limpar:

```powershell
Remove-Item "C:\app\organizador\gg-economy-mobile\node_modules\@react-native-async-storage\async-storage\android\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\app\organizador\gg-economy-mobile\node_modules\@react-native-community\datetimepicker\android\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\app\organizador\gg-economy-mobile\node_modules\@expo\log-box\android\build" -Recurse -Force -ErrorAction SilentlyContinue
```

Então rodar com `clean`:

```powershell
.\gradlew.bat --stop
Start-Sleep -Seconds 2
.\gradlew.bat clean assembleRelease
```

### Erro: Build usa cache antigo (fix não aparece)

Forçar rebuild completo:

```powershell
.\gradlew.bat assembleRelease --rerun-tasks
```

Ou parar daemon + rebuild:

```powershell
.\gradlew.bat --stop
Start-Sleep -Seconds 3
.\gradlew.bat assembleRelease
```

### Erro: APK instala como app separado (não substitui o principal)

O prebuild foi feito sem `APP_ENV=production`. O package fica `.dev` ao invés do correto. Refazer o prebuild:

```powershell
$env:APP_ENV = "production"
npx expo prebuild --platform android --clean
```

E então repetir os passos de build.

### Verificar dispositivo conectado

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Deve mostrar o dispositivo com status `device`.

---

## Notas Importantes

- O `expo prebuild --clean` apaga a pasta `android/` inteira e regenera. Qualquer alteração manual (como lint config e local.properties) precisa ser reaplicada.
- O `app.config.js` controla o package name via `APP_ENV`:
  - `production` → `com.ggeconomy.mobile`
  - `preview` → `com.ggeconomy.mobile.preview`
  - sem definir / outro valor → `com.ggeconomy.mobile.dev`
- A APK de release usa `signingConfigs.debug` (debug keystore). Funciona para testes mas não para publicação na Play Store.
