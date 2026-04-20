# MidnightArchitect AI — SDLC Workspace

## Overview
AI-powered Software Development Lifecycle (SDLC) application built with **Next.js 14** (App Router). Provides AI-assisted generation of BRD, FRS, PRS documents and QA test suites. Runs on port **5000**.

## Architecture
- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS v4
- **State Management**: Zustand (auth store), TanStack Query (server state)
- **UI Library**: Custom Apple iOS design system (globals.css)
- **Backend**: FastAPI (separate service, connected via `src/lib/api.ts`)

## Design System — Apple iOS Theme
Full Apple iOS design language established in `src/app/globals.css`:
- **Primary**: `#007AFF` (iOS system blue)
- **Background**: `#F2F2F7` (iOS grouped background)
- **Surface**: `#FFFFFF` (iOS system background)
- **Labels**: `#1C1C1E` / `#8E8E93` (iOS label / secondary label)
- **Success**: `#34C759` | **Error**: `#FF3B30` | **Orange**: `#FF9500`
- **Font**: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue'`
- **Glass effect**: `rgba(255,255,255,0.72) + backdrop-filter: saturate(180%) blur(20px)`
- **Card shadow**: `0 1px 3px rgba(0,0,0,0.08)`, border-radius 12–24px

### Custom Utility Classes
- `.ios-btn-primary` / `.ios-btn-secondary` — iOS pill buttons
- `.ios-input` — iOS text field with blue focus ring
- `.ios-tag` — iOS-style pill tag/badge
- `.ios-card` — white card with ambient shadow
- `.glass` — frosted glass panel
- `.bg-surface-container` / `.text-on-surface` / `.text-tertiary` — surface tokens
- `.architect-select` / `.architect-options` — custom dropdown
- `.prose` — iOS-styled markdown renderer
- `.custom-scrollbar` — minimal scrollbar

## Key Files
```
src/
  app/
    globals.css                          # Full iOS design system
    login/page.tsx                       # Login page (2-column iOS layout)
    dashboard/
      layout.tsx                         # Auth guard + iOS shell
      page.tsx                           # Dashboard overview
      projects/page.tsx                  # Project listing
      requirements/
        brd/page.tsx                     # BRD Studio (standalone)
        frs/page.tsx                     # FRS Studio (uses StudioPageLayout)
        prs/page.tsx                     # PRS Studio (uses StudioPageLayout)
      qa/
        test-cases/page.tsx              # Test Case Generator
        test-data/page.tsx               # Test Data Generator
  components/
    Layout/
      Sidebar.tsx                        # iOS frosted glass sidebar w/ collapsible groups
      Header.tsx                         # iOS nav bar
      StudioPageLayout.tsx               # Shared studio UI (all studios use this)
    ui/
      SmartUpload.tsx                    # iOS drag-and-drop file uploader
  lib/
    api.ts                               # Axios instance → backend (DO NOT MODIFY)
  store/
    authStore.ts                         # Zustand auth state
```

## Studio Pages Pattern
All studio pages (FRS, PRS, Test Cases, Test Data) use `StudioPageLayout` which provides:
- Project selector dropdown
- Left panel: SmartUpload + history list
- Right panel: context textarea + quick tags + generate button
- Output canvas with IDLE / POLLING / SUCCESS / ERROR states
- Delete confirmation dialog

Each studio page only contains: state, mutation logic, and passes props to the shared layout.

## Running the App
```bash
npm run dev    # starts on port 5000 (workflow: "Start application")
```

## Important Notes
- **Backend connectivity** (`src/lib/api.ts`, API endpoints) must never be modified
- All auth flows (login, /auth/me, /auth/logout) are untouched
- The `ThemeProvider` still wraps the app; iOS dark mode uses `.dark` CSS class
- TypeScript strict mode — all files use proper types
