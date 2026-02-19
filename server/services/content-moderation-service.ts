import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, sql as dsql } from "drizzle-orm";

const ADULT_TERMS = [
  "porn", "xxx", "nsfw", "onlyfans", "sex video", "nude", "nudes", "naked",
  "hentai", "erotic", "fetish", "camgirl", "camboy", "escort", "hooker",
  "prostitut", "stripper", "booty call", "milf", "dilf", "orgasm", "orgy",
  "threesome", "bdsm", "dominatrix", "submissive kink", "anal", "blowjob",
  "handjob", "deepthroat", "cum shot", "creampie", "gangbang", "bukakke",
  "sext", "dick pic", "pussy", "cock", "tits", "boobs", "ass pic",
  "slutty", "whore", "slut", "pornhub", "xvideos", "xhamster", "redtube",
  "brazzers", "chaturbate", "livejasmin", "bangbros", "realitykings",
  "fap", "masturbat", "vibrator", "dildo", "fleshlight", "lingerie model",
  "sugardaddy", "sugarbaby", "sugar daddy", "sugar baby", "sugar mommy",
  "r34", "rule34", "lewd", "ahegao"
];

const GAMBLING_TERMS = [
  "online casino", "casino bonus", "free spins", "slot machine", "poker online",
  "sports betting", "bet365", "betway", "1xbet", "bovada", "draftkings",
  "fanduel", "pinnacle", "unibet", "888casino", "pokerstars", "partypoker",
  "blackjack online", "roulette online", "baccarat online", "craps online",
  "gambling site", "place your bet", "betting odds", "win big money",
  "jackpot", "mega win", "guaranteed win", "sure bet", "fixed match",
  "match fixing", "rigged game", "casino deposit", "no deposit bonus",
  "wagering requirement", "cashout bonus", "crypto casino", "crash gambling",
  "csgo gambling", "skin gambling", "loot box", "gacha"
];

const NARCOTICS_TERMS = [
  "buy weed", "buy cocaine", "buy heroin", "buy meth", "buy lsd",
  "buy mdma", "buy ecstasy", "buy fentanyl", "buy xanax", "buy adderall",
  "buy oxycontin", "buy oxycodone", "buy hydrocodone", "buy percocet",
  "drug dealer", "drug supplier", "dark web drugs", "darknet market",
  "silk road", "mushroom dealer", "shroom dealer", "acid dealer",
  "crack cocaine", "crystal meth", "methamphetamine", "amphetamine",
  "marijuana dealer", "cannabis dealer", "thc cartridge",
  "buy steroids", "anabolic steroids", "prescription drugs online",
  "pharmacy no prescription", "no rx needed", "ketamine supplier",
  "dmt supplier", "pcp supplier", "ghb supplier", "rohypnol",
  "date rape drug", "roofie"
];

const SPAM_PATTERNS = [
  /(?:https?:\/\/[^\s]+){3,}/i,
  /(?:earn|make|win)\s+\$?\d+[\s,]*(?:per|a|each)\s*(?:day|hour|week|month)/i,
  /(?:click|visit)\s+(?:here|this|my)\s+(?:link|site|page|url)/i,
  /(?:free|cheap)\s+(?:iphone|ipad|macbook|laptop|samsung|gift card)/i,
  /(?:100%|guaranteed)\s+(?:free|money|income|profit|return)/i,
  /(?:work|earn)\s+(?:from|at)\s+home\s+\$?\d+/i,
  /(?:limited|exclusive)\s+(?:time|offer).*(?:act|hurry|now|fast)/i,
  /(?:nigerian|prince|inheritance|lottery)\s+(?:email|money|fund|winner)/i,
  /(?:crypto|bitcoin|ethereum)\s+(?:investment|opportunity|guaranteed|doubl)/i,
  /(?:telegram|whatsapp|signal)\s+(?:me|us|group)\s+(?:for|to)\s+(?:buy|get|earn)/i,
  /(?:dm|message)\s+(?:me|us)\s+(?:for|to)\s+(?:buy|order|get)/i,
  /(?:weight\s+loss|lose\s+weight)\s+(?:fast|quick|pill|supplement)/i,
  /(?:enlarg|grow|bigger)\s+(?:your|penis|breast|muscle)/i,
  /(?:v[1i]agra|c[1i]al[1i]s|kamagra|levitra)/i,
  /(.)\1{5,}/i,
  /[A-Z\s]{30,}/,
  /(?:subscribe|follow|like)\s+(?:my|our)\s+(?:channel|page|account)/i,
  /check\s+(?:my|out\s+my)\s+(?:profile|bio|link)/i,
];

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

