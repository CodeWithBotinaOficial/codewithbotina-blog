# CodeWithBotina Blog

A blazing-fast static blog built with Astro, Fresh (Deno), Supabase, and deployed on Cloudflare Pages.

## ✅ Features

- ✅ Google OAuth authentication
- ✅ Comment system with admin pinning
- ✅ Like/dislike reactions
- ✅ **Admin post management (create, edit, delete)**
- ✅ **WYSIWYG Markdown editor with live preview**
- ✅ **Image upload to Supabase Storage**
- ✅ Hybrid rendering (dynamic content without rebuilds)
- ✅ SEO optimized
- ✅ Fully responsive design

## 🚀 Tech Stack

- **Frontend:** Astro 5 (Static Site Generation)
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
3. Configure environment variables:
```

```bash
# frontend/.env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@codewithbotina.com
RESEND_TO_EMAIL=support@codewithbotina.com
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

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 👤 Author

**Diego Alejandro Botina**
- Website: [blog.codewithbotina.com](https://blog.codewithbotina.com)
- Email: support@codewithbotina.com

---

Made with ❤️ by CodeWithBotina
