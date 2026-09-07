# University of UTAMED Admission Portal - Installation & Hosting Guide

This guide describes how to install the project locally, set up the environment variables, seed the database, and deploy the application to hosting providers.

---

## 1. Requirements for Client/Company (Prerequisites)

To deploy or run this project, the client/company needs:
1. **Node.js**: Version 16 or newer (v18+ is recommended).
2. **MongoDB Database**: Either a local MongoDB instance or a cloud database hosted on **MongoDB Atlas** (recommended for production).
3. **SMTP Email Account**: A Gmail account (with an App Password enabled) or a service like **Resend** to send emails (notifications, application links, missing document reminders, status updates).
4. **Hosting Providers**:
   - **Backend Hosting**: A provider that supports Node.js (e.g., Render, Railway, Heroku, or a VPS like DigitalOcean).
   - **Frontend Hosting**: A provider that supports static site hosting (e.g., Vercel, Netlify, Hostinger, or GitHub Pages).

---

## 2. Environment Variables Configuration (`.env`)

You need to configure the environment variables in a `.env` file at the root of the backend folder. Here is the structure and purpose of each variable:

```env
# Backend server port
PORT=5000

# MongoDB Connection String (Atlas Replica Set or local mongodb://127.0.0.1:27017/db_name)
DB_URI=mongodb://username:password@your-atlas-cluster.mongodb.net/dbname?ssl=true&authSource=admin

# JWT Secret for admin authorization
JWT_SECRET=your_super_secret_jwt_key_here

# Environment (development or production)
NODE_ENV=development

# URL of the hosted backend server (used by the frontend and client)
VITE_API_URL=http://localhost:5000

# URL of the frontend application (used by backend to generate upload/portal links in emails)
CLIENT_URL=http://localhost:5174

# Email Configuration (SMTP Gmail)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Admin Notification Email
ADMIN_EMAIL=admin@UTAMED.com

# Expiration deadline in minutes for pending documents (e.g. 60 days ≈ 86400 minutes)
DOCUMENT_DEADLINE_MINUTES=86400

# Optional: Resend API Key (If using Resend instead of Gmail SMTP)
# RESEND_API_KEY=re_your_api_key_here
```

---

## 3. Local Installation & Running Guide

Follow these steps to run both the frontend and backend locally.

### Step 1: Install Backend & Frontend Dependencies
Open your terminal and install the dependencies:

```bash
# Install backend dependencies (Run in the root folder)
npm install

# Navigate to client directory and install frontend dependencies
cd client
npm install
```

### Step 2: Seed the Database
Before launching the server for the first time, run the seeding script to set up the default admin credentials and add some mock applications to the database:

```bash
# Run from the root directory
npm run seed
```

This will create a default administrator:
- **Email:** `admin@UTAMED.com`
- **Password:** `password123`

### Step 3: Run the Backend Server
Start the backend server in development mode (it will reload automatically on changes):

```bash
# Run from the root directory
npm run dev
```
The server will print `Server running on port 5000` and `MongoDB connected successfully`.

### Step 4: Run the Frontend Client
In a new terminal window, start the React development server:

```bash
cd client
npm run dev
```
The client will start running (usually at `http://localhost:5173` or `http://localhost:5174`). Open that URL in your browser.

---

## 4. Production Deployment & Hosting Guide

For production, the client/company can host the application using cloud providers.

### Option A: Free/Low-Cost Serverless Hosting (Recommended)

#### 1. Database: MongoDB Atlas (Free Tier)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up.
2. Create a free shared cluster.
3. Add a database user with read/write privileges.
4. Set IP Access List to `0.0.0.0/0` (Allow access from anywhere) so hosting platforms can connect to it.
5. Copy the connection string (`mongodb+srv://...`) and paste it as `DB_URI` in the backend environment variables.

#### 2. Backend Hosting: Render or Railway
* **Render (Free/Paid Tier):**
  1. Create a Web Service linked to your GitHub repository.
  2. Set the build command to `npm install`.
  3. Set the start command to `node server.js`.
  4. In the **Environment** tab, add all variables defined in the `.env` section (DB_URI, JWT_SECRET, EMAIL_USER, etc.).
  5. Save and deploy. Render will give you an API URL (e.g., `https://your-backend.onrender.com`).

* **Railway (Paid-by-usage):**
  1. Link your repository.
  2. Add the Node.js service.
  3. Enter the environment variables.
  4. Deploy.

#### 3. Frontend Hosting: Vercel or Netlify
* **Vercel (Free/Paid Tier):**
  1. Go to [Vercel](https://vercel.com/) and create a new project.
  2. Link the repository and set the **Root Directory** to `client`.
  3. Select **Vite** as the framework preset (it will automatically configure the build command as `vite build` and output directory as `dist`).
  4. Under **Environment Variables**, add:
     - `VITE_API_URL` = Your production backend URL (e.g., `https://your-backend.onrender.com`).
  5. Deploy. Vercel will give you a domain name (e.g., `https://utamed-admission.vercel.app`).
  6. **Important:** Copy your Vercel URL and update the `CLIENT_URL` in the backend's environment variables so email links point to the correct domain.

---

### Option B: Shared Hosting / cPanel (Hostinger, Bluehost, etc.)

If the company has a shared hosting account with Node.js support:
1. **Frontend**:
   - Run `npm run build` in the `client` directory locally.
   - Upload the contents of the generated `client/dist` folder to the `public_html` directory of the hosting domain.
2. **Backend**:
   - Create a Node.js Application in cPanel.
   - Set the Application Startup File to `server.js`.
   - Set the document root and upload the backend files (excluding `node_modules`).
   - Run `npm install` from the cPanel console / Node application dashboard.
   - Add environment variables in cPanel.
   - Restart the Node.js application.

---

## 5. SMTP/Email Credentials Setup

To send automated email notifications successfully:
* If using **Gmail**:
  1. Go to Google Account Settings -> Security.
  2. Enable **2-Step Verification**.
  3. Go to **App Passwords**.
  4. Generate a password for "Mail" and "Other (Custom Name)" e.g., "Admission Portal".
  5. Copy the generated 16-character password and set it as `EMAIL_PASS` in the `.env` configuration. Set `EMAIL_USER` as your Gmail address.
* If using **Resend**:
  1. Go to [Resend](https://resend.com) and create an API Key.
  2. Set `RESEND_API_KEY` in the `.env`. Nodemailer fallback will be ignored in favor of Resend if this key is provided.
