#!/usr/bin/env node
// Motor dosyalarını kökten extension/engine/ içine kopyalar.
//
// Neden kopya: Chrome eklenti kökünün DIŞINA çıkan yol (../recognizers.js)
// manifest'te geçersizdir. Tek kaynak kökte kalır, extension/engine/ üretilmiş
// çıktıdır ve .gitignore'dadır — böylece gazetteer/recognizer iyileştirmeleri
// hem web uygulamasına hem eklentiye tek yerden akar, iki kopya ayrışmaz.
//
// Kullanım: npm run build:ext

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'extension', 'engine');

const FILES = [
    'dictionaries.js',
    'recognizers.js',
    'ner-engine.js',
    'ai-workflow.js',
];

fs.mkdirSync(OUT, { recursive: true });

const banner = '// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.\n' +
               '// Kaynak: <repo kökü>/%s  (npm run build:ext ile kopyalanır)\n';

let total = 0;
for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) {
        console.error('HATA: kaynak bulunamadı: ' + f);
        process.exit(1);
    }
    const body = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(path.join(OUT, f), banner.replace('%s', f) + body);
    total += body.length;
    console.log('  ' + f.padEnd(20) + (body.length / 1024).toFixed(0).padStart(4) + ' KB');
}

console.log('\nextension/engine/ hazır — toplam ' + (total / 1024).toFixed(0) + ' KB.');
console.log('Chrome > chrome://extensions > "Paketlenmemiş öğe yükle" > extension/');
