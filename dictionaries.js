// Perde Web v3 - Turkish Dictionaries & Gazetteers

// ============================================================
// TURKISH PROVINCES (81 il)
// ============================================================
const TR_PROVINCES = new Set([
    'adana', 'adıyaman', 'afyonkarahisar', 'ağrı', 'aksaray', 'amasya', 'ankara',
    'antalya', 'ardahan', 'artvin', 'aydın', 'balıkesir', 'bartın', 'batman',
    'bayburt', 'bilecik', 'bingöl', 'bitlis', 'bolu', 'burdur', 'bursa',
    'çanakkale', 'çankırı', 'çorum', 'denizli', 'diyarbakır', 'düzce', 'edirne',
    'elazığ', 'erzincan', 'erzurum', 'eskişehir', 'gaziantep', 'giresun',
    'gümüşhane', 'hakkari', 'hatay', 'iğdır', 'ısparta', 'istanbul', 'izmir',
    'kahramanmaraş', 'karabük', 'karaman', 'kars', 'kastamonu', 'kayseri',
    'kırıkkale', 'kırklareli', 'kırşehir', 'kilis', 'kocaeli', 'konya', 'kütahya',
    'malatya', 'manisa', 'mardin', 'mersin', 'muğla', 'muş', 'nevşehir', 'niğde',
    'ordu', 'osmaniye', 'rize', 'sakarya', 'samsun', 'şanlıurfa', 'siirt',
    'sinop', 'sivas', 'şırnak', 'tekirdağ', 'tokat', 'trabzon', 'tunceli',
    'uşak', 'van', 'yalova', 'yozgat', 'zonguldak',
]);

// Major districts of Istanbul, Ankara, Izmir
const TR_DISTRICTS = new Set([
    // Istanbul
    'kadıköy', 'beşiktaş', 'şişli', 'bakırköy', 'fatih', 'üsküdar', 'beyoğlu',
    'ataşehir', 'maltepe', 'kartal', 'pendik', 'tuzla', 'sultanbeyli', 'ümraniye',
    'sancaktepe', 'çekmeköy', 'beykoz', 'sarıyer', 'eyüpsultan', 'kağıthane',
    'bayrampaşa', 'zeytinburnu', 'güngören', 'esenler', 'bağcılar', 'bahçelievler',
    'küçükçekmece', 'büyükçekmece', 'avcılar', 'esenyurt', 'beylikdüzü',
    'başakşehir', 'arnavutköy', 'sultangazi', 'gaziosmanpaşa', 'silivri',
    'çatalca', 'şile', 'adalar',
    // Ankara
    'çankaya', 'keçiören', 'yenimahalle', 'mamak', 'etimesgut', 'sincan',
    'altındağ', 'pursaklar', 'gölbaşı', 'polatlı',
    // Izmir
    'konak', 'karşıyaka', 'bornova', 'buca', 'çiğli', 'bayraklı', 'gaziemir',
    'narlıdere', 'balçova', 'karabağlar',
    // Others
    'nilüfer', 'osmangazi', 'yıldırım', 'seyhan', 'çukurova', 'muratpaşa',
    'konyaaltı', 'kepez', 'odunpazarı', 'tepebaşı',
]);

