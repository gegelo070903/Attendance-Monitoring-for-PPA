# Attendance Monitoring System for PPA (Philippine Ports Authority)

---

## Project Overview

This is a full-stack, offline-capable **Attendance Monitoring System** built for the Philippine Ports Authority (PPA). It runs on a **single server PC** and is accessible by other PCs/devices on the same local network via a web browser — **no internet required**.

The system uses **QR code scanning** for employee check-in/check-out, supports **AM, PM, and Night shifts**, captures **face photos** on scan, generates **reports**, and provides a complete **admin panel** for employee and attendance management.

---

## Tech Stack

| Technology                  | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| **Next.js 14** (App Router) | Full-stack web framework (frontend + API)                |
| **TypeScript**              | Type-safe programming language                           |
| **SQLite** (via Prisma ORM) | Embedded file-based database — no separate server needed |
| **Tailwind CSS**            | Utility-first CSS styling                                |
| **NextAuth.js**             | Authentication (email/password with JWT sessions)        |
| **Socket.IO**               | Real-time updates (live attendance feed)                 |
| **html5-qrcode**            | QR code scanning via device camera                       |
| **bcryptjs**                | Password hashing                                         |
| **date-fns**                | Date/time formatting and calculations                    |
| **qrcode**                  | QR code generation for employee IDs                      |
| **node-forge**              | Self-signed HTTPS certificate generation                 |

---

## System Requirements

### Server PC (the device that runs the system)

