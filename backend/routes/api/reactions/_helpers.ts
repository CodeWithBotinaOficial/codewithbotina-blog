import { supabase } from "../../../lib/supabase.ts";
import { DatabaseError } from "../../../utils/errors.ts";

export async function getReactionCounts(postId: string) {
  const { data, error } = await supabase
    .from("post_reactions")
    .select("reaction_type")
    .eq("post_id", postId);

  if (error) {
    console.error("Supabase error:", error);
    throw new DatabaseError("Failed to fetch reactions");
  }

  const likes = (data ?? []).filter((reaction) => reaction.reaction_type === "like")
    .length;
  const dislikes = (data ?? []).filter((reaction) =>
    reaction.reaction_type === "dislike"
  )
    .length;

  return { likes, dislikes, total: likes + dislikes };
}

export async function getUserReaction(postId: string, userId: string) {
  const { data, error } = await supabase
    .from("post_reactions")
    .select("reaction_type")
    .eq("post_id", postId)
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
  const { data: existing, error } = await supabase
    .from("post_reactions")
    .select("id, reaction_type")
    .eq("post_id", postId)
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
      .insert([{ post_id: postId, user_id: userId, reaction_type: reactionType }]);
    if (insertError) {
      console.error("Supabase error:", insertError);
      throw new DatabaseError("Failed to add reaction");
    }
  }

  const counts = await getReactionCounts(postId);
  return { reaction: nextReaction, counts };
}