// ============================================================
// TURKISH FIRST NAMES (expanded)
// ============================================================
const TR_FIRST_NAMES = new Set([
    // Male - very common
    'ahmet', 'mehmet', 'mustafa', 'ali', 'hüseyin', 'hasan', 'ibrahim', 'ismail',
    'osman', 'yusuf', 'murat', 'ömer', 'halil', 'ramazan', 'süleyman', 'recep',
    'salih', 'yaşar', 'mahmut', 'kadir', 'kerim', 'adem', 'bilal', 'hamza', 'eyüp',
    'bekir', 'yunus', 'abdullah', 'abdulkadir', 'abdurrahman', 'bayram', 'cemal',
    'cengiz', 'davut', 'dursun', 'enver', 'erdal', 'erhan', 'faruk', 'fatih',
    'ferhat', 'fikret', 'gökhan', 'güven', 'habib', 'harun', 'haydar', 'hayri',
    'hikmet', 'idris', 'ilhan', 'irfan', 'kemal', 'kubilay', 'levent', 'lütfi',
    'metin', 'muammer', 'muhammed', 'musa', 'muzaffer', 'nazım', 'necati',
    'nedim', 'nuri', 'oğuz', 'orhan', 'raif', 'rıza', 'rüştü', 'sabri',
    'saffet', 'sedat', 'selim', 'şaban', 'şakir', 'şükrü', 'tahir', 'tahsin',
    'talat', 'tayfun', 'temel', 'turgut', 'turhan', 'turan', 'uğur', 'ümit',
    'vedat', 'veli', 'veysel', 'yakup', 'yavuz', 'yılmaz', 'zafer', 'zeki',
    // Male - modern
    'emre', 'can', 'berk', 'cem', 'deniz', 'ege', 'kerem', 'burak', 'onur',
    'serkan', 'volkan', 'hakan', 'tolga', 'sinan', 'barış', 'kaan', 'tarık',
    'erdem', 'eren', 'arda', 'furkan', 'berke', 'utku', 'doruk', 'alp', 'efe',
    'baran', 'tuna', 'umut', 'koray', 'ilker', 'cenk', 'ozan', 'kağan', 'engin',
    'altan', 'çağlar', 'ersin', 'gürkan', 'polat', 'soner', 'yiğit', 'batuhan',
    'berkay', 'emir', 'mert', 'kıvanç', 'taner', 'taylan', 'görkem', 'atakan',
    'ersan', 'cihan', 'göksel', 'aykut', 'ayhan', 'bülent', 'cüneyt', 'ertuğrul', 'ilkay',
    'korhan', 'levend', 'muhsin', 'nevzat', 'oktay', 'özgür', 'rıfat', 'sami',
    'serhat', 'şenol', 'turgay', 'ufuk', 'üzeyir', 'yalçın', 'zafer', 'zühtü',
    // Female - very common
    'fatma', 'ayşe', 'emine', 'cemile', 'hatice', 'zeynep', 'elif', 'sultan', 'hanife',
    'merve', 'büşra', 'esra', 'derya', 'selin', 'ceren', 'defne', 'ece', 'ada',
    'nehir', 'yağmur', 'ebru', 'özlem', 'aslı', 'pınar', 'gül', 'gülcan', 'nurcan', 'nur', 'mine',
    'sevgi', 'dilek', 'leyla', 'aylin', 'gamze', 'tuğba', 'gizem', 'damla',
    'melis', 'sibel', 'filiz', 'gülay', 'hülya', 'münevver', 'naciye', 'nazan',
    'nesrin', 'neşe', 'nihal', 'nilgün', 'nilüfer', 'nuray', 'nurten', 'pembe',
    'perihan', 'rabia', 'rahime', 'remziye', 'rukiye', 'sabiha', 'safiye',
    'saadet', 'seher', 'selma', 'serpil', 'sevim', 'şerife', 'türkan', 'ümmühan',
    'yasemin', 'yıldız', 'zeliha', 'zübeyde',
    // Female - modern
    'aleyna', 'azra', 'berra', 'beyza', 'canan', 'cansu', 'cemre', 'dila', 'dilara',
    'duru', 'ecrin', 'ela', 'elçin', 'eylül', 'fulya', 'gonca', 'gökçe',
    'güneş', 'ilayda', 'irmak', 'kübra', 'lale', 'melisa', 'naz', 'nisa',
    'hande', 'pelin', 'sena', 'serra', 'simge', 'şeyma', 'tuba', 'tuğçe', 'zehra', 'zümra',
    // Additional common Turkish first names
    'zuhal', 'ilknur', 'duygu', 'ilkay', 'birsen', 'füsun', 'güzin', 'jale',
    'naime', 'neriman', 'nurgül', 'sevtap', 'songül', 'şirin', 'ülkü', 'yurdagül',
    'banu', 'belgin', 'binnaz', 'çiğdem', 'figen', 'gönül', 'handan', 'inci',
    'mediha', 'meral', 'müjgan', 'nalan', 'necla', 'pakize', 'rezzan', 'reyhan',
    'sıdıka', 'serap', 'solmaz', 'şükran', 'tülay', 'yeşim', 'zühal', 'arzu', 'başak',
    'betül', 'burcu', 'didem', 'evrim', 'ferda', 'funda', 'hazal', 'irem',
    'işıl', 'kadriye', 'kumru', 'leman', 'melike', 'mihriban', 'müge', 'nazlı',
    'özge', 'rana', 'rengin', 'ruken', 'saadet', 'şebnem', 'tülin', 'yelda',
    'zeren', 'tuğrul', 'doğukan', 'alperen', 'aras', 'eymen', 'yağız', 'ömer',
    // Additional male
    'adnan', 'akif', 'akin', 'alper', 'asaf', 'atilla', 'avni', 'bahadır',
    'baki', 'bedri', 'behçet', 'binali', 'burhan', 'cahit', 'celal', 'coşkun',
    'cumhur', 'çetin', 'doğan', 'ekrem', 'ender', 'erol', 'ertan', 'esat',
    'fevzi', 'fırat', 'galip', 'halit', 'hamdi', 'hüsnü', 'ihsan', 'izzet',
    'kamil', 'kazım', 'kenan', 'latif', 'lütfü', 'macit', 'mazhar', 'mesut',
    'mithat', 'muharrem', 'münir', 'müslüm', 'nail', 'namık', 'necdet',
    'necip', 'nihat', 'niyazi', 'nusret', 'oğuzhan', 'pertev', 'ragıp',
    'remzi', 'reşat', 'rıdvan', 'rüstem', 'sadık', 'saim', 'sakıp',
    'sami', 'savaş', 'selahattin', 'şeref', 'şevket', 'tevfik', 'timur',
    'tunç', 'tümer', 'vecdi', 'vural', 'yahya', 'yekta', 'ziya',
    // Additional female
    'ayla', 'ayten', 'bahar', 'berna', 'bihter', 'birgül', 'cahide',
    'celile', 'demet', 'deniz', 'ecehan', 'esma', 'fahriye', 'fazilet',
    'feride', 'feyza', 'güler', 'gülten', 'hadice', 'halime', 'hanım',
    'havva', 'hediye', 'hicran', 'huriye', 'hürmet', 'kezban', 'kıymet',
    'lamia', 'latife', 'lütfiye', 'makbule', 'melahat', 'menekşe',
    'mevlüde', 'mualla', 'mukaddes', 'münire', 'müzeyyen', 'nefise',
    'nermin', 'neslihan', 'nimet', 'nurhan', 'nurhayat', 'nuriye',
    'oya', 'pervin', 'raziye', 'rüveyda', 'sabahat', 'samiye',
    'saniye', 'sevda', 'sevil', 'şennur', 'şermin', 'teslime',
    'tülay', 'vahide', 'yüksel', 'zahide', 'zekeriya', 'zennure', 'züleyha',
    // International common
    'john', 'james', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
    'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark',
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan',
    'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'margaret', 'sandra',
    'george', 'alexander', 'benjamin', 'henry', 'andrew', 'peter', 'paul',
    'mohammed', 'ahmed', 'omar', 'hassan', 'hussein', 'ibrahim', 'mahmoud',
]);

