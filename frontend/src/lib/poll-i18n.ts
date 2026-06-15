import { t, type SupportedLanguage } from "./i18n";

type PollType = "free_text" | "single_choice" | "multiple_choice";
type PollStatus = "open" | "closed";
type PollNamespace = "post" | "admin";

function normalizeLanguage(language?: string): SupportedLanguage {
  return language === "en" || language === "es" || language === "pt-br" ? language : "en";
}

/**
 * Translation helper for poll-owned content language. Poll content is usually
 * returned by the API already localized, but this keeps poll-language lookup
 * explicit when a component needs poll-language strings.
 */
export function usePollContentTranslation(pollLanguage?: string) {
  const language = normalizeLanguage(pollLanguage);
  return (
    key: string,
    namespace: PollNamespace = "post",
    variables: Record<string, string | number> = {},
  ) => t(language, key, namespace, variables);
}

export function getPollContentTranslation(
  pollLanguage: string | undefined,
  key: string,
  namespace: PollNamespace = "post",
  variables: Record<string, string | number> = {},
): string {
  return t(normalizeLanguage(pollLanguage), key, namespace, variables);
}

export function getPollTypeName(language: SupportedLanguage, type: PollType): string {
  const typeMap: Record<PollType, string> = {
    free_text: "polls.type.freeText",
    single_choice: "polls.type.singleChoice",
    multiple_choice: "polls.type.multipleChoice",
  };
  return t(language, typeMap[type], "post");
}

export function getAdminPollTypeName(language: SupportedLanguage, type: PollType): string {
  const typeMap: Record<PollType, string> = {
    free_text: "polls.createModal.types.freeText",
    single_choice: "polls.createModal.types.singleChoice",
    multiple_choice: "polls.createModal.types.multipleChoice",
  };
  return t(language, typeMap[type], "admin");
}

export function getPollStatusName(language: SupportedLanguage, status: PollStatus, namespace: "post" | "admin" = "post"): string {
  return t(language, `polls.status.${status}`, namespace);
}

export function getPollVoteCount(language: SupportedLanguage, count: number, namespace: "post" | "admin" = "post"): string {
  const key = namespace === "post" ? "polls.meta.votes" : "polls.votesCount";
  return t(language, key, namespace, { count });
}
