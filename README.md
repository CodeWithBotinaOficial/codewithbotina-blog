# CodeWithBotina Blog

A production-grade bilingual blog built with Astro, Fresh (Deno), Supabase, and deployed on Cloudflare Pages.

## ✅ Features

- ✅ Google OAuth authentication
- ✅ Comment system with admin pinning
- ✅ Like/dislike reactions
- ✅ User profile page with activity statistics
- ✅ Self-serve account deletion from profile page (permanent)
- ✅ **Admin post management (create, edit, delete)**
- ✅ **Localized admin editor (English/Spanish)**
- ✅ **AI-powered tag suggestions + tag autocomplete**
- ✅ **Tag landing pages + tag-based sitemap entries**
- ✅ **Cookie consent (GDPR/CCPA) with consent tracking**
- ✅ **WYSIWYG Markdown editor with live preview**
- ✅ **Interactive Mermaid diagrams in Markdown (view/code toggle, pan/zoom, download, fullscreen)**
- ✅ **Enhanced Markdown tables (borders, zebra striping, responsive scroll, copy-to-clipboard)**
- ✅ **Drag-and-drop image uploads with improved preview (aspect-safe, file info, hover actions)**
- ✅ **Image library: reuse existing Supabase Storage images (no duplicate uploads)**
- ✅ **Tag persistence in edit flows (no accidental unlinking)**
- ✅ **Post translation linking (equivalent posts across languages)**
- ✅ **Simultaneous Post Translation: create/edit multiple language versions in one admin interface**
- ✅ **Smart language switcher (redirects to translated post when available, translation-aware 404 when missing)**
- ✅ Hybrid rendering (dynamic content without rebuilds)
- ✅ SEO optimized (JSON-LD, Open Graph, keywords, RSS, sitemaps)
- ✅ Bilingual i18n (English/Spanish) with language detection + hreflang
- ✅ Fully responsive design

## Multi-Language Post Management

The blog supports creating and editing posts in multiple languages simultaneously.

### Features

- Create posts in multiple languages from a single interface
- Edit all language versions together
- Share tags across languages or customize per language
- Use the same image for all versions or customize per language
- Automatic translation linking via `post_translations`

### Supported Languages

- English (`en`)
- Spanish (`es`)

## 🚀 Tech Stack

- **Frontend:** Astro 5 (Static Site Generation)
- **Markdown Enhancements:** Mermaid.js (diagrams) + custom table wrappers (copy-to-clipboard)
- **Backend:** Deno + Fresh (Edge Functions)
- **Database:** PostgreSQL (Supabase)
- **Storage:** Supabase Storage
- **Email:** Resend
- **Hosting:** Cloudflare Pages + Deno Deploy

## 📦 Project Structure
```
codewithbotina-blog/
├── frontend/          # Astro static site
│   ├── src/
│   │   ├── pages/    # Routes
│   │   └── styles/   # Global styles
│   └── public/       # Static assets
│
├── backend/          # Deno Fresh API
│   ├── routes/       # API endpoints
│   └── islands/      # Interactive components
│
├── .gitignore
├── LICENSE
└── README.md
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- Deno 2.6+
- Supabase account
- Resend account
- Cloudflare account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/codewithbotina-blog.git
cd codewithbotina-blog
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Configure environment variables:
```bash
# frontend/.env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
PUBLIC_API_URL=http://localhost:8000
PUBLIC_SITE_URL=http://localhost:4321

# backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@codewithbotina.com
RESEND_TO_EMAIL=support@codewithbotina.com
ALLOWED_ORIGIN=http://localhost:4321
```

4. Run development servers:
```bash
# Frontend (Astro)
cd frontend
npm run dev

# Backend (Deno)
cd backend
deno task start
```

## 🚢 Deployment

- **Frontend:** Deployed to Cloudflare Pages (blog.codewithbotina.com)
- **Backend:** Deployed to Deno Deploy (API endpoints)

## 📚 Documentation

- [SEO](docs/SEO.md)
- [Tag System](docs/tag-system.md)
- [Database Schema](docs/database-schema.md)
- [Multi-Language Posts](docs/multi-language-posts.md)
- [i18n Implementation](docs/i18n-implementation.md)
- [API Documentation](docs/api-documentation.md)

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 👤 Author

**Diego Alejandro Botina**
- Website: [blog.codewithbotina.com](https://blog.codewithbotina.com)
- Email: support@codewithbotina.com

---

Made with ❤️ by CodeWithBotina
