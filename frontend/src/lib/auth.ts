import { supabase } from "./supabase";

let listenerInitialized = false;

export function initAuthListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      localStorage.setItem("user", JSON.stringify(session.user));
    }

    if (event === "SIGNED_OUT") {
      localStorage.removeItem("user");
    }
  });
}

export async function getCurrentUser() {
  const cached = localStorage.getItem("user");
  if (cached) return JSON.parse(cached);

  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    localStorage.setItem("user", JSON.stringify(data.session.user));
    return data.session.user;
  }

  return null;
}

export async function signOut() {
  await supabase.auth.signOut();
  localStorage.removeItem("user");
  window.location.assign("/");
}
