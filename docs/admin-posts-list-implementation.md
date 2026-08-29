# Admin Posts List Component - Implementation Guide

**File Paths:**
- **Page:** `frontend/src/pages/[lang]/admin/posts.astro`
- **Component:** `frontend/src/components/admin/AdminPostsList.tsx`

**Date:** August 29, 2026  
**Status:** ✅ Complete

---

## 📋 Overview

The admin posts list provides a comprehensive interface for managing all blog posts with special attention to scheduled posts. It displays:

✅ **Post Organization**
- Grouped by status: Scheduled → Published → Drafts
- Sortable and expandable cards
- Thumbnail previews
- Key metadata (created date, scheduled date)

✅ **Scheduled Post Features**
- Distinct warning badge with "Scheduled" label
- Real-time countdown timer (updates every second)
- Scheduled publication date and time
- Edit/cancel schedule links
- Timezone-aware date formatting

✅ **Multilingual Support**
- Full EN/ES/PT-BR translations
- Uses i18n system for all text
- Locale-aware date formatting
- Language-based URL parameters

---

## 🎯 Key Features

### 1. Status Badge System
```typescript
Status Badge Component shows:
- ⏱️ SCHEDULED: Warning color + countdown timer
- ✅ PUBLISHED: Green checkmark + "Published" label
- 📝 DRAFT: Gray alert + "Draft" label
```

**Visual Example:**
```
Scheduled Post
├─ Badge: ⏱️ Scheduled  2d 3h
├─ Scheduled for: Aug 30, 2026, 6:30 PM
└─ Actions: [View] [Edit] [Delete]

Published Post
├─ Badge: ✅ Published
├─ Created: Aug 28, 2026, 10:15 AM
└─ Actions: [View] [Edit] [Delete]
```

### 2. Countdown Timer
- Updates every second in real-time
- Shows days + hours when > 1 hour away: `2d 3h`
- Shows hours + minutes when < 1 day: `5h 30m`
- Shows minutes + seconds when < 1 hour: `15m 45s`
- Shows seconds only when < 1 minute: `30s`
- Shows "Publishing..." when time arrives

### 3. Date Formatting
- Timezone-aware using browser locale
- Formats according to language:
  - EN-US: `Aug 30, 2026, 6:30 PM`
  - ES-ES: `30 ago 2026, 18:30`
  - PT-BR: `30 de ago de 2026 18:30`

### 4. Post Organization
Groups posts into three sections:
1. **Scheduled** - Posts pending publication (orange badge)
2. **Published** - Live posts (green badge)
3. **Drafts** - Unpublished work (gray badge)

Each section shows post count and relevant icon.

---

## 🏗️ Component Architecture

### Page: `posts.astro`
```astro
---
// Astro server-side
- Detect language from URL param
- Fetch posts from API
- Sort by date (newest first)
- Pass to React component
---

<!-- Astro template -->
<BaseLayout>
  <header>
    <h1>Posts</h1>
    <a href="/admin/create-post">+ Create post</a>
  </header>
  
  <!-- React component with hydration -->
  <AdminPostsList 
    posts={posts}
    currentLanguage={language}
    client:load
  />
</BaseLayout>
```

### Component: `AdminPostsList.tsx`
```typescript
interface Post {
  id: string;
  titulo: string;
  slug: string;
  fecha?: string;
  status?: string;
  scheduled_at?: string | null;
  language?: string;
  imagen_url?: string | null;
}

export default function AdminPostsList({
  posts: Post[],      // From Astro page
  currentLanguage: SupportedLanguage  // From URL
})

Key features:
- useEffect: Updates countdowns every second
- useMemo: Groups posts by status
- useState: Manages expanded states & delete confirmation
- Countdown interval cleanup on unmount
```

---

## 🎨 UI/UX Elements

### Post Card Structure
```
┌─────────────────────────────────────────────┐
│ 🖼️ [Thumbnail]  Title                 [►]  │
│                 /lang/slug                  │
│                 📅 Created: Aug 28, 2026    │
│                 ⏱️ Scheduled: Aug 30, 2026  │
│                 [⏱️ Scheduled  2d 3h]      │
│                                             │
│ [EXPANDED VIEW]                             │
│ ─────────────────────────────────────────  │
│ [👁️ View] [✏️ Edit Post] [🗑️ Delete]     │
│                                             │
└─────────────────────────────────────────────┘
```

### Colors & Status
| Status | Color | Icon | Badge |
|--------|-------|------|-------|
| Scheduled | Warning (Orange) | ⏱️ Clock | `scheduling.label` |
| Published | Success (Green) | ✅ Eye | "Published" |
| Draft | Neutral (Gray) | ⚠️ Alert | "Draft" |

