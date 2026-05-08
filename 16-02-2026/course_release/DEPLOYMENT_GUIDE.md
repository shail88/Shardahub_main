# Deployment Guide: ShardaHub Course Platform

This guide explains how to host your project for free using **GitHub** and **Cloudflare Pages**, and how to connect it to your **Supabase** backend.

## Prerequisites
1.  **GitHub Account**: [Sign up here](https://github.com/).
2.  **Cloudflare Account**: [Sign up here](https://dash.cloudflare.com/sign-up).
3.  **Supabase Account**: [Sign up here](https://supabase.com/).

---

## Step 1: Upload to GitHub
1.  Extract the `shardahub_full_project_v3.zip` file on your computer.
2.  Create a **New Repository** on GitHub (e.g., `shardahub-courses`).
3.  Upload all the extracted files to this repository.
    -   *Note*: Ensure `index.html` is in the root or `course/index.html` is easily accessible.

## Step 2: Configure Supabase
1.  Go to your Supabase Project Dashboard.
2.  Go to **Settings -> API**.
3.  Copy the `Project URL` and `anon public` Key.
4.  Open `course/lib/supabase.js` in your local files (or edit it directly on GitHub).
5.  **Paste your keys** into the `SUPABASE_URL` and `SUPABASE_ANON_KEY` variables.
6.  Go to **SQL Editor** in Supabase and run the content of `db/schema.sql`.

## Step 3: Deploy with Cloudflare Pages
1.  Log in to the **Cloudflare Dashboard**.
2.  Go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3.  Select your GitHub account and the `shardahub-courses` repository you created.
4.  **Build Settings**:
    -   **Framework Preset**: None (it's static HTML/JS).
    -   **Build Command**: (Leave empty).
    -   **Output Directory**: (Leave empty or set to `.` if needed).
5.  Click **Save and Deploy**.

## Step 4: Final Check
1.  Cloudflare will give you a URL (e.g., `shardahub-courses.pages.dev`).
2.  Open the link.
3.  Navigate to `/course/index.html`.
4.  Test the "Sign Up" and "Login" features. If they work, your Supabase connection is successful!

---

## Troubleshooting
-   **CORS Issues**: If you see CORS errors in the console, go to Supabase -> Authentication -> URL Configuration. Add your Cloudflare URL (e.g., `https://shardahub-courses.pages.dev`) to the **Site URL** and **Redirect URLs**.
