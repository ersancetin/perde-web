// Perde Web v3 - Dictionary & Pattern NER Engine

function trLower(s) {
    return s.replace(/İ/g, 'i').replace(/I/g, 'ı').replace(/Ş/g, 'ş').replace(/Ç/g, 'ç')
            .replace(/Ö/g, 'ö').replace(/Ü/g, 'ü').replace(/Ğ/g, 'ğ').toLowerCase();
}

// I/İ-tolerant dictionary lookup: PDF ALL CAPS text uses ASCII "I" (→ "ı")
// but dictionaries store "i" (from Turkish "İ"). Try both variants.
function nameSetHas(set, word) {
    const lower = trLower(word);
    if (set.has(lower)) return true;
    const swapped = lower.replace(/ı/g, 'i');
    if (swapped !== lower && set.has(swapped)) return true;
    const swapped2 = lower.replace(/i/g, 'ı');
    if (swapped2 !== lower && set.has(swapped2)) return true;
    return false;
}

// ============================================================
// DICTIONARY & PATTERN-BASED NER
// ============================================================

function detectNamesDict(text) {
    const findings = [];

    // Common non-name words to filter out
    const NOT_NAMES = new Set([
        'bilgileri', 'bilgisi', 'bilgi', 'numarası', 'numarasi', 'tarihi', 'tarihleri',
        'adresi', 'belgesi', 'durumu', 'hakkında', 'hakkinda', 'ilgili', 'sonucu',
        'raporu', 'tutanağı', 'tutanagi', 'beyanı', 'beyani', 'talebi', 'sonrası',
        'öncesi', 'sırasında', 'sirasinda', 'nedeniyle', 'kapsamında', 'gereği',
        'bilinmiyor', 'belirtilmemiş', 'belirtilmemis', 'yok', 'mevcut', 'tespit',
        'yetkili', 'sayın', 'müdürlüğü', 'başkanlığı', 'makamına',
        'dr', 'prof', 'doç', 'yrd', 'op', 'uzm', 'öğr',
        'vekili', 'vekilinin', 'vekilince', 'sicil', 'sicili',
        'davacı', 'davalı', 'sanık', 'müdahil', 'katılan', 'tanık', 'şüpheli',
        'protokol', 'diploma', 'operasyon', 'personel',
        'ad', 'soyad', 'adı', 'soyadı', 'no', 'numarası', 'kodu', 'tarihi',
        'dosya', 'dosyası', 'rapor', 'karar', 'belge', 'belgesi',
        'numara', 'kayıt', 'kayıtları', 'evrak', 'nüsha',
        'şirket', 'ünvanı', 'unvanı', 'sermayesi', 'sermaye', 'tescil',
        'ortak', 'ortaklar', 'kurucu', 'müdür', 'genel',
        'işçi', 'isci', 'işveren', 'isveren', 'lehtar', 'borçlu', 'borclu',
        'alacaklı', 'alacakli', 'kiracı', 'kiraci', 'sigortalı', 'sigortali',
        'müteveffa', 'muris', 'malik', 'hissedar', 'ortak',
        'arabulucu', 'bilirkişi', 'hakem',
        'sendika', 'sendikası',
        // bilirkişi raporu false-positive kelimeleri
        'araç', 'arac', 'parsel', 'ada', 'plakalı', 'plakali',
        'heyetimiz', 'raporumu', 'müdürlüğünüz', 'mudurlugumuz',
        'kıymet', 'kiymet', 'takdiri', 'şekilde', 'sekilde',
        'yapılması', 'yapilmasi', 'hakemliğinizde',
        'taşınmaz', 'tasinmaz', 'gayrimenkul',
        'tescilli', 'kayıtlı', 'kayitli', 'tarihli',
        'tarafından', 'tarafindan', 'nezdinde', 'kapsamda',
        'toplam', 'bedel', 'bedeli', 'değer', 'deger', 'değeri', 'degeri',
        'rayiç', 'rayic', 'emsal', 'piyasa',
        'tapu', 'kadastro', 'imar', 'arsa', 'arazi',
        'bina', 'konut', 'daire', 'kat', 'blok',
        'mahalle', 'sokak', 'cadde', 'bulvar', 'yol',
        'hasar', 'onarım', 'onarim', 'kusur', 'maluliyet',
        'tazminat', 'alacak', 'faiz', 'vade', 'ödeme', 'odeme',
        'tramer', 'karayolları', 'karayollari',
        // 2. corpus FP kelimeleri
        'bayram', 'bayramı', 'bayrami', 'harçlığı', 'harcligi', 'ramazan',
        'mahkemeye', 'mahkemece', 'mahkemesi', 'mahkemenin',
        'çalışma', 'calisma', 'belgesi', 'inceleme', 'incelemesi',
        'uzmanı', 'uzmani', 'uzman',
        'adli', 'bilirkişilik', 'grafoloji', 'patlama',
        'olmak', 'üzere', 'olarak', 'şeklinde', 'itibaren',
        'kazalı', 'kazali', 'yaralı', 'yarali', 'maktul',
        'soruşturma', 'sorusturma', 'kovuşturma', 'kovusturma',
        'ilamat', 'tensip', 'müzekkere', 'ihbarname', 'ihtarname',
        'sözleşme', 'sozlesme', 'uyarlama', 'fesih',
        'kusurlu', 'kusursuz', 'sorumlu', 'sorumlusu',
        'patlayıcı', 'patlayici', 'yanıcı', 'yanici',
        'aydınlatma', 'aydinlatma', 'değerleme', 'degerleme',
        'keşif', 'kesif', 'duruşma', 'durusma', 'celse',
    ]);

    const ORG_INDICATOR_WORDS = new Set([
        'inşaat', 'insaat', 'ticaret', 'sanayi', 'mühendislik', 'muhendislik',
        'mimarlık', 'mimarlik', 'holding', 'grubu', 'şirketi', 'sirketi',
        'limited', 'anonim', 'vakfı', 'vakfi', 'derneği', 'dernegi',
        'kooperatif', 'kooperatifi', 'belediye', 'belediyesi',
        'müdürlüğü', 'mudurlugu', 'başkanlığı', 'baskanligi',
        'hastanesi', 'üniversitesi', 'universitesi', 'enstitüsü', 'enstitusu',
        'lojistik', 'danışmanlık', 'danismanlik', 'yazılım', 'yazilim',
        'otomotiv', 'enerji', 'madencilik', 'tekstil', 'gıda', 'gida',
        'turizm', 'sigorta', 'bankası', 'bankasi',
        'endüstriyel', 'endustriyel', 'ürünler', 'urunler',
        'plastik', 'kimya', 'ambalaj', 'makina', 'makine',
        'proje', 'müteahhit', 'muteahhit', 'taahhüt', 'taahhut',
        'taşımacılık', 'tasimacilk', 'nakliyat', 'depolama',
        'ilaç', 'ilac', 'medikal', 'kozmetik',
        'matbaa', 'basım', 'basim', 'yayın', 'yayin', 'yayınevi', 'yayinevi',
        'reklamcılık', 'reklamcilik', 'perakende', 'toptan',
        'ithalat', 'ihracat', 'gayrimenkul', 'emlak',
        'müşavirlik', 'musavirlik', 'bilişim', 'bilisim', 'telekom',
        'petrol', 'akaryakıt', 'akaryakit', 'tarım', 'tarim',
        'hayvancılık', 'hayvancilik', 'seracılık', 'seracilik',
        'mobilya', 'konfeksiyon', 'deri', 'ayakkabı', 'ayakkabi',
        'sendikası', 'sendikasi', 'sendika', 'fabrika', 'fabrikası',
        'atölye', 'atolye', 'laboratuvar', 'laboratuvarı',
        'maden', 'seramik', 'cam', 'kağıt', 'kagit',
        'şubesi', 'subesi', 'teknoloji', 'elektronik',
        'hazine', 'hazinesi', 'maliye', 'kadastro', 'müdürlüğü',
    ]);

    // 1) Title-triggered name detection (high confidence)
    const titlePattern = new RegExp(
        '(?:' + TITLE_PREFIXES.map(t => t.replace('.', '\\.')).join('|') +
        ')[ \\t]*[:\\-]?[ \\t]*',
        'gi'
    );
    let tMatch;
    while ((tMatch = titlePattern.exec(text)) !== null) {
        const after = text.substring(tMatch.index + tMatch[0].length);
        const titleCaseMatch = after.match(/^[\n\r]*([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:[ \t]+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){0,3})/);
        const allCapsMatch = after.match(/^[\n\r]*([A-ZÇĞİÖŞÜ]{2,}(?:[ \t]+[A-ZÇĞİÖŞÜ]{2,}){0,3})/);
        const nameMatch = titleCaseMatch || allCapsMatch;
        if (nameMatch) {
            let nameVal = nameMatch[1];
            let nameLen = nameMatch[0].indexOf(nameMatch[1]) + nameMatch[1].length;
            const truncAt = nameVal.search(/\b(?:Kimlik|KİMLİK|TCKN|T\.C\.|Adres|ADRESİ|ADRESI|Sicil|SİCİL|No|NO)\b/);
            if (truncAt > 0) {
                nameVal = nameVal.substring(0, truncAt).trimEnd();
                nameLen = nameMatch[0].indexOf(nameMatch[1]) + nameVal.length;
            }
            const words = nameVal.split(/\s+/);
            if (words.length < 1 || NOT_NAMES.has(trLower(words[0]))) continue;
            // ALL CAPS: require at least one word in name dictionaries
            if (!titleCaseMatch && allCapsMatch) {
                const hasKnownName = words.some(w => {
                    const wl = trLower(w);
                    return nameSetHas(TR_FIRST_NAMES,wl) || nameSetHas(TR_LAST_NAMES,wl);
                });
                if (!hasKnownName) continue;
            }
            // Line-break continuation: only when initial match is 1 word (missing surname)
            // "Bilirkişi Hayri\nYılmaz" → "Hayri Yılmaz", but "Bilirkişi Hayri Yılmaz\n..." stays as is
            if (words.length === 1) {
                const afterName = after.substring(nameLen);
                const contRe = titleCaseMatch
                    ? /^\n([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)(?=[''\s,.:;)(\[\]{}]|$)/
                    : /^\n([A-ZÇĞİÖŞÜ]{2,})(?=[''\s,.:;)(\[\]{}]|$)/;
                const cont = afterName.match(contRe);
                if (cont && !NOT_NAMES.has(trLower(cont[1])) && !ORG_INDICATOR_WORDS.has(trLower(cont[1]))) {
                    nameVal = nameVal + ' ' + cont[1];
                    nameLen += cont[0].length;
                }
            }
            const candidateLower = trLower(nameVal);
            let isOrg = false;
            for (const org of KNOWN_ORGS) { if (candidateLower.includes(trLower(org)) || trLower(org).includes(candidateLower)) { isOrg = true; break; } }
            if (isOrg) continue;
            const finalWords = nameVal.split(/\s+/);
            if (finalWords.some(w => ORG_INDICATOR_WORDS.has(trLower(w)))) continue;
            const start = tMatch.index + tMatch[0].length + nameMatch[0].indexOf(nameMatch[1]);
            findings.push({
                entity: 'PERSON_NAME',
                value: nameVal,
                start,
                end: start + nameLen - nameMatch[0].indexOf(nameMatch[1]),
                score: 0.9,
                source: 'dict',
            });
        }
    }

    // 1b) Legal document label-based detection: "BAŞVURAN : ZUHAL ÜÇGÜL", "VEKİLİ : AV. İLKNUR KURT"
    const LEGAL_LABEL_WORDS = new Set(['ADRESİ', 'ADRESI', 'POSTA', 'KEP', 'VEKİLİ', 'BAŞVURAN', 'SİGORTA', 'KURULUŞU', 'UYUŞMAZLIK', 'TUTARI', 'HAKEMİ', 'TARİHİ', 'SAYISI', 'KİMLİK']);
    const legalNameLabels = /(?:BAŞVURAN|SİGORTA\s+HAKEMİ|SİGORTA\s+KURULUŞU\s+VEKİLİ|BAŞVURAN\s+VEKİLİ|SİG\.\s*KUR\.\s*VEK(?:İLİ)?)\s*:\s*/g;
    let lnm;
    while ((lnm = legalNameLabels.exec(text)) !== null) {
        const afterLabel = text.substring(lnm.index + lnm[0].length);
        // Match names on same line ([ \t]+ prevents newline crossing)
        const capsName = afterLabel.match(/^(?:AV\.\s*)?([A-ZÇĞİÖŞÜ]{2,}(?:[ \t]+[A-ZÇĞİÖŞÜ]{2,}){0,4})/);
        const titleName = afterLabel.match(/^(?:Av\.\s*)?([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:[ \t]+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){0,4})/);
        const nm = capsName || titleName;
        if (nm) {
            let name = nm[1];
            let nameEnd = lnm.index + lnm[0].length + nm[0].indexOf(nm[1]) + nm[1].length;
            // Check next line for name continuation (ALL CAPS word, not a label keyword)
            const restAfterName = text.substring(nameEnd);
            const contMatch = restAfterName.match(/^\n([A-ZÇĞİÖŞÜ]{2,}(?:[ \t]+[A-ZÇĞİÖŞÜ]{2,}){0,2})(?=\s|'|$)/);
            if (contMatch) {
                const contWords = contMatch[1].split(/\s+/);
                const isLabel = contWords.some(w => LEGAL_LABEL_WORDS.has(w));
                if (!isLabel) {
                    name = name + ' ' + contMatch[1];
                    nameEnd += contMatch[0].length;
                }
            }
            const nStart = lnm.index + lnm[0].length + nm[0].indexOf(nm[1]);
            const words = name.split(/\s+/);
            if (!NOT_NAMES.has(trLower(words[0])) && words.length >= 2) {
                // Remove shorter overlapping PERSON_NAME findings (legal label is higher confidence)
                for (let oi = findings.length - 1; oi >= 0; oi--) {
                    const of_ = findings[oi];
                    if (of_.entity === 'PERSON_NAME' && nStart <= of_.start && nameEnd >= of_.end) {
                        findings.splice(oi, 1);
                    }
                }
                const overlaps = findings.some(f => nStart < f.end && nameEnd > f.start);
                if (!overlaps) {
                    findings.push({
                        entity: 'PERSON_NAME', value: name, start: nStart,
                        end: nameEnd, score: 0.9, source: 'dict',
                    });
                }
            }
        }
    }

    // 2) Suffix-triggered: "[Name] isimli kişi / adlı şahıs / adındaki / ..."
    const suffixPattern = /(?:^|[\s,.:;!?()\[\]{}'""''\/\-])([A-ZÇĞİÖŞÜa-zçğıöşü]+\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+)\s+(?:[İiI]s[İiI]ml[İiI]|adl[ıIi]|ad[ıIi]ndak[İiI]|ad[ıIi]na|[İiI]s[İiI]ml[İiI]\s+k[İiI]ş[İiI]|adl[ıIi]\s+k[İiI]ş[İiI]|adl[ıIi]\s+şah[ıIi]s|[İiI]s[İiI]ml[İiI]\s+şah[ıIi]s)(?=[\s,.:;!?()\[\]{}'""''\/\-]|$)/gi;
    let sMatch;
    while ((sMatch = suffixPattern.exec(text)) !== null) {
        const candidate = sMatch[1];
        const candWords = candidate.split(/\s+/);
        if (candWords.some(w => NOT_NAMES.has(trLower(w)) || ORG_INDICATOR_WORDS.has(trLower(w)))) continue;
        let isOrg = false;
        const candLower = trLower(candidate);
        for (const org of KNOWN_ORGS) { if (candLower.includes(trLower(org)) || trLower(org).includes(candLower)) { isOrg = true; break; } }
        if (isOrg) continue;
        const candStart = sMatch.index + sMatch[0].indexOf(candidate);
        const candEnd = candStart + candidate.length;
        const overlaps = findings.some(f =>
            candStart < f.end && candEnd > f.start
        );
        if (!overlaps) {
            findings.push({
                entity: 'PERSON_NAME',
                value: candidate,
                start: candStart,
                end: candEnd,
                score: 0.85,
                source: 'dict',
            });
        }
    }

    // 3) Dictionary lookup for known Turkish names (case-insensitive matching)
    // Match both "Ersan Çetin" (capitalized) and "ersan çetin" (lowercase)
    // Note: \b doesn't work with Turkish chars (İÖŞÜÇĞ), so use lookaround
    const WORD_BOUND = /[\s,.:;!?()\[\]{}’”\-\/]/;
    const isAtBound = (t, idx) => idx <= 0 || WORD_BOUND.test(t[idx - 1]);
    const isEndBound = (t, idx) => idx >= t.length || WORD_BOUND.test(t[idx]);
    const LETTER = /[A-ZÇĞİÖŞÜa-zçğıöşü]/;

    // 3a) Three-word names: "Atakan Adem Selanik" (first + middle + last)
    const threeWordPattern = /(?:^|[\s,.:;!?()\[\]{}'""''\/\-])([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}[ \t]{1,4}[A-ZÇĞİÖŞÜa-zçğıöşü]{2,}[ \t]{1,4}[A-ZÇĞİÖŞÜa-zçğıöşü]{2,})(?=[\s,.:;!?()\[\]{}'""''\/\-]|$)/g;
    let tw;
    while ((tw = threeWordPattern.exec(text)) !== null) {
        const namePart = tw[1];
        const parts = namePart.split(/\s+/);
        const w1 = trLower(parts[0]), w2 = trLower(parts[1]), w3 = trLower(parts[2]);
        const nameStart = tw.index + tw[0].indexOf(namePart);
        const nameEnd = nameStart + namePart.length;

        // first_name + (first_name|last_name) + (last_name or unknown word as surname)
        const w3IsName = nameSetHas(TR_LAST_NAMES,w3) || /^[A-ZÇĞİÖŞÜ]/.test(parts[2]);
        const w3InDict = nameSetHas(TR_LAST_NAMES,w3) || nameSetHas(TR_FIRST_NAMES,w3);
        const w3CouldBeSurname = (w3InDict || /^[A-ZÇĞİÖŞÜ]/.test(parts[2]) || /o[ğg]lu$/i.test(parts[2])) && !TR_PROVINCES.has(w3) && !TR_DISTRICTS.has(w3) && !NOT_NAMES.has(w3) && w3.length >= 2;
        if (nameSetHas(TR_FIRST_NAMES,w1) && (nameSetHas(TR_FIRST_NAMES,w2) || nameSetHas(TR_LAST_NAMES,w2)) &&
            (w3IsName || w3CouldBeSurname) &&
            !NOT_NAMES.has(w1)) {
            const overlaps = findings.some(f => nameStart < f.end && nameEnd > f.start);
            if (!overlaps) {
                findings.push({
                    entity: 'PERSON_NAME',
                    value: namePart,
                    start: nameStart,
                    end: nameEnd,
                    score: (nameSetHas(TR_LAST_NAMES,w3) || nameSetHas(TR_FIRST_NAMES,w3)) ? 0.7 : 0.5,
                    source: 'dict',
                });
            }
        } else {
            // Retry from second word so "kızı Ayşe Nur Yalçın" retries as "Ayşe Nur Yalçın"
            threeWordPattern.lastIndex = nameStart + parts[0].length;
        }
    }

    // 3b-pre) Honorific suffix: "[FirstName] Hanım/Bey"
    const honorificRe = /(?:^|[\s,.:;!?()\[\]{}'""''\/\-])([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)[ \t]+(Hanım|Bey)(?=[\s,.:;!?()\[\]{}'""''\/\-]|$)/g;
    let hMatch;
    while ((hMatch = honorificRe.exec(text)) !== null) {
        const name = hMatch[1];
        if (!nameSetHas(TR_FIRST_NAMES, name)) continue;
        const fullVal = name + ' ' + hMatch[2];
        const hStart = hMatch.index + hMatch[0].indexOf(name);
        const hEnd = hStart + fullVal.length;
        const overlaps = findings.some(f => hStart < f.end && hEnd > f.start);
        if (!overlaps) {
            findings.push({ entity: 'PERSON_NAME', value: fullVal, start: hStart, end: hEnd, score: 0.75, source: 'dict' });
        }
    }

    // 3b) Two-word names ([ \t] instead of \s to prevent newline crossing)
    const wordPattern = /(?:^|[\s,.:;!?()\[\]{}'""''\/\-])([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}[ \t]{1,4}[A-ZÇĞİÖŞÜa-zçğıöşü]{2,})(?=[\s,.:;!?()\[\]{}'""''\/\-]|$)/g;
    let wMatch;
    while ((wMatch = wordPattern.exec(text)) !== null) {
        const namePart = wMatch[1];
        const parts = namePart.split(/[ \t]+/);
        const first = trLower(parts[0]);
        const last = trLower(parts[1]);
        const nameStart = wMatch.index + wMatch[0].indexOf(namePart);
        const nameEnd = nameStart + namePart.length;

        const isFirstName = nameSetHas(TR_FIRST_NAMES,first);
        if (!isFirstName) {
            wordPattern.lastIndex = nameStart + parts[0].length;
            continue;
        }
        if (ORG_INDICATOR_WORDS.has(last) || NOT_NAMES.has(last)) {
            wordPattern.lastIndex = nameStart + parts[0].length;
            continue;
        }

        // Both first and last name in dictionary → high confidence
        if (isFirstName && nameSetHas(TR_LAST_NAMES,last)) {
            const overlaps = findings.some(f =>
                nameStart < f.end && nameEnd > f.start
            );
            if (!overlaps) {
                findings.push({
                    entity: 'PERSON_NAME',
                    value: namePart,
                    start: nameStart,
                    end: nameEnd,
                    score: 0.7,
                    source: 'dict',
                });
            }
        }

        // Known first name + unknown capitalized last name (not a place)
        if (isFirstName && !nameSetHas(TR_FIRST_NAMES,last) &&
            !TR_PROVINCES.has(last) && !TR_DISTRICTS.has(last) &&
            !NOT_NAMES.has(last) &&
            /^[A-ZÇĞİÖŞÜ]/.test(parts[1])) {
            const overlaps = findings.some(f =>
                nameStart < f.end && nameEnd > f.start
            );
            if (!overlaps) {
                findings.push({
                    entity: 'PERSON_NAME',
                    value: namePart,
                    start: nameStart,
                    end: nameEnd,
                    score: 0.5,
                    source: 'dict',
                });
            }
        }
    }

    // 3c) Possessive suffix: "Hayri'nin", "Ahmet'in", "Ali'ye"
    const possessiveRe = /(?:^|[\s,.:;!?()\[\]{}""\/<\->])([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,})['''](?:n[iıuü]n|[iıuü]n|y[eaıiuü]|d[aeı]n|t[ae]n|d[ae]|t[ae]|[eaıiuü])(?=[\s,.:;!?()\[\]{}'""''\/\-]|$)/g;
    let possM;
    while ((possM = possessiveRe.exec(text)) !== null) {
        const name = possM[1];
        if (!nameSetHas(TR_FIRST_NAMES, name) && !nameSetHas(TR_LAST_NAMES, name)) continue;
        const nameStart = possM.index + possM[0].indexOf(name);
        const nameEnd = nameStart + name.length;
        const overlaps = findings.some(f => nameStart < f.end && nameEnd > f.start);
        if (!overlaps) {
            findings.push({ entity: 'PERSON_NAME', value: name, start: nameStart, end: nameEnd, score: 0.6, source: 'dict' });
        }
    }

    // 4) Context backreference: if a name was found in a full name,
    //    detect standalone occurrences of that first/last name in the text
    const detectedFirstNames = new Set();
    const detectedLastNames = new Set();
    for (const f of findings) {
        const parts = f.value.split(/\s+/);
        if (parts.length >= 2 && f.score >= 0.5) {
            detectedFirstNames.add(trLower(parts[0]));
            const lastName = parts[parts.length - 1];
            const lastLower = trLower(lastName);
            if (!TR_PROVINCES.has(lastLower) && !TR_DISTRICTS.has(lastLower) &&
                !NOT_NAMES.has(lastLower) && lastName.length >= 3) {
                detectedLastNames.add(lastLower);
            }
        }
    }
    const singleNameRe = /(?:^|[\s,.:;!?()\[\]{}'""''\/\-])([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]{2,})(?=['']|[\s,.:;!?()\[\]{}'""''\/\-]|$)/g;
    if (detectedFirstNames.size > 0 || detectedLastNames.size > 0) {
        let sn;
        while ((sn = singleNameRe.exec(text)) !== null) {
            const word = sn[1];
            const wordLower = trLower(word);
            if (!detectedFirstNames.has(wordLower) && !detectedLastNames.has(wordLower)) continue;
            const snStart = sn.index + sn[0].indexOf(word);
            const snEnd = snStart + word.length;
            const overlaps = findings.some(f => snStart < f.end && snEnd > f.start);
            if (!overlaps) {
                findings.push({
                    entity: 'PERSON_NAME',
                    value: word,
                    start: snStart,
                    end: snEnd,
                    score: 0.6,
                    source: 'dict',
                });
            }
        }
    }

    const trLetterRe = /[a-zA-ZçğıöşüÇĞİÖŞÜ]/;
    return findings.filter(f => {
        if (f.start > 0 && trLetterRe.test(text[f.start - 1])) return false;
        if (f.end < text.length && trLetterRe.test(text[f.end])) return false;
        return true;
    });
}

function detectOrganizations(text) {
    const findings = [];

    // 1) Known organization names (Turkish-aware case-insensitive search)
    const textLower = trLower(text);
    const isWordBoundary = (str, idx) => idx <= 0 || /[\s,.:;!?()\[\]{}'"\/\-]/.test(str[idx - 1]);
    const TURKISH_SUFFIXES = /^(?:'?(?:n[ıiuü]n|n[ea]|nd[ea]n?|nd[ae]ki|d[ea]n?|d[ae]ki|[ynt]?[ıiuü]|l[ae]r[ıiuü]?n?|[sy]?[ıiuü]n?|[ynt]?[ae]|y[ıiuü]))\b/;
    for (const org of KNOWN_ORGS) {
        const orgLower = trLower(org);
        let searchFrom = 0;
        while (true) {
            const idx = textLower.indexOf(orgLower, searchFrom);
            if (idx === -1) break;
            searchFrom = idx + orgLower.length;
            if (!isWordBoundary(textLower, idx)) continue;
            const afterIdx = idx + orgLower.length;
            if (afterIdx < textLower.length && /[a-zçğıöşü]/.test(textLower[afterIdx])) {
                const rest = textLower.substring(afterIdx);
                if (!TURKISH_SUFFIXES.test(rest)) continue;
            }
            // Skip short org abbreviations followed by label suffixes (e.g. "SGK Sicil No:")
            if (orgLower.length <= 5) {
                const afterText = textLower.substring(afterIdx).trimStart();
                if (/^(?:sicil|no|numaras|kayıt)/.test(afterText)) continue;
            }
            let endPos = idx + org.length;
            const afterOrg = text.substring(endPos, endPos + 15);
            const legalTail = afterOrg.match(/^\s*(A\.Ş\.|Ltd\.\s*Şti\.|Şti\.|Ltd\.)/i);
            if (legalTail) endPos += legalTail[0].length;
            const value = text.substring(idx, endPos);
            findings.push({
                entity: 'ORGANIZATION',
                value: value,
                start: idx,
                end: endPos,
                score: 0.85,
                source: 'dict',
            });
        }
    }

    // 2) Organization suffix patterns: "[Capitalized Words] Hastanesi/Üniversitesi/..."
    const ORG_STOP_WORDS = new Set(['bu', 'şu', 'o', 'bir', 'her', 'bazı', 'tüm', 'hiç',
        've', 'ile', 'veya', 'ama', 'da', 'de', 'ki', 'gibi', 'için', 'olan', 'diğer']);
    const COURT_SUFFIXES_SET = new Set(['mahkemesi', 'savcılığı', 'noterliği', 'adliyesi']);
    const NOTARY_SUFFIXES_SET = new Set(['noterliği']);
    for (const suffix of ORG_SUFFIXES) {
        const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const suffixRegex = new RegExp(escaped, 'gi');
        const suffixEntity = NOTARY_SUFFIXES_SET.has(suffix) ? 'NOTARY' : COURT_SUFFIXES_SET.has(suffix) ? 'COURT' : 'ORGANIZATION';
        let sm;
        while ((sm = suffixRegex.exec(text)) !== null) {
            const suffixStart = sm.index;
            const before = text.substring(Math.max(0, suffixStart - 60), suffixStart);
            const wordsBeforeArr = before.split(/[\n\r,.:;!?()\[\]{}'"\/]+/);
            const lastChunk = wordsBeforeArr[wordsBeforeArr.length - 1] || '';
            const words = lastChunk.trim().split(/\s+/).filter(w => w.length > 0);
            const nameWords = [];
            for (let i = words.length - 1; i >= 0; i--) {
                const w = words[i];
                if (/^[A-ZÇĞİÖŞÜ0-9]/.test(w) || /^\d/.test(w)) {
                    nameWords.unshift(w);
                } else break;
            }
            if (nameWords.length === 0) continue;
            const prefix = nameWords[0];
            if (ORG_STOP_WORDS.has(trLower(prefix))) continue;
            const orgSuffixSet = new Set(ORG_SUFFIXES.map(s => trLower(s)));
            const hasProperName = nameWords.some(w => !orgSuffixSet.has(trLower(w)));
            if (!hasProperName) continue;
            let orgName = nameWords.join(' ') + ' ' + sm[0];
            const startIdx = text.lastIndexOf(nameWords[0], suffixStart);
            if (startIdx === -1) continue;
            let endIdx = suffixStart + sm[0].length;
            const after = text.substring(endIdx, endIdx + 15);
            const legalSuffix = after.match(/^\s*(A\.Ş\.|Ltd\.\s*Şti\.|Şti\.|Ltd\.)/i);
            if (legalSuffix) {
                endIdx += legalSuffix[0].length;
                orgName = orgName + legalSuffix[0];
            }
            const fullMatch = orgName.trim();
            const matchTypes = [suffixEntity, 'ORGANIZATION', 'COURT'];
            const overlaps = findings.some(f =>
                startIdx < f.end && endIdx > f.start && matchTypes.includes(f.entity)
            );
            if (!overlaps) {
                findings.push({
                    entity: suffixEntity,
                    value: fullMatch,
                    start: startIdx,
                    end: endIdx,
                    score: 0.8,
                    source: 'dict',
                });
            }
        }
    }

    // 3) Full court/institution header patterns (e.g. "İZMİR 3. ASLİYE TİCARET MAHKEMESİ")
    const courtSuffixMap = {
        'mahkemesi': 'COURT', 'savcılığı': 'COURT', 'noterliği': 'NOTARY',
        'müdürlüğü': 'ORGANIZATION', 'başkanlığı': 'ORGANIZATION', 'başkanlığına': 'ORGANIZATION',
        'komisyonu': 'ORGANIZATION', 'komisyonuna': 'ORGANIZATION', 'dairesi': 'COURT', 'heyeti': 'ORGANIZATION',
    };
    for (const [suf, entityType] of Object.entries(courtSuffixMap)) {
        const escaped = suf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sufRe = new RegExp(escaped, 'gi');
        let cm;
        while ((cm = sufRe.exec(textLower)) !== null) {
            const sufStart = cm.index;
            const sufEnd = cm.index + cm[0].length;
            // Look backward for the full header (up to 80 chars)
            const before = text.substring(Math.max(0, sufStart - 80), sufStart);
            const chunks = before.split(/[\n\r,:;!?()\[\]{}'"\/]+/);
            const lastChunk = chunks[chunks.length - 1] || '';
            const words = lastChunk.trim().split(/\s+/).filter(w => w.length > 0);
            // Collect capitalized / numeric words from right
            const headerWords = [];
            for (let i = words.length - 1; i >= 0; i--) {
                const w = words[i];
                if (/^[A-ZÇĞİÖŞÜ0-9]/.test(w) || /^\d+\.$/.test(w)) {
                    headerWords.unshift(w);
                } else break;
            }
            const minWords = entityType === 'COURT' ? 1 : 2;
            if (headerWords.length < minWords) continue;
            const fullHeader = headerWords.join(' ') + ' ' + text.substring(sufStart, sufEnd);
            if (entityType === 'COURT' && /\b(?:vergi|tapu|nüfus|emniyet|sgk|sosyal\s*güvenlik)\s+dairesi\b/i.test(trLower(fullHeader))) continue;
            const headerStart = text.lastIndexOf(headerWords[0], sufStart);
            if (headerStart === -1) continue;
            const matchTypes = [entityType, 'ORGANIZATION', 'COURT'];
            const overlaps = findings.some(f =>
                headerStart <= f.start && sufEnd >= f.end && matchTypes.includes(f.entity)
            );
            if (overlaps) {
                for (let i = findings.length - 1; i >= 0; i--) {
                    if (matchTypes.includes(findings[i].entity) &&
                        findings[i].start >= headerStart && findings[i].end <= sufEnd) {
                        findings.splice(i, 1);
                    }
                }
            }
            const alreadyWider = findings.some(f =>
                matchTypes.includes(f.entity) && f.start <= headerStart && f.end >= sufEnd
            );
            if (!alreadyWider) {
                findings.push({
                    entity: entityType,
                    value: fullHeader.trim(),
                    start: headerStart,
                    end: sufEnd,
                    score: 0.9,
                    source: 'dict',
                });
            }
        }
    }

    // 4) Financial transaction context: "[Company] maaş ödemesi/havale/eft/fatura"
    const txnRe = /((?:[A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ]*\s+){1,4})(?:maaş\s*ödeme|havale|eft|fatura\s*ödeme|k[İiI]ra\s*ödeme|a[İiI]dat)/gi;
    let txn;
    while ((txn = txnRe.exec(text)) !== null) {
        const orgName = txn[1].trim();
        if (orgName.length < 3) continue;
        const orgStart = txn.index;
        const orgEnd = orgStart + orgName.length;
        const overlaps = findings.some(f =>
            f.entity === 'ORGANIZATION' && orgStart < f.end && orgEnd > f.start
        );
        if (!overlaps) {
            findings.push({
                entity: 'ORGANIZATION',
                value: orgName,
                start: orgStart,
                end: orgEnd,
                score: 0.7,
                source: 'txn-context',
            });
        }
    }

    return findings;
}

function detectLocations(text) {
    const findings = [];

    // Province and district names (capitalized, possibly with Turkish suffix: İstanbul’da, İzmir’e)
    const wordPattern = /(?:^|[\s,.:;!?()\[\]{}’"\/\-])([A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ]+)/g;
    let m;
    while ((m = wordPattern.exec(text)) !== null) {
        const word = trLower(m[1]);
        const locStart = m.index + m[0].indexOf(m[1]);
        const locEnd = locStart + m[1].length;
        if (TR_PROVINCES.has(word)) {
            findings.push({
                entity: 'LOCATION',
                value: m[1],
                start: locStart,
                end: locEnd,
                score: 0.6,
                source: 'dict',
            });
        } else if (TR_DISTRICTS.has(word)) {
            findings.push({
                entity: 'LOCATION',
                value: m[1],
                start: locStart,
                end: locEnd,
                score: 0.5,
                source: 'dict',
            });
        }
    }

    // Address patterns (street/avenue + optional number)
    const addressPatterns = [
        /((?:[A-ZÇĞİÖŞÜa-zçğıöşü]+\s+){0,3}(?:[Cc]addesi|[Cc]adde|[Cc]ad\.|[Ss]okak|[Ss]ok\.|[Ss]okağı|[Bb]ulvarı|[Bb]lv\.|[Mm]ahallesi|[Mm]ah\.|[Kk]öyü|[Ss]itesi|[Aa]pt\.|[Aa]partmanı)(?:\s+(?:No|no|NO)[:\.]?\s*\d+(?:\/\d+)?)?)/g,
    ];

    for (const pattern of addressPatterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((m = regex.exec(text)) !== null) {
            const addrStart = m.index + m[0].indexOf(m[1]);
            const addrEnd = addrStart + m[1].length;
            const contained = findings.some(f =>
                f.start <= addrStart && f.end >= addrEnd &&
                f.entity === 'LOCATION'
            );
            if (!contained) {
                for (let i = findings.length - 1; i >= 0; i--) {
                    const f = findings[i];
                    if (f.entity === 'LOCATION' && f.start >= addrStart && f.end <= addrEnd) {
                        findings.splice(i, 1);
                    }
                }
                findings.push({
                    entity: 'LOCATION',
                    value: m[1],
                    start: addrStart,
                    end: addrEnd,
                    score: 0.75,
                    source: 'dict',
                });
            }
        }
    }

    // ADDRESS — label-based full address detection
    // "Adres:" veya "Adresi:" sonrasında satır sonuna veya sonraki alan etiketine kadar
    const addrLabelRe = /(?:adres[İiI]?|ev\s*adres[İiI]?|[İiI]ş\s*adres[İiI]?|tebl[İiI]gat\s*adres[İiI]?|[İiI]kametg[âa]h[ıIi]?)\s*[:\-]\s*/gi;
    const nextFieldRe = /(?:\n\s*)(?:Tel(?:efon)?|Faks|Fax|GSM|Cep|[Ee]\-?posta|[Ee]\-?mail|KEP|TC|T\.C\.|VKN|Verg[İiI]|[İiI]BAN|Banka|Mesle[ğg]|Do[ğg]um|C[İiI]ns[İiI]yet|Meden[İiI]|K[İiI]ml[İiI]k|S[İiI]c[İiI]l|Dosya|Dava|[İiI]mza|Tar[İiI]h|Adres|[Dd][Aa][Vv][Aa][Cc][Iıİi]|[Dd][Aa][Vv][Aa][Ll][Iıİi]|[Vv]ek[İiI]l[İiI]|[Bb]or[çÇ]lu|[Aa]lacakl[ıIi]|Plaka|Şas[İiI]|Marka|Model|Pol[İiI]çe|Hasar|Ad\s+Soyad|Ehliyet|D[İiI][ğg]er|Kaza|Po[sş]ta|Konu|[Mm]üdaf[İiI][İiI]|[Mm]ü[şŞ]tek[İiI]|[Ss]an[ıIi]k|[Kk]at[ıIi]lan|[Tt]an[ıIi]k|[Ss]u[çÇ]|SANIK|MÜŞTEKİ)\s*[:\-]/;
    const addrSignals = /(?:mah\b|mahalle|cad\b|cadde|sok\b|sokak|bulvar|blv|apt|site|blok|kat\b|da[İiI]re|no\b|posta\s*kodu|\d{5}|\/)/i;
    let addrM;
    while ((addrM = addrLabelRe.exec(text)) !== null) {
        const afterLabel = text.substring(addrM.index + addrM[0].length);
        const lines = afterLabel.split('\n');
        let addrLines = [];
        for (const ln of lines) {
            const trimmed = ln.trim();
            if (!trimmed) break;
            if (addrLines.length > 0 && !addrSignals.test(trimmed)) break;
            if (addrLines.length > 0 && /^\S+\s*[:\-]/.test(trimmed)) break;
            addrLines.push(trimmed);
            if (addrLines.length >= 3) break;
        }
        const inlineField = addrLines[0] ? addrLines[0].search(/\s+(?:Tel(?:efon)?|Faks|GSM|Cep|[Ee]\-?posta|KEP)\s*[:\-]/) : -1;
        if (inlineField > 0) addrLines[0] = addrLines[0].substring(0, inlineField).trim();
        let addrVal = addrLines.join(' ').replace(/\s+/g, ' ').trim();
        if (addrVal.length >= 10 && addrSignals.test(addrVal)) {
            addrVal = addrVal.replace(/[\s,;:]+$/, '');
            const aStart = addrM.index + addrM[0].length;
            const rawEnd = afterLabel.indexOf(addrLines[addrLines.length - 1]);
            const aEnd = aStart + rawEnd + addrLines[addrLines.length - 1].length;
            const overlaps = findings.some(f => f.entity === 'ADDRESS' && aStart < f.end && aEnd > f.start);
            if (!overlaps) {
                findings.push({ entity: 'ADDRESS', value: addrVal, start: aStart, end: aEnd, score: 0.85, source: 'pattern' });
            }
        }
    }

    // Label-based location: "Mahalle: Fenerbahçe", "İl: İstanbul", "İlçe: Kadıköy"
    const locLabelRe = /\b(?:mahalle|mahalles[İiI]|[İiI]l|[İiI]lçe|semt|bölge)\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}(?:[ \t]+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,}){0,2})/gi;
    let lm;
    while ((lm = locLabelRe.exec(text)) !== null) {
        const val = lm[1].trim();
        const valStart = lm.index + lm[0].indexOf(val);
        const valEnd = valStart + val.length;
        // Override any ORGANIZATION findings that fall under a Mahalle/İl/İlçe label
        for (let fi = findings.length - 1; fi >= 0; fi--) {
            const f = findings[fi];
            if (f.entity === 'ORGANIZATION' && f.start >= valStart && f.end <= valEnd) {
                findings.splice(fi, 1);
            }
        }
        const overlaps = findings.some(f => valStart < f.end && valEnd > f.start && f.entity === 'LOCATION');
        if (!overlaps) {
            findings.push({ entity: 'LOCATION', value: val, start: valStart, end: valEnd, score: 0.7, source: 'pattern' });
        }
    }

    return findings;
}

function detectAddressBlocks(text, locationFindings) {
    const findings = [];
    // Multi-line: "Adres:\n content..."
    const addrLabelRe = /(?:^|\n)\s*(?:adres|adresi?)\s*[:\-]?\s*\n/gi;
    let am;
    while ((am = addrLabelRe.exec(text)) !== null) {
        const blockStart = am.index + am[0].length;
        const rest = text.substring(blockStart);
        const endMatch = rest.match(/\n\s*\n|\n\s*[A-ZÇĞİÖŞÜa-zçğıöşü][A-ZÇĞİÖŞÜa-zçğıöşü\s]*[:\-]\s/);
        const blockEnd = endMatch ? blockStart + endMatch.index : blockStart + rest.length;
        const block = text.substring(blockStart, blockEnd).trim();
        if (block.length < 5) continue;
        findings.push({
            entity: 'ADDRESS',
            value: block,
            start: blockStart,
            end: blockStart + block.length,
            score: 0.85,
            source: 'pattern',
        });
        for (let i = locationFindings.length - 1; i >= 0; i--) {
            const loc = locationFindings[i];
            if (loc.start >= blockStart && loc.end <= blockStart + block.length) {
                locationFindings.splice(i, 1);
            }
        }
    }
    // Inline: "Adres: content" — also collect continuation lines
    // Also handle "ADRESİ : content" (legal docs)
    const inlineRe = /(?:^|\n)\s*(?:adres[İi]?|adresi?)\s*[:\-]\s*(\S[^\n]{4,})/gi;
    const legalLabelRe = /^\s*[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s.]{2,}(?:ADRESİ|VEKİLİ|POSTA|SAYISI|TUTARI|HAKEMİ|KURULUŞU)\s*$/;
    let im;
    while ((im = inlineRe.exec(text)) !== null) {
        let val = im[1].trim();
        const cutMatch = val.match(/\s+(?:Tel(?:efon)?|Faks?|GSM|Cep|E-posta)\s*[:\-]/i);
        if (cutMatch) val = val.substring(0, cutMatch.index).trim();
        const valStart = im.index + im[0].indexOf(im[1]);
        // Collect continuation lines (address spanning multiple lines)
        let blockEnd = valStart + val.length;
        const afterFirst = text.substring(blockEnd);
        const contLines = afterFirst.split('\n');
        for (let ci = 1; ci < contLines.length; ci++) {
            const line = contLines[ci];
            if (line.trim() === '') break;
            // Stop at a new label: "WORD WORD :" pattern (legal doc labels)
            if (/^\s*[A-ZÇĞİÖŞÜ][\wÇĞİÖŞÜçğıöşü.\s]*\s+:\s/.test(line)) break;
            if (legalLabelRe.test(line)) break;
            // Address continuation: Kat/Daire/No/Blok/Sk/Cd or location names
            const isAddrCont = /(?:Kat|Daire|[Nn]o|Blok|[Ss]k\.|[Cc]d\.|[Cc]ad|[Ss]ok|[Mm]ah|[Mm]h\.|D:|K:)/i.test(line) ||
                /^\s*[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s*\/\s*[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?(?:\s*\/\s*[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?\s*$/.test(line) ||
                /^\s*[A-ZÇĞİÖŞÜ]{2,}(?:\s*\/\s*[A-ZÇĞİÖŞÜ]{2,})?(?:\s+[A-ZÇĞİÖŞÜ]{2,})?\s*$/.test(line);
            if (!isAddrCont) break;
            blockEnd += 1 + contLines[ci].length; // +1 for \n
            val = text.substring(valStart, blockEnd).trim();
        }
        if (val.length < 10) continue;
        const overlap = findings.some(f => valStart >= f.start && valStart < f.end);
        if (overlap) continue;
        findings.push({
            entity: 'ADDRESS',
            value: val,
            start: valStart,
            end: valStart + val.length,
            score: 0.85,
            source: 'pattern',
        });
    }
    return findings;
}

// ============================================================
// LEGAL / INSURANCE / MEDICAL RECOGNIZERS
// ============================================================

function trNormSearch(s) {
    return s.replace(/İ/g, 'i');
}

function detectLegalEntities(origText) {
    const text = trNormSearch(origText);
    const findings = [];

    // LEGAL_CITATION — Yargıtay, Danıştay, AYM, HGK atıfları (CASE_NUMBER'dan ÖNCE)
    const citationSpans = [];
    const highCourtRe = /(?:Yarg[ıIi]tay|YARGITAY|Dan[ıIi]ştay|DANIŞTAY|AYM|Anayasa\s*Mahkemesi|ANAYASA\s*MAHKEMESİ)/gi;

    // Inline: "Yargıtay 4. HD 2021/5678 E., 2022/1234 K." or "Yargıtay 12. CD E. 2019/13698 K. 2022/1306"
    const citInlineRe = new RegExp(
        '(' + highCourtRe.source + ')' +
        '\\s+(?:\\d{1,2}\\s*\\.\\s*(?:Hukuk|HUKUK|Ceza|CEZA|[İiI]dare|İDARE|H\\.?D\\.?|C\\.?D\\.?|HD|CD|D\\.?)\\s*(?:Daires[İiI]|DAİRESİ)?|HGK|CGK|[İiI]BDK|[İiI]BK)' +
        '(?:\\s+E\\.?\\s*(?:No\\.?\\s*[:\\-]?\\s*)?)?' +
        '\\s*\\d{4}\\s*\\/\\s*[\\d\\-]+(?:\\s*E\\.)?' +
        '(?:[\\s,;]+(?:K\\.?\\s*(?:No\\.?\\s*[:\\-]?\\s*)?)?\\d{4}\\s*\\/\\s*\\d+(?:\\s*K\\.)?)?' +
        '(?:[\\s,;]+(?:T\\.?\\s*[:\\-]?\\s*)?\\d{1,2}[\\.\\/-]\\d{1,2}[\\.\\/-]\\d{4})?',
        'gi'
    );
    let cM;
    while ((cM = citInlineRe.exec(text)) !== null) {
        const full = cM[0].trim();
        if (!/\d{4}\s*\/\s*\d+/.test(full)) continue;
        const start = cM.index;
        const end = cM.index + cM[0].length;
        citationSpans.push({ start, end });
        findings.push({
            entity: 'LEGAL_CITATION', value: origText.substring(start, end).trim(),
            start, end, score: 0.95, source: 'pattern', _keep: true,
        });
    }

    // Multi-line block: "Yargıtay...\nEsas No: 2016/5293\nKarar No: 2017/8012"
    const highCourtBlockRe = new RegExp(
        '(' + highCourtRe.source + ')' +
        '[^\\n]{0,60}\\n' +
        '(?:[^\\n]{0,80}\\n){0,3}?' +
        '(?:Esas\\s*(?:No\\.?\\s*)?[:\\-]?\\s*(\\d{4}\\s*\\/\\s*[\\d\\-]+))\\s*(?:E\\.?)?' +
        '(?:[\\s\\n]*Karar\\s*(?:No\\.?\\s*)?[:\\-]?\\s*(\\d{4}\\s*\\/\\s*\\d+)\\s*(?:K\\.?)?)?',
        'gi'
    );
    let bM;
    while ((bM = highCourtBlockRe.exec(text)) !== null) {
        const start = bM.index;
        const end = bM.index + bM[0].length;
        if (citationSpans.some(s => start >= s.start && start <= s.end)) continue;
        citationSpans.push({ start, end });
        findings.push({
            entity: 'LEGAL_CITATION', value: origText.substring(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
            start, end, score: 0.95, source: 'pattern', _keep: true,
        });
    }

    // "Esas No: .../... Karar No: .../..." without preceding court name but near one
    const esasKararRe = /Esas\s*(?:No\.?\s*)?[:\-]?\s*(\d{4}\s*\/\s*[\d\-]+)\s*(?:E\.?)?\s*[,;\n]\s*Karar\s*(?:No\.?\s*)?[:\-]?\s*(\d{4}\s*\/\s*\d+)\s*(?:K\.?)?/gi;
    let ekM;
    while ((ekM = esasKararRe.exec(text)) !== null) {
        const start = ekM.index;
        const end = ekM.index + ekM[0].length;
        if (citationSpans.some(s => start >= s.start && end <= s.end)) continue;
        const before200 = text.substring(Math.max(0, start - 200), start);
        highCourtRe.lastIndex = 0;
        if (highCourtRe.test(before200) || /say[ıIi]l[ıIi]\s*(?:karar|[İiI]lam)/i.test(text.substring(end, end + 50))) {
            citationSpans.push({ start, end });
            findings.push({
                entity: 'LEGAL_CITATION', value: origText.substring(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
                start, end, score: 0.9, source: 'pattern', _keep: true,
            });
        }
    }

    // "sayılı karar" pattern — "2021/5678 E. sayılı kararı"
    const sayiliRe = /(\d{4}\s*\/\s*[\d\-]+\s*(?:E\.?)?\s*(?:say[ıIi]l[ıIi]\s*(?:karar[ıIi]?|[İiI]lam[ıIi]?)))/gi;
    let sM;
    while ((sM = sayiliRe.exec(text)) !== null) {
        const start = sM.index;
        const end = sM.index + sM[0].length;
        if (citationSpans.some(s => start >= s.start - 5 && start <= s.end)) continue;
        citationSpans.push({ start, end });
        findings.push({
            entity: 'LEGAL_CITATION', value: origText.substring(start, end).trim(),
            start, end, score: 0.85, source: 'pattern', _keep: true,
        });
    }

    // Case/file numbers — split into specific entity types
    // IMPORTANT: More specific patterns MUST come before generic ones
    const casePatterns = [
        // INSURANCE_FILE_NO — hasar dosya, eksper dosya, ihbar, tahkim, rücu (BEFORE generic dosya)
        { regex: /(?:hasar|eksper|[İi]hbar|tahkim|rücu)\s*(?:dosya\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9\-\/]{5,25})/gi, score: 0.85, entity: 'INSURANCE_FILE_NO' },

        // GOV_DOCUMENT_ID — UYAP, CİMER, e-Devlet, tebligat, başvuru (BEFORE generic dosya/başvuru)
        { regex: /(?:UYAP|uyap)\s*(?:evrak|belge|dosya)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /\b((?:UYP|CMR|EDV|CIM)\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:C[İI]MER|cimer)\s*(?:başvuru\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:e[\-\s]*[Dd]evlet|edevlet)\s*(?:kullan[ıIi]c[ıIi]\s*)?(?:[İiI]şlem\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:tebligat)\s*(?:barkod\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{10,16})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:[İi]tiraz|şikayet)\s*(?:başvuru\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:dilekçe|onay|tahakkuk|tebliğ|beyanname|karar\s*[İi]lam|veraset\s*[İi]lam|[İi]ntikal)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:encümen)\s*(?:karar\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{4}\s*\/\s*\d{1,7})/gi, score: 0.92, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:[İi]şlem)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:randevu)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:sözleşme\w*)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'GOV_DOCUMENT_ID' },
        { regex: /(?:dekont)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'FINANCIAL_ID' },
        { regex: /\b((?:ABB|IBB|BLD|TPU|RND|ISL|TWB|SVS|DKT|KON|YRS|ISK|BEB|IMR|VTH|TIS|THH|SRV|ARZ|TLP|CMK|VIV|VRT|BYN|ICR)\-\d{4}\-\d{4,10})\b/g, score: 0.8, entity: 'GOV_DOCUMENT_ID' },

        // EINVOICE_UUID — e-fatura ETTN (UUID format)
        { regex: /(?:ETTN|ettn)\s*[:\-]?\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/gi, score: 0.95, entity: 'EINVOICE_UUID' },
        { regex: /(?:e[\-\s]*(?:fatura|arşiv))\s*(?:no|numaras[ıIi]?|UUID)?\s*[:\-]?\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/gi, score: 0.9, entity: 'EINVOICE_UUID' },

        // CHECK_SERIAL_NO — çek seri numarası (BEFORE DEVICE_ID to capture CK- prefix)
        { regex: /(?:çek)\s*(?:seri)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,20})/gi, score: 0.9, entity: 'CHECK_SERIAL_NO' },
        { regex: /\b(CK[\-]\d{5,12})\b/g, score: 0.85, entity: 'CHECK_SERIAL_NO' },
        { regex: /\b([A-Z]{2,4}[\-]\d{5,12})\s+(?:ser[İiI]\s*numaral[ıIi]|nolu|no['']?lu)\s+çek/gi, score: 0.9, entity: 'CHECK_SERIAL_NO' },

        // BARCODE_ID — barkod numarası (ödeme emri, tebligat, icra)
        { regex: /(?:barkod)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{10,16})/gi, score: 0.85, entity: 'BARCODE_ID' },

        // ENFORCEMENT_ID — takip talebi, icra dosya numarası
        { regex: /(?:tak[İiI]p\s*taleb[İiI])\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.9, entity: 'ENFORCEMENT_ID' },
        { regex: /\b(TKP[\-]\d{4}[\-]\d{4,10})\b/g, score: 0.85, entity: 'ENFORCEMENT_ID' },
        { regex: /(?:[İiI]cra)\s*(?:dosya|tak[İiI]p)\s*(?:no|numaras[ıIi]?|say[ıIi]s[ıIi])?\s*[:\-]?\s*(\d{4}\s*\/\s*\d{1,7})/gi, score: 0.95, entity: 'ENFORCEMENT_ID' },

        // MEDIATION_NO — arabuluculuk dosya no
        { regex: /(?:arabuluculuk)\s*(?:dosya)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'MEDIATION_NO' },
        { regex: /\b(ARB\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'MEDIATION_NO' },

        // ARBITRATION_NO — tahkim dosya no
        { regex: /(?:tahkim)\s*(?:dosya)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'ARBITRATION_NO' },
        { regex: /\b(THK\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'ARBITRATION_NO' },

        // WARRANT_NO — yakalama/tutuklama müzekkeresi
        { regex: /(?:yakalama|tutuklama)\s*(?:müzekkeresi?)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'WARRANT_NO' },
        { regex: /\b(YAK\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'WARRANT_NO' },

        // PAROLE_ID — denetimli serbestlik
        { regex: /(?:denetimli\s*serbestlik)\s*(?:dosya)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'PAROLE_ID' },
        { regex: /\b(DS\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'PAROLE_ID' },

        // COMMERCIAL_GAZETTE — ticaret sicil gazetesi ilan no
        { regex: /(?:ticaret\s*sicil[İi]?\s*gazete(?:si)?)\s*(?:ilan)?\s*(?:no|numaras[ıIi]?|say[ıIi]s[ıIi])\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'COMMERCIAL_GAZETTE' },
        { regex: /\b(TSG\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'COMMERCIAL_GAZETTE' },

        // BOND_PROMISSORY — senet/bono no
        { regex: /(?:senet|bono|emre\s*muharrer\s*senet)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'BOND_PROMISSORY' },
        { regex: /\b(SNT\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'BOND_PROMISSORY' },

        // CUSTOMS_DECLARATION — gümrük beyanname no
        { regex: /(?:gümrük)\s*(?:beyanname(?:si)?)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'CUSTOMS_DECLARATION' },
        { regex: /\b(GB\-\d{4}\-(?:IM|EX|TR)\-\d{4,10})\b/g, score: 0.85, entity: 'CUSTOMS_DECLARATION' },

        // LETTER_OF_CREDIT — akreditif no
        { regex: /(?:akreditif)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'LETTER_OF_CREDIT' },
        { regex: /\b(LC\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'LETTER_OF_CREDIT' },

        // BILL_OF_LADING — konşimento no
        { regex: /(?:konşimento|konşümento|bill\s*of\s*lading)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'BILL_OF_LADING' },
        { regex: /\b(BL\-\d{4}\-[A-Z]{2,4}\-\d{4,10})\b/g, score: 0.85, entity: 'BILL_OF_LADING' },

        // PATENT_NO — patent başvuru/tescil
        { regex: /(?:patent)\s*(?:(?:başvuru|tescil)\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-\/\s]{3,25})/gi, score: 0.9, entity: 'PATENT_NO' },
        { regex: /\b(TR\s*\d{4}\s*\/\s*\d{4,6})\b/g, score: 0.01, entity: 'PATENT_NO' },

        // TRADEMARK_NO — marka tescil no
        { regex: /(?:marka)\s*(?:tescil)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-\/]{3,25})/gi, score: 0.9, entity: 'TRADEMARK_NO' },

        // COPYRIGHT_ID — telif/FSEK tescil
        { regex: /(?:telif|FSEK|fikri\s*mülkiyet)\s*(?:tescil)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'COPYRIGHT_ID' },
        { regex: /\b(TEL\-\d{4}\-\d{4,10})\b/g, score: 0.85, entity: 'COPYRIGHT_ID' },

        // DEVICE_ID — kamera, cihaz seri no, e-imza sertifika
        { regex: /\b((?:CAM|SN|EIS)\-[\w\-]{5,25})\b/g, score: 0.8, entity: 'DEVICE_ID' },
        { regex: /(?:kamera\s*(?:kay[ıIi]t)?\s*(?:ID|no|numaras[ıIi]?))\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'DEVICE_ID' },
        { regex: /(?:cihaz\s*(?:seri)?\s*(?:no|numaras[ıIi]?))\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'DEVICE_ID' },
        { regex: /(?:e[\-\s]*imza\s*(?:sertifika)?\s*(?:no|numaras[ıIi]?))\s*[:\-]?\s*([A-Z0-9][\w\-]{5,25})/gi, score: 0.85, entity: 'DEVICE_ID' },
        { regex: /\b((?:TSP)\-\d{4}\-\d{4,10})\b/g, score: 0.8, entity: 'GOV_DOCUMENT_ID' },

        // IMSI — Turkey MCC 286, 15-digit SIM subscriber identity (HTS kayıtları)
        { regex: /(?:IMSI|imsi)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*(286\d{12})\b/gi, score: 0.85, entity: 'DEVICE_ID' },
        { regex: /(?:hts|abone|sim)\s*(?:kay[ıIi]t|kay[ıIi]tlar[ıIi]?)?\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*(286\d{12})\b/gi, score: 0.8, entity: 'DEVICE_ID' },

        // NOTARY_RECORD — yevmiye, ihtarname, ihbarname (BEFORE generic esas/karar)
        { regex: /(?:yevmiye)\s*(?:no|numaras[ıIi]?|say[ıIi]s[ıIi])?\s*[:\-]?\s*(\d{4}\s*\/\s*\d{1,7})/gi, score: 0.9, entity: 'NOTARY_RECORD' },
        { regex: /(?:[İi]htarname|[İi]hbarname)\s*(?:no|numaras[ıIi]?|say[ıIi]s[ıIi])?\s*[:\-]?\s*(\d{4}\s*\/\s*\d{1,7})/gi, score: 0.9, entity: 'NOTARY_RECORD' },
        { regex: /\b((?:NTR)\-\d{4}\-\d{4,10})\b/g, score: 0.8, entity: 'NOTARY_RECORD' },
        { regex: /(?:noter\s*(?:tasdik|onay|teyit))\s*(?:no|numaras[ıIi]?|say[ıIi]s[ıIi])?\s*[:\-]?\s*(\d{4}\s*\/\s*\d{1,7}|\d{3,10})/gi, score: 0.85, entity: 'NOTARY_RECORD' },

        // CASE_NUMBER — legal file numbers (esas, karar, dosya, dava, soruşturma, etc.)
        { regex: /(?:esas|karar|dosya|dava|soruşturma|kovuşturma|müracaat|başvuru|[İi]ddianame|tensip|[İi]flas|konkordato|veraset|miras)\s*(?:no|numaras[ıIi]?|say[ıIi]s[ıIi])?\s*[:\-]?\s*(\d{4}\s*\/\s*\d{1,7})/gi, score: 0.9, entity: 'CASE_NUMBER' },
        { regex: /\b(\d{4}\s*\/\s*\d{1,7})\s*(?:esas|karar|say[ıIi]l[ıIi]|e\.|k\.)/gi, score: 0.85, entity: 'CASE_NUMBER' },
        { regex: /\b[EeKk]\.\s*(\d{4}\s*\/\s*\d{1,7})/g, score: 0.85, entity: 'CASE_NUMBER' },
        { regex: /\b(\d{4}\/[EeKk]\.\d{1,7})\b/g, score: 0.85, entity: 'CASE_NUMBER' },
        { regex: /(?:dosya|dava)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9\-\/]{5,25})/gi, score: 0.8, entity: 'CASE_NUMBER', needsDigit: true },
        { regex: /(?:başvuru)\s*(?:dosya\s*)?(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9\-\/]{5,25})/gi, score: 0.8, entity: 'CASE_NUMBER', needsDigit: true },
        { regex: /(?:referans)\s*(?:(?:s[İiI]c[İiI]l|kay[ıIi]t)\s*)?(?:no|numaras[ıIi]?|kodu|ref)\s*[:\-]?\s*([A-Z0-9][\w\-]{2,24})/gi, score: 0.8, entity: 'CASE_NUMBER' },
        { regex: /\b(\d{4}\.[EHİKehiİk]\.?\d{1,7})\b/g, score: 0.9, entity: 'CASE_NUMBER' },
        { regex: /\b((?:HD|HSR|DSY|THK|RCU)\-\d{4}\-\d{4,10})\b/g, score: 0.8, entity: 'CASE_NUMBER' },
        { regex: /\b((?:TXN|TRX|REF|OPR)\-\d{4}\-\d{4,15})\b/g, score: 0.8, entity: 'CASE_NUMBER' },
        { regex: /(?:[İi]lan)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.8, entity: 'CASE_NUMBER' },
        { regex: /\b((?:ILN)\-\d{4}\-\d{4,10})\b/g, score: 0.8, entity: 'CASE_NUMBER' },
        { regex: /\b(K-\d{4}\/\d{3,10})\b/g, score: 0.9, entity: 'CASE_NUMBER' },
        { regex: /\b((?:19|20)\d{2}\/\d{1,6})\b/g, score: 0.45, entity: 'CASE_NUMBER' },
        // Kurul karar sayısı: YYYY/ABC-NNNNN veya ABC/YYYY-NNNNN
        { regex: /\b(\d{4}\/[A-ZÇĞİÖŞÜ]{2,6}-\d{2,7})\b/g, score: 0.8, entity: 'CASE_NUMBER' },
        { regex: /\b([A-ZÇĞİÖŞÜ]{2,6}\/\d{4}-\d{2,7})\b/g, score: 0.8, entity: 'CASE_NUMBER' },
        // Kaza tespit tutanağı no: YYYY-ilkodu-sırano
        { regex: /(?:kaza\s*tesp[İiI]t|tesp[İiI]t\s*tutana[ğg][ıIi]|tutanak)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*(\d{4}[\-]\d{2}[\-]\d{4,8})\b/gi, score: 0.85, entity: 'CASE_NUMBER' },
        // Doğrulama Kodu (e-imza belge doğrulama)
        { regex: /[Dd]oğrulama\s+[Kk]odu\s*[:\-]\s*([A-Z0-9]{10,30})/g, score: 0.95, entity: 'CASE_NUMBER' },
        // Doğrulama Linki (may span lines due to PDF line breaks)
        { regex: /[Dd]oğrulama\s+[Ll]inki\s*[:\-]\s*((?:https?:\/\/)[^\s]*(?:\n[^\s]*)?)/g, score: 0.95, entity: 'URL' },

        // Bilirkişi reports are legal (BEFORE generic MEDICAL_ID patterns)
        { regex: /\b(?:b[İiI]l[İiI]rk[İiI]ş[İiI])\s+(?:(?:rapor|dosya|hesap|tutanak)\s+)?(?:no|numaras[ıIi]?)\s*[:\-]\s*([A-Z0-9][\w\-]{3,19})/gi, score: 0.85, entity: 'CASE_NUMBER' },
        { regex: /\b(?:b[İiI]l[İiI]rk[İiI]ş[İiI])\s+(?:(?:rapor|dosya|hesap|tutanak)\s+)?(?:no|numaras[ıIi]?)\s*[:\-]\s*(\d{4}\s*\/\s*\d{1,7})/gi, score: 0.85, entity: 'CASE_NUMBER' },
        { regex: /\b(?:b[İiI]l[İiI]rk[İiI]ş[İiI])\s+(?:raporu?|belges[İiI]?|tutana[ğg][ıIi]?)\s*\(\s*([A-Z0-9][\w\-]{3,19})\s*\)/gi, score: 0.8, entity: 'CASE_NUMBER' },

        // EMPLOYEE_ID
        { regex: /(?:personel|çal[ıIi]şan)\s*(?:(?:s[İiI]c[İiI]l|kay[ıIi]t)\s*)?(?:no|numaras[ıIi]?|kodu)\s*[:\-]?\s*([A-Z0-9][\w\-]{2,24})/gi, score: 0.85, entity: 'EMPLOYEE_ID' },

        // PROPERTY_ID — tapu, ada, parsel, pafta, bağımsız bölüm
        { regex: /(?:tapu\s*(?:kay[ıIi]t|s[İiI]c[İiI]l|tesc[İiI]l))\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'PROPERTY_ID' },
        { regex: /(?:ada)\s*[\/\-]\s*(?:parsel)\s*[:\-]?\s*(\d{2,6}\s*\/\s*\d{1,6})/gi, score: 0.7, entity: 'PROPERTY_ID' },
        { regex: /(?:ada)\s*[:\-]?\s*(\d{2,6})/gi, score: 0.4, entity: 'PROPERTY_ID' },
        { regex: /\b(\d{2,6})\s+ada\b/gi, score: 0.5, entity: 'PROPERTY_ID' },
        { regex: /(?:parsel)\s*[:\-]?\s*(\d{1,6})/gi, score: 0.4, entity: 'PROPERTY_ID' },
        { regex: /\b(\d{1,6})\s+parsel/gi, score: 0.5, entity: 'PROPERTY_ID' },
        { regex: /(?:pafta)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*([A-Z0-9][\w\-]{1,15})/gi, score: 0.5, entity: 'PROPERTY_ID' },
        { regex: /(?:ba[ğg][ıIi]ms[ıIi]z\s*bölüm)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*(\d{1,5})/gi, score: 0.5, entity: 'PROPERTY_ID' },
        { regex: /(?:cilt)\s*(?:no)?\s*[:\-]?\s*(\d{1,5})\s*[,;]?\s*(?:sayfa)\s*(?:no)?\s*[:\-]?\s*(\d{1,5})/gi, score: 0.5, entity: 'PROPERTY_ID' },
        { regex: /\b((?:TK|TP)\-\d{4}\-\d{4,10})\b/g, score: 0.8, entity: 'PROPERTY_ID' },
    ];

    for (const p of casePatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            if (p.needsDigit && !/\d/.test(val)) continue;
            const valStart = m.index + m[0].indexOf(val);
            const valEnd = valStart + val.length;
            if (citationSpans.some(s => valStart >= s.start && valEnd <= s.end)) continue;
            findings.push({
                entity: p.entity,
                value: origText.substring(valStart, valEnd),
                start: valStart,
                end: valEnd,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Policy numbers
    const policyPatterns = [
        { regex: /(?:poliçe|police)\s*(?:no|numaras[ıIi]?)?\s*(?:\([^)]*\)\s*)?[:\-]?\s*([A-Z0-9\-]{5,25})/gi, score: 0.9, entity: 'POLICY_NUMBER' },
        { regex: /(?:traf[İiI]k|kasko|sa[ğg]l[ıIi]k|hayat|ferd[İiI]\s*kaza|DASK|deprem|yang[ıIi]n|konut|[İiI]şyer[İiI]|nakl[İiI]yat|mühend[İiI]sl[İiI]k|sorumluluk|emekl[İiI]l[İiI]k)\s*(?:pol[İiI]çe|s[İiI]gorta)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*([A-Z0-9\-]{5,25})/gi, score: 0.9, entity: 'POLICY_NUMBER' },
        { regex: /(?:s[İiI]gorta)\s*(?:pol[İiI]çe|sert[İiI]f[İiI]ka|certificate)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*([A-Z0-9\-]{5,25})/gi, score: 0.85, entity: 'POLICY_NUMBER' },
        { regex: /\b([A-Z]{2,5}\-\d{4}\-\d{4,10})\s*(?:numaral[ıIi]|nolu|no['']?lu)\s*(?:pol[İiI]çe|s[İiI]gorta)/gi, score: 0.85, entity: 'POLICY_NUMBER' },
    ];

    for (const p of policyPatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            const valStart = m.index + m[0].indexOf(val);
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Patient/medical/report numbers (purely medical context)
    const medPatterns = [
        { regex: /\b(?:hasta\s+(?:protokol\s+)?|protokol\s+|muayene\s+)(?:no|numaras[ıIi]?)\s*[:\-]\s*([A-Z0-9][\w\-]{3,19})/gi, score: 0.85, entity: 'MEDICAL_ID' },
        { regex: /\b(?:ep[İiI]kr[İiI]z|rapor|reçete|sevk|ekspert[İiI]z|aktüerya|otops[İiI]|adl[İiI]\s*t[ıIi]p|kaza\s*tesp[İiI]t|kaza\s*rapor|olay\s*yer[İiI]|kurum\s*sa[ğg]l[ıIi]k)\s+(?:(?:rapor|dosya|hesap|tutanak)\s+)?(?:no|numaras[ıIi]?)\s*[:\-]\s*([A-Z0-9][\w\-]{3,19})/gi, score: 0.8, entity: 'MEDICAL_ID' },
        { regex: /\b(?:ep[İiI]kr[İiI]z|rapor|reçete|ekspert[İiI]z|aktüerya|kaza\s*tesp[İiI]t|otops[İiI])\s+(?:raporu?|belges[İiI]?|tutana[ğg][ıIi]?)\s*\(\s*([A-Z0-9][\w\-]{3,19})\s*\)/gi, score: 0.75, entity: 'MEDICAL_ID' },
        { regex: /\b(?:SGK|ATK|EPK|BLK|KTT|KRT|ISG|OTP|SKR)\s*[\-]\s*\d{4}\s*[\-]\s*\d{2,10}\b/g, score: 0.8, entity: 'MEDICAL_ID' },
        { regex: /(?:operasyon|bildirge)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'MEDICAL_ID' },
        { regex: /(?:eksper\s+s[İiI]c[İiI]l)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'LICENSE_ID' },
        { regex: /(?:ekspert[İiI]z\s+referans)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'FINANCIAL_ID' },
        { regex: /\b(EXP\-\d{4,10})\b/g, score: 0.75, entity: 'MEDICAL_ID' },
        { regex: /\b(OP\-\d{4,10})\b/g, score: 0.75, entity: 'MEDICAL_ID' },
    ];

    for (const p of medPatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            const valStart = m.index + m[0].indexOf(val);
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Contextual dates (kaza tarihi, doğum tarihi, etc.)
    // Note: İ/i case-insensitive matching doesn't work in JS regex (İ.toLowerCase() = 'i̇')
    // So we include both İ and i variants for words starting with İ
    const dateLabelPatterns = [
        { regex: /(?:kaza|olay|do[ğg]um|vefat|ölüm|[İiI]şe gir[İiI]ş|[İiI]şten [çc][ıIi]k[ıIi]ş|rapor|ameliyat|muayene|duruşma|tebl[İiI][ğg]|[İiI]hbar|[İiI]htar|protesto|başvuru|süre sonu|son ödeme|pol[İiI][çc]e\s*başlang[ıIi][çc]|pol[İiI][çc]e\s*b[İiI]t[İiI]ş|pol[İiI][çc]e|tanzim|düzenleme|vade|hasar\s*[İiI]hbar|hasar|tedavi|taburcu|yat[ıIi]ş|epikriz|sevk|kontrol|randevu|re[çc]ete|operasyon|fes[İiI]h|evl[İiI]l[İiI]k|ayr[ıIi]l[ıIi]k|su[çc]|tutuklama|tahl[İiI]ye|başlang[ıIi][çc]|b[İiI]t[İiI]ş|[İiI]şe başlama|ekspert[İiI]z|keş[İiI]f|keş[İiI]de|tak[İiI]p|tesc[İiI]l|fatura|deprem|sel|yang[ıIi]n|h[ıIi]rs[ıIi]zl[ıIi]k|ödeme|rücu|temerrüt|[İiI]cra|red\s*karar[ıIi]|sözleşme|k[İiI]ra\s*sözleşme|senet|tapu|[İiI]hale|karar|dev[İiI]r|kabul|ret|atama|b[İiI]ld[İiI]r[İiI]m|müracaat|a[çc][ıIi]l[ıIi]ş|kapan[ıIi]ş|hac[İiI]z|mühür|tahl[İiI]ye|[İiI]nfaz|ceza\s*başlang[ıIi][çc]|ceza\s*b[İiI]t[İiI]ş|temy[İiI]z|[İiI]st[İiI]naf|tarh[İiI]yat|uzlaşma|[İiI]hbarname|yap[ıIi]\s*ruhsat|[İiI]skan|[İiI]mar|verg[İiI]\s*tahakkuk|fa[İiI]z\s*başlang[ıIi][çc]|[İiI]htarname|[İiI]mza|ölüm|kes[İiI]nleşme|terk[İiI]n|tahs[İiI]lat)\s*tar[İiI]h[İiI]?\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/gi, score: 0.97, entity: 'CONTEXTUAL_DATE' },
        // Compound labels: "Fesih Bildirimi Tarihi:", "Arabuluculuk Tutanak Tarihi:", etc.
        { regex: /(?:fes[İiI]h\s+b[İiI]ld[İiI]r[İiI]m[İiI]|arabuluculuk\s+(?:son\s+)?tutanak|hak\s+düşürücü\s+süre|zamanaş[ıIi]m[ıIi]|[İiI]t[İiI]raz\s+süres[İiI]|dava\s+a[çc]ma|kes[İiI]nleşme|tebellüğ|tefh[İiI]m|[İiI]nfaz\s+başlama|tahl[İiI]ye\s+emr[İiI]|[İiI]cra\s+tak[İiI]p|konkordato\s+mühlet[İiI]|[İiI]flas\s+karar|k[İiI]ra\s+başlang[ıIi][çc]|k[İiI]ra\s+b[İiI]t[İiI]ş|sözleşme\s+başlang[ıIi][çc]|sözleşme\s+b[İiI]t[İiI]ş|sözleşmen[İiI]n?\s+[İiI]mza|[İiI]htar\s+tebl[İiI][ğg]|noter\s+[İiI]htar|hac[İiI]z\s+[İiI]hbar)\s*tar[İiI]h[İiI]?\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/gi, score: 0.97, entity: 'CONTEXTUAL_DATE' },
    ];

    for (const p of dateLabelPatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            // Only capture the date value (m[1]), preserving the label text
            const dateVal = m[1];
            const dateStart = m.index + m[0].indexOf(dateVal);
            findings.push({
                entity: p.entity,
                value: dateVal,
                start: dateStart,
                end: dateStart + dateVal.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Turkish month+year dates: "Ocak 2022", "Ağustos 2021 - Ocak 2022", "Haziran 2015 - Temmuz 2015"
    const TR_MONTHS = '(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)';
    const monthYearRegex = new RegExp(`(${TR_MONTHS}\\s+\\d{4})`, 'g');
    let mym;
    while ((mym = monthYearRegex.exec(text)) !== null) {
        findings.push({
            entity: 'CONTEXTUAL_DATE', value: mym[1], start: mym.index,
            end: mym.index + mym[1].length, score: 0.85, source: 'pattern',
        });
    }

    // Vehicle chassis/motor/license numbers
    const vehiclePatterns = [
        { regex: /(?:şas[İiI]|şase|chassis)\s*(?:no|numaras[ıIi]?|numaral[ıIi])?\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})/gi, score: 0.9, entity: 'VEHICLE_ID' },
        { regex: /\b([A-HJ-NPR-Z0-9]{17})\b(?=\s*(?:şas[İiI]|şase|chassis|numaral[ıIi]))/gi, score: 0.85, entity: 'VEHICLE_ID' },
        { regex: /(?:motor)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{5,19})/gi, score: 0.7, entity: 'VEHICLE_ID' },
        { regex: /(?:ruhsat(?:\s*tesc[İiI]l)?|ara[çc]\s*tesc[İiI]l)\s*(?:(?:ser[İiI]\s*)?no|numaras[ıIi]?|belges[İiI]?)?\s*[:\-]?\s*([A-Z0-9\-]{5,20})/gi, score: 0.8, entity: 'VEHICLE_ID' },
        { regex: /(?:tesc[İiI]l)\s*(?:(?:ser[İiI]\s*)?no|numaras[ıIi]?|belge\s*no)\s*[:\-]\s*([A-Z0-9\-]{5,20})/gi, score: 0.75, entity: 'VEHICLE_ID' },
        { regex: /(?:ehl[İiI]yet|sürücü\s*belges[İiI]?|ehl[İiI]yet[İiI]?)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*([A-Z0-9][\w\-]{5,15})/gi, score: 0.85, entity: 'DRIVER_LICENSE' },
    ];

    for (const p of vehiclePatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            if (p.entity === 'VEHICLE_ID' && !/\d/.test(val)) continue;
            const valStart = m.index + m[0].indexOf(val);
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Professional license / registration numbers
    const licensePatterns = [
        { regex: /(?:diploma|arabulucu\s+sicil|mesleki\s+sicil|baro(?:su)?\s+sicil|bilirkişi\s+sicil|hakem\s+sicil|yeminli\s+mali\s+müşavir\s+sicil|serbest\s+muhasebeci\s+sicil|müfettiş\s+sicil|gümrük\s+müşavir\s+sicil|noter\s+sicil|avukat\s+sicil)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{3,10})/gi, score: 0.85, entity: 'LICENSE_ID' },
        { regex: /(?:diploma|arabulucu\s+sicil|mesleki\s+sicil|baro(?:su)?\s+sicil|bilirkişi\s+sicil|hakem\s+sicil|yeminli\s+mali\s+müşavir\s+sicil|serbest\s+muhasebeci\s+sicil|müfettiş\s+sicil|gümrük\s+müşavir\s+sicil|noter\s+sicil|avukat\s+sicil)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,19})/gi, score: 0.8, entity: 'LICENSE_ID' },
        // Sicil No — "(Sicil No: 01454)" or "Sicil No: 01454" (3-6 digits; longer ones are ambiguous)
        { regex: /(?<![a-zA-ZğüşöçİĞÜŞÖÇ])\(?[Ss]icil\s*[Nn]o\s*[:\-]\s*(\d{3,6})\b\s*\)?/g, score: 0.85, entity: 'LICENSE_ID' },
    ];

    for (const p of licensePatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            const valStart = m.index + m[0].indexOf(val);
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Bank account / branch numbers
    const bankPatterns = [
        { regex: /(?:hesap)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{5,16})/gi, score: 0.85, entity: 'BANK_ACCOUNT_NO' },
        { regex: /(?:şube)\s*(?:kodu?|no)\s*[:\-]?\s*(\d{3,6})/gi, score: 0.85, entity: 'BANK_BRANCH_CODE' },
    ];

    for (const p of bankPatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            const valStart = m.index + m[0].indexOf(val);
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // MERSİS number (labeled pattern)
    const mersisRe = /(?:mers[İiı][sş])\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{16,17})/gi;
    let mm;
    while ((mm = mersisRe.exec(text)) !== null) {
        const val = mm[1];
        const valStart = mm.index + mm[0].indexOf(val);
        findings.push({
            entity: 'TR_MERSIS_NO',
            value: val,
            start: valStart,
            end: valStart + val.length,
            score: 0.9,
            source: 'pattern',
        });
    }

    // SGK İşyeri Sicil No: 34.10.12345.12
    const sgkIsyeriRe = /(?:SGK|sgk)\s*(?:[İi]şyeri\s*)?(?:sicil)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*(\d{2}\.\d{2}\.\d{4,6}\.\d{2})/gi;
    let sgkm;
    while ((sgkm = sgkIsyeriRe.exec(text)) !== null) {
        const val = sgkm[1];
        const valStart = sgkm.index + sgkm[0].indexOf(val);
        findings.push({
            entity: 'EMPLOYEE_ID',
            value: val,
            start: valStart,
            end: valStart + val.length,
            score: 0.9,
            source: 'pattern',
        });
    }

    // SGK İş Kazası Bildirim No: 2026-IK-44812
    const sgkIkRe = /(?:SGK|sgk)\s*(?:[İiI]ş\s*[Kk]azas[ıIi]?\s*)?(?:b[İiI]ld[İiI]r[İiI]m|[İiI]hbar)\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*(\d{4}\-IK\-\d{3,10})/gi;
    let ikm;
    while ((ikm = sgkIkRe.exec(text)) !== null) {
        const val = ikm[1];
        const valStart = ikm.index + ikm[0].indexOf(val);
        findings.push({
            entity: 'GOV_DOCUMENT_ID',
            value: val,
            start: valStart,
            end: valStart + val.length,
            score: 0.9,
            source: 'pattern',
        });
    }

    // SSK/Bağ-Kur/Emekli Sandığı sicil no → EMPLOYEE_ID
    const legacySgkRe = /(?:SSK|Ba[ğg][\-\s]*Kur|Emekl[İiI]\s*Sand[ıIi][ğg][ıIi])\s*(?:s[İiI]c[İiI]l)?\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d[\d\-]{5,15})/gi;
    let lsgk;
    while ((lsgk = legacySgkRe.exec(text)) !== null) {
        const val = lsgk[1];
        const valStart = lsgk.index + lsgk[0].indexOf(val);
        findings.push({
            entity: 'EMPLOYEE_ID',
            value: val,
            start: valStart,
            end: valStart + val.length,
            score: 0.9,
            source: 'pattern',
        });
    }

    // Invoice / fatura numbers: FTR-2025-118742, FAT-2024-001234
    const invoicePatterns = [
        { regex: /\b((?:FTR|FAT|FT)\-?\d{4}\-?\d{4,10})\b/g, score: 0.85, entity: 'INVOICE_NO' },
        { regex: /(?:fatura)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9]*\d[\w\-]{3,25})/gi, score: 0.85, entity: 'INVOICE_NO' },
    ];
    for (const p of invoicePatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            const valStart = m.index + m[0].indexOf(val);
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Financial label patterns (tahsilat, havale, makbuz, swift, EFT)
    const finLabelPatterns = [
        { regex: /(?:tahsilat|havale|makbuz|[İi]rsaliye)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'FINANCIAL_ID' },
        { regex: /(?:swift|EFT|HAVALE)\s*(?:referans)\s*(?:no|numaras[ıIi]?|kodu?)?\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'FINANCIAL_ID' },
        { regex: /\b((?:THS|HVL|MKB|IRS)\-\d{4}\-\d{4,10})\b/g, score: 0.8, entity: 'FINANCIAL_ID' },
    ];
    for (const p of finLabelPatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            const valStart = m.index + m[0].indexOf(val);
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // Reverse context: "PR-2025-998114 protokol numaralı"
    const MEDICAL_PREFIXES = new Set(['SGK', 'ATK', 'EPK', 'BLK', 'KTT', 'KRT', 'ISG', 'OTP', 'SKR', 'HST', 'PRK', 'PR', 'RPR', 'EXP']);
    const reverseProtoRe = /\b([A-Z]{2,5}\-\d{4}\-\d{4,10})\s+(?:protokol|hasta|başvuru|dosya)\s*(?:numaral[ıIi]|nolu|no['']?lu)/gi;
    let rp;
    while ((rp = reverseProtoRe.exec(text)) !== null) {
        const val = rp[1];
        const valStart = rp.index;
        const prefix = val.split('-')[0];
        const entity = MEDICAL_PREFIXES.has(prefix) ? 'MEDICAL_ID' : 'GOV_DOCUMENT_ID';
        findings.push({
            entity,
            value: val,
            start: valStart,
            end: valStart + val.length,
            score: 0.85,
            source: 'pattern',
        });
    }

    // Time detection: HH:MM (optionally HH:MM:SS)
    const timePatterns = [
        { regex: /(?:saat|saati?)\s*[:\-]?\s*(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)/gi, score: 0.9, entity: 'TIME' },
        { regex: /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g, score: 0.4, entity: 'TIME' },
    ];
    for (const p of timePatterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const val = m[1] || m[0];
            const h = parseInt(val);
            if (h > 23) continue;
            const valStart = m.index + m[0].indexOf(val);
            // Skip TIME if immediately adjacent to a date (e.g. "15.03.2024 10:31")
            const before = text.substring(Math.max(0, valStart - 6), valStart);
            if (/\d{4}\s*$/.test(before)) continue;
            findings.push({
                entity: p.entity,
                value: val,
                start: valStart,
                end: valStart + val.length,
                score: p.score,
                source: 'pattern',
            });
        }
    }

    // MONETARY_AMOUNT — parasal tutarlar (TL, USD, EUR, EURO)
    // Format: 135.000,00 TL / 45.000 TL / 1.250,50 USD / 500 EUR / ₺15.000 / $1,500.00
    const moneyPatterns = [
        // Türk formatı: 135.000,00 TL veya 135.000 TL
        /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*(?:TL|tl|Tl|türk\s*liras[ıIi]))\b/g,
        // Prefix ₺: ₺15.000,00
        /(₺\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\b/g,
        // USD/EUR/EURO: 1,500.00 USD veya 1.500 USD
        /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s*(?:USD|usd|EUR|eur|EURO|euro|GBP|gbp|CHF|chf))\b/g,
        // Prefix $: $1,500.00
        /(\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/g,
        // Prefix €: €1.500,00
        /(€\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\b/g,
        // Label-driven: "bedel: 135.000,00", "tutar: 50.000" with context
        /(?:bedel[İiI]?|tutar[ıIi]?|mebl[ağg][ıIi]?|miktar[ıIi]?|ücret[İiI]?)\s*[:\-]?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*(?:TL|tl|USD|EUR|EURO)?)/gi,
    ];
    for (const re of moneyPatterns) {
        const regex = new RegExp(re.source, re.flags);
        let mm;
        while ((mm = regex.exec(text)) !== null) {
            const val = (mm[1] || mm[0]).trim();
            const raw = val.replace(/[^\d.,]/g, '');
            let amount;
            if (/\.\d{3}/.test(raw) && !/,\d{3}/.test(raw)) {
                amount = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
            } else {
                amount = parseFloat(raw.replace(/,/g, ''));
            }
            if (isNaN(amount) || amount < 100) continue;
            const valStart = mm.index + mm[0].indexOf(val);
            const overlaps = findings.some(f => valStart < f.end && (valStart + val.length) > f.start);
            if (!overlaps) {
                findings.push({
                    entity: 'MONETARY_AMOUNT',
                    value: origText.substring(valStart, valStart + val.length),
                    start: valStart,
                    end: valStart + val.length,
                    score: 0.7,
                    source: 'pattern',
                    _keep: true,
                });
            }
        }
    }

    for (const f of findings) { if (!f._keep) f.value = origText.substring(f.start, f.end); }
    return findings;
}

// ============================================================
// PERSONAL ATTRIBUTES & KVKK SENSITIVE DATA
// ============================================================

function detectPersonalAttributes(origText, enabledEntities) {
    const text = trNormSearch(origText);
    const findings = [];

    function addFinding(entity, val, valStart, score) {
        if (!enabledEntities.has(entity)) return;
        findings.push({ entity, value: val, start: valStart, end: valStart + val.length, score, source: 'label' });
    }

    function runPatterns(patterns) {
        for (const p of patterns) {
            if (!enabledEntities.has(p.entity)) continue;
            const regex = new RegExp(p.regex.source, p.regex.flags);
            let m;
            while ((m = regex.exec(text)) !== null) {
                const val = m[1];
                if (!val || val.trim().length < (p.minLen || 1)) continue;
                const valStart = m.index + m[0].indexOf(val);
                findings.push({ entity: p.entity, value: val.trim(), start: valStart, end: valStart + val.trim().length, score: p.score, source: 'label' });
            }
        }
    }

    // AGE — "45 yaşında", "yaşı: 45", "(28 Yaş)", "1997 (28 Yaş)"
    if (enabledEntities.has('AGE')) {
        const agePatterns = [
            /\b(\d{1,3})\s*yaşında(?:ki)?\b/gi,
            /(?:yaşı|yaş)\s*[:\-]?\s*(\d{1,3})\b/gi,
            /\((\d{1,3})\s*[Yy]aş\)/g,
        ];
        for (const re of agePatterns) {
            const regex = new RegExp(re.source, re.flags);
            let m;
            while ((m = regex.exec(text)) !== null) {
                const age = parseInt(m[1], 10);
                if (age < 1 || age > 120) continue;
                const val = m[1];
                const valStart = m.index + m[0].indexOf(val);
                addFinding('AGE', val, valStart, 0.85);
            }
        }
    }

    // GENDER — "cinsiyeti: erkek", "Cinsiyet\nErkek"
    runPatterns([
        { regex: /(?:c[İiI]ns[İiI]yet[İiI]?)\s*[:\-]?\s*[\n\r]?\s*(erkek|kad[ıIi]n|bay|bayan)/gi, score: 0.9, entity: 'GENDER' },
    ]);

    // NATIONALITY — "uyruğu: T.C.", "Vatandaşlık\nTürkiye Cumhuriyeti"
    runPatterns([
        { regex: /(?:uyruk|uyru[ğg]u|tab[İiI][İiI]yet[İiI]?|tâb[İiI][İiI]yet[İiI]?|vatandaşl[ıIi][ğg][ıIi]?|vatandaşl[ıIi]k)\s*[:\-]?\s*[\n\r]?\s*([A-ZÇĞİÖŞÜa-zçğıöşü. ]{2,30}?)(?=\s*[\n,;]|$)/gi, score: 0.9, entity: 'NATIONALITY', minLen: 2 },
    ]);

    // MARITAL_STATUS — "medeni hali: evli", "Medeni Durum\nEvli"
    runPatterns([
        { regex: /(?:meden[İiI]\s*(?:hal[İiI]?|durum[uü]?))\s*[:\-]?\s*[\n\r]?\s*(evl[İiI]|bek[âa]r|boşanm[ıIi]ş|dul|n[İiI][şs]anl[ıIi])/gi, score: 0.9, entity: 'MARITAL_STATUS' },
    ]);

    // OCCUPATION — "mesleği: avukat"
    runPatterns([
        { regex: /(?:mesle[ğg][İiI]?|meslek|görev[İiI]?)\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,40}?)(?=\s*[,.\n;]|$)/gi, score: 0.85, entity: 'OCCUPATION', minLen: 2 },
    ]);

    // MILITARY_ID — "askerlik no: 2024-118742"
    runPatterns([
        { regex: /(?:askerlik|terhis\s*(?:belge)?)\s*(?:no|numaras[ıIi]?)\s*[:\-]\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'MILITARY_ID' },
    ]);

    // EDUCATION_ID — "diploma no: 2024118742"
    runPatterns([
        { regex: /(?:diploma|öğrenci|mezun|mezon)\s*(?:no|numaras[ıIi]?)\s*[:\-]\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.85, entity: 'EDUCATION_ID' },
    ]);

    // BARO_SICIL — "baro sicil no: 45872"
    runPatterns([
        { regex: /(?:baro(?:su)?\s*(?:s[İiI]c[İiI]l|kayd[ıIi]))\s*(?:no|numaras[ıIi]?)?\s*[:\-]\s*(\d{3,10})/gi, score: 0.9, entity: 'BARO_SICIL' },
    ]);

    // TRADE_REGISTRY_NO — "ticaret sicil no: 558412"
    runPatterns([
        { regex: /(?:ticaret\s*sicil)\s*(?:no|numaras[ıIi]?)\s*[:\-]\s*(\d{3,15})/gi, score: 0.9, entity: 'TRADE_REGISTRY_NO' },
    ]);

    // SALARY_AMOUNT — "maaşı: 15.500 TL"
    runPatterns([
        { regex: /(?:maaş[ıIi]?|ücret[İiI]?|gel[İiI]r[İiI]?|ayl[ıIi][ğg][ıIi]?|net\s*(?:maaş|ücret)|brüt\s*(?:maaş|ücret))\s*[:\-]?\s*([\d.,]+\s*(?:TL|₺|tl|türk\s*l[İiI]ras[ıIi]))/gi, score: 0.9, entity: 'SALARY_AMOUNT', minLen: 2 },
    ]);

    // BLOOD_TYPE — "kan grubu: A Rh+"
    if (enabledEntities.has('BLOOD_TYPE')) {
        const bloodPatterns = [
            /(?:kan\s*(?:grubu|tipi))\s*[:\-]\s*((?:AB|A|B|0)\s*Rh?\s*[+\-])/gi,
            /(?:kan\s*(?:grubu|tipi))\s*[:\-]\s*((?:AB|A|B|0)\s*[+\-])/gi,
        ];
        for (const re of bloodPatterns) {
            const regex = new RegExp(re.source, re.flags);
            let m;
            while ((m = regex.exec(text)) !== null) {
                const val = m[1].trim();
                const valStart = m.index + m[0].indexOf(m[1]);
                addFinding('BLOOD_TYPE', val, valStart, 0.95);
            }
        }
    }

    // HEALTH_CONDITION — "tanı: lomber disk hernisi" or ICD-10 codes
    if (enabledEntities.has('HEALTH_CONDITION')) {
        const healthPatterns = [
            { regex: /(?:tan[ıIi]|teşh[İiI]s|hastal[ıIi][ğg][ıIi]?|rahats[ıIi]zl[ıIi][ğg][ıIi]?)\s*[:\-]\s*([^\n,;]{3,60}?)(?=\s*[,.\n;]|$)/gi, score: 0.9 },
            { regex: /\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g, score: 0.01 },
        ];
        for (const p of healthPatterns) {
            const regex = new RegExp(p.regex.source, p.regex.flags);
            let m;
            while ((m = regex.exec(text)) !== null) {
                const val = (m[1] || m[0]).trim();
                if (val.length < 3) continue;
                const valStart = m.index + m[0].indexOf(m[1] || m[0]);
                // ICD-10 codes need context
                if (p.score < 0.1) {
                    const before = text.substring(Math.max(0, valStart - 40), valStart).toLowerCase();
                    if (!/tanı|teşhis|icd|hastalık|kod/.test(before)) continue;
                }
                addFinding('HEALTH_CONDITION', val, valStart, p.score < 0.1 ? 0.7 : p.score);
            }
        }
    }

    // RELIGION — "dini: İslam", "İnancı: Hristiyanlık"
    runPatterns([
        { regex: /(?:d[İiI]n[İiI]?|[İiI]nanc[ıIi]|mezheb[İiI]?)\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,30}?)(?=\s*[,.\n;]|$)/gi, score: 0.95, entity: 'RELIGION', minLen: 2 },
    ]);

    // ETHNICITY — "etnik kökeni: Kürt", "Irkı: Kafkas"
    runPatterns([
        { regex: /(?:[ıIiİ]rk[ıIi]?|etn[İiI]k\s*köken[İiI]?|m[İiI]ll[İiI]yet[İiI]?)\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,30}?)(?=\s*[,.\n;]|$)/gi, score: 0.95, entity: 'ETHNICITY', minLen: 2 },
    ]);

    // POLITICAL_VIEW — "siyasi görüşü: sosyal demokrat"
    runPatterns([
        { regex: /(?:s[İiI]yas[İiI]\s*görüş[üu]?|part[İiI]\s*üyel[İiI][ğg][İiI]?)\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,40}?)(?=\s*[,.\n;]|$)/gi, score: 0.95, entity: 'POLITICAL_VIEW', minLen: 2 },
    ]);

    // UNION_MEMBERSHIP — "sendika üyeliği: Türk Metal" or "X sendikası üyesi"
    if (enabledEntities.has('UNION_MEMBERSHIP')) {
        const unionPatterns = [
            /(?:send[İiI]ka\s*(?:üyel[İiI][ğg][İiI]?)?)\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,50}?)(?=\s*[,.\n;]|$)/gi,
            /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+){0,4})\s+send[İiI]kas[ıIi]\s+üyes[İiI]/gi,
        ];
        for (const re of unionPatterns) {
            const regex = new RegExp(re.source, re.flags);
            let m;
            while ((m = regex.exec(text)) !== null) {
                const val = m[1].trim();
                if (val.length < 2) continue;
                const valStart = m.index + m[0].indexOf(m[1]);
                addFinding('UNION_MEMBERSHIP', val, valStart, 0.9);
            }
        }
    }

    // CRIMINAL_RECORD — "sabıka kaydı: var", "adli sicil: temiz"
    runPatterns([
        { regex: /(?:sab[ıIi]ka\s*(?:kayd[ıIi]|durumu)|adl[İiI]\s*s[İiI]c[İiI]l[İiI]?|sab[ıIi]kas[ıIi])\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,50}?)(?=\s*[,.\n;]|$)/gi, score: 0.9, entity: 'CRIMINAL_RECORD', minLen: 2 },
    ]);

    // BIRTH_PLACE — "doğum yeri: Ankara"
    runPatterns([
        { regex: /(?:do[ğg]um\s*yer[İiI])\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,40}?)(?=\s*[,.\n;]|$)/gi, score: 0.9, entity: 'BIRTH_PLACE', minLen: 2 },
    ]);

    // EDUCATION_LEVEL — "eğitim durumu: üniversite", "öğrenim: lise", "Eğitim: Lisans"
    runPatterns([
        { regex: /(?:e[ğg][İiI]t[İiI]m\s*(?:durum[uü]?|sev[İiI]yes[İiI]|düzey[İiI])?|ö[ğg]ren[İiI]m\s*(?:durum[uü]?)?)\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s()]{2,40}?)(?=\s*[,.\n;]|$)/gi, score: 0.85, entity: 'EDUCATION_LEVEL', minLen: 2 },
    ]);

    // MILITARY_STATUS — "askerlik durumu: yapıldı", "Askerlik: Tecilli", "Askerlik\nYapıldı"
    runPatterns([
        { regex: /(?:askerl[İiI]k\s*(?:durum[uü]?|h[İiI]zmet[İiI]?)?)\s*[:\-]?\s*[\n\r]?\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,40}?)(?=\s*[,.\n;]|$)/gi, score: 0.85, entity: 'MILITARY_STATUS', minLen: 2 },
    ]);

    // RESIDENCE_PERMIT — "ikamet izni no: IKA-2024-551882"
    runPatterns([
        { regex: /(?:[İiI]kamet\s*(?:[İiI]zn[İiI]?|tezkeres[İiI]?))\s*(?:no|numaras[ıIi]?)?\s*[:\-]\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'RESIDENCE_PERMIT' },
    ]);

    // WORK_PERMIT — "çalışma izni no: CI-2024-118742"
    runPatterns([
        { regex: /(?:çal[ıIi]şma\s*(?:[İiI]zn[İiI]?))\s*(?:no|numaras[ıIi]?)?\s*[:\-]\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'WORK_PERMIT' },
    ]);

    // PENSION_ID — "emekli sicil no: ESN-2024-77441"
    runPatterns([
        { regex: /(?:emekl[İiI](?:l[İiI]k)?\s*(?:s[İiI]c[İiI]l|kay[ıIi]t|ba[ğg]kur))\s*(?:no|numaras[ıIi]?)?\s*[:\-]\s*([A-Z0-9][\w\-]{3,25})/gi, score: 0.9, entity: 'PENSION_ID' },
    ]);

    // SEXUAL_LIFE — "cinsel yönelim: ...", "cinsel tercih: ..."
    runPatterns([
        { regex: /(?:c[İiI]nsel\s*(?:yönel[İiI]m[İiI]?|terc[İiI]h[İiI]?|hayat[ıIi]?|k[İiI]ml[İiI][ğg][İiI]?))\s*[:\-]\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,40}?)(?=\s*[,.\n;]|$)/gi, score: 0.95, entity: 'SEXUAL_LIFE', minLen: 2 },
    ]);

    // BIOMETRIC_DATA — "parmak izi no: ...", "retina tarama: ..."
    runPatterns([
        { regex: /(?:parmak\s*[İiI]z[İiI]|ret[İiI]na\s*(?:tarama)?|yüz\s*tan[ıIi]ma|b[İiI]yometr[İiI]k\s*ver[İiI])\s*(?:no|numaras[ıIi]?|kodu?)?\s*[:\-]\s*([A-Z0-9][\w\-]{2,30})/gi, score: 0.9, entity: 'BIOMETRIC_DATA' },
        { regex: /(?:b[İiI]yometr[İiI]k)\s*(?:no|numaras[ıIi]?|kodu?)\s*[:\-]\s*([A-Z0-9][\w\-]{2,30})/gi, score: 0.9, entity: 'BIOMETRIC_DATA' },
    ]);

    // DISABILITY_STATUS — "engel oranı: %40", "engel durumu: ortopedik"
    if (enabledEntities.has('DISABILITY_STATUS')) {
        const disabilityPatterns = [
            /(?:engel\s*(?:oran[ıIi]|durumu|türü|dereces[İiI])|sakatl[ıIi]k\s*(?:oran[ıIi]|durumu)|malul[İiI]yet\s*(?:oran[ıIi]|durumu|dereces[İiI]))\s*[:\-]\s*([^\n,;]{2,40}?)(?=\s*[,.\n;]|$)/gi,
        ];
        for (const re of disabilityPatterns) {
            const regex = new RegExp(re.source, re.flags);
            let m;
            while ((m = regex.exec(text)) !== null) {
                const val = m[1].trim();
                if (val.length < 2) continue;
                const valStart = m.index + m[0].indexOf(m[1]);
                addFinding('DISABILITY_STATUS', val, valStart, 0.9);
            }
        }
    }

    for (const f of findings) { if (!f._keep) f.value = origText.substring(f.start, f.end); }
    return findings;
}

// ============================================================
// UNIFIED DICTIONARY + LEGAL NER
// ============================================================

function runDictionaryNER(text, enabledEntities, scoreThreshold) {
    const allFindings = [];

    if (enabledEntities.has('PERSON_NAME')) {
        allFindings.push(...detectNamesDict(text));
    }
    if (enabledEntities.has('ORGANIZATION')) {
        allFindings.push(...detectOrganizations(text));
    }

    let locationFindings = [];
    if (enabledEntities.has('LOCATION') || enabledEntities.has('ADDRESS')) {
        locationFindings = detectLocations(text);
    }

    // ADDRESS: merge location findings under "Adres:" labels
    if (enabledEntities.has('ADDRESS')) {
        const addressFindings = detectAddressBlocks(text, locationFindings);
        allFindings.push(...addressFindings);
    }

    // Add remaining location findings
    if (enabledEntities.has('LOCATION')) {
        allFindings.push(...locationFindings);
    }

    // Legal/insurance/medical/license/bank entities
    const legalEntities = ['CASE_NUMBER', 'POLICY_NUMBER', 'MEDICAL_ID', 'CONTEXTUAL_DATE', 'VEHICLE_ID',
                           'LICENSE_ID', 'BANK_ACCOUNT_NO', 'BANK_BRANCH_CODE', 'TR_MERSIS_NO',
                           'INVOICE_NO', 'TIME', 'EMPLOYEE_ID', 'COURT',
                           'PROPERTY_ID', 'NOTARY_RECORD', 'INSURANCE_FILE_NO', 'NOTARY', 'DRIVER_LICENSE',
                           'GOV_DOCUMENT_ID', 'DEVICE_ID',
                           'EINVOICE_UUID', 'CHECK_SERIAL_NO', 'BARCODE_ID', 'ENFORCEMENT_ID',
                           'MEDIATION_NO', 'ARBITRATION_NO', 'WARRANT_NO', 'PAROLE_ID',
                           'COMMERCIAL_GAZETTE', 'BOND_PROMISSORY',
                           'CUSTOMS_DECLARATION', 'LETTER_OF_CREDIT', 'BILL_OF_LADING',
                           'PATENT_NO', 'TRADEMARK_NO', 'COPYRIGHT_ID'];
    if (legalEntities.some(e => enabledEntities.has(e))) {
        const legalFindings = detectLegalEntities(text);
        for (const f of legalFindings) {
            if (enabledEntities.has(f.entity)) {
                allFindings.push(f);
            }
        }
    }

    // Personal attributes & KVKK sensitive data
    const personalEntities = ['AGE', 'GENDER', 'NATIONALITY', 'MARITAL_STATUS', 'OCCUPATION',
                              'MILITARY_ID', 'EDUCATION_ID', 'BARO_SICIL', 'TRADE_REGISTRY_NO',
                              'SALARY_AMOUNT', 'BLOOD_TYPE', 'HEALTH_CONDITION',
                              'RELIGION', 'ETHNICITY', 'POLITICAL_VIEW', 'UNION_MEMBERSHIP', 'CRIMINAL_RECORD',
                              'BIRTH_PLACE', 'EDUCATION_LEVEL', 'MILITARY_STATUS',
                              'RESIDENCE_PERMIT', 'WORK_PERMIT', 'PENSION_ID',
                              'SEXUAL_LIFE', 'BIOMETRIC_DATA', 'DISABILITY_STATUS'];
    if (personalEntities.some(e => enabledEntities.has(e))) {
        allFindings.push(...detectPersonalAttributes(text, enabledEntities));
    }

    // Override ORG→LOCATION under Mahalle/İl/İlçe labels or "X Mahallesi" suffix pattern
    if (enabledEntities.has('LOCATION')) {
        const locOverrideRe = /(?:mahalle|mahallesi|[İi]l|[İi]lçe|semt|bölge)\s*[:\-]\s*/gi;
        let lo;
        while ((lo = locOverrideRe.exec(text)) !== null) {
            const valStart = lo.index + lo[0].length;
            for (const f of allFindings) {
                if (f.entity === 'ORGANIZATION' && f.start >= valStart && f.start <= valStart + 2) {
                    f.entity = 'LOCATION';
                    f.source = 'label-override';
                }
            }
        }
        // "X Mahallesi" suffix: override ORG that is followed by "Mahallesi"
        for (const f of allFindings) {
            if (f.entity === 'ORGANIZATION') {
                const after = text.substring(f.end, Math.min(text.length, f.end + 15));
                if (/^[ \t]+[Mm]ahallesi\b/.test(after)) {
                    f.entity = 'LOCATION';
                    f.source = 'suffix-override';
                }
            }
        }
    }

    // Remove "SGK" as ORGANIZATION when used as section header ("SGK VE İŞ BİLGİLERİ")
    // or as label prefix ("SGK İşyeri Sicil No:")
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity === 'ORGANIZATION' && trLower(f.value) === 'sgk') {
            const after = text.substring(f.end, Math.min(text.length, f.end + 25));
            if (/^\s+(?:VE\s+[İI]|[İI]şyeri)/i.test(after)) {
                allFindings.splice(i, 1);
            }
        }
    }

    // Remove ORG/COURT when used as section header (ALL_CAPS + header suffix word)
    const HEADER_SUFFIXES = /^\s+(?:BAŞVURUSU|DOSYASI|RAPORU|BİLGİLERİ|KAYDI|KAYITLARI|İŞLEMLERİ|SÜRECİ)(?=\s|$)/;
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity !== 'ORGANIZATION' && f.entity !== 'COURT') continue;
        const ALL_CAPS_RE = /^[A-ZÇĞİÖŞÜ0-9\s.]+$/;
        if (!ALL_CAPS_RE.test(f.value)) continue;
        const after = text.substring(f.end, Math.min(text.length, f.end + 25));
        if (HEADER_SUFFIXES.test(after)) {
            allFindings.splice(i, 1);
        }
    }

    // Remove PERSON_NAME that acts as a field label (followed by ":" and then a number or label text)
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity === 'PERSON_NAME') {
            const after = text.substring(f.end, Math.min(text.length, f.end + 30));
            if (/^[ \t]*[:\-][ \t]*\n?\s*\d/.test(after)) {
                allFindings.splice(i, 1);
                continue;
            }
            if (/^[ \t]+(?:Ünvanı|Sermayesi|Sermaye|Tarihi)\b/i.test(after)) {
                allFindings.splice(i, 1);
            }
        }
    }

    // Remove ORG label duplication: when an ORG is followed by ":" and then another wider ORG
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity !== 'ORGANIZATION') continue;
        const after = text.substring(f.end, Math.min(text.length, f.end + 3));
        if (!/^[ \t]*:/.test(after)) continue;
        const hasWider = allFindings.some(o =>
            o !== f && o.entity === 'ORGANIZATION' && o.start > f.end && o.start <= f.end + 5 &&
            o.value.length > f.value.length
        );
        if (hasWider) allFindings.splice(i, 1);
    }

    // Label:Value scanner — detect PII after labeled fields ("Baba Adı: Hasan")
    const labelValueFindings = detectLabeledValues(text, allFindings, enabledEntities);
    allFindings.push(...labelValueFindings);

    return allFindings.filter(f => f.score >= scoreThreshold);
}

function detectLabeledValues(origText, existingFindings, enabledEntities) {
    const text = trNormSearch(origText);
    const findings = [];

    const ORG_INDICATOR_WORDS_LABEL = new Set([
        'inşaat', 'insaat', 'ticaret', 'sanayi', 'mühendislik', 'muhendislik',
        'mimarlık', 'mimarlik', 'holding', 'grubu', 'şirketi', 'sirketi',
        'limited', 'anonim', 'vakfı', 'vakfi', 'derneği', 'dernegi',
        'kooperatif', 'belediye', 'belediyesi', 'hastanesi', 'üniversitesi',
        'lojistik', 'danışmanlık', 'yazılım', 'otomotiv', 'enerji',
        'madencilik', 'tekstil', 'gıda', 'turizm', 'sigorta', 'bankası',
        'endüstriyel', 'endustriyel', 'ürünler', 'plastik',
        'kimya', 'proje', 'müteahhit', 'taahhüt', 'makina', 'makine',
        'müdürlüğü', 'başkanlığı',
        'taşımacılık', 'nakliyat', 'depolama', 'ilaç', 'medikal', 'kozmetik',
        'matbaa', 'basım', 'yayın', 'yayınevi', 'reklamcılık', 'perakende',
        'ithalat', 'ihracat', 'gayrimenkul', 'emlak', 'müşavirlik', 'bilişim',
        'telekom', 'petrol', 'akaryakıt', 'tarım', 'hayvancılık',
        'mobilya', 'konfeksiyon', 'ambalaj',
        'sendikası', 'sendika', 'fabrika', 'fabrikası',
        'atölye', 'laboratuvar', 'maden', 'seramik',
    ]);

    // ORG-context labels: "Davacı:", "Davalı:", "Şirket Ünvanı:", "İşveren:" etc.
    // After these labels, capture full company name (including "ve" connectors) until A.Ş./Ltd./Şti. or end of line
    const orgLabelRe = /(?:davac[ıIi]|daval[ıIi]|ş[İiI]rket\s*[üu]nvan[ıIi]|t[İiI]caret\s*[üu]nvan[ıIi]|kurum|[İiI]şveren|keş[İiI]dec[İiI]|yüklen[İiI]c[İiI]|tedar[İiI]k[çc][İiI]|lehtar|alacakl[ıIi]|bor[çc]lu|k[İiI]rac[ıIi]|k[İiI]raya\s*veren|müşter[İiI]|sat[ıIi]c[ıIi]|al[ıIi]c[ıIi]|s[İiI]gortac[ıIi]|s[İiI]gortal[ıIi]|send[İiI]ka|banka|hastane|okul|fakülte|acente|ş[İiI]kayet\s*eden|ş[İiI]kayet\s*ed[İiI]len|başvuran|başvuru\s*sah[İiI]b[İiI]|karş[ıIi]\s*taraf|[İiI]hbar\s*eden|[İiI]hbar\s*ed[İiI]len|mağdur\s*(?:f[İiI]rma|ş[İiI]rket)|bay[İiI][İiI]?|d[İiI]str[İiI]bütör|acentes[İiI]?)\s*[:\-][ \t]*([^\n]{3,80})/gi;
    let m;
    while ((m = orgLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('ORGANIZATION')) continue;
        let val = m[1].trim();
        const orgSuffixMatch = val.match(/^(.*?(?:A\.Ş\.|Ltd\.?\s*Şti\.?|Şti\.?|Inc\.?|Corp\.?|GmbH|S\.A\.))/i);
        if (orgSuffixMatch) {
            val = orgSuffixMatch[1].trim();
        } else {
            const words = val.split(/\s+/);
            const hasOrgWord = words.some(w => ORG_INDICATOR_WORDS_LABEL.has(trLower(w)));
            if (!hasOrgWord) continue;
        }
        if (val.length < 3) continue;
        const valStart = m.index + m[0].indexOf(m[1]);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.entity === 'ORGANIZATION' && f.start <= valStart && f.end >= valEnd);
        if (covered) continue;
        for (let i = existingFindings.length - 1; i >= 0; i--) {
            const ef = existingFindings[i];
            if (ef.entity === 'PERSON_NAME' && ef.start >= valStart && ef.end <= valEnd) {
                existingFindings.splice(i, 1);
            }
        }
        for (let i = existingFindings.length - 1; i >= 0; i--) {
            const ef = existingFindings[i];
            if (ef.entity === 'ORGANIZATION' && ef.start >= valStart && ef.end <= valEnd) {
                existingFindings.splice(i, 1);
            }
        }
        findings.push({ entity: 'ORGANIZATION', value: val, start: valStart, end: valEnd, score: 0.9, source: 'label' });
    }

    // Name labels: "Baba Adı:", "Anne Adı:", "Malik:", "Veren:", "Alıcı:", etc.
    const nameLabelRe = /(?:baba|anne|gel[İiI]n|damat|tan[ıIi]k|müteveffa|mur[İiI]s|m[İiI]ras\s*b[ıIi]rakan|mal[İiI]k|hak\s*sah[İiI]b[İiI]|veren|al[ıIi]c[ıIi]|gönderen|lehtar|bor[çc]lu|alacakl[ıIi]|kef[İiI]l|b[İiI]l[İiI]rk[İiI]ş[İiI])\s*(?:ad[ıIi]|ad\s*soyad)?\s*[:\-][ \t]*(?:(?:Prof|Do[çc]|Yrd|Dr|Av|Uzm|Op|Ö[ğg]r)\.?\s+)*([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:[ \t]+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){0,2})/gi;
    const FORM_LABELS = new Set(['ad', 'soyad', 'ad soyad', 'adres', 'telefon', 'tarih', 'konu', 'numara']);
    while ((m = nameLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('PERSON_NAME')) continue;
        const val = m[1].trim();
        if (FORM_LABELS.has(val.toLowerCase())) continue;
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd) ||
                        findings.some(f => f.start <= valStart && f.end >= valEnd);
        if (covered) continue;
        const afterVal = text.substring(valEnd, Math.min(text.length, valEnd + 10));
        if (/^\s*(?:A\.Ş\.|Ltd|Inc|Corp|GmbH|S\.A\.)/.test(afterVal)) continue;
        const isOrg = existingFindings.some(f => f.entity === 'ORGANIZATION' && f.start <= valStart && f.end >= valStart);
        if (isOrg) continue;
        const words = val.split(/\s+/);
        if (words.some(w => ORG_INDICATOR_WORDS_LABEL.has(trLower(w)))) continue;
        findings.push({ entity: 'PERSON_NAME', value: val, start: valStart, end: valEnd, score: 0.85, source: 'label' });
    }

    // Registry number labels: "Cilt No:", "Aile Sıra No:", "Birey Sıra No:"
    const regLabelRe = /(?:c[İiI]lt|a[İiI]le\s*s[ıIi]ra|b[İiI]rey\s*s[ıIi]ra)\s*(?:no|numaras[ıIi]?)?\s*[:\-]\s*(\d{1,10})/gi;
    while ((m = regLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('REGISTRY_NO')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'REGISTRY_NO', value: val, start: valStart, end: valEnd, score: 0.5, source: 'label' });
        }
    }

    // Nüfus kayıt combined: "Cilt/Hane/Birey: 12/03745/008", "Cilt/Aile/Sıra: 5/123/7"
    const nufusCombinedRe = /(?:c[İiI]lt\s*\/\s*(?:a[İiI]le|hane)\s*\/\s*(?:b[İiI]rey|s[ıIi]ra))\s*(?:no)?\s*[:\-]?\s*(\d{1,5}\s*\/\s*\d{1,5}\s*\/\s*\d{1,5})/gi;
    while ((m = nufusCombinedRe.exec(text)) !== null) {
        if (!enabledEntities.has('REGISTRY_NO')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'REGISTRY_NO', value: val, start: valStart, end: valEnd, score: 0.85, source: 'label' });
        }
    }

    // T.C. Kimlik Kartı Seri No — yeni format: A01B12345, eski: seri A01 no 123456
    const kimlikSeriRe = /(?:k[İiI]ml[İiI]k\s*(?:kart[ıIi]?\s*)?|nüfus\s*(?:cüzdan[ıIi]?\s*)?|tc\s*k[İiI]ml[İiI]k\s*)?(?:ser[İiI])\s*(?:no|numaras[ıIi]?)?\s*[:\-]?\s*([A-Z]\d{2}[A-Z]\d{5})\b/gi;
    while ((m = kimlikSeriRe.exec(text)) !== null) {
        if (!enabledEntities.has('GOV_DOCUMENT_ID')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'GOV_DOCUMENT_ID', value: val, start: valStart, end: valEnd, score: 0.85, source: 'label' });
        }
    }
    // Eski format: Seri: A01 No: 123456
    const kimlikSeriOldRe = /(?:k[İiI]ml[İiI]k|nüfus|cüzdan)\s*(?:kart[ıIi]?\s*)?(?:ser[İiI])\s*[:\-]?\s*([A-Z]\d{2})\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{6})\b/gi;
    while ((m = kimlikSeriOldRe.exec(text)) !== null) {
        if (!enabledEntities.has('GOV_DOCUMENT_ID')) continue;
        const val = m[1] + ' ' + m[2];
        const valStart = m.index + m[0].indexOf(m[1]);
        const valEnd = m.index + m[0].lastIndexOf(m[2]) + m[2].length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'GOV_DOCUMENT_ID', value: val, start: valStart, end: valEnd, score: 0.85, source: 'label', _keep: true });
        }
    }

    // SGK İşyeri Sicil No — 26 haneli: "1 1234 01 01 1234567 034 05 61 000"
    const sgkIsyeriRe = /(?:[İi]şyeri\s*(?:sgk|sigorta)?\s*(?:sicil)?|sgk\s*[İi]şyeri)\s*(?:no|numaras[ıi]?)\s*[:\-]?\s*(\d[\d\s\-]{20,35})/gi;
    while ((m = sgkIsyeriRe.exec(text)) !== null) {
        if (!enabledEntities.has('TR_SGK_NO')) continue;
        const val = m[1].trim();
        const digits = val.replace(/\D/g, '');
        if (digits.length < 20 || digits.length > 30) continue;
        const valStart = m.index + m[0].indexOf(m[1]);
        const valEnd = valStart + m[1].length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'TR_SGK_NO', value: val, start: valStart, end: valEnd, score: 0.8, source: 'label' });
        }
    }

    // TBB Sicil No → LICENSE_ID (Türkiye Barolar Birliği)
    const tbbLabelRe = /(?:TBB)\s*(?:sicil)?\s*(?:no|numaras[ıIi]?|kodu)\s*[:\-]\s*([A-Z0-9][\w\-]{2,25})/gi;
    while ((m = tbbLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('LICENSE_ID')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'LICENSE_ID', value: val, start: valStart, end: valEnd, score: 0.7, source: 'label' });
        }
    }

    // General labeled ID: "Ticaret Sicil No:", "Müşteri No:", "Kredi No:", etc.
    const idLabelRe = /(?:t[İiI]caret\s*s[İiI]c[İiI]l|müşter[İiI]|kred[İiI]|ruhsat\s*(?:ser[İiI])?|tahs[İiI]s|emekl[İiI]l[İiI]k\s*dosya)\s*(?:no|numaras[ıIi]?|kodu)\s*[:\-]\s*([A-Z0-9][\w\-]{2,25})/gi;
    while ((m = idLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('FINANCIAL_ID')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'FINANCIAL_ID', value: val, start: valStart, end: valEnd, score: 0.7, source: 'label' });
        }
    }

    // GOV_DOCUMENT_ID labels: "Tebligat Barkod No:", "Tespit No:", etc.
    const govLabelRe = /(?:tebl[İiI]gat\s*(?:barkod)?|tesp[İiI]t|evrak|başvuru\s*(?:kay[ıIi]t)?)\s*(?:no|numaras[ıIi]?|kodu)\s*[:\-]\s*([A-Z0-9][\w\-]{3,25})/gi;
    while ((m = govLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('GOV_DOCUMENT_ID')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd) ||
                        findings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'GOV_DOCUMENT_ID', value: val, start: valStart, end: valEnd, score: 0.7, source: 'label' });
        }
    }

    // TR_VERGI_NO labels: "Vergi No:", "VKN:", "V.K.N.:", "Vergi Numarası:", "Vergi Kimlik No:"
    const vergiLabelRe = /(?:verg[İiI]\s*(?:no|numaras[ıIi]?|k[İiI]ml[İiI]k\s*(?:no|numaras[ıIi]?))|V\.?K\.?N\.?)\s*[:\-]\s*(\d{10,11})\b/gi;
    while ((m = vergiLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('TR_VERGI_NO')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        for (let i = existingFindings.length - 1; i >= 0; i--) {
            const ef = existingFindings[i];
            if (ef.start === valStart && ef.end === valEnd && ef.entity !== 'TR_VERGI_NO') {
                existingFindings.splice(i, 1);
            }
        }
        const covered = existingFindings.some(f => f.entity === 'TR_VERGI_NO' && f.start === valStart && f.end === valEnd);
        if (!covered) {
            findings.push({ entity: 'TR_VERGI_NO', value: val, start: valStart, end: valEnd, score: 0.95, source: 'label' });
        }
    }

    // MERNİS No → TR_ID_NUMBER
    const mernisLabelRe = /(?:mern[iİ]s)\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*(\d{11})\b/gi;
    while ((m = mernisLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('TR_NATIONAL_ID')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd) ||
                        findings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'TR_NATIONAL_ID', value: val, start: valStart, end: valEnd, score: 0.95, source: 'label' });
        }
    }

    // Service/warranty IDs: "Servis Kayıt No:", "Arıza Kayıt No:", "Talep No:"
    const serviceLabelRe = /(?:serv[İiI]s\s*(?:kay[ıIi]t|tak[İiI]p)|ar[ıIi]za\s*(?:kay[ıIi]t|tak[İiI]p)|talep|ş[İiI]kayet\s*(?:kay[ıIi]t|tak[İiI]p)|müracaat\s*kay[ıIi]t|[çc]a[ğg]r[ıIi]\s*merkez[İiI]\s*(?:kay[ıIi]t|referans))\s*(?:no|numaras[ıIi]?)\s*[:\-]?\s*([A-Z0-9][\w\-]{3,25})/gi;
    while ((m = serviceLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('GOV_DOCUMENT_ID')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd) ||
                        findings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'GOV_DOCUMENT_ID', value: val, start: valStart, end: valEnd, score: 0.8, source: 'label' });
        }
    }

    // DEVICE_ID labels: "Seri No:", "Sertifika No:"
    const deviceLabelRe = /(?:seri|sertifika)\s*(?:no|numaras[ıIi]?)\s*[:\-]\s*([A-Z0-9][\w\-]{3,25})/gi;
    while ((m = deviceLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('DEVICE_ID')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd) ||
                        findings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'DEVICE_ID', value: val, start: valStart, end: valEnd, score: 0.7, source: 'label' });
        }
    }

    // USERNAME: "Kullanıcı Adı: hakanaydin88"
    const userLabelRe = /(?:kullan[ıIi]c[ıIi]\s*(?:ad[ıIi]|ad))\s*[:\-]\s*\n?\s*([a-zA-Z0-9._\-]{3,30})/gi;
    while ((m = userLabelRe.exec(text)) !== null) {
        if (!enabledEntities.has('USERNAME')) continue;
        const val = m[1];
        const valStart = m.index + m[0].indexOf(val);
        const valEnd = valStart + val.length;
        const covered = existingFindings.some(f => f.start <= valStart && f.end >= valEnd);
        if (!covered) {
            findings.push({ entity: 'USERNAME', value: val, start: valStart, end: valEnd, score: 0.7, source: 'label' });
        }
    }

    for (const f of findings) { if (!f._keep) f.value = origText.substring(f.start, f.end); }
    return findings;
}
