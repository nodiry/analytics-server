
# Web Analytics Project

This repository is a Web Analytics system designed to track and collect data on website visits, user interactions, and performance metrics. The project uses Mongoose models to store and manage various pieces of data, including developer info, website tracking data, and aggregated metrics.

## Models Overview

### 1. **Dev Model**
Represents a developer (user) who owns websites. This model is used for user authentication and management.

```typescript
import mongoose from "mongoose";

const devSchema = new mongoose.Schema({
  username: { type: String, unique: true, required:true, immutable: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email:{type:String, required:true, unique:true },
  password: { type: String, required: true }, // Hashed with Bun
  created_at: { type: Date, default: Date.now, immutable: true },
  modified_at: { type: Date },
  img_url: { type: String, default: "" },
  authorized:{type:Boolean, default:false}
});

export const Dev = mongoose.model("Dev", devSchema);
```

#### Fields:
- **username**: Unique and immutable username for the developer.
- **firstname, lastname**: Developer's first and last names.
- **email**: Unique email for authentication.
- **password**: The developer’s password (hashed).
- **created_at**: The date when the account was created.
- **img_url**: Profile image URL.
- **authorized**: Boolean flag for whether the developer is authorized.

---

### 2. **Metric Model**
Stores aggregated metric data at 15-minute intervals for a specific website. This data includes visits, referrers, devices, and more.

```typescript
const metricSchema = new mongoose.Schema({
    unique_key: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    totalVisits: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    avgLoadTime: { type: Number, default: 0 },
    pages: [{ url: String, visits: Number }],
    referrers: [{ referrer: String, count: Number }],
    deviceStats: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
    },
    geoDistribution: [{ country: String, visits: Number }],
}, { timestamps: true });

export const Metric = mongoose.model("Metric", metricSchema);
```

#### Fields:
- **unique_key**: A unique key for each website (used to group data).
- **timestamp**: The timestamp for the start of the 15-minute interval.
- **totalVisits**: Total number of visits in the interval.
- **uniqueVisitors**: Number of unique visitors.
- **avgSessionDuration**: The average duration of user sessions.
- **bounceRate**: The percentage of users who left after visiting only one page.
- **avgLoadTime**: The average page load time.
- **pages**: Data on individual pages visited.
- **referrers**: Top referrers for the website.
- **deviceStats**: Breakdown of visitors by device type (desktop, mobile, tablet).
- **geoDistribution**: Visitors' distribution by country.

---

### 3. **Quick Model**
A simple model for storing a quick access item like an email and a passcode.

```typescript
const quick = new mongoose.Schema({
    email: String,
    passcode: Number,
});

export const Quick = mongoose.model('Quick', quick);
```

---

### 4. **Track Model**
Stores raw tracking data in real-time for websites. This model is essential for collecting detailed session data, such as the user's device type, session ID, page load times, and country.

```typescript
const trackSchema = new mongoose.Schema({
    unique_key: { type: String, required: true, index: true },
    url: { type: String, required: true },
    referrer: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
    userAgent: { type: String, required: true },
    ip: String,
    loadTime: { type: Number, default: 0 },
    session_id: { type: String, required: true, index: true },
    country: { type: String, default: "" },
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet"], required: true },
}, { timestamps: true });

export const Track = mongoose.model("Track", trackSchema);
```

#### Fields:
- **unique_key**: Unique identifier for each website (matches website's unique key).
- **url**: URL of the page that was tracked.
- **referrer**: Referrer URL (where the user came from).
- **timestamp**: The exact time when the page visit was recorded.
- **userAgent**: The browser's user-agent string.
- **ip**: The user's IP address.
- **loadTime**: The time it took for the page to load.
- **session_id**: A unique identifier for the user's session.
- **country**: Country based on IP geolocation.
- **deviceType**: The type of device (desktop, mobile, tablet).

---

### 5. **Website Model**
Stores the details of a website being tracked, such as its URL, description, and aggregated statistics like visits and device breakdown.

```typescript
const websiteSchema = new mongoose.Schema({
  dev: { type: mongoose.Schema.Types.ObjectId, ref: "Dev", required: true },
  url: { type: String, required: true },
  desc: { type: String, default: "" },
  unique_key: { type: String, unique: true, required: true },
  created_at: { type: Date, default: Date.now, immutable: true },
  modified_at: { type: Date },
  stats: {
    total_visits: { type: Number, default: 0 },
    monthly_visits: { type: Number, default: 0 },
    daily_visits: { type: Number, default: 0 },
    unique_visitors: { type: Number, default: 0 },
    avg_session_duration: { type: Number, default: 0 },
    bounce_rate: { type: Number, default: 0 },
    top_referrers: [{ referrer: String, count: Number }],
    device_distribution: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
    },
    pages: [
      {
        path: String,
        visits: Number,
        avg_loading_time: Number,
        avg_time_on_page: { type: Number, default: 0 },
      },
    ],
  },
});

export const Website = mongoose.model("Website", websiteSchema);
```

#### Fields:
- **dev**: Reference to the developer (user) who owns the website.
- **url**: The website's URL.
- **desc**: Optional description of the website.
- **unique_key**: A unique key for the website (8-character key).
- **stats**: Aggregated statistics for the website, including visits, referrers, device distribution, and more.

---

## Conclusion

These models are crucial for the backend to collect, store, and compute data regarding website visits and performance metrics. By leveraging Mongoose, we can easily interact with MongoDB and perform CRUD operations to manage the data flow within your Web Analytics system.

