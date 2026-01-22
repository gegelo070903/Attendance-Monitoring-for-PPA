# Attendance Monitoring System

A full-stack attendance monitoring application built with Next.js, TypeScript, Prisma, and Tailwind CSS.

## Features

- ✅ User Authentication (Admin & Employee roles)
- ✅ Check-in/Check-out time tracking
- ✅ Dashboard with attendance statistics
- ✅ Admin panel for employee management
- ✅ Daily, weekly, and monthly reports
- ✅ Modern responsive UI

## Prerequisites

- Node.js 18+ (Download from https://nodejs.org/)
- npm (comes with Node.js)

## Getting Started

1. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/
   - Choose the LTS version

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Seed the database with initial data**
   ```bash
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

### Admin Account
- Email: admin@ppa.com
- Password: admin123

### Employee Account
- Email: employee@ppa.com
- Password: employee123

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js

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

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

## License

MIT