### Responsive Design
- Desktop: Full card layout with thumbnails
- Tablet: Flexible grid
- Mobile: Stacked cards, smaller thumbnails
- Touch-friendly button targets (min 44px)

---

## 🌍 i18n Integration

### Translation Keys Used

All keys available in `admin.json`:

| Component | Key | Type |
|-----------|-----|------|
| Page Header | `posts` | Section |
| Buttons | `createPost` | Action |
| Post Actions | `editPost` | Action |
| Post Actions | `deletePost` | Action |
| Dates | `editor.createdLabel` | Label |
| Scheduling | `scheduling.label` | Label |
| Scheduling | `scheduling.scheduledFor` | Label |

### Languages Supported
- ✅ English (`en`)
- ✅ Spanish (`es`)
- ✅ Portuguese BR (`pt-br`)

### Date Localization
```typescript
const locale = currentLanguage === "pt-br" 
  ? "pt-BR" 
  : currentLanguage === "es" 
  ? "es-ES" 
  : "en-US";

new Intl.DateTimeFormat(locale, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(date);
```

---

## 🔄 Data Flow

### Page Load Sequence
```
1. User visits: /en/admin/posts
2. Astro detects language: "en"
3. Astro fetches: GET /api/posts?language=en&limit=100
4. Astro sorts posts by date (newest first)
5. Astro passes posts + language to React component
6. React component hydrates on client
7. React starts countdown timer (updates every 1 sec)
8. Countdowns display for all scheduled posts
```

### Scheduled Post Timeline
```
Post Created
    ↓
[Draft Status]
    ↓
Admin schedules for Aug 30, 6:30 PM
    ↓
[Scheduled Status]
    ├─ Countdown shows: 2d 3h → 1h 30m → 5m → 30s
    ├─ Real-time updates every second
    └─ Date shows: "Scheduled for: Aug 30, 2026, 6:30 PM"
    ↓
Aug 30, 6:30 PM arrives
    ↓
GitHub Actions cron triggers
    ↓
Backend publishes post
    ↓
[Published Status]
    ├─ Badge changes to green ✅
    └─ Countdown timer removed
    ↓
Post live on blog
```

---

## 🎮 User Interactions

### Viewing Posts
1. Navigate to `/en/admin/posts`
2. Posts grouped by status automatically
3. Scheduled posts show with countdown timers
4. Click chevron (►) to expand post actions

### Editing Scheduled Post
1. Expand scheduled post card
2. Click "Edit Post" button
3. Redirects to edit page with scheduling section
4. Can modify schedule or cancel it

### Deleting Post
1. Expand post card
2. Click "Delete" button
3. Button changes to "Confirm" + "Cancel"
4. Click "Confirm" to permanently delete
5. Page refreshes automatically

### Monitoring Schedule
- Real-time countdown updates every second
- No page refresh needed
- Countdown stops when time arrives
- Shows "Publishing..." status

---

## 🔍 Key Code Patterns

### Countdown Update Hook
```typescript
useEffect(() => {
  const updateCountdowns = () => {
    const now = new Date();
    const newCountdowns: CountdownState = {};

    for (const post of posts) {
      if (post.status === "scheduled" && post.scheduled_at) {
        const scheduledDate = new Date(post.scheduled_at);
        const diffMs = scheduledDate.getTime() - now.getTime();

        if (diffMs <= 0) {
          newCountdowns[post.id] = "Publishing...";
        } else {
          // Calculate days, hours, minutes, seconds
          // Format as "2d 3h" or "5h 30m" etc.
        }
      }
    }

    setCountdowns(newCountdowns);
  };

  updateCountdowns(); // Initial call
  const interval = setInterval(updateCountdowns, 1000); // Every second

  return () => clearInterval(interval); // Cleanup
}, [posts]);
```

### Status Badge Component
```typescript
const getStatusBadge = (post: Post) => {
  if (post.status === "scheduled") {
    return (
      <div class="bg-warning text-warning">
        <Clock size={16} />
        <span>{t(currentLanguage, "scheduling.label", "admin")}</span>
        <span>{countdowns[post.id]}</span>
      </div>
    );
  }
  // ... published and draft badges
};
```

### Post Grouping
```typescript
const groupedPosts = useMemo(() => {
  const groups = { scheduled: [], published: [], draft: [] };
  
  for (const post of posts) {
    const status = post.status || "draft";
    groups[status].push(post);
  }
  
  return groups;
}, [posts]);
```

---

## 🌐 URL Structure

