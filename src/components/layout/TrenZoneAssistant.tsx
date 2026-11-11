"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, MessageSquare
} from "lucide-react";
import { usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";

interface FaqPoint {
  title?: string;
  text: string;
}

interface FaqItem {
  q: string;
  points: FaqPoint[];
}

export function TrenZoneAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const isRo = locale === "ro";

  const [step, setStep] = useState<"welcome" | "faq_answer">("welcome");
  const [activeFaq, setActiveFaq] = useState<FaqItem | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const faqs: FaqItem[] = isRo
    ? [
        {
          q: "Ce să aleg: X5 sau X10?",
          points: [
            {
              title: "TrenZone X5 (Flexibile & Confortabile)",
              text: "Ideale pentru volum, umeri și hipertrofie. Le poți purta pe tot parcursul antrenamentului pentru protecție continuă a tendoanelor."
            },
            {
              title: "TrenZone X10 (Rigiditate Extremă)",
              text: "Rigiditate maximă de competiție. Blochează cotul ca o armură pe seriile tale cele mai grele și la PR-uri."
            }
          ]
        },
        {
          q: "La ce exerciții mă ajută și cum funcționează?",
          points: [
            {
              title: "Exerciții Cheie",
              text: "Bench Press (bară/gantere), Împins umeri (Overhead Press), Flotări la paralele cu greutate (Dips) și extensii grele de triceps."
            },
            {
              title: "Stabilitate Fără Tremurat",
              text: "Blochează mecanic cotul în punctul cel mai de jos unde presiunea și riscul de accidentare sunt maxime."
            },
            {
              title: "Protecție Tendoane & Recul",
              text: "Preia forțele de forfecare de pe tendonul tricepsului și îți oferă recul elastic ca să spargi punctul mort al împinsului."
            }
          ]
        },
        {
          q: "Cum se compară cu alte benzi din comerț?",
          points: [
            {
              title: "Densitate Militar de 1.2 kg",
              text: "Nu se lărgesc și nu devin moi după câteva săptămâni, spre deosebire de benzile concurente din bumbac subțire."
            },
            {
              title: "Aderență Anti-Alunecare",
              text: "Materialul interior se blochează pe braț și nu alunecă chiar și când transpiri abundent."
            }
          ]
        },
        {
          q: "Mă ajută dacă am dureri de cot?",
          points: [
            {
              title: "Da, direct",
              text: "Compresia strânsă ține cotul cald și stabil, elimină jocul articular și preia șocul greutății direct de pe tendoane."
            }
          ]
        },
        {
          q: "Sunt bune și dacă nu sunt avansat?",
          points: [
            {
              title: "Potrivite pentru orice nivel",
              text: "Nu trebuie să fii sportiv de performanță. X5 este excelent pentru prevenție la sală, iar X10 îți oferă siguranță totală când împingi greutăți mari."
            }
          ]
        }
      ]
    : [
        {
          q: "Which should I choose: X5 or X10?",
          points: [
            {
              title: "TrenZone X5 (Flexible & Versatile)",
              text: "Great for volume, hypertrophy, and continuous joint support throughout your entire workout."
            },
            {
              title: "TrenZone X10 (Maximum Stiffness)",
              text: "Competition-grade lock. Turns your elbows into armor for heavy top sets and personal records."
            }
          ]
        },
        {
          q: "What exercises do they help with and how?",
          points: [
            {
              title: "Key Movements",
              text: "Bench Press (barbell/dumbbells), Overhead Shoulder Press, Weighted Dips, and heavy triceps extensions."
            },
            {
              title: "Zero Joint Wobble",
              text: "Mechanically locks your elbow on track at the bottom of the rep where strain is highest."
            },
            {
              title: "Tendon Shield & Rebound",
              text: "Takes crushing strain off the triceps tendon and stores elastic recoil to power through sticking points."
            }
          ]
        },
        {
          q: "How do they compare to generic market wraps?",
          points: [
            {
              title: "Heavy 1.2 kg Structural Density",
              text: "Will never stretch out or become dead after weeks of use, unlike flimsy cotton wraps."
            },
            {
              title: "Anti-Slip Lock",
              text: "Grips securely to skin or clothing without slipping during sweaty sets."
            }
          ]
        },
        {
          q: "Do they help with elbow pain?",
          points: [
            {
              title: "Yes, directly",
              text: "Tight therapeutic compression keeps the joint warm and transfers brutal shearing loads away from irritated tendons."
            }
          ]
        },
        {
          q: "Are they good if I'm not an advanced lifter?",
          points: [
            {
              title: "Built for all lifters",
              text: "You don't need to be an elite athlete. X5 prevents joint wear and tear, while X10 gives bulletproof security on heavy lifts."
            }
          ]
        }
      ];

  const handleFaqClick = (faq: FaqItem) => {
    setActiveFaq(faq);
    setStep("faq_answer");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const handleBack = () => {
    setStep("welcome");
    setActiveFaq(null);
  };

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep("welcome");
        setActiveFaq(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const [showTrigger, setShowTrigger] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    // Show after a short delay
    const timer = setTimeout(() => setShowTrigger(true), 1500);

    // Hide when hero is fully visible (scroll < 80vh), show when scrolled past it
    const handleScroll = () => {
      const vh = window.innerHeight;
      if (window.scrollY > vh * 0.8) {
        setPastHero(true);
      } else if (window.scrollY < vh * 0.7) {
        setPastHero(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Hide when footer is visible
    const footer = document.querySelector('footer');
    let observer: IntersectionObserver | null = null;
    if (footer) {
      observer = new IntersectionObserver(
        ([entry]) => setFooterVisible(entry.isIntersecting),
        { threshold: 0.05 }
      );
      observer.observe(footer);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      observer?.disconnect();
    };
  }, []);

  const isBundlePage = pathname?.includes("bundle");

  if (isBundlePage) return null;
  
  return (
    <>
      <AnimatePresence>
        {showTrigger && pastHero && !footerVisible && !isOpen && !isBundlePage && (
          <motion.button
            key="chat-trigger"
            initial={{ opacity: 0, scale: 0.6, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 22, mass: 0.8 }}
            style={{ willChange: "transform, opacity" }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 sm:bottom-10 right-4 sm:right-6 z-40 group flex items-center justify-center"
            aria-label={isRo ? "Deschide Întrebările Frecvente" : "Open FAQs"}
          >
            {/* Efectul de pulsație subtilă (sonar) - CSS nativ pentru 0 lag */}
            <div className="absolute w-10 h-10 rounded-full bg-[#e32f8c] opacity-30 animate-ping [animation-duration:3s] group-hover:opacity-0 transition-opacity" />
            
            {/* Butonul principal */}
            <div className="relative w-14 h-14 bg-[#e32f8c] rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(227, 47, 140,0.5)] border border-white/20 group-hover:scale-110 transition-all duration-300">
              <MessageSquare className="w-6 h-6 text-black" />
            </div>
            
            {/* Tooltip */}
            <div className="absolute -top-12 right-0 bg-black/90 backdrop-blur-md text-[10px] text-[#e32f8c] font-black uppercase tracking-widest px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-[#e32f8c]/30 pointer-events-none whitespace-nowrap shadow-xl">
              {isRo ? "ÎNTREBĂRI FRECVENTE" : "QUESTIONS?"}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-2 sm:bottom-6 right-0 sm:right-6 z-[70] w-full sm:w-[440px] max-h-[90vh] flex flex-col bg-zinc-950 text-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10 mx-auto sm:mx-0 overflow-hidden"
            >
              {/* Drag Handle for Mobile UX */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/10 rounded-full sm:hidden" />

              <button 
                onClick={() => setIsOpen(false)} 
                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-full transition-all z-[80] shadow-2xl border border-white/10 active:scale-90"
                aria-label={isRo ? "Închide asistentul" : "Close assistant"}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative flex-1 p-6 sm:p-8 pt-12 sm:pt-14 overflow-y-auto" ref={scrollRef}>

                      {step === "welcome" && (
                        <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-6">
                          <div className="w-16 h-16 bg-[#e32f8c]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#e32f8c]/20">
                            <MessageSquare className="w-8 h-8 text-[#e32f8c]" />
                          </div>
                          
                          <div className="space-y-2">
                            <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">
                              {isRo ? "ÎNTREBĂRI FRECVENTE" : "QUESTIONS?"}
                            </h2>
                            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
                              {isRo
                                ? "Găsește rapid răspunsul sau scrie-ne direct pe WhatsApp pentru orice întrebare."
                                : "Find quick answers below or message us directly on WhatsApp."}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3 text-left">
                            {faqs.map((faq, idx) => (
                              <button 
                                key={idx}
                                type="button"
                                onClick={() => handleFaqClick(faq)} 
                                className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all group cursor-pointer touch-manipulation select-none"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                              >
                                <span className="font-bold text-[13px] text-zinc-200">{faq.q}</span>
                                <ChevronRight className="w-4 h-4 text-[#e32f8c] flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                          
                          <div className="pt-2">
                            <a href="https://wa.me/40730214738" target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-black transition-all">
                              <MessageSquare className="w-4 h-4" /> {isRo ? "VREAU SĂ PUN O ÎNTREBARE PE WHATSAPP" : "ASK A QUESTION ON WHATSAPP"}
                            </a>
                          </div>
                        </motion.div>
                      )}

                      {step === "faq_answer" && activeFaq && (
                        <motion.div key="faq_answer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div className="space-y-1.5 text-left">
                            <span className="text-[10px] font-black text-[#e32f8c] uppercase tracking-[0.25em]">
                              {isRo ? "RĂSPUNS RAPID" : "QUICK ANSWER"}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight font-[family-name:var(--font-oswald)]">
                              {activeFaq.q}
                            </h2>
                          </div>

                          {/* Visual, clean bullet cards */}
                          <div className="space-y-2.5 text-left">
                            {activeFaq.points.map((pt, i) => (
                              <div
                                key={i}
                                className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3"
                              >
                                <span className="w-2 h-2 rounded-full bg-[#e32f8c] shrink-0 mt-1.5 shadow-[0_0_8px_rgba(227,47,140,0.8)]" />
                                <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                                  {pt.title && (
                                    <strong className="text-white font-black uppercase text-xs tracking-wider block mb-0.5 font-[family-name:var(--font-oswald)]">
                                      {pt.title}
                                    </strong>
                                  )}
                                  <span>{pt.text}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-5 gap-2 pt-2">
                            <button 
                              onClick={handleBack} 
                              className="col-span-1 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all border border-white/5 cursor-pointer py-3.5"
                              aria-label="Înapoi"
                            >
                              <ChevronRight className="w-4 h-4 text-zinc-400 rotate-180" />
                            </button>
                            <a 
                              href="/shop" 
                              onClick={() => setIsOpen(false)} 
                              className="col-span-4 bg-[#e32f8c] text-black py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:bg-[#c41a72] transition-all shadow-[0_0_20px_rgba(227,47,140,0.3)]"
                            >
                              {isRo ? "VEZI MAGAZINUL →" : "VISIT SHOP →"}
                            </a>
                          </div>
                        </motion.div>
                      )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
