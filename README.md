# University of Bologna Admission Portal

A full-stack web application for the University of Bologna's admission portal. It includes a public landing page and a secure admin dashboard to manage applications.

## Tech Stack

*   **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios
*   **Backend:** Node.js, Express, Mongoose, JWT Auth, bcrypt
*   **Database:** MongoDB

## Prerequisites

*   Node.js (v16+)
*   MongoDB running locally on port `27017` or update the `DB_URI` in `server/.env`.

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd Bologna
    ```

2.  **Backend Setup:**
    ```bash
    cd server
    npm install
    ```
    *Ensure your `.env` file in the `server` directory has the correct MongoDB URI:*
    ```env
    PORT=5000
    DB_URI=mongodb://127.0.0.1:27017/bologna_admissions
    JWT_SECRET=supersecret_bologna_key_2026
    ```
    *Seed the database with default admin credentials and mock applications:*
    ```bash
    node seed.js
    ```
    *Start the development server:*
    ```bash
    npm run dev
    ```

3.  **Frontend Setup:**
    Open a new terminal and navigate to the client folder.
    ```bash
    cd client
    npm install
    ```
    *Start the development server:*
    ```bash
    npm run dev
    ```

## Usage

*   **Public Portal:** Navigate to `http://localhost:5173/` to view the landing page.
*   **Admin Login:** Navigate to `http://localhost:5173/admin` and log in with:
    *   **Email:** `admin@unibo.it`
    *   **Password:** `password123`
*   **Dashboard:** Manage applications, view details, and change status.

## Environment Variables

*   **Server** (`server/.env`):
    *   `PORT` - Backend port (default 5000)
    *   `DB_URI` - MongoDB connection string
    *   `JWT_SECRET` - Secret key for JSON Web Tokens
