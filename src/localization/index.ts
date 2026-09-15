import { koreanTranslations } from "./ko-KR";

export type PluginLanguage = "en-GB" | "ko-KR";

const LANGUAGE_KEY = "fireworks.language";
let cachedLanguage: PluginLanguage | undefined;

export function getLanguage(): PluginLanguage
{
    if (cachedLanguage) return cachedLanguage;
    if (typeof context !== "undefined" && context.sharedStorage)
    {
        const stored = context.sharedStorage.get<string>(LANGUAGE_KEY);
        if (stored === "ko-KR") return cachedLanguage = "ko-KR";
    }
    return cachedLanguage = "en-GB";
}

export function setLanguage(language: PluginLanguage): void
{
    cachedLanguage = language;
    if (typeof context !== "undefined" && context.sharedStorage)
    {
        context.sharedStorage.set(LANGUAGE_KEY, language);
    }
}

export function isKorean(): boolean
{
    return getLanguage() === "ko-KR";
}

export function t(source: string): string
{
    return isKorean() ? koreanTranslations[source] ?? source : source;
}

export function localizedMetric(english: number, korean: number): number
{
    return isKorean() ? korean : english;
}
