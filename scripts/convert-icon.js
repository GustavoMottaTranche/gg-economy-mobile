/**
 * Script para converter imagem JPG para PNG e redimensionar para ícone de app.
 *
 * Uso:
 *   node scripts/convert-icon.js <caminho-da-imagem.jpg>
 *
 * Gera:
 *   - assets/icon.png (1024x1024) — ícone principal do app
 *   - assets/adaptive-icon.png (1024x1024) — ícone adaptativo Android
 *   - assets/favicon.png (48x48) — favicon para web
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = process.argv[2];

if (!INPUT) {
  console.error('❌ Uso: node scripts/convert-icon.js <caminho-da-imagem>');
  console.error('   Exemplo: node scripts/convert-icon.js ~/Downloads/gg-logo.jpg');
  process.exit(1);
}

const inputPath = path.resolve(INPUT);

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Arquivo não encontrado: ${inputPath}`);
  process.exit(1);
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Garante que a pasta assets existe
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function convert() {
  console.log(`📷 Processando: ${inputPath}\n`);

  // 1. Ícone principal (1024x1024)
  await sharp(inputPath)
    .resize(1024, 1024, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✅ assets/icon.png (1024x1024)');

  // 2. Adaptive icon para Android (1024x1024)
  await sharp(inputPath)
    .resize(1024, 1024, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✅ assets/adaptive-icon.png (1024x1024)');

  // 3. Favicon para web (48x48)
  await sharp(inputPath)
    .resize(48, 48, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✅ assets/favicon.png (48x48)');

  // 4. Splash icon (opcional, 200x200 para splash screen)
  await sharp(inputPath)
    .resize(200, 200, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('✅ assets/splash-icon.png (200x200)');

  console.log('\n🎉 Pronto! Agora configure o app.json com os caminhos dos ícones.');
}

convert().catch((err) => {
  console.error('❌ Erro ao processar imagem:', err.message);
  process.exit(1);
});
