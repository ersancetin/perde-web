#!/usr/bin/env node
// Eklenti ikonlarını üretir (16/32/48/128 px PNG).
//
// Chrome ikonlarda SVG kabul etmiyor, projede de raster ikon yok. Bağımlılık
// eklemek yerine kilit çizimini index.html'deki favicon SVG'siyle aynı
// koordinatlardan (32 birimlik alan) rasterize ediyoruz.
//
// Kullanım: npm run build:ext  (sync-engine ile birlikte çalışır)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
const SIZES = [16, 32, 48, 128];

const INK = [0x1a, 0x19, 0x17];      // --accent
const PAPER = [0xff, 0xff, 0xff];

// ─── Geometri (32 birimlik alan, favicon SVG'siyle aynı) ─────────────────────

function inRoundRect(x, y, x0, y0, x1, y1, r) {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r;
}

function inCircle(x, y, cx, cy, r) {
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r;
}

// Bir alt-örnek noktasının rengi (null = saydam)
function sample(x, y) {
    if (!inRoundRect(x, y, 0.6, 0.6, 31.4, 31.4, 6)) return null;

    // kilit gövdesi
    let lock = inRoundRect(x, y, 4, 14, 28, 30, 3);

    // askı: (16,10) merkezli 6 yarıçaplı yayın üst yarısı, kalınlık 3
    if (!lock && y <= 10) {
        const d = Math.hypot(x - 16, y - 10);
        if (d >= 4.5 && d <= 7.5) lock = true;
    }
    // askının iki dikey ucu
    if (!lock && y >= 10 && y <= 14.2) {
        if ((x >= 8.5 && x <= 11.5) || (x >= 20.5 && x <= 23.5)) lock = true;
    }

    if (lock) {
        // anahtar deliği gövdenin içinden oyulur
        if (inCircle(x, y, 16, 22, 2.6)) return INK;
        return PAPER;
    }
    return INK;
}

// ─── Rasterize (4x4 supersampling) ───────────────────────────────────────────

function raster(size) {
    const SS = 4;
    const rgba = Buffer.alloc(size * size * 4);
    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            let r = 0, g = 0, b = 0, a = 0, hits = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const x = ((px + (sx + 0.5) / SS) / size) * 32;
                    const y = ((py + (sy + 0.5) / SS) / size) * 32;
                    const c = sample(x, y);
                    if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; hits++; }
                }
            }
            const n = SS * SS;
            const i = (py * size + px) * 4;
            if (hits) {
                rgba[i] = Math.round(r / hits);
                rgba[i + 1] = Math.round(g / hits);
                rgba[i + 2] = Math.round(b / hits);
                rgba[i + 3] = Math.round(a / n);
            }
        }
    }
    return rgba;
}

// ─── Minimal PNG yazıcı (RGBA, 8-bit) ────────────────────────────────────────

const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8;    // bit derinliği
    ihdr[9] = 6;    // renk tipi: RGBA
    // 10,11,12 = sıkıştırma/filtre/interlace = 0

    // her satırın başına filtre baytı (0 = None)
    const stride = size * 4;
    const raw = Buffer.alloc((stride + 1) * size);
    for (let y = 0; y < size; y++) {
        raw[y * (stride + 1)] = 0;
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const size of SIZES) {
    const file = path.join(OUT, 'icon' + size + '.png');
    fs.writeFileSync(file, png(size, raster(size)));
    console.log('  icon' + size + '.png');
}
console.log('\nextension/icons/ hazır.');
