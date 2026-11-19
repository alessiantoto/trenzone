import type { Product } from './api';
import { PROGRAM_SLUGS, PROGRAM_UUIDS } from './programs';

export type ProgramDetailKey = 'food-plan' | 'training-program' | 'bench-program' | 'bundle';

export interface BilingualText {
  ro: string;
  en: string;
}

export interface ProgramModuleItem {
  number: string;
  title: BilingualText;
  summary: BilingualText;
}

export interface ProgramRichDetail {
  key: ProgramDetailKey;
  slug: string;
  id: string;
  categoryLabel: BilingualText;
  title: BilingualText;
  summary: BilingualText;
  forWhoTitle: BilingualText;
  forWho: BilingualText[];
  outcomesTitle: BilingualText;
  outcomes: BilingualText[];
  modulesTitle: BilingualText;
  modules: ProgramModuleItem[];
}

export const PROGRAM_RICH_DETAILS: Record<ProgramDetailKey, ProgramRichDetail> = {
  'food-plan': {
    key: 'food-plan',
    slug: PROGRAM_SLUGS.FOOD_PLAN,
    id: PROGRAM_UUIDS.FOOD_PLAN,
    categoryLabel: { ro: 'Nutriție & Structură', en: 'Nutrition System' },
    title: { ro: 'Food Plan — By Vlad Tren', en: 'Food Plan — By Vlad Tren' },
    summary: {
      ro: 'Sistem complet de nutriție pentru masă musculară sau definire: calcule practice, exemple complete de meniuri și reguli sustenabile pe termen lung.',
      en: 'A practical nutrition system for muscle gain or fat loss: clear structure, full sample meal plans, and sustainable everyday habits.',
    },
    forWhoTitle: { ro: 'Cui i se potrivește', en: 'Built For' },
    forWho: [
      {
        ro: 'Celor care vor masă musculară curată și nu știu dacă mănâncă suficient sau dacă își ating necesarul zilnic de proteină.',
        en: 'Lifters chasing lean muscle who want clarity on daily calories and protein without overcomplicating meals.',
      },
      {
        ro: 'Celor care vor să slăbească sănătos fără diete extreme la care renunți după primele săptămâni.',
        en: 'Anyone looking for sustainable fat loss without restrictive crash diets that kill gym energy.',
      },
      {
        ro: 'Persoanelor ocupate care vor mese rapide, accesibile ca buget și ușor de pregătit din timp.',
        en: 'Busy routines built around accessible ingredients, simple prep, and zero wasted budget.',
      },
    ],
    outcomesTitle: { ro: 'Ce primești concret', en: 'What You Get' },
    outcomes: [
      {
        ro: 'Principii clare de construcție a meselor adaptate la programul tău zilnic și la obiectivul actual.',
        en: 'A repeatable meal-building framework tailored to your daily schedule and physique goal.',
      },
      {
        ro: 'Exemple complete de meniuri zilnice atât pentru creștere musculară, cât și pentru scădere în greutate.',
        en: 'Full sample meal plans with real portions for both muscle gain and weight loss.',
      },
      {
        ro: 'Strategii anti-risipă pentru cumpărături + selecția sinceră a suplimentelor care chiar își fac treaba.',
        en: 'Smart grocery batch-prep strategies plus an honest breakdown of supplements worth taking.',
      },
    ],
    modulesTitle: { ro: 'Structura ghidului', en: 'Inside the Guide' },
    modules: [
      {
        number: '01',
        title: { ro: 'Introducere & Direcție', en: 'Introduction' },
        summary: {
          ro: 'Cum îți aliniez alimentația cu programul real, preferințele și obiectivul tău.',
          en: 'Setting up a realistic plan around your schedule, preferences, and goals.',
        },
      },
      {
        number: '02',
        title: { ro: 'Bazele Nutriției', en: 'Nutrition Fundamentals' },
        summary: {
          ro: 'Ce elemente nu trebuie să lipsească zilnic pentru energie, refacere și sănătate.',
          en: 'The core daily nutritional pillars required for performance and recovery.',
        },
      },
      {
        number: '03',
        title: { ro: 'Macro-nutrienți & Fibre', en: 'Macronutrients & Fiber' },
        summary: {
          ro: 'Rolul fiecărui macronutrient, repere clare de dozaj și sursele recomandate.',
          en: 'Clear intake guidelines and top food sources for strength training.',
        },
      },
      {
        number: '04',
        title: { ro: 'Structurarea Meselor', en: 'Meal Architecture' },
        summary: {
          ro: 'Modele flexibile de împărțire pe parcursul zilei și formula rapidă a farfuriei.',
          en: 'Flexible daily meal timing and a repeatable formula for main meals.',
        },
      },
      {
        number: '05',
        title: { ro: 'Protocol Masă Musculară + Meniu', en: 'Muscle-Gain Diet + Sample Plan' },
        summary: {
          ro: 'Cum construiești surplusul corect și un exemplu complet de zi structurată pe mese.',
          en: 'How to pace calorie intake alongside a full daily sample menu.',
        },
      },
      {
        number: '06',
        title: { ro: 'Protocol Slăbire + Zi Exemplu', en: 'Weight-Loss Diet + Sample Day' },
        summary: {
          ro: 'Abordare sustenabilă de definire cu structură vizuală și variante ușoare de înlocuire.',
          en: 'Long-term fat-loss structure with flexible meals and snack swaps.',
        },
      },
      {
        number: '07',
        title: { ro: 'Optimizare Buget & Pregătire', en: 'Budget & Smart Prep' },
        summary: {
          ro: 'Cum reduci cheltuielile și timpul petrecut în bucătărie fără să mănânci monoton.',
          en: 'Cutting grocery waste and prep time while keeping meals consistent.',
        },
      },
      {
        number: '08',
        title: { ro: 'Suplimente', en: 'Supplements Breakdown' },
        summary: {
          ro: 'Ce merită cumpărat pentru performanță și ce poți sări fără regrete.',
          en: 'Clear perspective on what supports training and what is unnecessary.',
        },
      },
      {
        number: '09',
        title: { ro: 'Reguli Practice Zilnice', en: 'Practical Daily Habits' },
        summary: {
          ro: 'Obiceiuri simple de hidratare, sațietate și echilibru ca să poți ține planul pe termen lung.',
          en: 'Everyday habits for hydration, appetite control, and staying consistent.',
        },
      },
      {
        number: '10',
        title: { ro: 'Mindset & Concluzii', en: 'Final Thoughts' },
        summary: {
          ro: 'Cum transformi regulile din ghid în rutină permanentă, fără perfecționism.',
          en: 'Turning simple habits into lasting results without chasing perfection.',
        },
      },
    ],
  },

  'training-program': {
    key: 'training-program',
    slug: PROGRAM_SLUGS.TRAINING_PROGRAM,
    id: PROGRAM_UUIDS.TRAINING_PROGRAM,
    categoryLabel: { ro: 'Hipertrofie & Forță', en: 'Complete Training System' },
    title: { ro: 'Training Program — By Vlad Tren', en: 'Training Program — By Vlad Tren' },
    summary: {
      ro: 'Sistem complet de antrenament pe grupe musculare: programare săptămânală, selecție exactă de exerciții, volume și principii de progresie.',
      en: 'A complete workout system across all major muscle groups with structured weekly rotation, exact exercise programming, and progression rules.',
    },
    forWhoTitle: { ro: 'Cui i se potrivește', en: 'Built For' },
    forWho: [
      {
        ro: 'Celor care vor să intre în sală cu un plan clar — știind exact ce grupă, exerciții și volum urmează.',
        en: 'Lifters tired of improvising workouts who want a complete, pre-built training week.',
      },
      {
        ro: 'Celor care urmăresc dezvoltare proporțională pe partea superioară și picioare puternice, fără grupe neglijate.',
        en: 'Anyone targeting balanced upper-body hypertrophy and strong legs with zero skipped muscle groups.',
      },
      {
        ro: 'Începătorilor și intermediarilor care vor tehnică curată și recuperare organizată pentru progres continuu.',
        en: 'Beginners and intermediates prioritizing strict execution, controlled volume, and proper recovery.',
      },
    ],
    outcomesTitle: { ro: 'Ce primești concret', en: 'What You Get' },
    outcomes: [
      {
        ro: 'Structură săptămânală gata configurată cu zile clare de antrenament și recuperare.',
        en: 'A complete weekly schedule balancing focused training days and dedicated rest.',
      },
      {
        ro: 'Exerciții selectate pe unghiuri complementare pentru fiecare grupă majoră, cu serii și repetări exacte.',
        en: 'Exact exercise order, set/rep targets, and multi-angle selection for every major muscle group.',
      },
      {
        ro: 'Reguli de execuție pe fiecare sesiune și criterii clare ca să știi când e momentul să urci greutatea.',
        en: 'Form rules on every workout page plus clear progression triggers so you never stall blindly.',
      },
    ],
    modulesTitle: { ro: 'Secțiunile programului', en: 'Program Modules' },
    modules: [
      {
        number: '01',
        title: { ro: 'Planificarea Săptămânală', en: 'Weekly Training Rotation' },
        summary: {
          ro: 'Împărțirea optimă între zilele de împins, tras, picioare și zilele dedicate refacerii.',
          en: 'How weekly sessions and rest days are sequenced to maximize strength and recovery.',
        },
      },
      {
        number: '02',
        title: { ro: 'Antrenamentul de Piept', en: 'Chest Development' },
        summary: {
          ro: 'Combinație de exerciții de bază și izolare pentru forță la împins și dezvoltare completă.',
          en: 'Compound pressing and targeted isolation angles with exact intensity schemes and form cues.',
        },
      },
      {
        number: '03',
        title: { ro: 'Antrenamentul de Spate', en: 'Back Strength & Density' },
        summary: {
          ro: 'Mișcări alese din mai multe unghiuri pentru lățime, grosime și control postural fără balans.',
          en: 'Multi-angle pulling movements built for width, thickness, and strict back engagement.',
        },
      },
      {
        number: '04',
        title: { ro: 'Brațe (Biceps & Triceps)', en: 'Biceps & Triceps' },
        summary: {
          ro: 'Volum structurat pe ambele capete ale brațului, cu accent pe control și progres măsurabil.',
          en: 'Structured arm volume focused on clean range of motion and progressive overload.',
        },
      },
      {
        number: '05',
        title: { ro: 'Dezvoltarea Umerilor', en: 'Balanced Shoulders' },
        summary: {
          ro: 'Lucru echilibrat pentru toate fasciculele deltoidului, menținând articulația sănătoasă.',
          en: 'Targeted pressing and raise variations for balanced 3D delts and shoulder longevity.',
        },
      },
      {
        number: '06',
        title: { ro: 'Sesiunea Completă de Picioare', en: 'Complete Lower Body' },
        summary: {
          ro: 'Antrenament complet pentru cvadriceps, femural, fesieri și gambe cu reguli stricte de siguranță.',
          en: 'Full lower-body programming hitting quads, hamstrings, glutes, and calves with clean pacing.',
        },
      },
      {
        number: '07',
        title: { ro: 'Regulile Progresului Real', en: 'The Blueprint for Progress' },
        summary: {
          ro: 'Monitorizarea seriilor, momentul corect de încărcare, alimentația și importanța somnului.',
          en: 'Lift logging, load progression criteria, fueling, and recovery management.',
        },
      },
    ],
  },

  'bench-program': {
    key: 'bench-program',
    slug: PROGRAM_SLUGS.BENCH_PROGRAM,
    id: PROGRAM_UUIDS.BENCH_PROGRAM,
    categoryLabel: { ro: 'Forță & Tehnică', en: 'Bench Strength Protocol' },
    title: { ro: 'Bench Program — By Vlad Tren', en: 'Bench Program — By Vlad Tren' },
    summary: {
      ro: 'Sistem dedicat creșterii forței la împins la piept: mecanică corectă pe bancă, antrenament structurat și metodă matematică de progresie.',
      en: 'A specialized system to raise your bench press through tighter bar setup, structured programming, accessory balance, and smart recovery.',
    },
    forWhoTitle: { ro: 'Cui i se potrivește', en: 'Built For' },
    forWho: [
      {
        ro: 'Celor care s-au plafonat la împins la piept și forțează recorduri haotice fără un plan clar.',
        en: 'Lifters stuck at a bench plateau tired of testing random max-outs without real progress.',
      },
      {
        ro: 'Celor care își pierd stabilitatea pe bancă sau simt disconfort în umeri din cauza setup-ului greșit.',
        en: 'Anyone feeling unstable off the chest or dealing with shoulder strain from loose setup mechanics.',
      },
      {
        ro: 'Sportivilor care vor reguli exacte pentru când urcă greutatea pe bară și cum gestionează zilele grele.',
        en: 'Lifters wanting clear programming math so every session moves their bench number forward safely.',
      },
    ],
    outcomesTitle: { ro: 'Ce primești concret', en: 'What You Get' },
    outcomes: [
      {
        ro: 'Checklist biomecanic complet pe bancă: ancorare, stabilizarea spatelui, priză și traiectorie controlată.',
        en: 'Step-by-step bench mechanics: lower-body drive, upper-back stability, grip, and controlled bar path.',
      },
      {
        ro: 'Sesiune dedicată de bench + exerciții accesorii alese special ca să îți susțină împinsul.',
        en: 'Dedicated main-lift protocol paired with accessory work targeting lockout and chest drive.',
      },
      {
        ro: 'Metodă clară de dublă progresie pas-cu-pas + protocol exact pentru momentele când apare stagnarea.',
        en: 'Structured progression model with exact stall-breaking rules and a daily recovery checklist.',
      },
    ],
    modulesTitle: { ro: 'Ce conține ghidul', en: 'Protocol Sections' },
    modules: [
      {
        number: '01',
        title: { ro: 'Pilonii Forței la Împins', en: 'Foundations of a Stronger Bench' },
        summary: {
          ro: 'De ce disciplina formei și urmărirea antrenamentelor bat ridicatul din ego.',
          en: 'Why form mastery, tracking, and smart pacing beat reckless maxing out.',
        },
      },
      {
        number: '02',
        title: { ro: 'Biomecanica & Setup-ul pe Bancă', en: 'Bench Press Technique Blueprint' },
        summary: {
          ro: 'Cum blochezi corpul pe bancă înainte să scoți bara, pentru transfer maxim de forță.',
          en: 'Anchoring feet, locking your upper back, setting grip width, and controlling the bar path.',
        },
      },
      {
        number: '03',
        title: { ro: 'Structura Antrenamentului de Bench', en: 'Your Bench Session' },
        summary: {
          ro: 'Exercițiul principal alături de mișcările secundare pentru piept superior, triceps și spate.',
          en: 'Main pressing work balanced with key upper-back, incline, and tricep accessories.',
        },
      },
      {
        number: '04',
        title: { ro: 'Metoda de Progresie Pas-cu-Pas', en: 'Double-Progression System' },
        summary: {
          ro: 'Exemplu concret de acumulare pe antrenamente ca să știi exact când adaugi kilograme pe bară.',
          en: 'Concrete session-by-session progression example showing the exact moment to add weight.',
        },
      },
      {
        number: '05',
        title: { ro: 'Protocol Anti-Plafonare', en: 'Breaking Plateaus' },
        summary: {
          ro: 'Ce ajustezi imediat la volum, somn și încărcătură dacă greutățile nu mai urcă.',
          en: 'What to adjust first when reps stall so you bounce back stronger without burnout.',
        },
      },
      {
        number: '06',
        title: { ro: 'Accesorii Suport & Checklist Recuperare', en: 'Supportive Gear & Recovery' },
        summary: {
          ro: 'Cum integrezi inteligent echipamentul de suport și cele 5 condiții zilnice pentru refacere optimă.',
          en: 'Proper role of elbow wraps alongside a 5-point sleep, food, and workload checklist.',
        },
      },
    ],
  },

  bundle: {
    key: 'bundle',
    slug: PROGRAM_SLUGS.COMPLETE_BUNDLE,
    id: PROGRAM_UUIDS.COMPLETE_BUNDLE,
    categoryLabel: { ro: 'Sistem Integral · 3 în 1', en: 'Complete 3-in-1 System' },
    title: { ro: 'Pachet Complet (3 în 1) — Food + Training + Bench', en: 'Complete Bundle (3-in-1) — Full System' },
    summary: {
      ro: 'Toate cele 3 programe oficiale într-un singur sistem coerent (Alimentație + Antrenament Complet + Specializare Bench), cu economie automată de pachet.',
      en: 'All 3 official systems combined (Nutrition + Full Training Split + Bench Specialization) with automatic bundle savings.',
    },
    forWhoTitle: { ro: 'Cui i se potrivește', en: 'Built For' },
    forWho: [
      {
        ro: 'Celor care vor să alinieze nutriția, structura săptămânală de sală și forța la piept fără ghiduri contradictorii.',
        en: 'Lifters wanting daily nutrition, weekly workouts, and pressing strength synchronized in one system.',
      },
      {
        ro: 'Începătorilor care vor direcție clară din prima săptămână, atât în bucătărie, cât și la sală.',
        en: 'Beginners building proper habits from week one in both the kitchen and the gym.',
      },
      {
        ro: 'Sportivilor care vor rezultate vizibile și progres constant pe bară, la cel mai avantajos preț.',
        en: 'Athletes chasing both physique transformation and heavier lifts while saving 27%.',
      },
    ],
    outcomesTitle: { ro: 'Cum se completează', en: 'How All 3 Work Together' },
    outcomes: [
      {
        ro: 'Food Plan îți susține recuperarea și compoziția corporală indiferent dacă ești pe masă musculară sau definire.',
        en: 'Food Plan fuels recovery and body composition whether your priority is gaining size or leaning out.',
      },
      {
        ro: 'Training Program îți organizează complet întreaga săptămână de antrenament pe toate grupele musculare.',
        en: 'Training Program maps your entire gym week across every major muscle group with clear progression.',
      },
      {
        ro: 'Bench Program rafinează biomecanica și progresia la împins ca să deblochezi greutăți noi constant.',
        en: 'Bench Program dials in pressing mechanics and structured progression to keep PRs moving.',
      },
    ],
    modulesTitle: { ro: 'Include toate cele 3 programe', en: 'Includes All 3 Official Guides' },
    modules: [
      {
        number: '01',
        title: { ro: 'Food Plan', en: 'Food Plan' },
        summary: {
          ro: 'Sistem complet de nutriție, macro-nutrienți, meniuri de masă/slăbire, buget și ghid de suplimente.',
          en: 'Complete nutrition blueprint, meal structure, bulk & fat-loss sample plans, budget prep & supplements.',
        },
      },
      {
        number: '02',
        title: { ro: 'Training Program', en: 'Training Program' },
        summary: {
          ro: 'Împărțire completă pe zile și grupe musculare (Piept, Spate, Brațe, Umeri, Picioare) + reguli de progres.',
          en: 'Full workout rotation across Chest, Back, Arms, Shoulders, and Legs with set/rep targets & form rules.',
        },
      },
      {
        number: '03',
        title: { ro: 'Bench Program', en: 'Bench Program' },
        summary: {
          ro: 'Tehnică de setup pe bancă, structură dedicată de antrenament, metodă de dublă progresie și protocol anti-stagnare.',
          en: 'Bench biomechanics, dedicated strength session, step-by-step progression framework & plateau protocol.',
        },
      },
    ],
  },
};