// ============================================================
// TURKISH LAST NAMES (expanded)
// ============================================================
const TR_LAST_NAMES = new Set([
    'yılmaz', 'kaya', 'demir', 'çelik', 'şahin', 'yıldız', 'yıldırım', 'öztürk',
    'aydın', 'özdemir', 'arslan', 'doğan', 'kılıç', 'aslan', 'çetin', 'kara',
    'koç', 'kurt', 'özkan', 'şimşek', 'polat', 'korkmaz', 'güneş', 'aktaş',
    'erdoğan', 'yavuz', 'güler', 'çakır', 'tan', 'keskin', 'kaplan', 'ateş',
    'bayrak', 'bulut', 'akın', 'toprak', 'tunç', 'başar', 'uçar', 'bozkurt',
    'aksoy', 'altın', 'avcı', 'bayram', 'cengiz', 'durmaz', 'ergin', 'gündüz',
    'ışık', 'karaca', 'taş', 'uysal', 'ünal', 'sönmez', 'tekin', 'türk',
    'acar', 'akbaş', 'akgül', 'akman', 'aktürk', 'akyol', 'akyürek', 'akyüz', 'albayrak',
    'alemdar', 'altıntaş', 'arıkan', 'atasoy', 'avcıoğlu', 'aygün', 'bağcı',
    'bakırcı', 'bal', 'balcı', 'başaran', 'başer', 'başkan', 'batur', 'bayar',
    'bayraktar', 'bektaş', 'bilgin', 'bilgiç', 'bingöl', 'binici', 'bircan',
    'budak', 'büyük', 'büyükbaş', 'can', 'cansız', 'ceylan', 'coşkun', 'çağlar',
    'çakar', 'çalışkan', 'çam', 'çavuş', 'çınar', 'çoban', 'dağ', 'dal',
    'dalkılıç', 'dede', 'demirci', 'demirtaş', 'deniz', 'dinç', 'dinçer',
    'doğru', 'duman', 'duran', 'durmuş', 'duru', 'elmas', 'emre', 'erbaş',
    'ercan', 'erdem', 'erdoğmuş', 'eren', 'ergün', 'eroğlu', 'ersoy', 'ertürk',
    'genç', 'gencer', 'göçmen', 'gökalp', 'gökçe', 'gökmen', 'gül', 'gülen',
    'gümüş', 'gündoğdu', 'güneri', 'güngör', 'gürbüz', 'gürsel', 'güven',
    'ilhan', 'ince', 'işık', 'kaban', 'kalkan', 'kaptan', 'karadağ', 'karakaya',
    'karakuş', 'karataş', 'kartal', 'keleş', 'kılınç', 'kıran', 'kırca',
    'kocaman', 'koçak', 'koparan', 'köse', 'kulaç', 'kutlu', 'küçük',
    'küçükali', 'mazlum', 'mutlu', 'nas', 'ocak', 'odabaşı', 'oğuz', 'okur',
    'olgun', 'oral', 'orhan', 'ovalı', 'öz', 'özay', 'özbek', 'özçelik',
    'özen', 'özer', 'özgür', 'özhan', 'pala', 'parlak', 'peker', 'pehlivan',
    'poyraz', 'sağlam', 'sarı', 'sarıkaya', 'savcı', 'savaş', 'sayan',
    'seçkin', 'serdar', 'sevim', 'sevinç', 'sezen', 'soğancı', 'solak',
    'soydan', 'sözen', 'sözer', 'şen', 'şener', 'şengül', 'talay', 'tanrıverdi',
    'taşkın', 'tatlı', 'tekeli', 'tezcan', 'tokgöz', 'topal', 'torun',
    'tosun', 'tuncer', 'turan', 'türker', 'türkoğlu', 'uçak', 'uğurlu',
    'ulu', 'ulusoy', 'uslu', 'uzun', 'uzuner', 'yalçın', 'yaman', 'yanar',
    'yazıcı', 'yener', 'yeşil', 'yolcu', 'yücel', 'yüksek', 'yüksel',
    'zengin', 'zorlu', 'selanik', 'soylu', 'soysalan', 'soysal', 'soytürk',
    // Additional common Turkish last names
    'üçgül', 'tunçer', 'atılgan', 'savran', 'kollu', 'cebecioğlu', 'özdoğan',
    'aksu', 'alkan', 'altunbaş', 'arıkan', 'aslantaş', 'atasever', 'aydoğan',
    'ayhan', 'bağcı', 'bayhan', 'baysal', 'birinci', 'bostancı', 'candan',
    'cansever', 'çağlayan', 'çakıcı', 'çetiner', 'çolak', 'dağlı', 'dalkıran',
    'demirbaş', 'demirel', 'deveci', 'ekmekçi', 'elmalı', 'ergüven', 'erkılıç',
    'ertaş', 'göçer', 'gökçen', 'gürcan', 'gürdal', 'gürsoy', 'hacıoğlu',
    'hancı', 'karaman', 'karslı', 'kayaalp', 'kılıçarslan', 'koçer', 'kuzu',
    'memiş', 'mercan', 'okutan', 'öncü', 'özaydın', 'özkaya', 'özmen', 'pınar',
    'sağır', 'sarıgül', 'savci', 'selçuk', 'soylu', 'sümer', 'şanlı', 'tabak',
    'tanrıkulu', 'taşçı', 'tekbaş', 'tezcan', 'tokdemir', 'topçu', 'tuncel',
    'türkyılmaz', 'uçar', 'ulutaş', 'üstün', 'yağcı', 'yalçınkaya', 'yaşar',
    'yiğitbaşı', 'yörük', 'zenginoğlu',
    // Additional common Turkish last names (2)
    'abacı', 'akbulut', 'akçay', 'akdoğan', 'akgün', 'akkaya', 'akkuş',
    'alpay', 'altıparmak', 'arslantürk', 'atalay', 'aydınlık', 'bağcılar',
    'bahadır', 'balaban', 'başçı', 'batmaz', 'bayrakçı', 'bayındır',
    'bilge', 'bozdoğan', 'bozok', 'bölükbaşı', 'büyükkaya', 'cabbar',
    'canpolat', 'coşar', 'çakıroğlu', 'çakmak', 'çalık', 'çavuşoğlu',
    'çiftçi', 'çiçek', 'çilingir', 'dabak', 'dağdelen', 'dağhan', 'damar',
    'değirmenci', 'dikmen', 'doğru', 'dölek', 'dönmez', 'dülger', 'düzenli',
    'elibol', 'elçi', 'emen', 'emiroğlu', 'engindeniz', 'erbil', 'erçetin',
    'erdil', 'erikçi', 'erkek', 'ertop', 'evren', 'eyüboğlu', 'gedik',
    'gezer', 'gider', 'göktaş', 'gönül', 'gözükara', 'güçlü', 'güler',
    'gülhan', 'güneyli', 'güngördü', 'gürel', 'halıcı', 'harman',
    'irmak', 'inal', 'kabakçı', 'kafadar', 'kaleli', 'kanat', 'kandil',
    'kapıcı', 'karabulut', 'karaduman', 'karakaş', 'kavaklı', 'kaynak',
    'kement', 'keser', 'kırbaş', 'kızıl', 'kızılırmak', 'koçak', 'konuk',
    'kopuz', 'körpe', 'kulaçoğlu', 'kumcu', 'kuşçu', 'oğuzhan', 'önder',
    'öztaş', 'palaz', 'pehlivanlı', 'pirinç', 'samancı', 'sarıçam',
    'sarıhan', 'sarıtaş', 'sezer', 'sivri', 'solmaz', 'şahinbaş', 'şeker',
    'şimşir', 'taban', 'tahtacı', 'tandoğan', 'taşdemir', 'taşkıran',
    'tekin', 'temiz', 'terzi', 'toklu', 'toygar', 'tuna', 'tunçel',
    'türkmen', 'uçkan', 'uzunalioğlu', 'varlık', 'yağmur', 'yalın',
    'yamaç', 'yanbolu', 'yapıcı', 'yaşaroğlu', 'yazgan', 'yılmazer',
    'yurdakul', 'yurduseven', 'zengin', 'zeyrek',
    // International
    'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller',
    'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson',
    'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee',
    'thompson', 'white', 'harris', 'clark', 'lewis', 'robinson', 'walker',
]);

