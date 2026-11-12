/** «فيديو قرآني»: verse text (from the Uthmani mushaf API — never written by AI), a reciter's audio, a calm moving background. */
export const QFPS = 30;

/** [name, number of ayat] — index 0 = Al-Fatiha (surah 1). */
export const SURAHS: [string, number][] = [["الفاتحة",7],["البقرة",286],["آل عمران",200],["النساء",176],["المائدة",120],["الأنعام",165],["الأعراف",206],["الأنفال",75],["التوبة",129],["يونس",109],["هود",123],["يوسف",111],["الرعد",43],["إبراهيم",52],["الحجر",99],["النحل",128],["الإسراء",111],["الكهف",110],["مريم",98],["طه",135],["الأنبياء",112],["الحج",78],["المؤمنون",118],["النور",64],["الفرقان",77],["الشعراء",227],["النمل",93],["القصص",88],["العنكبوت",69],["الروم",60],["لقمان",34],["السجدة",30],["الأحزاب",73],["سبإ",54],["فاطر",45],["يس",83],["الصافات",182],["ص",88],["الزمر",75],["غافر",85],["فصلت",54],["الشورى",53],["الزخرف",89],["الدخان",59],["الجاثية",37],["الأحقاف",35],["محمد",38],["الفتح",29],["الحجرات",18],["ق",45],["الذاريات",60],["الطور",49],["النجم",62],["القمر",55],["الرحمن",78],["الواقعة",96],["الحديد",29],["المجادلة",22],["الحشر",24],["الممتحنة",13],["الصف",14],["الجمعة",11],["المنافقون",11],["التغابن",18],["الطلاق",12],["التحريم",12],["الملك",30],["القلم",52],["الحاقة",52],["المعارج",44],["نوح",28],["الجن",28],["المزمل",20],["المدثر",56],["القيامة",40],["الإنسان",31],["المرسلات",50],["النبإ",40],["النازعات",46],["عبس",42],["التكوير",29],["الانفطار",19],["المطففين",36],["الانشقاق",25],["البروج",22],["الطارق",17],["الأعلى",19],["الغاشية",26],["الفجر",30],["البلد",20],["الشمس",15],["الليل",21],["الضحى",11],["الشرح",8],["التين",8],["العلق",19],["القدر",5],["البينة",8],["الزلزلة",8],["العاديات",11],["القارعة",11],["التكاثر",8],["العصر",3],["الهمزة",9],["الفيل",5],["قريش",4],["الماعون",7],["الكوثر",3],["الكافرون",6],["النصر",3],["المسد",5],["الإخلاص",4],["الفلق",5],["الناس",6]];

/** Verse-by-verse recitations on everyayah.com: https://everyayah.com/data/{folder}/{SSS}{AAA}.mp3 — admins can edit this list. */
export type Reciter = { id: string; name: string; folder: string };
export const DEFAULT_RECITERS: Reciter[] = [
  { id: "dosari", name: "ياسر الدوسري", folder: "Yasser_Ad-Dussary_128kbps" },
  { id: "alafasy", name: "مشاري العفاسي", folder: "Alafasy_128kbps" },
  { id: "muaiqly", name: "ماهر المعيقلي", folder: "MaherAlMuaiqly128kbps" },
  { id: "sudais", name: "عبدالرحمن السديس", folder: "Abdurrahmaan_As-Sudais_192kbps" },
  { id: "shuraim", name: "سعود الشريم", folder: "Saood_ash-Shuraym_128kbps" },
  { id: "ajamy", name: "أحمد العجمي", folder: "ahmed_ibn_ali_al_ajamy_128kbps" },
  { id: "qatami", name: "ناصر القطامي", folder: "Nasser_Alqatami_128kbps" },
  { id: "husary", name: "محمود خليل الحصري", folder: "Husary_128kbps" },
  { id: "minshawi", name: "محمد صديق المنشاوي", folder: "Minshawy_Murattal_128kbps" },
  { id: "abdulbasit", name: "عبدالباسط عبدالصمد", folder: "Abdul_Basit_Murattal_192kbps" },
];
export const ayahAudio = (folder: string, surah: number, ayah: number) =>
  `https://everyayah.com/data/${folder}/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;

export const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
export const MAX_AYAT = 20;

export type QAyah = { n: number; text: string; en?: string; audio: string; dur: number }; // n = 0 → basmala
export type QStyle = "classic" | "glass" | "frame" | "minimal";
export const Q_STYLES: [QStyle, string][] = [["classic", "كلاسيكي"], ["glass", "زجاجي"], ["frame", "إطار مزخرف"], ["minimal", "بسيط"]];
export const Q_FONTS: [string, string][] = [["Amiri Quran", "خط المصحف (أميري قرآن)"], ["Amiri", "أميري"]];
export type QuranSpec = {
  aspect: "9:16" | "1:1" | "16:9";
  surah: number; from: number; to: number;
  reciter: string; reciterName: string; folder: string;
  ayahs: QAyah[];
  bg: { kind: "video" | "image"; url: string; path?: string; bucket?: "results" | "uploads" } | null;
  dim: number;                       // dark layer over the background 0..0.8
  style: QStyle;
  font: string;
  textColor: string; accent: string;
  showSurah: boolean; showNumbers: boolean; showTranslation: boolean; showReciter: boolean;
  gap: number;                       // silence between ayat (s)
  quality?: "1080" | "4k";
};

export const qDims = (a: QuranSpec["aspect"]) => (a === "16:9" ? { width: 1920, height: 1080 } : a === "1:1" ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 });
export const qIntro = 1.4;  // seconds: surah title before the first ayah
export const qOutro = 1.2;
export const qFrames = (s: QuranSpec) => Math.max(1, Math.round((qIntro + s.ayahs.reduce((a, x) => a + x.dur + s.gap, 0) + qOutro) * QFPS));
/** Removes harakat to compare words. */
export const plain = (t: string) => t.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[ٱأإآ]/g, "ا");
/** Arabic-Indic digits for ayah numbers. */
export const arNum = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
