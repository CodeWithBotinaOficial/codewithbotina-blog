# Tag System Documentation

## Overview

This tag system adds SEO-friendly tags with a many-to-many relationship between posts and tags. It includes tag suggestions, autocomplete, and tag landing pages.

## Database Schema (Supabase SQL)

```sql
-- tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- post_tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, tag_id)
);

-- indexes
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

-- usage_count trigger
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_usage_count_trigger
AFTER INSERT OR DELETE ON post_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are publicly readable"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Post tags are publicly readable"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON tags FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admins can manage post_tags"
  ON post_tags FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));
```

## API Endpoints

### Suggest tags
`POST /api/tags/suggest`

Request body:
```json
{ "title": "...", "body": "..." }
```

Response:
```json
{ "success": true, "data": { "suggestions": [ ... ] } }
```

### Autocomplete tags
`GET /api/tags/autocomplete?q=react`

Response:
```json
{ "success": true, "data": { "tags": [ ... ] } }
```

### Create tag (admin only)
`POST /api/tags/create`

Request body:
```json
{ "name": "React", "description": "Optional" }
```

## Admin Workflow

1. Create or edit a post.
2. Tag selector suggests tags based on the title and body.
3. Autocomplete lists existing tags.
4. Admin can create a new tag inline.
5. Tags are saved via `tag_ids` on create/update.

## SEO Features

- Post meta keywords from tags.
- Open Graph `article:tag` entries.
- JSON-LD `keywords` populated with tag names.
- Tag landing pages at `/tags/[slug]`.
- Sitemap includes tag pages.
- Post pages display tag chips that link to `/tags/{slug}`.
- Post pages fall back to the backend tags API if public tag reads are blocked.

## Best Practices

- Use 3–7 tags per post.
- Prefer specific tags over generic ones.
- Reuse existing tags to avoid duplicates.
- Keep tag names short and consistent.
