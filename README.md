# 📈 Portfolio Tracker Dashboard

A modern, high-performance financial dashboard built with Next.js to track, visualize, and analyze your investment portfolio. The application aggregates data across asset classes (Equity, Bonds, Gold) and provides deep insights into asset allocation, daily performance, cash flow, and risk metrics.

## ✨ Key Features

- **Holistic Dashboard**: View your Net Worth, daily changes, and high-level allocation at a glance.
- **Equities (Stocks) Management**: Track your stock holdings with real-time price movements, top gainers/losers, and sector allocations.
- **Bonds Management**: Monitor fixed-income assets, upcoming maturities with a maturity ladder, and credit rating distributions.
- **Interactive Visualizations**: Beautiful, responsive charts powered by Recharts (Asset Allocation, Sector Spread, Cash Flow).
- **Advanced Filtering & Sorting**: Easily sort through tables of your holdings by value, maturity, YTM, price change, and more.
- **AI Insights**: Integrated with Google's Gemini 2.5 Flash API to provide intelligent, contextual insights based on your portfolio data.
- **Data Parsing**: Built-in support to parse and map data seamlessly from Google Sheets.
- **Modern UI/UX**: Sleek dark mode design utilizing Tailwind CSS, Shadcn UI, and Framer Motion for buttery-smooth micro-interactions.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router, React 18)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Integration**: `@google/genai` (Gemini API)
- **Language**: TypeScript

## 📂 Project Structure

```
dashboard/
├── app/                  # Next.js App Router pages (analytics, bonds, calendar, cashflow, insights, portfolio, stocks)
├── components/           # Reusable UI components
│   ├── charts/           # Recharts visualization components
│   ├── layout/           # Topbar, Sidebar, and core layout pieces
│   ├── shared/           # KPI Cards, Empty States, and common widgets
│   └── ui/               # Shadcn UI primitives (cards, tables, badges, etc.)
├── hooks/                # Custom React hooks (e.g., usePortfolioData)
├── lib/                  # Core business logic
│   ├── calc/             # Portfolio math, risk analysis, and allocation calculations
│   ├── mappers/          # Data transformation layers for raw data
│   └── sheets/           # Google Sheets parsing utilities
└── types/                # TypeScript interfaces and type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.17 or higher)
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "Portfolio Tracker/dashboard"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or yarn install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root of the `dashboard` directory and configure your keys. You will need your Gemini API key for the AI Insights feature to work.
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   # Add any required Google Sheets integration keys if applicable
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **View the Application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Data Integration

This dashboard is designed to connect to your personal investment tracking Google Sheet. The logic for fetching and parsing this data is contained within `lib/sheets/parser.ts` and `hooks/usePortfolioData.ts`. Ensure your source sheet matches the expected schema in the mappers (`lib/mappers/equity.ts`, etc.) for seamless synchronization.
