# Attendance Monitoring System for PPA

## Project Overview
This is a full-stack Attendance Monitoring System built with Next.js, TypeScript, Prisma ORM, and Tailwind CSS.

## Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js

## Features
- User authentication (Admin and Employee roles)
- Check-in/Check-out time tracking
- Dashboard with attendance statistics
- Admin panel for employee management
- Reports generation (daily, weekly, monthly)
- Modern responsive UI

## Project Structure
```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── admin/          # Admin panel
│   │   └── auth/           # Authentication pages
│   ├── components/         # Reusable UI components
│   ├── lib/                # Utility functions and configurations
│   └── types/              # TypeScript type definitions
├── prisma/                 # Database schema and migrations
└── public/                 # Static assets
```

## Development Guidelines
- Follow Next.js App Router conventions
- Use Server Components by default, Client Components when needed
- Keep API routes in `src/app/api/`
- Use Prisma for all database operations
- Follow TypeScript strict mode
