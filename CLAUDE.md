# CLAUDE.md - AI Assistant Guide for GGK Education Platform

## Project Overview

GGK is a comprehensive **education and examination management platform** built for managing academic content, practice questions, mock exams, and student learning pathways. The platform supports multiple exam boards (Cambridge, Edexcel) across various academic levels (IGCSE, O-Level, A-Level).

### Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.5
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4 with custom theme
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **State Management**: React Query (TanStack Query v4) + React Context
- **Routing**: React Router DOM v6
- **Form Validation**: Zod
- **Icons**: Lucide React

## Quick Reference Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Testing
npm run test         # Run question data operations tests

# Utilities
npm run seed-test-users  # Seed test users for development
```

## Project Structure

```
GGK_LiveProduction/
├── src/
│   ├── app/                    # Page components organized by module
│   │   ├── auth/               # Auth callback handler
│   │   ├── entity-module/      # Entity admin dashboard
│   │   ├── landing/            # Public landing pages
│   │   ├── signin/             # Sign in page
│   │   ├── student-module/     # Student dashboard
│   │   ├── system-admin/       # System admin dashboard
│   │   └── teachers-module/    # Teachers dashboard
│   ├── components/             # Reusable UI components
│   │   ├── admin/              # Admin-specific components
│   │   ├── answer-formats/     # Answer input components
│   │   ├── auth/               # Auth components (ProtectedRoute)
│   │   ├── configuration/      # Config components
│   │   ├── entity/             # Entity-specific components
│   │   ├── forms/              # Form components
│   │   ├── layout/             # Layout components
│   │   ├── practice/           # Practice mode components
│   │   ├── question-import/    # Question import workflow
│   │   └── shared/             # Shared/common components
│   ├── contexts/               # React contexts
│   │   ├── PermissionContext.tsx
│   │   └── UserContext.tsx
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core libraries
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── constants/          # App constants
│   │   ├── data-operations/    # Database operations
│   │   ├── extraction/         # Data extraction utilities
│   │   ├── helpers/            # Helper functions
│   │   ├── sessionManager.ts   # Session management
│   │   ├── supabase.ts         # Supabase client
│   │   ├── theme.ts            # Theme configuration
│   │   └── validation/         # Validation utilities
│   ├── pages/                  # Additional pages
│   ├── providers/              # React providers
│   ├── services/               # Business logic services
│   ├── styles/                 # Global styles
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── supabase/
│   ├── functions/              # Edge functions
│   └── migrations/             # Database migrations
├── tests/                      # Test files
├── scripts/                    # Utility scripts
└── JSON/                       # Sample JSON data
```

## User Roles & Modules

The application has role-based access control with the following roles:

| Role | Module Access | Description |
|------|--------------|-------------|
| `SSA` | All modules | System Super Admin - full access |
| `SUPPORT` | system-admin | Support staff with admin access |
| `VIEWER` | system-admin | Read-only admin access |
| `ENTITY_ADMIN` | entity-module | School/organization administrator |
| `TEACHER` | teachers-module | Teacher with class management |
| `STUDENT` | student-module | Student with practice access |

### Module Routes

- `/app/system-admin/*` - System administration (SSA, SUPPORT, VIEWER)
- `/app/entity-module/*` - Entity/organization management (SSA, ENTITY_ADMIN)
- `/app/student-module/*` - Student dashboard (SSA, STUDENT)
- `/app/teachers-module/*` - Teacher dashboard (SSA, TEACHER)

## Key Conventions

### 1. Brand Colors (CRITICAL)

**Primary brand color is GREEN (#8CC63F), NOT blue.**

```typescript
// CORRECT - Use green for active/primary states
import { ACTIVE_STATE_CLASS, PRIMARY_BUTTON_CLASS } from '@/lib/theme';

// Active state
<button className={cn('px-4 py-2', isActive && ACTIVE_STATE_CLASS)}>

// Primary button
<button className={PRIMARY_BUTTON_CLASS}>Submit</button>

// DO NOT use blue for primary actions
// Blue is ONLY for informational messages
```

See `src/lib/THEME_GUIDELINES.md` for complete color guidelines.

### 2. Loading States

Use the shared `LoadingSpinner` component consistently:

```typescript
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LoadingOverlay } from '@/components/shared/LoadingOverlay';

// Page loading
<LoadingSpinner size="lg" message="Loading..." />

// Button loading
<Button disabled={loading}>
  {loading ? <><LoadingSpinner size="sm" inline /><span className="ml-2">Saving...</span></> : 'Save'}
</Button>

// Full page overlay
{isProcessing && <LoadingOverlay message="Processing..." />}
```

See `src/components/shared/LOADING_SPINNER_GUIDE.md` for complete usage.

### 3. Path Aliases

Use the `@/` alias for imports from the `src/` directory:

```typescript
import { Button } from '@/components/shared/Button';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/questions';
```

### 4. File Header Comments

Include descriptive header comments for major files:

```typescript
/**
 * File: /src/components/MyComponent.tsx
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *
 * Preserved Features:
 *   - List important features maintained
 *
 * Database Tables:
 *   - List tables this component interacts with
 *
 * Connected Files:
 *   - List related files
 */
```

### 5. Question Types & Answer Formats

The platform supports these question types:

```typescript
type QuestionType = 'mcq' | 'tf' | 'descriptive' | 'complex';

