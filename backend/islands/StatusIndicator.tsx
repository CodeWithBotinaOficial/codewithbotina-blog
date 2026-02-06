import { useEffect, useState } from "preact/hooks";

export default function StatusIndicator() {
  const [status, setStatus] = useState<"loading" | "ok" | "down">("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (res.ok) setStatus("ok");
        else setStatus("down");
      })
      .catch(() => setStatus("down"));
  }, []);

  if (status === "loading") return <span>Checking status...</span>;

  return (
    <div class="status-indicator">
      <span
        class={`status-dot ${status === "ok" ? "status-ok" : "status-down"}`}
      >
      </span>
      <span>{status === "ok" ? "Operational" : "Service Disruption"}</span>
    </div>
  );
}
