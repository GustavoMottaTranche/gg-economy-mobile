@echo off
REM Build script that uses a short path junction to avoid Windows MAX_PATH issues with CMake/Ninja
REM The junction C:\ggm points to this project directory

set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set APP_ENV=production

REM Create junction if it doesn't exist
if not exist C:\ggm (
    mklink /J C:\ggm "%~dp0"
)

REM Clean CMake caches (they store absolute paths)
if exist "C:\ggm\node_modules\expo\node_modules\expo-modules-core\android\.cxx" (
    rmdir /s /q "C:\ggm\node_modules\expo\node_modules\expo-modules-core\android\.cxx"
)
if exist "C:\ggm\node_modules\expo-updates\android\.cxx" (
    rmdir /s /q "C:\ggm\node_modules\expo-updates\android\.cxx"
)
if exist "C:\ggm\android\app\.cxx" (
    rmdir /s /q "C:\ggm\android\app\.cxx"
)

REM Run Gradle from the short path
cd /d C:\ggm\android
call gradlew.bat assembleRelease -x lint -x test --no-daemon %*

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo APK: C:\ggm\android\app\build\outputs\apk\release\app-release.apk
    echo ========================================
) else (
    echo.
    echo BUILD FAILED with exit code %ERRORLEVEL%
)
