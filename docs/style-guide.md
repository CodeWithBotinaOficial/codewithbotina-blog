# CodeWithBotina Style Guide

## Color Palette

### Primary Colors
- **Primary 500** (#2c5f2d): Main brand color.
- **Primary 600** (#234a24): Hover states.
- **Primary 700** (#1d3f1f): Active states.

### Neutral Colors
- **Neutral 50–100**: Backgrounds.
- **Neutral 200–300**: Borders, dividers.
- **Neutral 600–900**: Text colors.

### Semantic Colors
- **Success** (#4caf50)
- **Warning** (#f57c00)
- **Error** (#d32f2f)
- **Info** (#1976d2)

## Typography

### Font Families
- **Sans**: System UI stack.
- **Mono**: `SF Mono`, `Fira Code`, fallback monospace.

### Font Sizes
- **xs**: 12px
- **sm**: 14px
- **base**: 16px
- **lg**: 18px
- **xl**: 20px
- **2xl**: 24px
- **3xl**: 30px
- **4xl**: 36px

## Spacing

Use the spacing scale:
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

## Components

### Buttons

Primary:
```tsx
<button className="px-4 py-2 bg-[var(--color-accent-primary)] text-white rounded-lg transition-colors">
  Primary Action
</button>
```

Secondary:
```tsx
<button className="px-4 py-2 bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] rounded-lg transition-colors">
  Secondary Action
</button>
```

Danger:
```tsx
<button className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg transition-colors">
  Delete
</button>
```

### Cards

```tsx
<div className="bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
  Card content
</div>
```

### Inputs

```tsx
<input
  type="text"
  className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-white focus:ring-2 focus:ring-[var(--color-accent-primary)]"
/>
```

## Accessibility

- All interactive elements must be keyboard accessible.
- Icon-only buttons require `aria-label`.
- Maintain contrast ratio ≥ 4.5:1 for text.
- Use semantic HTML (`<button>`, `<nav>`, `<main>`).

## Responsive Design

Mobile-first approach with breakpoints:
- **Mobile**: default (< 768px)
- **Tablet**: `md` (≥ 768px)
- **Desktop**: `lg` (≥ 1024px)
- **Large Desktop**: `xl` (≥ 1280px)

Example:
```tsx
<div className="p-4 md:p-6 lg:p-8 xl:p-10">
  Content
</div>
```