export function resolveProgramDetailForProduct(
  product?: Partial<Product> | null
): ProgramRichDetail | null {
  if (!product) return null;
  const hay = `${product.id || ''} ${product.slug || ''}`.toLowerCase();
  if (
    hay.includes(PROGRAM_UUIDS.COMPLETE_BUNDLE) ||
    hay.includes(PROGRAM_SLUGS.COMPLETE_BUNDLE) ||
    hay.includes('pachet') ||
    hay.includes('bundle')
  ) {
    return PROGRAM_RICH_DETAILS.bundle;
  }
  if (hay.includes(PROGRAM_UUIDS.FOOD_PLAN) || hay.includes(PROGRAM_SLUGS.FOOD_PLAN) || hay.includes('food-plan')) {
    return PROGRAM_RICH_DETAILS['food-plan'];
  }
  if (hay.includes(PROGRAM_UUIDS.TRAINING_PROGRAM) || hay.includes(PROGRAM_SLUGS.TRAINING_PROGRAM) || hay.includes('training-program')) {
    return PROGRAM_RICH_DETAILS['training-program'];
  }
  if (hay.includes(PROGRAM_UUIDS.BENCH_PROGRAM) || hay.includes(PROGRAM_SLUGS.BENCH_PROGRAM) || hay.includes('bench-program')) {
    return PROGRAM_RICH_DETAILS['bench-program'];
  }
  return null;
}
