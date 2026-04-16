# UX Decisions & Future Considerations

This document records UX decisions and potential improvements for future iterations.

---

## Case Generation Flow

### Current Behavior (Auto-Open) ✅
After generating a case, the app automatically navigates to the simulation screen. This provides immediate gratification and a seamless flow:

```
User types topic → Generate → Wait (30-60s) → Simulation opens
```

**Implementation:**
```typescript
// Auto-open the simulation after case generation
router.push(`/simulation?caseId=${result.case_id}`);
```

**Visual Feedback:**
- New case appears at TOP of recommended list
- Green border + light green background highlight
- "NEW" badge displayed for 3 seconds
- Difficulty badge shows correct color (green/amber/red)

### Alternative Considered: Confirmation Dialog

**Idea:** Show an alert dialog after generation with options:
- **"Start Now"** → Opens the simulation immediately
- **"Later"** → Dismisses and stays on home screen

**Rationale for this approach:**
- Users might want to generate multiple cases first, then pick one
- Allows reviewing the case title before committing
- Users can continue browsing recommendations
- Useful for power users who want to batch-generate cases

**Why we chose auto-open instead:**
- More satisfying user experience - instant gratification after waiting for AI generation
- Reduces friction - one less tap required
- Matches mental model: "I want to practice this topic" → "Here's your case"
- User can always go back to home screen if they changed their mind

**Implementation notes:**
```typescript
Alert.alert(
  'Case Generated',
  `"${result.title}" has been added to your cases.`,
  [
    { text: 'Start Now', onPress: () => router.push(`/simulation?caseId=${result.case_id}`) },
    { text: 'Later', style: 'cancel' },
  ]
);
```

### Future Enhancement Ideas

1. **User Preference Setting**
   - Add a toggle: "Auto-open simulations after generation"
   - Store preference in AsyncStorage
   - Default: true (auto-open) for new users

2. **Batch Generation Mode**
   - "Generate 3 cases" option for educators building curriculum
   - Shows a checklist of generated cases
   - Allows selecting which to start

3. **Smart Auto-Open**
   - Auto-open on first generation of a session
   - Show dialog after 2+ generations (power user detection)

4. **Toast Notification Alternative**
   - Non-blocking toast: "Case added! Tap to open"
   - Auto-dismisses after 5 seconds
   - Less interruptive than alert dialog

---

## Case List Rendering

### Problem
React Native Web's FlatList doesn't always re-render when state updates with new items at the beginning of the list.

### Solution
Multiple fixes applied:

1. **Key prop on FlatList** - Forces complete remount when data changes:
```typescript
<FlatList
  key={`cases-${cases.length}-${cases[0]?.case_id || 'empty'}`}
  // ...
/>
```

2. **extraData prop** - Triggers re-render on specific data changes:
```typescript
extraData={{ length: cases.length, firstId: cases[0]?.case_id }}
```

3. **Visual "NEW" indicator** - State-based highlight for newly added cases:
```typescript
const [newCaseAdded, setNewCaseAdded] = useState<string | null>(null);
// Set when case is added, clear after 3 seconds
```

---

## Difficulty Color Coding

### Mapping
Backend uses: `beginner`, `intermediate`, `advanced`
Mobile app uses: `easy`, `medium`, `hard`

**Mapping function:**
```typescript
const mapDifficulty = (difficulty: string): 'easy' | 'medium' | 'hard' => {
  switch (difficulty?.toLowerCase()) {
    case 'beginner': return 'easy';
    case 'intermediate': return 'medium';
    case 'advanced': return 'hard';
    default: return 'medium';
  }
};
```

### Colors
| Difficulty | Badge Color | Hex Code |
|------------|-------------|----------|
| Easy/Beginner | Green | `#22c55e` |
| Medium/Intermediate | Amber | `#f59e0b` |
| Hard/Advanced | Red | `#ef4444` |

---

## API Architecture Decisions

### Case Generation Flow
```
POST /api/cases/generate
  → Returns: { case_id, title, status }
  ↓
GET /api/cases/{case_id}
  → Returns: Full case data (specialty, difficulty, etc.)
  ↓
Prepend to UI list + Auto-open simulation
```

**Why not use /api/cases/recommended?**
- Thompson Sampling bandit prioritizes cases based on engagement history
- Newly generated cases may not appear in top recommendations immediately
- Direct fetch ensures we get the exact case data we need

**Future consideration:**
- If Thompson Sampling is enabled for personalized recommendations, newly generated cases should be flagged with high exploration priority to ensure they appear in recommendations

---

## Document History

| Date | Change |
|------|--------|
| 2026-04-16 | Initial document created |
| 2026-04-16 | Changed from alert dialog to auto-open |
| 2026-04-16 | Added FlatList rendering fixes |
| 2026-04-16 | Added difficulty color coding documentation |
| 2026-04-16 | Added API architecture decisions |
| 2026-04-16 | Removed DALL-E patient portrait feature from backend |

---

## Removed Features

### DALL-E Patient Portraits

**What was removed:** The backend DALL-E 3 patient portrait generation feature was completely removed.

**Why:** The feature was generating images of doctors (typically male in white coat) instead of patients. Even with attempts to fix it by passing age/sex demographics and improving prompts, the results weren't clinically useful. The focus should remain on medical imaging (X-rays, CT scans, ECGs) rather than photorealistic patient portraits.

**Impact on mobile app:**
- Patient portraits will not be displayed in the Physical Exam tab
- The `patient_image_url` field in cases will be empty
- No changes needed to mobile app code - it already handles missing images gracefully

**Original implementation (for reference):**
- Backend called `generate_patient_portrait()` in `src/simulation/media.py`
- Used OpenAI DALL-E 3 API
- Attempted to extract age/sex from case presentation text
- Returned image URL stored in `patient_image_url` field
