import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { ContactFormData, ContactRecord } from "../../types/api.types.ts";

export const createMockSupabaseClient = (shouldFail = false) => ({
  from: (_table: string) => ({
    insert: (data: ContactFormData[]) => ({
      select: () => ({
        single: (): Promise<PostgrestSingleResponse<ContactRecord>> => {
          if (shouldFail) {
            return Promise.resolve({
              data: null,
              error: {
                message: "Database error",
                details: "",
                hint: "",
                code: "500",
                name: "PostgrestError",
              },
              count: null,
              status: 500,
              statusText: "Internal Server Error",
            });
          }
          return Promise.resolve({
            data: {
              id: "mock-uuid-123",
              created_at: new Date().toISOString(),
              ...data[0],
            },
            error: null,
            count: 1,
            status: 201,
            statusText: "Created",
          });
        },
      }),
    }),
  }),
});