// ============================================================
// ORGANIZATION SUFFIXES & PATTERNS
// ============================================================
const ORG_SUFFIXES = [
    'hastanesi', 'hastahanesi', 'üniversitesi', 'fakültesi', 'lisesi', 'okulu',
    'koleji', 'enstitüsü', 'akademisi', 'vakfı', 'derneği', 'birliği',
    'odası', 'bakanlığı', 'müdürlüğü', 'başkanlığı', 'genel müdürlüğü',
    'bankası', 'sigorta', 'holding', 'şirketi', 'limited', 'anonim',
    'a.ş.', 'ltd.', 'tic.', 'san.', 'org.', 'vakıf', 'ltd. şti.',
    'mahkemesi', 'savcılığı', 'adliyesi', 'müftülüğü', 'kaymakamlığı',
    'valiliği', 'belediyesi', 'emniyet müdürlüğü', 'jandarma',
    'tıp merkezi', 'klinigi', 'kliniği', 'polikliniği', 'laboratuvarı',
    'eczanesi', 'sağlık merkezi', 'sağlık ocağı', 'dispanser',
    'avm', 'plaza', 'tower', 'center', 'centre',
];

const KNOWN_ORGS = new Set([
    // Hospitals
    'acıbadem', 'memorial', 'medicana', 'medipol', 'florence nightingale',
    'amerikan hastanesi', 'german hospital', 'liv hospital', 'anadolu sağlık',
    'johns hopkins', 'mayo clinic',
    // Insurance
    'axa sigorta', 'allianz', 'anadolu sigorta', 'aksigorta', 'sompo sigorta',
    'hdi sigorta', 'mapfre', 'groupama', 'zurich sigorta', 'ray sigorta',
    'eureko sigorta', 'güneş sigorta', 'generali sigorta', 'unico sigorta',
    'bereket sigorta', 'türk nippon', 'quick sigorta',
    // Banks
    'ziraat bankası', 'türkiye iş bankası', 'iş bankası', 'garanti bbva', 'yapı kredi', 'akbank',
    'halkbank', 'vakıfbank', 'denizbank', 'qnb finansbank', 'türkiye finans',
    'kuveyt türk', 'teb', 'şekerbank', 'ing', 'hsbc', 'odeabank', 'fibabanka',
    // Government
    'sgk', 'tcmb', 'bddk', 'spk', 'epdk', 'kgm', 'karayolları',
    'maliye hazinesi', 'hazine', 'maliye', 'tapu müdürlüğü', 'kadastro müdürlüğü',
    'nüfus müdürlüğü', 'emniyet müdürlüğü', 'orman müdürlüğü',
    'çevre ve şehircilik', 'tarım müdürlüğü',
    // Courts
    'asliye hukuk', 'asliye ceza', 'sulh hukuk', 'sulh ceza', 'ağır ceza',
    'ticaret mahkemesi', 'iş mahkemesi', 'aile mahkemesi', 'idari yargı', 'icra müdürlüğü',
    'icra dairesi', 'idare mahkemesi', 'anayasa mahkemesi', 'yargıtay',
    'danıştay', 'sayıştay', 'uyuşmazlık mahkemesi',
    // Bars
    'istanbul barosu', 'ankara barosu', 'izmir barosu', 'bursa barosu',
    'antalya barosu', 'ısparta barosu', 'türkiye barolar birliği',
    // Insurance authorities
    'sigorta tahkim komisyonu', 'sigortacılık genel müdürlüğü',
    'hazine ve maliye bakanlığı', 'türkiye sigorta birliği',
    'güvence hesabı', 'trafik sigortaları bilgi merkezi', 'tramer',
    'doğal afet sigortaları kurumu', 'dask',
]);

