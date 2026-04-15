import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";
import { handler } from "../../../routes/api/posts/search.ts";
import { supabase } from "../../../lib/supabase.ts";

type QueryState = {
  table: string;
  selectCols?: unknown;
  selectOptions?: { count?: string; head?: boolean };
  ilike?: Array<{ col: string; value: string }>;
  in?: Record<string, unknown[]>;
  eq?: Record<string, unknown>;
  range?: { from: number; to: number };
  order?: { col: string; ascending?: boolean };
  limit?: number;
};

function createThenableQuery(
  state: QueryState,
  responder: (s: QueryState) => unknown,
) {
  type ThenableQuery = {
    select: (
      cols: unknown,
      options?: QueryState["selectOptions"],
    ) => ThenableQuery;
    ilike: (col: string, value: string) => ThenableQuery;
    in: (col: string, values: unknown[]) => ThenableQuery;
    eq: (col: string, value: unknown) => ThenableQuery;
    gte: (col: string, value: unknown) => ThenableQuery;
    lte: (col: string, value: unknown) => ThenableQuery;
    order: (col: string, opts?: { ascending?: boolean }) => ThenableQuery;
    range: (from: number, to: number) => ThenableQuery;
    limit: (n: number) => ThenableQuery;
    then: (
      resolve: (value: unknown) => void,
      reject: (reason: unknown) => void,
    ) => void;
  };

  const builder = {} as ThenableQuery;
  const record = <K extends keyof QueryState>(k: K, v: QueryState[K]) => {
    state[k] = v;
    return builder;
  };

  builder.select = (cols: unknown, options?: QueryState["selectOptions"]) => {
    state.selectCols = cols;
    state.selectOptions = options;
    return builder;
  };
  builder.ilike = (col: string, value: string) => {
    state.ilike = state.ilike ?? [];
    state.ilike.push({ col, value });
    return builder;
  };
  builder.in = (col: string, values: unknown[]) => {
    state.in = state.in ?? {};
    state.in[col] = values;
    return builder;
  };
  builder.eq = (col: string, value: unknown) => {
    state.eq = state.eq ?? {};
    state.eq[col] = value;
    return builder;
  };
  builder.gte = (_col: string, _value: unknown) => builder;
  builder.lte = (_col: string, _value: unknown) => builder;
  builder.order = (col: string, opts?: { ascending?: boolean }) =>
    record("order", { col, ascending: opts?.ascending });
  builder.range = (from: number, to: number) => record("range", { from, to });
  builder.limit = (n: number) => record("limit", n);

  builder.then = (
    resolve: (value: unknown) => void,
    reject: (reason: unknown) => void,
  ) => {
    Promise.resolve()
      .then(() => responder(state))
      .then(resolve, reject);
  };

  return builder;
}

Deno.test("Integration: GET /api/posts/search uses sequential fallback (title -> content)", async () => {
  const responder = (s: QueryState) => {
    if (s.table === "posts" && s.selectOptions?.head) {
      const ilikeCol = s.ilike?.[0]?.col;
      if (ilikeCol === "titulo") return { count: 0, error: null };
      if (ilikeCol === "body") return { count: 2, error: null };
      return { count: 0, error: null };
    }

    if (s.table === "posts" && !s.selectOptions?.head) {
      return {
        data: [
          {
            id: "p-1",
            titulo: "Hello world",
            slug: "hello-world",
            body: "Content match",
            imagen_url: null,
            fecha: new Date().toISOString(),
            language: "en",
          },
          {
            id: "p-2",
            titulo: "Another",
            slug: "another",
            body: "Content match too",
            imagen_url: null,
            fecha: new Date().toISOString(),
            language: "en",
          },
        ],
        error: null,
      };
    }

    return { data: [], error: null, count: 0 };
  };

  const supabaseAny = supabase as unknown as {
    from: (table: string) => unknown;
  };
  stub(supabaseAny, "from", (table: string) => {
    const state: QueryState = { table };
    return createThenableQuery(state, responder);
  });

  const req = new Request(
    "http://localhost/api/posts/search?q=hooks&language=en&limit=10&offset=0",
    {
      method: "GET",
      headers: { Origin: "http://localhost:8000" },
    },
  );

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.phase, "content");
  assertEquals(body.data.total, 2);
  assertEquals(body.data.posts.length, 2);

  restore();
});

Deno.test("Integration: GET /api/posts/search rejects future dates", async () => {
  const req = new Request(
    "http://localhost/api/posts/search?from=2999-01-01&language=en",
    {
      method: "GET",
      headers: { Origin: "http://localhost:8000" },
    },
  );

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 400);
  assertEquals(body.success, false);
  assertEquals(body.error, "Future dates not allowed");
});

Deno.test("Integration: GET /api/posts/search applies AND tag filter", async () => {
  const responder = (s: QueryState) => {
    if (s.table === "post_tags") {
      // post a has both tags; post b only has t1.
      return {
        data: [
          { post_id: "post-a", tag_id: "t1" },
          { post_id: "post-a", tag_id: "t2" },
          { post_id: "post-b", tag_id: "t1" },
        ],
        error: null,
      };
    }

    if (s.table === "posts" && s.selectOptions?.head) {
      // Count after tag filter.
      const ids = s.in?.["id"] ?? [];
      return { count: ids.includes("post-a") ? 1 : 0, error: null };
    }

    if (s.table === "posts" && !s.selectOptions?.head) {
      return {
        data: [
          {
            id: "post-a",
            titulo: "Tagged",
            slug: "tagged",
            body: "Body",
            imagen_url: null,
            fecha: new Date().toISOString(),
            language: "en",
          },
        ],
        error: null,
      };
    }

    return { data: [], error: null, count: 0 };
  };

  const supabaseAny = supabase as unknown as {
    from: (table: string) => unknown;
  };
  stub(supabaseAny, "from", (table: string) => {
    const state: QueryState = { table };
    return createThenableQuery(state, responder);
  });

  const req = new Request(
    "http://localhost/api/posts/search?tag_ids=t1,t2&language=en&limit=10&offset=0",
    {
      method: "GET",
      headers: { Origin: "http://localhost:8000" },
    },
  );

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.total, 1);
  assertEquals(body.data.posts[0].id, "post-a");

  restore();
});
