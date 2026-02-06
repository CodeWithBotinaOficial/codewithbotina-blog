import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";
import { ContactFormData, ContactRecord } from "../types/api.types.ts";
import { DatabaseError } from "../utils/errors.ts";

export class ContactRepository {
  private db: SupabaseClient;

  constructor(dbClient: SupabaseClient = supabase) {
    this.db = dbClient;
  }

  async insertContact(data: ContactFormData): Promise<ContactRecord> {
    const { data: insertedData, error } = await this.db
      .from("contacts")
      .insert([
        {
          nombre: data.nombre,
          correo: data.correo,
          mensaje: data.mensaje,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to save contact information");
    }

    return insertedData as ContactRecord;
  }
}