// ============================================================
// TITLE / HONORIFIC PREFIXES
// ============================================================
const TITLE_PREFIXES = [
    'bay', 'bayan', 'sayın', 'sn.', 'sn',
    'dr.', 'dr', 'prof.', 'prof', 'doç.', 'doç',
    'av.', 'av', 'arş.', 'öğr.', 'uzm.',
    'mr.', 'mr', 'mrs.', 'mrs', 'ms.', 'ms', 'miss',
    'hakim', 'savcı', 'müfettiş', 'müdür', 'başkan',
    'hemşire', 'ebe', 'eczacı', 'mühendis', 'mimar',
    'yüzbaşı', 'binbaşı', 'albay', 'general', 'komiser',
    'davacı', 'davalı', 'müşteki', 'şüpheli', 'sanık', 'tanık',
    'mağdur', 'müdahil', 'vekil', 'vekili',
    'ad soyad', 'adı soyadı', 'ad-soyad',
    'eksper', 'cerrah', 'hekim', 'sorumlu hekim', 'operatör',
    'yetkili', 'çalışan', 'sürücü', 'araç sahibi', 'hasta',
    'bilirkişi', 'müfettiş', 'noter',
];

// ============================================================
// LEGAL/INSURANCE/MEDICAL CONTEXT KEYWORDS
// ============================================================
const LEGAL_CONTEXT = {
    caseNumber: ['esas', 'karar', 'dosya', 'dava', 'soruşturma', 'kovuşturma',
                  'müracaat', 'başvuru', 'itiraz', 'temyiz', 'istinaf'],
    policyNumber: ['poliçe', 'police', 'sigorta poliçe', 'trafik poliçe',
                    'kasko poliçe', 'sağlık poliçe', 'hayat poliçe'],
    claimNumber: ['hasar', 'tazminat', 'dosya', 'talep', 'ihbar'],
    patientId: ['hasta', 'protokol', 'muayene', 'epikriz', 'rapor',
                 'tedavi', 'reçete', 'sevk'],
    vehicleInfo: ['plaka', 'şasi', 'motor', 'ruhsat', 'tescil'],
};