- **Operating System**: Windows 10 or later
- **Node.js**: v18 or higher (download from https://nodejs.org)
- **RAM**: 4 GB minimum
- **Storage**: 500 MB+ for the application, database grows over time
- **Network**: Connected to same WiFi/LAN as other PCs
- **Camera**: Required if this PC is also the scanning station

### Client PCs (other devices that access the system)

- **Any device with a web browser** (Chrome, Edge, Firefox, Safari)
- **Connected to the same WiFi/LAN** as the server PC
- **No installation required** — just open the URL in a browser

---

## Features

### Employee Features

- **Dashboard** — View today's attendance (AM/PM/Night times), monthly statistics
- **My QR Code** — View, download, and print personal QR code for scanning
- **Profile Management** — Update department, position, and profile photo
- **Attendance History** — View personal attendance records with filters
- **Reports** — View personal attendance reports (daily, weekly, monthly)
- **Change Password** — Update account password

### Admin Features

- **Admin Dashboard** — Overview stats (total employees, present/absent/late today)
- **QR Scanner Station** — Scan employee QR codes for check-in/check-out with face capture
- **Employee Management** — Full CRUD (create, read, update, delete employees)
- **Attendance Management** — View and manage all employee attendance records
- **Reports** — Generate reports for all employees with date filters
- **Activity Logs** — Full audit trail of all system events (logins, scans, changes)
- **Settings** — Configure shift times, grace periods, and late thresholds
- **Database Backup & Restore** — Create, download, delete, and restore database backups
- **ID Card Printing** — Generate and print PPA-branded employee ID cards with QR codes

### System Features

- **Offline & Local** — Works 100% without internet on a local network
- **Real-time Updates** — Live attendance updates via WebSocket (Socket.IO)
- **Dark/Light Theme** — Toggle between dark and light mode
- **Face Capture** — Captures employee photo during QR scan for verification
- **Shift Support** — AM (morning), PM (afternoon), and Night shifts
- **Grace Period** — Configurable late thresholds per shift
- **Auto-start** — Can be configured to start automatically on PC boot
- **Activity Logging** — Every action is logged for audit purposes

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema (5 models)
│   └── dev.db                 # SQLite database file (all data stored here)
│
├── public/
│   ├── images/                # Static images (PPA logos)
│   └── uploads/               # Upload directories
│       ├── profiles/          # Profile images
│       └── scans/             # Scan photos
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout (Providers wrapper)
│   │   ├── page.tsx           # Landing page (login/scanner links)
│   │   ├── globals.css        # Global styles
│   │   │
│   │   ├── auth/              # Authentication pages
│   │   │   ├── login/page.tsx     # Login form
│   │   │   └── register/page.tsx  # Registration form
│   │   │
│   │   ├── dashboard/         # Employee pages (requires login)
│   │   │   ├── layout.tsx         # Auth-protected layout with Sidebar
│   │   │   ├── page.tsx           # Employee dashboard
│   │   │   ├── attendance/page.tsx # Personal attendance history
│   │   │   ├── my-qr/page.tsx     # Personal QR code viewer
│   │   │   ├── profile/page.tsx   # Profile editor
│   │   │   └── reports/page.tsx   # Personal reports
│   │   │
│   │   ├── admin/             # Admin pages (requires ADMIN role)
│   │   │   ├── layout.tsx         # Admin-protected layout with Sidebar
│   │   │   ├── page.tsx           # Admin dashboard (stats overview)
│   │   │   ├── employees/page.tsx # Employee CRUD management
│   │   │   ├── attendance/page.tsx # All attendance records
│   │   │   ├── reports/page.tsx   # All-employee reports
│   │   │   ├── activity-logs/page.tsx # System audit logs
│   │   │   └── settings/page.tsx  # System settings
│   │   │
│   │   ├── scan/              # QR Scanner station (public page)
│   │   │   └── page.tsx           # Scanner with face capture
│   │   │
│   │   └── api/               # Backend API routes
│   │       ├── auth/              # Authentication endpoints
│   │       │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │       │   ├── register/route.ts       # User registration
│   │       │   └── logout/route.ts         # Logout logging
│   │       │
│   │       ├── attendance/        # Attendance endpoints
│   │       │   ├── route.ts           # GET attendance records
│   │       │   ├── qr/route.ts        # QR scan processing (core logic)
│   │       │   └── photo/             # Scan photo management
│   │       │       ├── route.ts       # Upload scan photo
│   │       │       └── update/route.ts # Link photo to activity log
│   │       │
│   │       ├── employees/route.ts     # Employee CRUD (admin)
│   │       ├── dashboard/route.ts     # Dashboard statistics
│   │       ├── activity-logs/route.ts # Activity log queries
│   │       ├── settings/route.ts      # System settings CRUD
│   │       ├── files/[id]/route.ts    # Binary file serving
│   │       ├── profile/              # Profile management
│   │       │   ├── update/route.ts    # Update profile fields
│   │       │   └── upload/route.ts    # Upload profile image
│   │       ├── user/
│   │       │   └── change-password/route.ts  # Password change
│   │       ├── health/route.ts        # Health check
│   │       └── socket_io/route.ts     # WebSocket server
│   │
│   ├── components/            # React UI components
│   │   ├── Providers.tsx          # Root context providers
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── QRScanner.tsx          # QR code scanner (camera)
│   │   ├── QRCodeGenerator.tsx    # QR code generator (for employees)
│   │   ├── FaceCapture.tsx        # Face photo capture on scan
│   │   ├── AttendanceTable.tsx    # Attendance records table
│   │   ├── CheckInOutButton.tsx   # Manual check-in/out toggle
│   │   ├── IDCardPrinter.tsx      # PPA ID card generator/printer
│   │   ├── StatsCard.tsx          # Dashboard statistics card
│   │   ├── PPALogo.tsx            # PPA logo component
│   │   ├── ThemeProvider.tsx      # Dark/light theme manager
│   │   ├── Toast.tsx              # Toast notification system
│   │   └── WatercolorBackground.tsx # Decorative background
│   │
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── activityLogger.ts      # Activity logging utility
│   │   ├── utils.ts               # Date/time/status helpers
│   │   ├── socketServer.ts        # Socket.IO server setup
│   │   ├── useAttendanceSocket.ts # Real-time attendance hook
│   │   ├── useDashboardSocket.ts  # Real-time dashboard hook
│   │   └── useActivityLogSocket.ts # Real-time activity log hook
│   │
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts               # Core interfaces (User, Attendance, etc.)
│   │   └── next-auth.d.ts        # NextAuth type extensions
│   │
│   └── pages/api/             # Legacy pages directory (Socket.IO compat)
│
├── START-SERVER.bat           # Start the server (main entry point)
├── AUTO-START.bat             # Auto-restart server on crash (24/7 mode)
├── INSTALL-AUTO-START.bat     # Install Windows auto-start on boot
├── UNINSTALL-AUTO-START.bat   # Remove Windows auto-start
├── package.json               # Dependencies and scripts
├── next.config.mjs            # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── prisma/schema.prisma       # Database schema
```

---

## Database Schema (SQLite)

The database is a single file: `prisma/dev.db`

### Models

| Model           | Purpose                          | Key Fields                                                                                                                                      |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**        | Employees and admins             | `id`, `email` (unique), `name`, `password` (hashed), `role` (ADMIN/EMPLOYEE), `department`, `position`, `shiftType` (DAY/NIGHT), `profileImage` |
| **Attendance**  | Daily attendance per user        | `userId` (FK), `date`, `amIn/amOut`, `pmIn/pmOut`, `nightIn/nightOut`, `status` (PRESENT/LATE/HALF_DAY/ABSENT), `workHours`                     |
| **FileUpload**  | Binary file storage (images)     | `filename`, `mimeType`, `data` (binary bytes)                                                                                                   |
| **ActivityLog** | Audit trail for all events       | `userId`, `action`, `description`, `type` (INFO/SUCCESS/WARNING/ERROR), `scanPhoto`, `metadata` (JSON)                                          |
| **Settings**    | System configuration (singleton) | Shift start/end times, grace periods per shift, late threshold                                                                                  |

---

## API Endpoints

### Authentication

| Method | Endpoint                  | Description                                  |
| ------ | ------------------------- | -------------------------------------------- |
| POST   | `/api/auth/[...nextauth]` | NextAuth login handler (email + password)    |
| POST   | `/api/auth/register`      | Register new user (EMPLOYEE role by default) |
| POST   | `/api/auth/logout`        | Log logout event                             |

### Attendance

| Method   | Endpoint                       | Description                                                                                                    |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| GET      | `/api/attendance`              | Fetch attendance records (filtered by user/date)                                                               |
| GET/POST | `/api/attendance/qr`           | **Core endpoint** — process QR scan, record AM/PM/Night check-in/out, calculate work hours, determine lateness |
| POST     | `/api/attendance/photo`        | Upload scan face photo                                                                                         |
| POST     | `/api/attendance/photo/update` | Link photo to activity log entry                                                                               |

### Employee Management (Admin)

| Method | Endpoint         | Description                       |
| ------ | ---------------- | --------------------------------- |
| GET    | `/api/employees` | List all employees                |
| POST   | `/api/employees` | Create new employee               |
| PUT    | `/api/employees` | Update employee details           |
| DELETE | `/api/employees` | Delete employee and their records |

### Dashboard & Reports

| Method | Endpoint             | Description                            |
| ------ | -------------------- | -------------------------------------- |
| GET    | `/api/dashboard`     | Dashboard statistics (today + monthly) |
| GET    | `/api/activity-logs` | Paginated activity logs with filters   |

### Backup Management (Admin)

| Method         | Endpoint                                         | Description                                               |
| -------------- | ------------------------------------------------ | --------------------------------------------------------- |
| GET            | `/api/backup`                                    | List backup files and storage stats                       |
| POST           | `/api/backup`                                    | Create a new database backup                              |
| PUT            | `/api/backup`                                    | Restore database from selected backup (creates safe copy) |
| DELETE         | `/api/backup`                                    | Delete a selected backup file                             |
| PATCH          | `/api/backup`                                    | Upload an external `.db` backup file to the backups list  |
| GET (download) | `/api/backup?action=download&filename=<file>.db` | Download a backup file                                    |

### Profile & Settings

| Method  | Endpoint                    | Description                         |
| ------- | --------------------------- | ----------------------------------- |
| GET/PUT | `/api/profile/update`       | View/update user profile            |
| POST    | `/api/profile/upload`       | Upload profile image (max 5MB)      |
| POST    | `/api/user/change-password` | Change user password                |
| GET/PUT | `/api/settings`             | View/update system settings (admin) |

### Other

| Method | Endpoint          | Description                       |
| ------ | ----------------- | --------------------------------- |
| GET    | `/api/files/[id]` | Serve stored files (images) by ID |
| GET    | `/api/health`     | Health check (`{ ok: true }`)     |

---

## UI Components

| Component                | Description                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **QRScanner**            | Camera-based QR code scanner using `html5-qrcode`. Validates PPA attendance format, prevents duplicate scans, captures video frame on success. |
| **FaceCapture**          | Opens front camera, shows motivational message, auto-captures after 5s countdown. Preview, retake, and skip options.                           |
| **QRCodeGenerator**      | Generates employee QR code with PPA logo overlay. Download as PNG and print support.                                                           |
| **IDCardPrinter**        | Generates printable PPA-branded ID card (2.125" × 3.375") with name, department, position, photo, and QR code.                                 |
| **AttendanceTable**      | Responsive table with AM/PM/Night columns, work hours, status badges, and real-time WebSocket updates.                                         |
| **Sidebar**              | Navigation with role-based links (employee vs admin items), theme toggle, and logout.                                                          |
| **StatsCard**            | Reusable stat display card with 7 color themes and dark mode support.                                                                          |
| **ThemeProvider**        | Dark/light theme context with localStorage persistence and system preference detection.                                                        |
| **Toast**                | Notification system (success/error/warning/info) with 4s auto-dismiss.                                                                         |
| **CheckInOutButton**     | Manual check-in/out toggle with current status display.                                                                                        |
| **PPALogo**              | PPA logo with optional text. Full and simple variants.                                                                                         |
| **WatercolorBackground** | Decorative SVG background with Philippine flag colors (blue/red).                                                                              |
| **Providers**            | Root wrapper composing SessionProvider + ThemeProvider + ToastProvider.                                                                        |

---

## How the QR Scanning Works

1. **Admin opens Scanner Station** (`/scan` page)
2. **Employee presents QR code** to the camera
3. **System reads the QR code** (format: `PPA_ATTENDANCE|email|name`)
4. **System determines the scan type** based on current time and existing records:
   - AM In → AM Out → PM In → PM Out (Day shift)
   - Night In → Night Out (Night shift)
5. **Face capture activates** — takes a photo of the employee (5s countdown)
6. **Record is saved** with timestamp, lateness calculation, and work hours
7. **Real-time update** broadcasts to all connected dashboards via Socket.IO
8. **Activity log entry** is created with all scan details

### Shift Schedule (configurable in Settings)

| Shift | Default Start | Default End | Grace Period |
| ----- | ------------- | ----------- | ------------ |
| AM    | 08:00         | 12:00       | 15 minutes   |
| PM    | 13:00         | 17:00       | 15 minutes   |
| Night | 22:00         | 06:00       | 15 minutes   |

---

## Deployment Architecture (Local Network)

```
  ┌─────────────────────────┐
  │    SERVER PC             │
  │  (runs the system)       │
  │                          │
  │  Node.js + Next.js       │
  │  SQLite Database         │
  │  All APIs & Logic        │
  │                          │
   │  URL: https://192.168.x.x:3000 │
  └────────┬────────────────┘
           │ Local WiFi / LAN
     ┌─────┼─────┬──────────┐
     │     │     │          │
  ┌──▼──┐ ┌▼───┐ ┌▼────┐ ┌─▼────┐
  │PC 2 │ │PC 3│ │PC 4 │ │Phone │
  │Admin│ │Emp │ │Emp  │ │Scan  │
  │Panel│ │Dash│ │Dash │ │Station│
  └─────┘ └────┘ └─────┘ └──────┘
  (browser) (browser) (browser) (browser)
```

- **Only the server PC** needs Node.js installed
- **All other devices** just open a browser and navigate to the server URL
- **No internet required** — everything runs on the local network
- **The database** is stored on the server PC only

---

## Setup Instructions (First Time on a New PC)

### Step 1: Install Node.js

1. Download Node.js (v18+) from https://nodejs.org
2. Run the installer, accept defaults
3. Restart the PC after installation

### Step 2: Copy the Project

1. Copy the entire project folder to the new PC
2. Recommended location: `C:\PPA Attendance\` or `Documents\PPA Attendance\`

### Step 3: Install Dependencies

1. Open a terminal/command prompt in the project folder
2. Run: `npm install`
3. Run: `npx prisma generate`
4. Run: `npx prisma db push`

### Step 4: Start the Server

- **Option A (Recommended for scanner use)**: Double-click `START-SERVER.bat` (HTTPS + auto certificate generation)
- **Option B**: Run `npm run dev` (development mode, HTTP)
- **Option C**: Run `npm run build` then `npm start` (production mode, HTTP)
- **Option D**: Run `npm run start:https` (production mode, HTTPS)

### Step 5: Access from Other PCs

1. Note the **Network URL** shown in the terminal (e.g., `https://192.168.1.100:3000`)
2. On other PCs, open a browser and enter that URL
3. If browser shows certificate warning, click **Advanced** then **Proceed** (self-signed certificate)
4. If Windows Firewall asks, click **"Allow access"**

### Step 6: Create Admin Account

1. Navigate to the registration page
2. Create the first admin account
3. (Or use existing data if you copied the `prisma/dev.db` file)

---

## Transferring to Another PC

### Transfer WITH Existing Data

1. Copy the **entire project folder** including `prisma/dev.db`
2. On the new PC: Install Node.js, run `npm install`, then `START-SERVER.bat`
3. All employees, attendance records, settings, and logs will be preserved

### Transfer WITHOUT Data (Fresh Start)

1. Copy the project folder **without** `prisma/dev.db`
2. On the new PC: Install Node.js, run `npm install`
3. Run `npx prisma db push` to create a fresh database
4. Start the server and register a new admin account

### Backup Strategy

- The file `prisma/dev.db` contains **ALL system data**
- Periodically copy this file to a USB drive or backup location
- To restore: replace `prisma/dev.db` with the backup copy

### Upload Backup Database (Admin)

Use this when you have a backup database file from another PC, USB drive, or external storage.

1. Log in as an **Admin**.
2. Open **Admin → Settings**.
3. Go to the **Database Backup & Storage** section.
4. Click **Upload Backup**.
5. Select your backup file (`.db` only).
6. Wait for the success toast message.
7. Confirm the uploaded file appears in the backup list (it will be saved with an `uploaded_YYYY-MM-DD_HH-MM-SS.db` style name).
8. If you want to use it as the active database, click **Restore** on that uploaded file.
9. Restart the server after restore so all modules use the restored data.

Important notes:

- Accepted file type: `.db` only.
- Maximum upload size: `500 MB`.
- Uploading a backup does not immediately replace the active database; only **Restore** does that.
- The system automatically creates a safety backup before restore.

---

## Batch Files (Windows)

| File                       | Purpose                                       | How to Use                         |
| -------------------------- | --------------------------------------------- | ---------------------------------- |
| `START-SERVER.bat`         | Start the server in HTTPS mode                | Double-click to run                |
| `AUTO-START.bat`           | Start HTTPS with auto-restart on crash (24/7) | Double-click to run                |
| `INSTALL-AUTO-START.bat`   | Auto-start server when PC boots               | Right-click → Run as Administrator |
| `UNINSTALL-AUTO-START.bat` | Remove auto-start on boot                     | Right-click → Run as Administrator |
| `BACKUP-DATABASE.bat`      | Manual backup with optional USB copy          | Double-click to run                |
| `RESTORE-DATABASE.bat`     | Restore from backup (with safety backup)      | Double-click to run                |
| `SCHEDULED-BACKUP.bat`     | Silent backup script for Task Scheduler       | Use from Windows Task Scheduler    |

---

## Default Credentials

After fresh setup, register the first account. To make it an admin, either:

- Use the registration page and manually update the role in the database
- Or use the existing `prisma/dev.db` which may already have admin accounts

---

## Troubleshooting

| Problem                                        | Solution                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| "npm not found"                                | Install Node.js and restart the terminal                                                |
| "Port 3000 already in use"                     | Close the other terminal/process using port 3000                                        |
| Other PCs can't connect                        | Check Windows Firewall — allow Node.js through. Ensure all PCs are on the same network. |
| Browser warns about HTTPS certificate          | This is expected for self-signed certs; click Advanced → Proceed                        |
| Auto-start task runs but server does not start | Open `AUTO-START.bat` manually once to confirm Node/npm and certificate creation work   |
| Server crashes                                 | Use `AUTO-START.bat` instead of `START-SERVER.bat` for auto-restart                     |
| Database corrupted                             | Restore from backup (`prisma/dev.db`)                                                   |
| QR scanner not working                         | Allow camera access in the browser when prompted                                        |
| Blank page after transfer                      | Run `npm run build` to rebuild the application                                          |

---

## Development Guidelines

- Follow Next.js App Router conventions
- Use Server Components by default, Client Components only when needed (interactivity, hooks)
- Keep API routes in `src/app/api/`
- Use Prisma for all database operations
- Follow TypeScript strict mode
- Log all significant actions using `logActivity()` from `src/lib/activityLogger.ts`
- Use Socket.IO for real-time updates (attendance, dashboard, activity logs)
- All passwords must be hashed with bcrypt before storage
- Keep the SQLite database — it's stable, portable, and supported until 2050

---

## NPM Scripts

| Script                | Command                                   | Purpose                                      |
| --------------------- | ----------------------------------------- | -------------------------------------------- |
| `npm run dev`         | `next dev -H 0.0.0.0`                     | Start in development mode (hot reload)       |
| `npm run build`       | `prisma generate && next build`           | Build for production                         |
| `npm start`           | `next start -H 0.0.0.0`                   | Start production server (network accessible) |
| `npm run start:https` | `node generate-cert.js && node server.js` | Start HTTPS server with HTTP redirect        |
| `npm run db:generate` | `prisma generate`                         | Regenerate Prisma client                     |
| `npm run db:push`     | `prisma db push`                          | Push schema to database                      |
| `npm run db:migrate`  | `prisma migrate deploy`                   | Deploy migrations                            |
| `npm run lint`        | `next lint`                               | Run ESLint                                   |

---

## System Check Snapshot (2026-03-16)

- Workspace diagnostics (`TypeScript`/`ESLint` via editor): **No errors found**
- Startup mode in `START-SERVER.bat`: **HTTPS** (recommended for camera/scanner stations)
- HTTPS runtime script available: `npm run start:https`
- Backup API available at `/api/backup` (list/create/download/delete/restore)
- `AUTO-START.bat` is now portable and runs from its own project folder (`%~dp0`)
