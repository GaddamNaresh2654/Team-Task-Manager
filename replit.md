# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (managed integration)
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui + Wouter routing

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Team Task Manager (TaskFlow)

A full-stack team task manager with Clerk auth, role-based access control, and project/task management.

### Artifacts

- `artifacts/task-manager` — React+Vite frontend, previewPath `/`
- `artifacts/api-server` — Express API server, previewPath `/api`

### Shared Libraries

- `lib/db` — Drizzle ORM schema + DB client (`@workspace/db`)
- `lib/api-spec` — OpenAPI spec + Orval codegen config (`@workspace/api-spec`)
- `lib/api-client-react` — Orval-generated React Query hooks (`@workspace/api-client-react`)
- `lib/api-zod` — Orval-generated Zod schemas (`@workspace/api-zod`)

### Database Schema

Tables: `users`, `projects`, `project_members`, `tasks`

- `users`: id (Clerk user ID), email, firstName, lastName, imageUrl
- `projects`: id (serial), name, description, ownerId, createdAt, updatedAt
- `project_members`: projectId, userId, role (admin|member), joinedAt
- `tasks`: id (serial), projectId, creatorId, assigneeId, title, description, status (todo|in_progress|done), priority (low|medium|high), dueDate, createdAt, updatedAt

### API Routes (all under /api)

- `GET /api/healthz` — health check
- `GET /api/users/me` — current user profile (auto-syncs to DB)
- `GET /api/users` — list all users
- `GET/POST /api/projects` — list/create projects
- `GET/PUT/DELETE /api/projects/:projectId` — get/update/delete project
- `GET/POST /api/projects/:projectId/members` — list/add members
- `PUT/DELETE /api/projects/:projectId/members/:memberId` — update/remove member
- `GET/POST /api/projects/:projectId/tasks` — list/create tasks
- `GET/PUT/DELETE /api/projects/:projectId/tasks/:taskId` — get/update/delete task
- `GET /api/dashboard/summary` — dashboard stats
- `GET /api/dashboard/my-tasks` — tasks assigned to current user
- `GET /api/dashboard/overdue` — overdue tasks

### Frontend Pages

- `/` — Landing page (signed-out) or redirect to /dashboard (signed-in)
- `/sign-in` / `/sign-up` — Clerk auth pages
- `/dashboard` — Stats overview, overdue alerts
- `/projects` — Project list with progress indicators
- `/projects/:projectId` — Kanban task board (todo/in_progress/done columns)
- `/projects/:projectId/settings` — Project settings + member management (admin only)

### RBAC

- Project **admin**: full control (edit, delete, manage members, manage tasks)
- Project **member**: view project, create/update tasks, cannot manage members or delete project

### Mutation Call Format (Orval-generated hooks)

Mutations use flat variables — NOT nested `params`:
- `createTask.mutate({ projectId, data: {...} })`
- `updateTask.mutate({ projectId, taskId, data: {...} })`
- `deleteTask.mutate({ projectId, taskId })`
- `updateProject.mutate({ projectId, data: {...} })`
- `deleteProject.mutate({ projectId })`
- `addMember.mutate({ projectId, data: {...} })`
- `updateMember.mutate({ projectId, userId, data: {...} })`
- `removeMember.mutate({ projectId, userId })`