| Page | URL | Language |
|------|-----|----------|
| Posts List EN | `/en/admin/posts` | English |
| Posts List ES | `/es/admin/posts` | Spanish |
| Posts List PT-BR | `/pt-br/admin/posts` | Portuguese |
| Edit Post EN | `/en/admin/edit-post/{slug}` | English |
| Create Post EN | `/en/admin/create-post` | English |

---

## 🧪 Testing Scenarios

### Test Scheduled Post Countdown
```bash
1. Create post with schedule 2 minutes in future
2. Navigate to /admin/posts
3. Verify countdown timer displays
4. Wait and observe timer decrements every second
5. Verify format changes: "2m 0s" → "1m 59s" → ... → "0s"
6. Observe "Publishing..." when time arrives
```

### Test i18n
```bash
Visit: /es/admin/posts
- Verify badge shows Spanish text
- Verify date format is Spanish: "30 ago 2026"
- Verify button labels in Spanish

Visit: /pt-br/admin/posts
- Verify Portuguese translations
- Verify date format: "30 de ago de 2026"
```

### Test Delete Confirmation
```bash
1. Expand any post card
2. Click "Delete" button
3. Verify button changes to "Confirm" + "Cancel"
4. Click "Cancel" → button reverts to "Delete"
5. Click "Delete" again
6. Click "Confirm" → post deleted, page refreshes
```

---

## 📊 Performance Notes

- **Countdown Timer:** One interval for all posts (efficient)
- **Post Grouping:** Memoized to prevent unnecessary recalculations
- **Image Loading:** Lazy loading with `loading="lazy"`
- **API Fetch:** Server-side in Astro (no client waterfalls)
- **Component Hydration:** Only React component hydrated (`client:load`)

---

## 🔐 Security Features

- ✅ Admin authentication required (via middleware on Astro page)
- ✅ Delete requires explicit confirmation
- ✅ API credentials via `include` in fetch
- ✅ CSRF-safe API calls
- ✅ Date validation on backend

---

## 🚀 Usage Example

### View All Posts
```
1. Sign in as admin
2. Navigate to: https://yourblog.com/en/admin/posts
3. See all posts grouped by status
4. Scheduled posts show countdown timers
5. Click to expand and manage individual posts
```

### Schedule Post for Publication
```
1. Create new post (status = draft)
2. Save post
3. Visit /admin/posts
4. Find post in "Drafts" section
5. Click "Edit Post"
6. Scroll to "Schedule Post Publication" section
7. Select future date (e.g., Aug 30, 2026, 6:30 PM)
8. Click "Schedule Post"
9. Return to /admin/posts
10. Post now in "Scheduled" section with countdown timer
```

### Monitor Publication
```
1. Watch countdown timer decrement
2. Countdown: 2d 3h → ... → 30s
3. When timer reaches 0s, shows "Publishing..."
4. GitHub Actions cron triggers within 5 minutes
5. Post status changes to "Published"
6. Post badge becomes green ✅
7. Countdown timer disappears
8. Post now live on blog
```

---

## 📦 File Structure

```
frontend/src/
├── pages/
│   └── [lang]/admin/
│       ├── posts.astro ← Admin posts list page
│       ├── edit-post/
│       │   └── [slug].astro
│       └── create-post.astro
└── components/admin/
    ├── AdminPostsList.tsx ← Posts list component
    ├── ScheduleDateInput.astro
    ├── PostEditor.tsx
    └── ...
```

---

## ✅ Checklist: What's Complete

- [x] Admin posts list page (`posts.astro`)
- [x] AdminPostsList component with React
- [x] Status-based grouping (Scheduled/Published/Drafts)
- [x] Scheduled post badges with countdown timers
- [x] Real-time countdown updates (every 1 second)
- [x] Timezone-aware date formatting
- [x] i18n translations via i18n system
- [x] Multi-language support (EN/ES/PT-BR)
- [x] Post actions (View/Edit/Delete)
- [x] Delete confirmation dialog
- [x] Image thumbnails with lazy loading
- [x] Responsive design
- [x] Accessibility features (ARIA labels)

---

## 🔗 Related Files

- **i18n System:** `frontend/src/lib/i18n.ts`
- **Translation Files:** `frontend/src/i18n/{lang}/admin.json`
- **Edit Page:** `frontend/src/pages/[lang]/admin/edit-post/[slug].astro`
- **Schedule Component:** `frontend/src/components/admin/ScheduleDateInput.astro`
- **API Endpoint:** `backend/routes/api/posts/publish-scheduled.ts`
- **GitHub Actions:** `.github/workflows/publish-scheduled-posts.yml`


