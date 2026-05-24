import { useState } from "preact/hooks";
import { useToast } from "../../../hooks/useToast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onPollCreated?: (_poll: any) => void;
}

export default function PollCreator({ isOpen, onClose, language, onPollCreated }: Props) {
  const [type, setType] = useState("single_choice");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const maxOptions = type === "single_choice" ? 5 : 9;
  const minOptions = 2;

  async function handleCreate() {
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    if (type !== "free_text") {
      const validOptions = options.filter((o) => o.trim());
      if (validOptions.length < minOptions) {
        showToast(`At least ${minOptions} options required`, 'error');
        return;
      }
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    try {
      const res = await fetch("/api/polls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          title,
          description,
          type,
          language,
          options: type === "free_text" ? [] : options.map((t) => ({ text: t })),
        }),
      });

      if (res.ok) {
        const poll = await res.json();
        showToast("Poll created!", "success");
        onPollCreated?.(poll.data ?? poll);
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to create poll", "error");
      }
    } catch (_err) {
      showToast("Failed to create poll", "error");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Create Poll</h3>
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e: any) => setType(e.target.value)}>
            <option value="free_text">Free Text</option>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
          </select>
        </div>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onInput={(e: any) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onInput={(e: any) => setDescription(e.target.value)} rows={3} />
        </div>
        {type !== "free_text" && (
          <div className="form-group">
            <label>Options ({minOptions}-{maxOptions})</label>
            {options.map((opt, i) => (
              <input key={i} value={opt} onInput={(e: any) => {
                const newOpts = [...options];
                newOpts[i] = e.target.value;
                setOptions(newOpts);
              }} />
            ))}
            {options.length < maxOptions && (
              <button type="button" onClick={() => setOptions([...options, ""])}>+ Add</button>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={handleCreate} className="primary">Create</button>
        </div>
      </div>
    </div>
  );
}
