# EventX Setup and Troubleshooting Guide

This document provides detailed instructions for setting up and troubleshooting the EventX application.

## Detailed Setup Instructions

### MongoDB Setup

#### Verifying MongoDB Installation

Check if MongoDB is installed and running:

```bash
# Check MongoDB version
mongod --version

# Check if MongoDB service is running
# Windows
sc query mongodb
# Linux
systemctl status mongod
# macOS
brew services list | grep mongodb
```

#### Creating Data Directory

MongoDB needs a directory to store data:

```bash
# Create data directory (if not using default)
mkdir -p ~/data/db

# Start MongoDB with custom data directory
mongod --dbpath ~/data/db
```

#### Database Connection String Format

- Local MongoDB: `mongodb://127.0.0.1:27017/eventx`
- Atlas MongoDB: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/eventx?retryWrites=true&w=majority`

### Network and Port Configuration

#### Checking Available Ports

```bash
# Windows
netstat -ano | findstr :5003
# macOS/Linux
lsof -i :5003
```

#### Firewall Settings

Ensure your firewall allows connections on the ports you're using:
- MongoDB: 27017
- Backend: 5003
- Frontend: 5173

### Common Error Scenarios

#### MongoDB Connection Failures

1. **Error**: "MongoNetworkError: connect ECONNREFUSED"
   **Solution**: MongoDB is not running. Start the MongoDB service.

2. **Error**: "MongoServerSelectionError: Authentication failed"
   **Solution**: Incorrect credentials in connection string. Check username/password.

#### Backend Server Issues

1. **Error**: "EADDRINUSE: address already in use"
   **Solution**: Port is busy. Change PORT in .env or terminate the process using that port.

2. **Error**: "JWT_SECRET missing"
   **Solution**: Add JWT_SECRET to your .env file.

#### Frontend API Connection Issues

1. **Error**: "Network Error" in browser console
   **Solution**: Check if backend is running and VITE_API_URL is correct.

2. **Error**: "CORS error: No 'Access-Control-Allow-Origin' header"
   **Solution**: Ensure CLIENT_URL in server .env matches your frontend URL.

## Checking System Health

### MongoDB Status Check

Connect to your MongoDB to check if it's running properly:

```bash
# Connect to MongoDB
mongosh

# List databases to verify connection
show dbs

# Switch to EventX database
use eventx

# List collections to verify structure
show collections

# Check if users exist
db.users.find({}).limit(1)
```

### API Health Check

Test the backend API health:

```bash
# Using curl
curl http://localhost:5003

# Using PowerShell
Invoke-WebRequest -Uri http://localhost:5003
```

### Full System Test

1. Start MongoDB
2. Start backend server with `npm run dev` in server directory
3. Start frontend with `npm run dev` in client directory
4. Open browser at http://localhost:5173
5. Try to log in with credentials: `admin@eventx.dev` / `Admin123!`

## Advanced Configuration

### Production Settings

For production deployment, update these settings:

- Set `NODE_ENV=production` in server .env
- Set `SEED_ON_START=false` to prevent reseeding
- Use a strong, random JWT_SECRET
- Configure proper MongoDB authentication
- Set up HTTPS for both frontend and backend

### Database Maintenance

Backup your MongoDB data:

```bash
# Create a backup
mongodump --db eventx --out ~/backup/$(date +%Y-%m-%d)

# Restore from backup
mongorestore --db eventx ~/backup/2023-05-01/eventx
```

## Need More Help?

Check these resources:
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Vite Documentation](https://vitejs.dev/guide/)
