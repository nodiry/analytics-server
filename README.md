Web Analytics Server
This is the backend server for a Web Analytics platform built with Express.js and MongoDB. It manages user authentication, website tracking, and metric computations. This server interacts with the Traffic Server to collect data and provides endpoints for viewing analytics metrics.

Features
Authentication: User sign-up, login, and JWT authentication.
Website Tracking: Collects website-specific traffic and metric data.
Metrics: Computes and stores analytics data for websites.
CORS & Cookie Management: Secure handling of cross-origin requests and cookies.
MongoDB Integration: Stores user and website analytics data.
Background Metric Computation: Runs periodic metric computations using a background process.
Prerequisites
Before you begin, make sure you have the following installed:

Node.js (Version 16+ or Bun)
MongoDB (Local or Cloud instance)
Redis (Optional, for background jobs)
Setup and Installation

1. Clone the repository:

git clone https://github.com/yourusername/web-analytics-server.git
cd web-analytics-server

2. Install dependencies:
You can install the dependencies using npm or yarn.

npm install

3. Configure your environment:
Create a .env file to configure your environment variables.

Example .env:

Copy
Edit
PORT=3000
DB_URL=mongodb://localhost/Analytic
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_jwt_secret
4. Run the server:
You can start the server using the following command:

bash
Copy
Edit
npm start
or with Bun:

bash
Copy
Edit
bun start
5. Test the API:
Auth Routes: /auth (sign-up, login)
Website Routes: /web (manage website data)
Metrics Routes: /metric (retrieve metrics)
You can test the API with Postman or curl. Ensure that the server is running and you have MongoDB set up.

Folder Structure
Here's a breakdown of the folder structure for the project:
web-analytics-server/
│
├── config/                # Configuration files (e.g., DB, JWT secret, etc.)
│   └── config.ts          # Database connection settings, environment variables
│
├── middleware/            # Middlewares for background processing and additional checks
│   └── metric.ts          # Metric computation background worker
│
├── routes/                # All the routes for handling API requests
│   ├── auth.ts            # Authentication routes (login, sign-up, etc.)
│   ├── website.ts         # Website management routes
│   └── metric.ts          # Metric data routes (retrieving computed data)
│
├── models/                # Mongoose models for MongoDB schema
│   ├── user.ts            # User model (authentication)
│   └── website.ts         # Website model (stores website-related data)
│
├── public/                # Static assets, if any (images, CSS, etc.)
│
├── utils/                 # Utility functions (e.g., JWT helpers, validation)
│   └── jwt.ts             # JWT token generation and verification
│
├── .env                   # Environment variables
├── package.json           # Project dependencies and scripts
├── README.md              # Project documentation
└── server.ts              # Main server entry point (Express app)

