<<<<<<< HEAD
## Smart QR-Based Canteen Ordering System

### Folder structure

- `frontend`: Next.js student menu + staff dashboard + voice announcements
- `backend`: Node.js + Express REST API + Socket.IO + Supabase persistence
- `n8n`: n8n workflow export JSON

### Supabase setup

Create a Supabase project and run `backend/supabase.sql` in the SQL editor.

Seed example menu items in Supabase `menu_items`:

- Idli
- Dosa
- Maggi
- Tea
- Coffee

### Backend setup

Copy `backend/.env.example` to `backend/.env` and fill:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `N8N_WEBHOOK_URL` to your n8n webhook URL for the workflow

Install and run:

```bash
cd backend
npm install
npm run dev
```

### Frontend setup

Copy `frontend/.env.local.example` to `frontend/.env.local` and set:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api`
- `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000`

Install and run:

```bash
cd frontend
npm install
npm run dev
```

Open:

- `http://localhost:3000` student menu
- `http://localhost:3000/staff` staff dashboard
- `http://localhost:3000/order` order tracking + voice

### n8n workflow

Import `n8n/order-ready-workflow.json` into n8n.

Use the production webhook URL for the Webhook node path `order-ready` and set it as:

- `backend/.env` `N8N_WEBHOOK_URL=<your n8n webhook url>`

=======
# CODE4
Smart QR-based canteen system where students scan, order digitally, and track status in real time. Staff manage orders via dashboard, and when ready, automated voice announcements are triggered using n8n. Reduces queues, saves time, and improves canteen efficiency with a full-stack solution.
>>>>>>> 460851a6410b84d696b477de9d926fbc285a9e70
