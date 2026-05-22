# LaTeX Math Rendering Rules

This blog supports LaTeX mathematical formulas rendered with KaTeX.

## Delimiters

Inline math:

```markdown
The derivative $\frac{d}{dx}(x^2) = 2x$ is basic calculus.
```

Display math:

```markdown
\[
\int_{a}^{b} f(x) \, dx
\]
```

Optional display math:

```markdown
$$
\int_{0}^{\infty} e^{-x} dx = 1
$$
```

## Important Rules

1. Delimiters are hidden. Only the rendered formula is shown.
2. LaTeX is not rendered inside:
   - fenced code blocks (``` ... ```)
   - inline code spans (`...`)
   - quoted strings: `"..."` and `'...'`
3. Mermaid (and other diagram) code fences still work as before.

## Escaping

To show the raw LaTeX delimiters without rendering, escape the `$`:

```markdown
The code is "\$x^2\$" (quoted, not rendered).
```

Or use inline code:

```markdown
Use `$\frac{a}{b}$` for fractions.
```

## Interactive Features

On any rendered formula:

- Desktop: right-click
- Mobile: long-press (500ms)

Menu actions:

1. Download as PNG (transparent background)
2. Copy as LaTeX (raw)
3. Copy as Formula (PNG clipboard when supported; otherwise text fallback)