interface ModerationResult {
  allowed: boolean;
  reasons: string[];
  isSpam: boolean;
  severity: "clean" | "low" | "medium" | "high";
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5\$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[8]/g, "b")
    .replace(/\s+/g, " ")
    .trim();
}

function checkTerms(text: string, terms: string[]): string[] {
  const normalized = normalizeText(text);
  const found: string[] = [];
  for (const term of terms) {
    if (normalized.includes(term.toLowerCase())) {
      found.push(term);
    }
  }
  return found;
}

function checkSpamPatterns(text: string): boolean {
  let matches = 0;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      matches++;
      if (matches >= 2) return true;
    }
  }
  const urls = text.match(URL_PATTERN);
  if (urls && urls.length >= 3) return true;

  return false;
}

function hasExcessiveRepetition(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  if (words.length < 5) return false;
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(freq));
  return maxFreq > words.length * 0.5 && maxFreq > 3;
}

export function moderateContent(text: string, title?: string): ModerationResult {
  const fullText = title ? `${title} ${text}` : text;
  const reasons: string[] = [];
  let severity: ModerationResult["severity"] = "clean";
  let isSpam = false;

  const adultMatches = checkTerms(fullText, ADULT_TERMS);
  if (adultMatches.length > 0) {
    reasons.push("Contains prohibited adult/explicit content");
    severity = "high";
  }

  const gamblingMatches = checkTerms(fullText, GAMBLING_TERMS);
  if (gamblingMatches.length > 0) {
    reasons.push("Contains prohibited gambling-related content");
    severity = severity === "high" ? "high" : "medium";
  }

  const narcoticsMatches = checkTerms(fullText, NARCOTICS_TERMS);
  if (narcoticsMatches.length > 0) {
    reasons.push("Contains prohibited narcotics/drug-related content");
    severity = "high";
  }

  if (checkSpamPatterns(fullText)) {
    reasons.push("Content detected as spam");
    isSpam = true;
    severity = severity === "clean" ? "medium" : severity;
  }

  if (hasExcessiveRepetition(fullText)) {
    reasons.push("Excessive word repetition detected");
    isSpam = true;
    severity = severity === "clean" ? "low" : severity;
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    isSpam,
    severity,
  };
}

export function sanitizeLinks(html: string): string {
  return html.replace(
    /<a\s+([^>]*?)href\s*=\s*["']?(https?:\/\/[^"'\s>]+)["']?([^>]*)>/gi,
    (match, before, url, after) => {
      const cleanBefore = before.replace(/rel\s*=\s*["'][^"']*["']/gi, "").trim();
      const cleanAfter = after.replace(/rel\s*=\s*["'][^"']*["']/gi, "").trim();
      return `<a ${cleanBefore} href="${url}" rel="nofollow noopener noreferrer" target="_blank" ${cleanAfter}>`;
    }
  );
}

const SPAM_THRESHOLD = 3;

export async function recordViolation(userId: string, isSpam: boolean): Promise<boolean> {
  try {
    const increment = isSpam ? 2 : 1;
    const [updated] = await db.update(users)
      .set({ spamViolations: dsql`${users.spamViolations} + ${increment}` })
      .where(eq(users.id, userId))
      .returning({ spamViolations: users.spamViolations });

    if (updated && updated.spamViolations >= SPAM_THRESHOLD) {
      await storage.markUserAsSpammer(userId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function isUserSpammer(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    return user?.isSpammer === true;
  } catch {
    return false;
  }
}
