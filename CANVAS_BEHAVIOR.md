# Canvas Behavior - Conversation Switching

**Date:** November 14, 2025
**Status:** ✅ **IMPLEMENTED**

---

## Decision: Option A - Clear Canvas on Conversation Switch

### Behavior:

When a user switches conversations or starts a new chat, the canvas **automatically clears** to provide clean separation between conversations.

---

## Implementation Details

### 1. Conversation Switch Clearing

**File:** `app/(app)/chatbot/page.tsx` (lines 169-182)

```typescript
// Clear canvas when switching conversations (Option A: Clean separation)
useEffect(() => {
  if (selectedConversation !== null) {
    console.log("[Canvas] Conversation switched, clearing canvas");
    setCanvasData({
      type: null,
      essayId: null,
      studentId: null,
      isExpanded: false,
    });
  }
}, [selectedConversation]);
```

**Triggers when:**
- User clicks on a different conversation in the chat history
- `selectedConversation` state changes to a new conversation ID

**What happens:**
- Canvas data is cleared (type, essayId, studentId all set to null)
- Canvas collapses (isExpanded set to false)
- Empty state is shown in canvas area
- sessionStorage is cleared (via existing effect on line 138-154)

---

### 2. New Chat Clearing

**File:** `app/(app)/chatbot/page.tsx` (lines 631-646)

```typescript
const handleNewChat = () => {
  setMessages([]);
  setSelectedConversation(null);
  setInput("");
  setAttachedImages([]);
  setShowRetryButton(false);
  setLastFailedMessage(null);
  // Clear canvas when starting new chat
  console.log("[Canvas] New chat started, clearing canvas");
  setCanvasData({
    type: null,
    essayId: null,
    studentId: null,
    isExpanded: false,
  });
};
```

**Triggers when:**
- User clicks "New Chat" button
- User clicks "+ New Chat" in sidebar

**What happens:**
- All messages cleared
- Conversation ID set to null
- Input field cleared
- Canvas data cleared
- Canvas shows empty state

---

## User Experience

### Scenario 1: Switch Between Conversations

**User Flow:**
1. User is in Conversation A, working on Sarah's essay
2. Canvas shows Sarah's essay
3. User clicks on Conversation B in chat history
4. ✅ **Canvas immediately clears**
5. Canvas shows empty state: "No content loaded yet"
6. User asks about John's essay in Conversation B
7. AI loads John's essay into canvas
8. Canvas shows John's essay

**Benefit:** Clear separation, no confusion about which student/essay is being discussed

---

### Scenario 2: Start New Chat

**User Flow:**
1. User is in an existing conversation
2. Canvas shows a student profile
3. User clicks "New Chat"
4. ✅ **Canvas immediately clears**
5. Canvas shows empty state
6. User starts fresh conversation
7. If user asks about a student/essay, it loads into canvas

**Benefit:** Fresh start, clean slate

---

### Scenario 3: Canvas Auto-Loads in Current Conversation

**User Flow:**
1. User is in Conversation A, canvas is empty
2. User asks: "Show me Sarah's essay"
3. AI loads Sarah's essay into canvas
4. Canvas auto-enables and slides in (existing behavior)
5. User can view and edit essay
6. User switches to Conversation B
7. ✅ **Canvas clears**
8. User asks: "Review John's application"
9. AI loads John's student profile into canvas
10. Canvas shows John's profile

**Benefit:** Each conversation has its own canvas context

---

## Why This Approach?

### ✅ Advantages:

1. **Clear Mental Model**
   - Each conversation is independent
   - No confusion about "which context am I in?"
   - Canvas reflects current conversation's work

2. **Prevents Errors**
   - User won't accidentally edit wrong student's essay
   - No risk of "I thought I was working on Sarah but it's showing John"
   - Clear visual feedback when switching

3. **Clean UX**
   - Fresh start with each conversation
   - Easy to understand behavior
   - Predictable and consistent

4. **Fits Natural Workflow**
   - Conversations are typically about different students/topics
   - When you switch conversations, you're switching context
   - Canvas should match that context switch

### ❌ Trade-offs:

1. **Can't Reference Across Conversations**
   - If you want to view Sarah's essay while talking about John, you can't
   - **Workaround:** Open Sarah's essay in a new conversation or refresh it in current

2. **Lose "Pinned" Behavior**
   - Canvas doesn't act as a persistent reference panel
   - **Alternative:** Could add a "pin" feature in future if needed

---

## Alternative Approaches (Not Chosen)

### Option B: Keep Canvas Showing
- Canvas would persist across conversation switches
- **Rejected because:** Too confusing, user might think AI is working with wrong data

### Option C: Smart Context Matching
- Each conversation remembers its own canvas
- **Rejected because:** Too complex, harder to implement, unclear UX

---

## Console Logging

For debugging, the following console logs are added:

```
[Canvas] Conversation switched, clearing canvas
[Canvas] New chat started, clearing canvas
```

These help track when and why the canvas is being cleared during development.

---

## Future Enhancements

### Potential Additions:

1. **"Pin Canvas" Feature**
   - Allow user to pin canvas content across conversations
   - Toggle: "Keep canvas when switching conversations"

2. **Canvas History**
   - Remember last 5 canvas items per conversation
   - Quick access to recently viewed essays/students

3. **Multi-Canvas**
   - Side-by-side comparison
   - Show Sarah's essay AND John's essay simultaneously

4. **Canvas Restore**
   - "Recently cleared" notification
   - Quick button to restore previous canvas content

---

## Testing

### Manual Tests Performed:

✅ **Test 1: Switch Conversations**
- Started in Conv A with essay loaded
- Switched to Conv B
- Result: Canvas cleared, showed empty state

✅ **Test 2: New Chat**
- Had student profile loaded
- Clicked "New Chat"
- Result: Canvas cleared, showed empty state

✅ **Test 3: Load After Switch**
- Switched to empty conversation
- Asked AI to load essay
- Result: Canvas loaded essay correctly

✅ **Test 4: Multiple Switches**
- Switched between 3 different conversations
- Result: Canvas cleared every time

---

## Compilation Status

```
✓ Compiled in 474ms (4773 modules)
```

All changes compiled successfully with zero errors.

---

## Summary

✅ Canvas clears when switching conversations
✅ Canvas clears when starting new chat
✅ Clean separation between conversation contexts
✅ Prevents confusion about which student/essay is active
✅ Simple, predictable behavior
✅ Console logs for debugging

**Status: PRODUCTION READY**

The canvas now provides clear, independent context for each conversation. When you switch conversations, you get a clean slate - and when the AI loads new content, it appears in the canvas for that specific conversation.
