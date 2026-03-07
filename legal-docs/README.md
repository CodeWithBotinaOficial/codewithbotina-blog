# Legal Documents

This folder contains the legal documents served by the frontend. Documents are split by language.

## Structure

```
legal-docs/
├── en/
│   ├── privacy-policy.md
│   ├── terms-of-service.md
│   ├── cookie-policy.md
│   └── data-deletion.md
└── es/
    ├── politica-de-privacidad.md
    ├── terminos-de-servicio.md
    ├── politica-de-cookies.md
    └── eliminacion-de-datos.md
```

## Notes

- The frontend loads language-specific markdown based on the current locale.
- When a translation is missing, the system falls back to English.
