# EventX Studio – Full Stack Event Management System

A complete Event Management System with authentication, event booking, seat selection, QR-coded tickets, analytics, and more.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [MongoDB](https://www.mongodb.com/try/download/community) (local installation or MongoDB Atlas account)
- [Git](https://git-scm.com/downloads) (optional, for version control)

## Setup Instructions (Step by Step)

### 1. Database Setup

**Option A: Local MongoDB**
- Install [MongoDB Community Edition](https://www.mongodb.com/try/download/community)
- Start MongoDB service:
  - Windows: It should run as a service automatically
  - macOS: `brew services start mongodb-community`
  - Linux: `sudo systemctl start mongod`
- Verify it's running: `mongo` or `mongosh` should connect (typically at port 27017)

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
- Create a new cluster
- Get your connection string from Atlas dashboard
- Update it in server/.env

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your database connection string and JWT secret
```

**Key .env settings**:
- `PORT=5003` (or any free port)
- `MONGO_URI=mongodb://127.0.0.1:27017/eventx` (for local MongoDB)
- `JWT_SECRET=your_secure_random_string`
- `CLIENT_URL=http://localhost:5173` (frontend URL)
- `SEED_ON_START=true` (to automatically seed sample data)

### 3. Frontend Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env to match your backend URL
```

**Key .env setting**:
- `VITE_API_URL=http://localhost:5003` (should match backend PORT)

### 4. Running the Application

**Start in the correct order**:

1. **Start MongoDB** (if using local MongoDB and it's not running as a service)
   ```bash
   mongod --dbpath=/path/to/data/directory
   ```

2. **Start Backend**
   ```bash
   cd server
   npm run dev
   ```
   Wait until you see "Database connection established" and "EventX API running on http://localhost:5003"

3. **Start Frontend**
   ```bash
   cd client
   npm run dev
   ```
   Frontend should be available at http://localhost:5173

### 5. Login Credentials

After the server seeds the database, you can log in with:
- Admin: `admin@eventx.dev` / `Admin123!`
- Regular user: `user1@mail.com` / `User1234!`

## Troubleshooting

### Database Connection Issues
- Ensure MongoDB is running (`mongod` process should be active)
- Check if port 27017 is available and not blocked by firewall
- If using Atlas, check network access settings to allow your IP

### Port Conflicts
- If you get "port already in use" errors, change the PORT in server/.env
- Update VITE_API_URL in client/.env to match the new port

### API Communication Problems
- Ensure CORS is properly configured in server.js
- Check network tab in browser dev tools for API errors
- Verify VITE_API_URL is correct in client/.env

### Authentication Issues
- Clear localStorage in browser if you get persistent auth errors
- Ensure JWT_SECRET is set in server/.env

## Development Workflow

1. Make backend changes in server/src
2. Test API endpoints with tools like Postman or browser's Network tab
3. Make frontend changes in client/src
4. Run both servers simultaneously during development
5. Check browser console and server logs for errors

Happy coding!

HERE IS FRONTEND DEPLOYMENT : event-x-studio-nu.vercel.app
