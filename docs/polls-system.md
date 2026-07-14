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
3. Select poll language (English, Español, or Português)
4. Enter title and description
5. Add options (for choice-based polls)
6. Configure visualizations
7. Click "Create Poll"

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

### Smart Auto-Discovery

Use the basic syntax in post content. The embed automatically resolves the poll language:

```markdown
[Poll Title](poll:poll-slug)
```

Resolution order:

1. Try the post language first.
2. Try every supported poll language.
3. Try English as the final fallback.
4. Show a not-found error only if the slug does not exist in any language.

This means an English poll can be embedded in a Spanish post, a Spanish poll can be embedded in a Portuguese post, and a Portuguese poll can be embedded in an English post without adding a language parameter.

### Explicit Language

To prefer a specific poll language, keep using the explicit language parameter:

```markdown
[Poll Title](poll:poll-slug|en)
```

Supported language codes: `en`, `es`, `pt-br`

The explicit format remains backward compatible. The resolver tries the explicit language first, then continues through the normal fallback order.

### Example Scenarios

| Post Language | Poll Language | Format                  | Result              |
| ------------- | ------------- | ----------------------- | ------------------- |
| English       | English       | `[text](poll:slug)`     | Found in English    |
| English       | Spanish       | `[text](poll:slug)`     | Found in Spanish    |
| Spanish       | English       | `[text](poll:slug)`     | Found in English    |
| Portuguese    | Spanish       | `[text](poll:slug)`     | Found in Spanish    |
| Any           | Spanish       | `[text](poll:slug\|es)` | Tries Spanish first |

### Examples

```markdown
# Same-language poll

[What's your favorite framework?](poll:favorite-framework)

# Cross-language poll resolved automatically

[¿Cuál es tu framework favorito?](poll:framework-favorito)

# Explicit poll language

[Original Spanish poll](poll:encuesta-original|es)
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

### Independent Creation

You can create polls in different languages independently. Each poll has its own slug and language setting.

### Cross-Language Usage

Polls are not restricted to the post's language. A poll in any supported language can be used across the blog with `[text](poll:slug)`, while `[text](poll:slug|language)` is available when a specific language should be tried first.

### Visual Indicators

Poll embeds and the Polls Browser show the poll's native language with a flag icon (🇺🇸, 🇪🇸, 🇧🇷) to help authors manage cross-language content.

## Poll Translations

Polls can be linked across languages so voting and results are unified while each language keeps its own title, description, and option text.

### Linking Requirements

**Type matching is mandatory:**

- Free Text can only link to Free Text.
- Single Choice can only link to Single Choice.
- Multiple Choice can only link to Multiple Choice.
- Mixed types are rejected by both the admin UI and database enforcement.

**Language uniqueness is mandatory:**

- A translation group can have only one poll per language.
- EN ↔ ES, EN ↔ PT-BR, and ES ↔ PT-BR are valid.
- EN ↔ EN, ES ↔ ES, and PT-BR ↔ PT-BR are rejected.

**Option count must match for choice polls:**

- Free Text polls do not require options.
- Single Choice and Multiple Choice translations must have the same number of options.
- Example: an English poll with 4 options can only link to a Spanish poll with 4 options.

### Critical: Option Order Matters

Votes are mapped by position, not by option content.

```text
Spanish Poll:          English Poll:
1. Python              1. Python
2. Java                2. C++
3. C++                 3. Java

User votes "Java" in Spanish at position 2.
In English, position 2 is "C++", so the vote appears as "C++".
```

Keep the exact same option order in every linked version.

### Unified Voting Behavior

When polls are linked:

- Vote in any language and the vote is visible in all linked versions.
- Results aggregate across the full translation group.
- Choice-poll vote state is mapped onto the current language's option IDs by option position.
- Free-text polls allow one response per user across the full translation group.
- Free-text responses cannot be edited or removed from any linked version.

### Creating Translated Polls

1. Create the poll in the first language.
2. Create the poll in another language with the same type.
3. For choice polls, keep the same option count and option order.
4. Open the poll editor and use "Link Translation".
5. Select an eligible poll. The system validates type, language, and option count before linking.

### Unlinking Polls

Admins can unlink a poll from its translation group at any time. Votes are not deleted; they are retargeted to the remaining effective group where possible.

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
- Poll exists in at least one supported language
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
