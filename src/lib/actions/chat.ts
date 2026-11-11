"use server";

import { chatModel } from "@/lib/gemini";
import { headers } from "next/headers";
import { rateLimiters, checkRateLimit } from "@/lib/ratelimit";

// Intelligent deterministic fallback without naming specific brand competitors
function getFallbackHeavyLiftingResponse(message: string): string {
  const m = message.toLowerCase().trim();

  // Competitor comparison
  if (
    m.includes("concuren") || 
    m.includes("compar") ||
    m.includes("alte benzi") ||
    m.includes("piata") ||
    m.includes("altele")
  ) {
    return "Multe benzi din comerț sunt dintr-un bumbac subțire care după o lună se lărgește și nu mai ține deloc tensiunea. Noi am făcut TrenZone din poliester elastic ultra-dens (1.2 kg per pereche) care nu se lasă nici după sute de antrenamente grele. În plus, au material aderent pe interior ca să nu alunece când transpiri și vin în două trepte reale de forță (X5 și X10), nu o mărime universală moale.";
  }

  // Which one to choose / difference between X5 and X10
  if (
    (m.includes("ce") && m.includes("aleg")) || 
    m.includes("diferent") || 
    m.includes("recomand") ||
    m.includes("x5 sau x10") ||
    m.includes("care e mai bun")
  ) {
    return "Depinde de stilul tău de antrenament: dacă vrei confort, mobilitate bună și protecție pe serii de volum și culturism, alege X5 (+10 kg recul). Dacă vrei rigiditate extremă, blocare de fier pe coate și asistență de până la +20 kg pe seriile tale cele mai grele sau la PR-uri, ia direct X10.";
  }

  // Heavy sets / PR / X10 focus
  if (
    m.includes("x10") || 
    m.includes("grele") || 
    m.includes("pr") || 
    m.includes("maxim") || 
    m.includes("powerlifting")
  ) {
    return "Pentru forță maximă, seturi grele și PR-uri personale, TrenZone X10 este alegerea supremă. Au rigiditate 5.0/5 de competiție, 1.2 kg densitate pe pereche și oferă până la +20 kg asistență mecanică când pleci cu bara de pe piept.";
  }

  // Volume / Hypertrophy / X5 focus
  if (
    m.includes("x5") || 
    m.includes("volum") || 
    m.includes("hipertrofie") || 
    m.includes("gantere")
  ) {
    return "Pentru antrenamente de hipertrofie, culturism și serii de volum, modelul TrenZone X5 este cel mai potrivit: ai suport ferm 3.5/5, recul de +10 kg și mobilitate excelentă fără să-ți amorțească brațul.";
  }

  // Pain / Tendons / Elbow issues
  if (
    m.includes("durere") || 
    m.includes("doare") || 
    m.includes("cot") || 
    m.includes("tendon") || 
    m.includes("articulat") || 
    m.includes("tendinit")
  ) {
    return "Mulți le folosesc tocmai pentru dureri de cot sau tendon. Compresia strânsă ține cotul cald, stabilizează tendonul tricepsului și nu lasă articulația să joace sub greutate. Asta ia tot șocul de pe tendon și te lasă să împingi tare fără să pleci cu dureri din sală.";
  }

  // Exercises and benefits (not just bench press)
  if (
    m.includes("bench") || 
    m.includes("piept") || 
    m.includes("umer") ||
    m.includes("dips") ||
    m.includes("triceps") ||
    m.includes("exerciti") ||
    m.includes("ajuta") || 
    m.includes("benefic") ||
    m.includes("rebound")
  ) {
    return "Nu sunt doar pentru Bench Press! Sunt concepute pentru orice mișcare grea de împins și brațe: Bench Press (bară/gantere, orizontal/înclinat), Împins umeri / deasupra capului (Overhead Press), Flotări la paralele cu greutate (Dips) și extensii grele de triceps. Îți blochează tremuratul din coate în punctul critic, preiau presiunea de pe tendoane și oferă recul elastic ca să spargi punctul mort.";
  }

  // Beginners vs Advanced
  if (
    m.includes("incepator") || 
    m.includes("intermediar") || 
    m.includes("avansat")
  ) {
    return "Nu trebuie să fii sportiv de elită ca să le folosești. Modelul X5 este excelent pentru oricine trage la sală și vrea să evite durerile de tendoane. Modelul X10 oferă siguranță maximă și blocare ca o armură pe seriile tale grele de împins, indiferent de greutatea de pe bară.";
  }

  // Prices
  if (
    m.includes("pret") || 
    m.includes("cat costa") || 
    m.includes("lei") || 
    m.includes("bani")
  ) {
    return "TrenZone X5 este 269,99 LEI, iar TrenZone X10 de competiție este 359,99 LEI. Ambele vin în pereche completă (2 benzi) cu geantă de transport inclusă.";
  }

  // General fallback
  return "Salut! Dacă vrei să alegi între X5 (confort & hipertrofie) și X10 (suport maxim & forță brută), spune-mi cum te antrenezi sau dacă ai dureri de cot!";
}

export async function getAIChatResponse(
  message: string, 
  history: Array<{ role: 'user' | 'model', parts: [{ text: string }] }> = []
) {
  const safeMessage = String(message || "").slice(0, 1000).trim();
  if (!safeMessage) {
    return {
      success: true,
      text: getFallbackHeavyLiftingResponse(""),
    };
  }

  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || reqHeaders.get("x-real-ip") || "unknown";
    const { allowed } = await checkRateLimit(rateLimiters.contact, `ai-chat:${ip}`, "contact");
    if (!allowed) {
      return {
        success: true,
        text: getFallbackHeavyLiftingResponse(safeMessage),
      };
    }

    if (chatModel) {
      const safeHistory = Array.isArray(history)
        ? history.slice(-10).map((item) => ({
            role: (item.role === "model" ? "model" : "user") as "user" | "model",
            parts: [{ text: String(item?.parts?.[0]?.text || "").slice(0, 1000) }] as [{ text: string }],
          }))
        : [];

      const chat = chatModel.startChat({
        history: safeHistory,
      });

      const result = await chat.sendMessage(safeMessage);
      const response = await result.response;
      const text = response.text();

      if (text && text.trim().length > 0) {
        return {
          success: true,
          text: text.trim(),
        };
      }
    }

    return {
      success: true,
      text: getFallbackHeavyLiftingResponse(safeMessage),
    };
  } catch (error: any) {
    return {
      success: true,
      text: getFallbackHeavyLiftingResponse(safeMessage),
    };
  }
}
