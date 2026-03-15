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

## Linking Translations (Equivalent Posts Across Languages)

Use the **Translations** section in the post editor to connect equivalent articles across languages (so the language switcher can take readers to the matching post instead of a 404).

### How To Link

1. Open **Create Post** or **Edit Post**
2. In **Translations**, type at least 2 characters in the search box
3. Select the matching post(s) in other languages
4. Save the post

### Rules

- You cannot link a post in the **same language** as the current post.
- You can link **multiple** posts, but **only one per language**.
- If you remove a linked post and save, that post is **unlinked from the translation group**.

### Best Practices

- Link translations as soon as you publish the second language version.
- Keep slugs language-specific; translation links handle navigation between them.

## Featured Image Inheritance From Linked Posts

When creating a translated post, you can inherit the featured image from the first linked post:

- If the first linked post has an image, **Use image from linked post** can auto-fill the featured image on create.
- You can click **Change image** to override with a different URL or an upload.
- Unlinking translations later does not remove an image that was already saved to the post.

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
- Prefer **Select from Library** to reuse existing images and avoid duplicates
- Recommended size: 1200x800px or similar aspect ratio
- Max file size: 5MB (auto-compressed to <500KB)
- Supported formats: JPG, PNG, WebP

## Image Library (Supabase Storage)

In the post editor image section, you can choose:

1. **Upload New**: Upload and optimize a new image
2. **Select from Library**: Pick an existing image already stored in Supabase
3. **External URL**: Use an image hosted elsewhere

Notes:

- Filenames are **read-only** in the library (other posts may reference the same file).
- Using the library prevents duplicate uploads and saves storage.

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
