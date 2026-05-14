# CodeTracker

A dashboard for competitive programmers to track their problem-solving progress across different platforms like LeetCode, Codeforces, CodeChef, and CSES.

## How to deploy on Vercel

The application is structured to be easily deployed on Vercel as a full-stack project utilizing Vercel's serverless functions for the Express backend and the standard Vite build process for the frontend.

### One-Click Deploy
You can deploy this project directly to Vercel by pushing your code to a GitHub repository and importing it into Vercel.

### Step-by-Step Vercel Deployment

1. **Push your code to GitHub (or GitLab/Bitbucket)**
   Initialize a git repository if you haven't already:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import into Vercel**
   - Go to your Vercel Dashboard (https://vercel.com/dashboard)
   - Click **Add New...** > **Project**
   - Import the repository you just pushed.
   
3. **Configure Project**
   - Vercel should automatically detect the framework as **Vite**.
   - Make sure the Build Command is `npm run build` or `vite build` (Vercel's default for Vite).
   - The Output Directory should automatically be set to `dist`.

4. **Environment Variables Config Details (If applicable)**
   - If your project requires any Firebase credentials, you must add them in the **Environment Variables** section before deploying. 

5. **Deploy!**
   - Click the "Deploy" button.
   - Vercel will build the frontend and set up the Express API automatically. The `vercel.json` file ensures that API routes are mapped correctly and client-side routing works as expected.

Once the build finishes, you'll be given a public URL where your application is live!
