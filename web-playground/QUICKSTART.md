# 🎵 Vibe IDE - Quick Start Guide

## One-Command Setup

```bash
cd web-playground
npm install && npm run dev
```

In another terminal:
```bash
node server.js
```

Then open: **http://localhost:5173**

## What You'll See

```
┌─────────────────────────────────────────────────────────┐
│  🎵 Vibe IDE    [main.vibe]    JavaScript ▼  Compile ⚡ │ ◄─ Top Bar
├──────┬────────────────────────────────────┬─────────────┤
│      │  main.vibe ✕ fibonacci.vibe ✕      │             │
│      ├────────────────────────────────────┤  📟 Terminal│ ◄─ Editor Tabs & Terminal
│      │                                     │  ⚠️ Problems│
│      │  fn greet(name: str) -> str {      │  📊 Output │
│ File │    format("Hello, {}", name)       │  🤖 AI     │
│      │  }                                  │             │
│ Tree │                                     │  [type cmd] │
│      ├────────────────────────────────────┤             │
│      │ ✅ Compiled JavaScript              │             │
│      │                                     │             │
│      │ console.log("Hello, World");        │             │
└──────┴────────────────────────────────────┴─────────────┘
```

## Key Controls

| Action | Keys/Click |
|--------|-----------|
| Compile | Click **Compile** or Ctrl+Enter |
| Switch file | Click tab |
| Close file | Click X on tab |
| Toggle sidebar | Click ☰ menu icon |
| Minimize terminal | Click **−** button |
| Clear terminal | Click trash icon |
| Switch terminal tab | Click Problems/Output/AI |
| Resize panel | Drag divider between panels |

## File Structure

- **src/** - Your Vibe source files
- **examples/** - Sample code
- **out/** - Compiled output

## Editor Features

✨ **Monaco Editor** with:
- Syntax highlighting (Vibe, JS, Python, Rust, etc.)
- Line numbers & folding
- Word wrap
- Format on paste
- Auto-layout

🎯 **Compilation Targets**:
- JavaScript
- Python
- Rust
- Go
- Java
- C++
- TypeScript

## Terminal Features

🖥️ **xterm.js** pseudo-terminal with:
- **Terminal tab**: Run commands (bash/powershell)
- **Problems tab**: Compilation errors
- **Output tab**: Logs & stdout
- **AI Console**: Ask Claude to refine code

Type commands:
```bash
npm run dev
npm build
python out.py
# etc.
```

## State Management

All state lives in **Zustand store** (`src/store.ts`):
- Current file & open files
- Editor code & target
- Compilation output
- Terminal output
- UI flags (sidebar, theme, etc.)

## API Endpoints (Backend)

```
POST /api/compile
  Body: { code, target, filename }
  Returns: { success, output/error }

GET /api/health
  Returns: { status, version }

GET /api/targets
  Returns: list of available targets
```

## Development

### File Changes Auto-reload
Vite HMR will reload the app when you edit:
- `src/App.tsx` or component files
- `src/store.ts` (state)
- `src/*.css` (styles)

No manual refresh needed!

### Build for Production
```bash
npm run build        # Creates dist/
npm run preview      # Test production build
```

### Type Checking
```bash
npm run type-check   # Find TypeScript errors
```

## Customization

### Add a New Component

1. Create `src/MyComponent.tsx`:
```typescript
import React from 'react';

export const MyComponent: React.FC = () => {
  return <div>Hello</div>;
};
```

2. Import in `src/App.tsx`:
```typescript
import { MyComponent } from './MyComponent';

// Inside App:
<MyComponent />
```

### Change Colors

Edit `:root` in `src/App.css`:
```css
:root {
  --color-primary: #60a5fa;    /* Change blue here */
  --color-accent: #ec4899;     /* Change pink here */
}
```

### Adjust Panel Sizes

In `src/App.tsx`, change `defaultSize`:
```typescript
<Panel defaultSize={20} minSize={15} maxSize={35}>  {/* Wider sidebar */}
```

## Keyboard Shortcuts (Future)

- `Ctrl+Shift+P` - Command palette
- `Ctrl+F` - Find in file
- `Ctrl+H` - Find & replace
- `Ctrl+Enter` - Compile
- `Ctrl+K+C` - Toggle comment
- `Ctrl+/` - Quick comment

*Not yet implemented — coming soon!*

## Troubleshooting

### **Port 5173 already in use?**
```bash
npm run dev -- --port 5174
```

### **Backend not responding?**
```bash
# Kill existing process
pkill -f "node server.js"

# Restart
node server.js
```

### **Terminal not showing?**
Click the toggle at top-right. Check console (F12) for errors.

### **Files not saving?**
Files are stored in **memory only** (Zustand store). To persist:
- Use localStorage: `useEffect(..., [editorState.code])`
- Or implement backend file storage

### **TypeScript errors?**
```bash
npm run type-check
```

Fix any errors in `src/` before pushing.

## Next Steps

1. ✅ Run dev server & explore the UI
2. 💾 Add file persistence (localStorage or API)
3. 🔌 Wire terminal to real shell (WebSocket)
4. 🤖 Connect AI Console to Claude API
5. 🎨 Customize colors & theme
6. 🚀 Deploy to production

---

**Ready? Open http://localhost:5173** 🚀