type AnswerFormat =
  | 'single_word' | 'single_line' | 'multi_line'
  | 'two_items' | 'two_items_connected'
  | 'calculation' | 'equation'
  | 'table' | 'table_completion'
  | 'diagram' | 'graph'
  | 'code' | 'audio' | 'file_upload'
  | 'chemical_structure' | 'structural_diagram'
  | 'not_applicable';
```

## Environment Variables

Required environment variables (create `.env` file):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Architecture

### Key Tables

- `users` - User accounts and profiles
- `question_master_admin` - Main questions table
- `sub_questions` - Question parts/subparts
- `question_correct_answers` - Correct answers with alternatives
- `question_options` - MCQ options
- `question_attachments` - Question media files
- `paper_setup` - Exam papers metadata
- `past_paper_import_sessions` - Import tracking
- `edu_subjects`, `edu_regions`, `edu_programs`, `edu_providers` - Education catalogue

### Supabase Edge Functions

Located in `supabase/functions/`:
- `create-admin-user-auth` - Create admin users
- `create-teacher-student-user` - Create teacher/student users
- `generate-signed-video-url` - Secure video URLs
- `send-email` - Email notifications
- `upload-subject-logo` - Subject logo uploads
- Various user management functions

## Key Components

### Shared Components (`src/components/shared/`)

- `Button.tsx` - Styled button component
- `LoadingSpinner.tsx` - Loading indicator
- `Toast.tsx` - Toast notifications
- `DataTable.tsx` - Data table with pagination
- `QuestionSelector.tsx` / `EnhancedQuestionSelector.tsx` - Question selection
- `DynamicAnswerField.tsx` - Dynamic answer input based on format
- `UnifiedTestSimulation.tsx` - Test simulation mode
- `QuestionImportReviewWorkflow.tsx` - Question import process

### Answer Format Components (`src/components/answer-formats/`)

Specialized input components for different answer formats:
- `AudioRecorder/` - Audio recording
- `ChemicalStructureEditor/` - Chemistry diagrams
- `CodeEditor/` - Code input
- `DiagramCanvas/` - Drawing diagrams
- `GraphPlotter/` - Graph plotting
- `TableCreator/` / `TableInput/` - Table answers

### Services (`src/services/`)

- `mockExamService.ts` - Mock exam management
- `practiceService.ts` - Practice mode logic
- `userCreationService.ts` - User creation workflows
- `questionNavigationService.ts` - Question navigation
- `TableTemplateService.ts` - Table completion templates

### Custom Hooks (`src/hooks/`)

- `useAccessControl.ts` - Permission checking
- `useAnswerValidation.ts` - Answer validation
- `useMockExams.ts` - Mock exam state
- `useQuestionNavigation.ts` - Question navigation
- `useModuleSecurity.ts` - Module security

## Development Workflow

### 1. Adding New Features

1. Create components in appropriate directory
2. Add types to `src/types/`
3. Add service logic to `src/services/`
4. Use theme constants for styling
5. Follow existing patterns in similar components

### 2. Database Changes

1. Create migration in `supabase/migrations/`
2. Update types in `src/types/`
3. Update data operations in `src/lib/data-operations/`

### 3. Adding Edge Functions

1. Create function in `supabase/functions/[function-name]/`
2. Add `index.ts` with Deno handler
3. Deploy via Supabase CLI

## Important Notes

### Session Management

- Session manager handles auto-logout and session warnings
- Grace period prevents false session expirations during page loads
- Long operations can request activity confirmation

### Test Mode

- Test mode available for admin users to test as different roles
- `TestModeBar` component shows when in test mode
- Use `isInTestMode()` and `getCurrentUser()` from `@/lib/auth`

### Security

- Row Level Security (RLS) enforced on Supabase tables
- Protected routes require authentication
- Role-based module access enforced in `App.tsx`

### Performance

- React Query handles data caching and refetching
- Vite code splitting configured for optimal bundle sizes
- Lazy loading used for heavy components

## Common Tasks

### Create a New Protected Page

```typescript
// 1. Create page component in src/app/[module]/
export default function MyPage() {
  return <div>My Page Content</div>;
}

// 2. Add route in App.tsx within appropriate module
<Route path="/app/system-admin/my-page" element={<MyPage />} />
```

### Add a New Service

```typescript
// src/services/myService.ts
import { supabase } from '@/lib/supabase';

export const myService = {
  async fetchData() {
    const { data, error } = await supabase
      .from('my_table')
      .select('*');
    if (error) throw error;
    return data;
  }
};
```

### Use React Query for Data Fetching

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['myData'],
  queryFn: () => myService.fetchData()
});
```

## Troubleshooting

### Common Issues

1. **Session Expired Errors**: Check if `SUPABASE_SESSION_REQUIRED_KEY` is set correctly
2. **Permission Denied**: Verify user role matches required module access
3. **Build Errors**: Run `npm run lint` to check for TypeScript errors
4. **Missing Env Vars**: Ensure `.env` file has all required variables

### Debug Mode

Check browser console for detailed logs:
- `[Auth]` - Authentication events
- `[App]` - Application lifecycle
- `[Session]` - Session management

## Documentation Files

Additional documentation available in project root:
- Many `*_FIX_*.md` files document bug fixes and implementations
- `*_IMPLEMENTATION_*.md` files detail feature implementations
- `*_GUIDE.md` files provide usage guidance

## Contributing

1. Follow existing code patterns and conventions
2. Use TypeScript strict mode
3. Apply theme constants for styling
4. Add appropriate comments and documentation
5. Test with different user roles
6. Ensure no ESLint errors before committing
