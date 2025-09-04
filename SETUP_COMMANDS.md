# EventX Setup Commands

Follow these commands in order to set up and run the entire application stack locally.

## 1. Start MongoDB (if not running as a service)

**Windows:**
```cmd
# Check if MongoDB is running
sc query mongodb

# If not running as a service, start MongoDB (in a new terminal window)
# Replace with your MongoDB data path if different
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath="C:\data\db"

# If MongoDB isn't installed as a service, you can install it:
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --install --dbpath="C:\data\db"
sc start MongoDB
```

**macOS:**
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start if not running
brew services start mongodb-community

# Alternative manual start:
mongod --dbpath ~/data/db
```

**Linux:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start if not running
sudo systemctl start mongod

# If service doesn't exist, start manually:
mongod --dbpath /var/lib/mongodb
```

### MongoDB Troubleshooting

If you encounter "MongoDB Connection Error: connect ECONNREFUSED 127.0.0.1:27017":

1. **Verify MongoDB is installed correctly**
   ```bash
   # Check MongoDB version (should display version info if installed)
   mongod --version
   ```

2. **Check if MongoDB is actually running**
   ```bash
   # Windows
   tasklist | findstr mongod
   
   # macOS/Linux
   ps aux | grep mongod
   ```

3. **Check if port 27017 is being used**
   ```bash
   # Windows
   netstat -ano | findstr 27017
   
   # macOS/Linux
   lsof -i :27017
   ```

4. **Try connecting to MongoDB directly**
   ```bash
   # Using mongosh (newer MongoDB versions)
   mongosh
   
   # Using legacy mongo shell
   mongo
   ```

5. **Try creating the data directory manually**
   ```bash
   # Windows
   mkdir C:\data\db
   
   # macOS/Linux
   mkdir -p ~/data/db
   ```

6. **Alternative: Use MongoDB Atlas (cloud) instead of local installation**
   - Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Create a new cluster and get your connection string
   - Update your `.env` file with the Atlas connection string:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/eventx?retryWrites=true&w=majority
   ```

## 2. Set Up and Start Backend Server

```bash
# Navigate to server directory
cd c:\Users\Asus\Desktop\rana 2\server

# Install dependencies (first time only)
npm install

# Ensure .env file exists (first time only)
copy .env.example .env
# Edit .env file if needed - current settings should work with defaults

# Start the backend server
npm run dev
```

After running these commands, you should see:
- "Database connection established" 
- "EventX API running on http://localhost:5003"
- "Auto-seeding completed successfully!" (if SEED_ON_START=true)

## 3. Set Up and Start Frontend Client

Open a new terminal window and run:

```bash
# Navigate to client directory
cd c:\Users\Asus\Desktop\rana 2\client

# Install dependencies (first time only)
npm install

# Ensure .env file exists (first time only)
copy .env.example .env
# Make sure VITE_API_URL=http://localhost:5003 matches backend port

# Start the frontend development server
npm run dev
```

You should see a message that the development server is running at http://localhost:5173

## 4. Verify Everything Is Working

1. Open your browser and navigate to http://localhost:5173
2. Log in with the seeded credentials:
   - Admin user: `admin@eventx.dev` / `Admin123!`
   - Regular user: `user1@mail.com` / `User1234!`
3. Navigate to different sections of the application to ensure they load correctly

## Troubleshooting Commands

**Check if port 5003 is in use:**
```bash
# Windows
netstat -ano | findstr :5003

# macOS/Linux
lsof -i :5003
```

**Connect to MongoDB directly:**
```bash
# Windows (using mongosh - newer MongoDB versions)
"C:\Program Files\MongoDB\Server\6.0\bin\mongosh.exe"

# macOS/Linux
mongosh
```

**Clear frontend browser data:**
```
# In Chrome:
1. Open DevTools (F12)
2. Go to Application tab
3. Select "Clear storage" on the left
4. Click "Clear site data"
```

**Restart the entire stack:**
1. Stop frontend (Ctrl+C in terminal)
2. Stop backend (Ctrl+C in terminal)
3. Restart MongoDB if needed
4. Start backend again
5. Start frontend again

## Troubleshooting Login Issues

If you're experiencing login failures with the seeded credentials:

1. **Verify the admin user exists in the database**:
   ```bash
   # Check the admin user directly in MongoDB
   mongosh
   use eventx
   db.users.findOne({email: "admin@eventx.dev"})
   ```

2. **Force re-seed the database**:
   ```bash
   # Run the seed script manually
   cd server
   npm run seed -- --force
   ```

3. **Check logs for seeding errors**:
   Look for any errors in the server console related to:
   - "Auto-seeding failed"
   - "MongoDB Connection Error"

4. **Verify JWT secret**:
   Make sure your JWT_SECRET is properly set in .env file

5. **Try the debug endpoint**:
   Visit http://localhost:5003/api/debug/check-admin in your browser to verify if the admin user exists
