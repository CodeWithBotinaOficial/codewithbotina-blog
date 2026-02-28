# Admin Guide - CodeWithBotina Blog

## Becoming an Admin

Admins are manually added to the `admin_users` table in Supabase:

```sql
INSERT INTO admin_users (user_id) VALUES ('your-user-id-here');
```

Get your `user_id` from the `users` table after logging in with Google.

## Creating Posts

1. **Access:** Homepage → "Create New Post" button (visible to admins only)
2. **Title:** Enter post title (auto-generates slug)
3. **Slug:** Edit if needed (must be unique, lowercase, hyphens only)
4. **Content:** Write in Markdown, use Preview to see rendered HTML
5. **Image:** Choose external URL or upload file (max 5MB)
6. **Publish:** Click "Create Post" → Confirm → Post goes live immediately

## Editing Posts

1. **Access:** Post detail page → Three-dot menu → "Edit Post"
2. **Modify:** Update any field (title, content, image)
3. **Save:** Click "Update Post" → Confirm → Changes live immediately

## Deleting Posts

⚠️ **Warning:** Deleting a post permanently removes:
- The post content
- All associated comments
- All associated reactions (likes/dislikes)
- Uploaded featured image (if applicable)

**Process:**
1. Post detail page → Three-dot menu → "Delete Post"
2. Read warning dialog carefully
3. Confirm deletion → Redirected to homepage

## Markdown Guide

Supported Markdown syntax:
- Headings: `# H1`, `## H2`, `### H3`
- Bold: `**text**`
- Italic: `*text*`
- Lists: `- item` or `1. item`
- Links: `[text](url)`
- Images: `![alt](url)`
- Code: `` `code` `` or ` ```lang\ncode\n``` `
- Blockquotes: `> quote`

## Image Best Practices

- Use descriptive titles (becomes alt text)
- Prefer uploads over URLs (auto-optimized)
- Recommended size: 1200x800px or similar aspect ratio
- Max file size: 5MB (auto-compressed to <500KB)
- Supported formats: JPG, PNG, WebP

## Troubleshooting

**Slug already exists:**
- Edit slug to make it unique
- Use post date or number suffix (e.g., `my-post-2`)

**Upload failed:**
- Check file size (<5MB)
- Verify file type (JPG, PNG, WebP only)
- Check internet connection

**Can't see admin buttons:**
- Verify you're logged in
- Confirm you're in `admin_users` table
- Clear cache and reload page
