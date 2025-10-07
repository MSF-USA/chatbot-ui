# Complete App Restoration Plan

## Current Status
✅ CSS/Tailwind working
✅ Basic structure working
✅ Chat topbar with model selector + settings restored
✅ ModelSelect component fully restored with agent toggle & temperature
✅ SettingsDialog wired to ModelSelect
⚠️ Many features still missing from refactor

## Restoration Progress

### Completed
- ✅ ModelSelect.tsx - Full 312-line component with agent toggle, temperature control
- ✅ SettingsDialog - Now shows ModelSelect properly
- ✅ ChatTopbar - Model selector button + Request Support link

### In Progress
- 🔄 Dropdown.tsx + dependencies (requires 4+ files)

### Missing Dependencies
For Dropdown.tsx to work, need:
1. ❌ ChatInputImage.tsx - Image upload component
2. ❌ ChatInputImageCapture.tsx - Camera capture
3. ❌ ChatInputSearch.tsx - Web search modal (has agent integration)
4. ✅ ChatInputTranscribe.tsx - Already exists
5. ✅ ChatInputTranslate.tsx - Already exists
6. ❌ useEnhancedOutsideClick hook
7. ❌ onFileUpload utility function

## Files to Restore from Git (with adaptations)

### Priority 1: Critical Functionality

1. **Dropdown.tsx** (474 lines) - `git show 4edae29:components/Chat/ChatInput/Dropdown.tsx`
   - Provides: File upload, image upload, camera, search, translate, transcribe
   - Changes needed:
     - Replace `HomeContext` imports with Zustand hooks
     - Keep all functionality intact

2. **ChatInput.tsx** (622 lines) - `git show 4f6011a^:components/Chat/ChatInput.tsx`
   - Full featured input with dropdown integration
   - Changes needed:
     - Replace `useContext(HomeContext)` with `useConversations()`, `useChat()`, `useSettings()`
     - Wire `onSend` to new sendMessage from chatStore

3. **Sidebar.tsx** - Check if current version has all features
   - Need: Conversations tab, Prompts tab, search, new chat button
   - Bottom: User avatar + Settings button

### Priority 2: Important Features

4. **ModelSelect.tsx** (312 lines) - `git show 4f6011a^:components/Chat/ModelSelect.tsx`
   - Full model selector with agent toggle, temperature slider
   - Changes needed:
     - Replace HomeContext with `useSettings()` and `useConversations()`

5. **SettingsDialog** - Current stub needs full implementation
   - Should show ModelSelect content when opened

### Priority 3: Polish

6. Update suggested prompt icons to match screenshot 2
7. Add "Beta" badge to chat input
8. Ensure all translations work

## Migration Strategy

For each file:
1. Extract from git: `git show COMMIT:path/to/file.tsx > /tmp/original.tsx`
2. Identify all HomeContext usage
3. Map to equivalent Zustand hooks:
   - `state.selectedConversation` → `useConversations().selectedConversation`
   - `state.models` → `useSettings().models`
   - `state.apiKey` → `useSettings().apiKey`
   - `handleUpdateConversation` → `updateConversation(id, updates)`
4. Update imports
5. Test functionality

## Zustand Mapping Reference

| Old HomeContext | New Zustand Hook |
|----------------|------------------|
| `state.conversations` | `useConversations().conversations` |
| `state.selectedConversation` | `useConversations().selectedConversation` |
| `handleUpdateConversation` | `useConversations().updateConversation` |
| `handleNewConversation` | `useConversations().addConversation` |
| `state.messageIsStreaming` | `useChat().isStreaming` |
| `state.models` | `useSettings().models` |
| `state.apiKey` | `useSettings().apiKey` |
| `state.temperature` | `useSettings().temperature` |
| `state.systemPrompt` | `useSettings().systemPrompt` |
| `state.showChatbar` | `useUI().showChatbar` |
| `dispatch({type, payload})` | Call specific setter functions |

## Estimated Work
- Dropdown: 1 hour to adapt
- ChatInput: 1 hour to adapt
- ModelSelect: 30 min to adapt
- Sidebar updates: 30 min
- Testing: 1 hour

Total: ~4 hours of focused work

## Next Steps
Do you want me to:
A) Systematically restore each component one by one (will take many messages)
B) Create a single large PR with all changes
C) Focus on just the most critical features first (Dropdown + full ChatInput)
