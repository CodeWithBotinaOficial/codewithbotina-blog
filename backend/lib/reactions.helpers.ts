import { supabase } from "./supabase.ts";
import { DatabaseError } from "../utils/errors.ts";

type ReactionTarget = {
  postId: string;
  translationGroupId: string;
};

async function resolveReactionTarget(postId: string): Promise<ReactionTarget> {
  const { data, error } = await supabase
    .from("post_translations")
    .select("translation_group_id")
    .eq("post_id", postId)
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    throw new DatabaseError("Failed to resolve post translation group");
  }

  return {
    postId,
    translationGroupId: data?.translation_group_id ?? postId,
  };
}

export async function getReactionCounts(postId: string) {
  const target = await resolveReactionTarget(postId);
  const { data, error } = await supabase
    .from("post_reactions")
    .select("reaction_type")
    .eq("translation_group_id", target.translationGroupId);

  if (error) {
    console.error("Supabase error:", error);
    throw new DatabaseError("Failed to fetch reactions");
  }

  const likes =
    (data ?? []).filter((reaction) => reaction.reaction_type === "like").length;
  const dislikes =
    (data ?? []).filter((reaction) => reaction.reaction_type === "dislike")
      .length;

  return {
    likes,
    dislikes,
    total: likes + dislikes,
    translationGroupId: target.translationGroupId,
  };
}

export async function getUserReaction(postId: string, userId: string) {
  const target = await resolveReactionTarget(postId);
  const { data, error } = await supabase
    .from("post_reactions")
    .select("reaction_type")
    .eq("translation_group_id", target.translationGroupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    throw new DatabaseError("Failed to fetch user reaction");
  }

  return data?.reaction_type ?? null;
}

export async function toggleReaction(
  postId: string,
  userId: string,
  reactionType: "like" | "dislike",
) {
  const target = await resolveReactionTarget(postId);
  const { data: existing, error } = await supabase
    .from("post_reactions")
    .select("id, reaction_type")
    .eq("translation_group_id", target.translationGroupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    throw new DatabaseError("Failed to fetch reaction");
  }

  let nextReaction: "like" | "dislike" | null = reactionType;

  if (existing?.reaction_type === reactionType) {
    const { error: deleteError } = await supabase
      .from("post_reactions")
      .delete()
      .eq("id", existing.id);
    if (deleteError) {
      console.error("Supabase error:", deleteError);
      throw new DatabaseError("Failed to remove reaction");
    }
    nextReaction = null;
  } else if (existing) {
    const { error: updateError } = await supabase
      .from("post_reactions")
      .update({ reaction_type: reactionType })
      .eq("id", existing.id);
    if (updateError) {
      console.error("Supabase error:", updateError);
      throw new DatabaseError("Failed to update reaction");
    }
  } else {
    const { error: insertError } = await supabase
      .from("post_reactions")
      .insert([{
        post_id: target.postId,
        translation_group_id: target.translationGroupId,
        user_id: userId,
        reaction_type: reactionType,
      }]);
    if (insertError) {
      console.error("Supabase error:", insertError);
      throw new DatabaseError("Failed to add reaction");
    }
  }

  const counts = await getReactionCounts(target.postId);
  return { reaction: nextReaction, counts };
}