Explanation of Key Code Sections
1. Dependencies:
Express.js: Web framework for building RESTful APIs.
Mongoose: MongoDB object modeling for Node.js.
Morgan: HTTP request logging middleware.
Cors: Middleware for handling Cross-Origin Resource Sharing.
Cookie-Parser: Middleware for parsing cookies, used for managing sessions.
2. Middleware:
The metric middleware is imported and runs background tasks related to computing metrics. These metrics are stored in the database and later retrieved through the /metric routes.
3. Routes:
Auth Routes (/auth): Handle user authentication (sign-up, login, etc.) using JWT tokens.
Website Routes (/web): Handle website-specific operations, including adding new websites and tracking data.
Metrics Routes (/metric): Retrieve the computed analytics data for websites.
4. Database Connection:
MongoDB is used as the database, and the connection is established using Mongoose.
config.db is used to configure the MongoDB connection string, defaulting to mongodb://localhost/Analytic if not provided.
5. Server Initialization:
The server uses Express.js to listen for HTTP requests on the specified PORT.
It also uses CORS middleware to allow cross-origin requests from the frontend (configured to accept requests from http://localhost:5173).
The cookie-parser middleware is used to parse cookies, especially for managing authentication tokens.
The server runs at http://localhost:3000 by default or the port defined in the environment.

Models Overview
We have the following models:

Dev - Represents a developer (user) who owns websites.
Metric - Stores aggregated data about website performance, such as visits, bounce rates, and more.
Quick - A simple model for storing quick access data (e.g., passcodes).
Track - Stores raw tracking data for real-time analytics, including page visits, session data, device types, etc.
Website - Represents a website with tracking data, such as visits, referrers, and session information.


# Metrics Computation Service

## Overview
This Node.js service is responsible for computing and aggregating website tracking metrics from stored event data. It periodically aggregates key statistics, stores them in a `Metric` collection, and clears the processed event data from the `Track` collection.

The service is scheduled to run every 15 minutes using `node-cron`.

## Features
- **Event-Level Aggregation**: Computes total visits and average load time for each website.
- **Pages Aggregation**: Counts the number of visits per page for each website.
- **Referrer Aggregation**: Tracks referral sources (ignoring empty values).
- **Session-Level Aggregation**: Calculates session duration, bounce rate, and session counts per device type.
- **Geographic Aggregation**: Counts visits by country.
- **Data Merging & Storage**: Combines all aggregated data and stores it in the `Metric` collection.
- **Automatic Data Cleanup**: Deletes all processed event data from `Track` after computation.
- **Scheduled Execution**: Runs automatically every 15 minutes.

## Dependencies
- `node-cron`: For scheduling periodic execution.
- `mongoose`: For interacting with MongoDB.

## Installation & Setup
1. **Clone the repository**
   ```sh
   git clone <repo-url>
   cd <project-folder>
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Configure MongoDB connection**
   Ensure MongoDB is running and the connection settings are correctly configured in your project.

4. **Run the service**
   ```sh
   node index.js
   ```
   The metric computation will now run every 15 minutes automatically.

## Code Explanation
### 1. **Event-Level Aggregation**
```ts
const eventAggregation = await Track.aggregate([
  { $group: { _id: "$unique_key", totalVisits: { $sum: 1 }, avgLoadTime: { $avg: "$loadTime" } } }
]);
```
- Groups records by `unique_key` (website identifier).
- Computes total visits and average load time.

### 2. **Pages Aggregation**
```ts
const pagesAggregation = await Track.aggregate([
  { $group: { _id: { unique_key: "$unique_key", url: "$url" }, visits: { $sum: 1 } } },
  { $group: { _id: "$_id.unique_key", pages: { $push: { url: "$_id.url", visits: "$visits" } } } }
]);
```
- Counts visits per page for each website.

### 3. **Referrer Aggregation**
```ts
const referrersAggregation = await Track.aggregate([
  { $match: { referrer: { $ne: "" } } },
  { $group: { _id: { unique_key: "$unique_key", referrer: "$referrer" }, count: { $sum: 1 } } },
  { $group: { _id: "$_id.unique_key", referrers: { $push: { referrer: "$_id.referrer", count: "$count" } } } }
]);
```
- Counts visits per referrer, ignoring empty values.

### 4. **Session-Level Aggregation**
```ts
const sessionAggregation = await Track.aggregate([
  { $group: { _id: { unique_key: "$unique_key", session_id: "$session_id" }, minTime: { $min: "$timestamp" }, maxTime: { $max: "$timestamp" }, deviceType: { $first: "$deviceType" }, eventCount: { $sum: 1 } } },
  { $group: { _id: "$unique_key", avgSessionDuration: { $avg: "$sessionDuration" }, totalSessions: { $sum: 1 }, bounceSessions: { $sum: { $cond: [{ $eq: ["$eventCount", 1] }, 1, 0] } }, deviceStatsArray: { $push: "$deviceType" } } }
]);
```
- Computes session duration, total sessions, bounce rate, and device statistics.

### 5. **Geographic Aggregation**
```ts
const geoAggregation = await Track.aggregate([
  { $match: { country: { $ne: "" } } },
  { $group: { _id: { unique_key: "$unique_key", country: "$country" }, visits: { $sum: 1 } } },
  { $group: { _id: "$_id.unique_key", geoDistribution: { $push: { country: "$_id.country", visits: "$visits" } } } }
]);
```
- Counts visits per country.

### 6. **Merging Aggregations & Storing Metrics**
```ts
await Metric.create({ unique_key, totalVisits, uniqueVisitors, avgSessionDuration, bounceRate, avgLoadTime, pages, referrers, deviceStats, geoDistribution, timestamp: now });
```
- Merges all collected data and stores it in the `Metric` collection.

### 7. **Scheduled Execution**
```ts
cron.schedule("*/15 * * * *", computeMetrics);
```
- Runs the `computeMetrics` function every 15 minutes.

## Conclusion
This script efficiently aggregates website analytics data and stores useful metrics, ensuring up-to-date insights while maintaining a clean database by removing processed records. The automated scheduling ensures continuous operation without manual intervention.

---
**Author:** Your Name  
**License:** MIT  

