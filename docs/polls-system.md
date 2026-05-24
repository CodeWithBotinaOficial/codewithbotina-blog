# Poll System Documentation

## Overview

The blog supports 3 types of interactive polls:
- **Free Text**: Users write custom responses → Word cloud visualization
- **Single Choice**: Users select one option → Top list + Bar chart
- **Multiple Choice**: Users select multiple options → Top list + Bar chart

## Creating Polls

### From Post Editor

1. Click "Add Poll" button
2. Select poll type
3. Enter title and description
4. Add options (for choice-based polls)
5. Configure visualizations
6. Click "Create Poll"

### Poll Types

**Free Text:**
- Users write custom text responses
- Minimum 1 character, maximum 500 characters
- One response per user (cannot edit)
- Results shown as word cloud

**Single Choice:**
- 2-5 options
- User selects ONE option
- Can change vote or remove vote
- Configurable Top list and Bar chart

**Multiple Choice:**
- 2-9 options
- User selects MULTIPLE options (unlimited)
- Can change votes or remove all votes
- Configurable Top list and Bar chart

## Embedding Polls

Use this syntax in post content:

```markdown
[Poll Title](poll:poll-slug)
```

**Example:**
```markdown
What's your favorite programming language?
[Vote Now](poll:favorite-language-2024)
```

## Poll Settings

### Display Settings (Choice-based polls)

**Top List:**
- Show top N results
- Maximum: 60% of total options
- Order: Ascending or Descending
- Shows option text + vote count
- Downloadable as PNG

**Bar Chart:**
- Orientation: Horizontal or Vertical
- Show N options (1 to total)
- Color-coded bars
- Interactive (zoom, pan)
- Downloadable as PNG

### Lifecycle

**Open:**
- Users can vote
- Users can edit votes (except free text)
- Results visible in real-time

**Closed:**
- No new votes accepted
- No vote edits allowed
- Only results visible

**Auto-close:**
- Set optional expiration date
- Poll closes automatically
- Manual override available

## Admin Features

### Poll Management

**Create:**
- From post editor
- Or dedicated poll creator page
- Supports all 3 languages

**Edit:**
- Edit title, description
- Add options (while open)
- Delete options (only if 0 votes)
- Update display settings
- Open/close manually

**Delete:**
- Requires slug confirmation
- Deletes all votes
- Cannot be undone

### Analytics

Admins can view:
- Who voted
- What they voted for
- When they voted
- Export to CSV

## Multi-language Support

### Creating Translations

1. Create poll in default language (English)
2. Click "Add Translation"
3. Select language (ES or PT-BR)
4. Enter translated content
5. Poll slug changes (e.g., `favorite-language-es`)

### Using Translations

Polls use language-specific slugs:
- English: `[Vote](poll:favorite-language)`
- Spanish: `[Vota](poll:favorite-language-es)`
- Portuguese: `[Vote](poll:favorite-language-pt)`

Votes are shared across translations (same poll_id).

## Voting Rules

### Authentication

- **Required to vote:** Yes
- **Required to view results:** No

### Vote Limits

- **Free Text:** 1 response per user (permanent)
- **Single Choice:** 1 vote per user (editable)
- **Multiple Choice:** Unlimited selections (editable)

### Vote Editing

**Single/Multiple Choice:**
- Click different option → changes vote
- Click same option again → removes vote
- "Remove Response" button available

**Free Text:**
- Cannot edit after submission
- Cannot delete response

## Best Practices

### Poll Creation

✅ **DO:**
- Write clear, specific questions
- Keep options concise
- Test poll before publishing
- Set appropriate close date

❌ **DON'T:**
- Create biased options
- Too many options (confusing)
- Vague questions
- Duplicate options

### Option Management

✅ **DO:**
- Add options while poll is open
- Remove options with 0 votes
- Use consistent wording

❌ **DON'T:**
- Delete options with votes
- Change option meaning drastically
- Add too many options later

## Troubleshooting

### Poll not appearing

**Check:**
- Slug is correct in markdown
- Poll exists in database
- Language matches post language
- Poll is not deleted

### Cannot vote

**Check:**
- User is authenticated
- Poll is open
- Poll has not expired
- User hasn't exceeded vote limit

### Analytics not loading

**Check:**
- User is admin
- Poll has votes
- Poll ID is correct

## API Reference

**Create Poll:**
```
POST /api/polls/create
```

**Get Poll:**
```
GET /api/polls/:slug?lang=en
```

**Vote:**
```
POST /api/polls/:slug/vote
```

**Remove Vote:**
```
DELETE /api/polls/:slug/vote
```

**Analytics:**
```
GET /api/polls/:slug/analytics
```

See [API Documentation](./api-documentation.md) for details.

