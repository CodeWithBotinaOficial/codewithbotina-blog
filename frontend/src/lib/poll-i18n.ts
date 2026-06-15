import { t, type SupportedLanguage } from "./i18n";

type PollType = "free_text" | "single_choice" | "multiple_choice";
type PollStatus = "open" | "closed";

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
