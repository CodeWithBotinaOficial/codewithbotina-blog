import { useState } from "preact/hooks";

export default function TryItOut() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setStatus(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const data = {
      nombre: formData.get("nombre"),
      correo: formData.get("correo"),
      mensaje: formData.get("mensaje"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      setStatus(res.status);
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (_error) {
      setResponse(JSON.stringify({ error: "Network error" }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="card">
      <h3>⚡ Try It Out</h3>
      <p>Test the live API directly from your browser.</p>

      <form onSubmit={handleSubmit} class="try-it-form">
        <div class="form-group">
          <label for="nombre">Name</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            required
            placeholder="John Doe"
          />
        </div>

        <div class="form-group">
          <label for="correo">Email</label>
          <input
            type="email"
            id="correo"
            name="correo"
            required
            placeholder="john@example.com"
          />
        </div>

        <div class="form-group">
          <label for="mensaje">Message</label>
          <textarea
            id="mensaje"
            name="mensaje"
            required
            rows={3}
            placeholder="Hello world..."
          >
          </textarea>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Request"}
        </button>
      </form>

      {response && (
        <div class="mt-4">
          <h4>
            Response {status && (
              <span
                class={status >= 200 && status < 300
                  ? "text-green-500"
                  : "text-red-500"}
              >
                ({status})
              </span>
            )}
          </h4>
          <pre><code>{response}</code></pre>
        </div>
      )}
    </div>
  );
}
