# 📈 Portfolio Tracker Dashboard

> A modern, high-performance financial dashboard built with Next.js to track, visualize, and analyze your investment portfolio and aggregated financial news.

**🚀 Live Demo:** [https://portfolio-tracker-kishoreabcs-projects.vercel.app/](https://portfolio-tracker-kishoreabcs-projects.vercel.app/) — *To experience its full potential, try it out!*
*(Demo credentials are hidden inside this file. Read fully to get access)*
**📊 Reference Data:** [Google Sheet Template](https://docs.google.com/spreadsheets/d/1uDp-iC8BJYWLzDHcuPv1Go40Pikkt24OBH58G4ewYOU/edit?usp=sharing)

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

## Overview

**What the project does**: The Portfolio Tracker Dashboard is a comprehensive web application that aggregates financial data across various asset classes (Equities, Bonds) and presents it in a unified, visually appealing interface. It integrates directly with a read-only Google Sheets database for your portfolio data, utilizes Supabase with pgvector for intelligent semantic news aggregation, and utilizes Google's Gemini AI to provide intelligent insights and automatic text translations.

**Why it was built**: To provide a centralized, privacy-focused, and highly customizable alternative to generic portfolio trackers, allowing the user to maintain full control over their financial data within Google Sheets while enjoying a premium dashboard experience.

**The target users**: Individuals who already track their investment and financial details in Google Sheets and need a powerful, automated way to visualize and analyze that data, along with staying updated on relevant market news.

> [!IMPORTANT]
> ## 🤖 Built with "Vibe Coding" & AI
> **Developer Disclaimer:** This entire project was brought to life relying almost completely on AI-assisted "vibe coding." While I possess only a basic, foundational understanding of full-stack development, the entire complex architecture, component structuring, Next.js integrations, LLM NLP pipelines, and UI interactions were orchestrated by directing AI agents (like Gemini and Claude).
> 
> My primary role was shaping the vision, defining the user experience, structuring the data integrations, and dictating the overall "vibe" of the solution. The AI acted as the execution engine for writing the boilerplate, handling state management, writing Postgres vector search logic, and refining the visual details. This repository stands as a testament to what is possible when fundamental domain knowledge meets modern AI-driven development workflows!

---

## Features

### Core Features
- **Holistic Dashboard**: At-a-glance view of net worth, daily changes, and high-level allocation.
- **Equities & Bonds Management**: Track stock holdings, real-time price movements, sector allocations, upcoming maturities, and credit ratings.
- **Cash Flow Tracking**: Daily transaction log integration for income and expenses tracking.
- **Reports Export**: Generate CSV/PDF reports of portfolio holdings.

### Financial News & AI (NEW)
- **AI-Powered News Hub**: Automatically fetches RSS feeds, translates regional news to English using LangChain and LLMs, generates summaries, and extracts market sentiment/impact.
- **Vector Semantic Search**: High-performance AI search over the news database powered by Supabase pgvector and Gemini 1024-dimensional embeddings.
- **Automated Portfolio Tagging**: Dynamically links news articles to companies currently held in your live Google Sheets portfolio.
- **AI Insights**: Contextual portfolio analysis powered by Google's Gemini API.

### Security & Performance
- **NextAuth Integration**: Secure OAuth-based authentication (Google Provider) and basic credentials.
- **Server-Side API Calls**: Keys are never exposed to the client browser.
- **React Query Caching**: Smart 15-minute data caching to minimize API calls and improve load times.

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | Next.js 16 (App Router), React 19 | Core framework and UI library. |
| **Styling & UI** | Tailwind CSS v4, Shadcn UI, Framer Motion | Utilities, accessible components, and animations. |
| **State Management**| React Query | Client-side data fetching, caching, and synchronization. |
| **Backend & APIs** | Next.js Route Handlers | API endpoints for fetching data and interacting with LLMs. |
| **Database (Portfolio)**| Google Sheets API v4 | Read-only data source for personal portfolio data. |
| **Database (News)** | Supabase (PostgreSQL + pgvector) | Stores processed news articles and their semantic embeddings. |
| **Authentication** | Auth.js (NextAuth v5 beta) | Secure session management. |
| **AI & NLP** | LangChain, Gemini API, Groq | Translation, summarization, entity extraction, and vector embeddings. |

---

## Project Structure

```text
dashboard/
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
│   ├── api/              # Route Handlers (news, sheets, insights, etc)
│   ├── portfolio/        # Unified holdings table view
│   ├── news/             # AI-driven financial news hub
│   └── ...               # Other route views (analytics, bonds, cashflow)
├── components/           # Reusable UI elements (Shadcn, Charts, Layout)
├── hooks/                # React Query hooks (usePortfolioData, useNews, etc)
├── lib/                  # Core Business Logic
│   ├── calc/             # Portfolio math (allocation, risk)
│   ├── mappers/          # Data normalizers for raw Google Sheet rows
│   ├── news/             # News ingestion, NLP, and Supabase integrations
│   └── sheets/           # Google Sheets discovery and heuristic parsing
├── supabase/
│   └── migrations/       # SQL schemas (news table, vector similarity search)
├── .env.example          # Template for required environment variables
└── package.json          # Dependency manifest
```

---

## Prerequisites

- Node.js (v20+ recommended)
- npm or pnpm
- A Google Cloud Project with the Google Sheets API enabled.
- A Supabase Project (Postgres Database).

---

## Installation

### 1. Clone repository
```bash
git clone <repository-url>
cd "Portfolio Tracker/dashboard"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment variables
Create a `.env.local` file based on the example:
```bash
cp env_example.txt .env.local
```
Fill in your specific API keys in `.env.local` (see Environment Variables section below).

### 4. Database Setup (Supabase)
Run the SQL migrations located in `supabase/migrations/` in your Supabase SQL Editor to create the necessary `news` table and the vector matching RPC functions.

### 5. Start development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Check `env_example.txt` for the full list. Here are the most critical ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SHEET_ID` | Yes | The ID of the Google Sheet (found in the URL) |
| `GOOGLE_SHEETS_API_KEY` | Yes | API Key with access to Google Sheets API |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI Insights and NLP |
| `AUTH_SECRET` | Yes | NextAuth encryption secret (`npx auth secret`) |
| `AUTH_URL` | Yes | Base URL of the application (`http://localhost:3000`) |
| `SUPABASE_URL` | Yes | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase secret role key for backend DB access |
| `RSS_URL` | Yes | The RSS Feed endpoint to scrape financial news from |

> **Security Note:** Never commit your `.env.local` file. It is safely ignored by `.gitignore`.

---

## Usage

1. **Login**: Navigate to the site and authenticate. For the live demo, use Username: `test` and Password: `test`.
2. **Main Workflows**: 
   - **Dashboard**: View high-level metrics (Net Worth, total equities, total bonds).
   - **Data Sync**: The app automatically fetches from your Google Sheet.
   - **News Hub**: Navigate to the News tab to view the live aggregated RSS news feed, complete with automated AI-translations, sentiment impact tags, and dynamic tags that identify companies held in your actual portfolio.
3. **User Actions**:
   - **Analyze**: Go to the Analytics or Insights tab to view concentration risks and AI-generated advice.
   - **Export**: Navigate to the Reports tab to download your portfolio state as a CSV or PDF.

---

## API & Usage

The dashboard utilizes internal API route handlers acting as secure proxies.

### Fetch Sheets Data
- **URL**: `/api/sheets?force=true`
- **Method**: `GET`
- **Description**: Fetches, parses, and maps all configured Google Sheets tabs. Returns arrays of `equities`, `bonds`, `transactions`, and `allocations`.

### Trigger News Sync
- **URL**: `/api/news/sync`
- **Method**: `POST`
- **Description**: Connects to the RSS feed, translates Tamil content to English using LLMs, generates summary metrics, extracts portfolio holding aliases, computes 1024-dimensional embeddings, and inserts them into Supabase.

### Semantic Vector Search
- **URL**: `/api/news/search?q=query&semantic=true`
- **Method**: `GET`
- **Description**: Converts the search term into an embedding vector and calls the Supabase PostgreSQL RPC function `match_news` using cosine similarity (`<=>`) to retrieve semantically related articles above a strict threshold.

---

## Testing

There is an empty `__tests__` directory configured for Vitest, but no automated test suites are currently implemented in the repository.

---

## Deployment

**Vercel (Recommended)**
This project is currently deployed on Vercel.
To deploy your own instance:
1. Connect your GitHub repository to Vercel.
2. Set all the Environment Variables in the Vercel dashboard.
3. Deploy. Vercel automatically detects Next.js and builds the project.

---

## License

This project is open-sourced and maintained for personal use.
