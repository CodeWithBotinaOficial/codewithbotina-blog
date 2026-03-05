# UI Components Documentation

## Modal

Generic modal component for dialogs, forms, and overlays.

### Props
- `isOpen` (boolean): Controls modal visibility.
- `onClose` (function): Callback when modal closes.
- `title` (string): Modal header text.
- `children` (ReactNode): Modal body content.
- `footer` (ReactNode, optional): Modal footer buttons.

### Usage
```tsx
import Modal from "@/components/ui/Modal";

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="My Modal"
  footer={<button onClick={handleSave}>Save</button>}
>
  <p>Modal content goes here.</p>
</Modal>
```

### Features
- Locks body scroll when open.
- Click backdrop to close.
- Accessible dialog semantics.
- Responsive layout.

---

## ConfirmDialog

Pre-configured modal for confirmation prompts.

### Props
- `isOpen`, `onClose` (inherited from Modal).
- `onConfirm` (function): Callback when user confirms.
- `title` (string): Dialog title.
- `message` (string): Confirmation message.
- `confirmText` (string, default: "Confirm").
- `cancelText` (string, default: "Cancel").
- `variant` ("danger" | "warning" | "info").

### Usage
```tsx
import ConfirmDialog from "@/components/ui/ConfirmDialog";

<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Post"
  message="This action cannot be undone."
  variant="danger"
  confirmText="Delete"
/>
```

### Variants
- **danger**: Destructive actions (delete, remove).
- **warning**: Risky actions (archive, unpublish).
- **info**: General confirmations (save, publish).

---

## Toast

Temporary notification component.

### Props
- `message` (string): Notification text.
- `type` ("success" | "error" | "info").
- `onClose` (function): Callback when toast closes.
- `duration` (number, default: 5000): Auto-dismiss time (ms).

### Usage with Hook
```tsx
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";

function MyComponent() {
  const { toasts, showToast, removeToast } = useToast();

  return (
    <>
      <button onClick={() => showToast("Saved", "success")}>Save</button>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}
```

---

## Icon Usage

We use **Lucide Preact** for all icons.

### Installation
```bash
npm install lucide-preact
```

### Recommended icons
- Admin actions: `Pencil`, `Trash2`, `PlusCircle`, `MoreVertical`.
- User actions: `LogIn`, `LogOut`, `User`, `Settings`.
- Status: `CheckCircle2`, `AlertCircle`, `AlertTriangle`, `Info`.

### Best practices
- Keep icon sizes consistent: `className="h-5 w-5"`.
- Provide `aria-label` for icon-only buttons.
