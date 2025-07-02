# Financial Dashboard

A modern, responsive financial dashboard built with Next.js, Tailwind CSS v4, and Supabase.

## 🚀 Features

- **Modern Stack**: Next.js 15.3.4 with Turbopack enabled for lightning-fast development
- **Tailwind CSS v4**: Latest version with new CSS-first configuration
- **Supabase Integration**: Full-stack database and authentication
- **Responsive Design**: Works perfectly on desktop and mobile
- **Excel Processing**: Import and analyze financial data from Excel files
- **Data Visualization**: Interactive charts and graphs using Recharts
- **Type-Safe**: Built with TypeScript for better development experience

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.4 with Turbopack
- **Styling**: Tailwind CSS v4
- **Database**: Supabase
- **Authentication**: Supabase Auth with SSR
- **UI Components**: Radix UI primitives with shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation
- **Language**: TypeScript

## 🏃‍♂️ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd financial-dashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
financial-dashboard/
├── app/                    # Next.js app directory
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── financial-dashboard.tsx
├── lib/                  # Utility functions and configurations
│   ├── supabase/        # Supabase client configurations
│   └── types/           # TypeScript type definitions
├── hooks/               # Custom React hooks
├── data/               # Sample data and configurations
└── public/             # Static assets
```

## 🎨 Tailwind CSS v4

This project uses the latest Tailwind CSS v4 with the new CSS-first configuration approach:

- Configuration is now directly in CSS files using `@theme {}` blocks
- Faster builds and better IDE support
- Automatic compatibility with previous versions

## 🔐 Authentication

Supabase Auth is implemented with Server-Side Rendering (SSR) support:

- Secure authentication flow
- Session management with middleware
- Protected routes
- User profile management

## 📊 Data Management

- Excel file import and processing
- Real-time data synchronization with Supabase
- Data visualization with interactive charts
- Export capabilities

## 🚀 Deployment

This project is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy automatically on every push to main branch

## 📝 Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production with Turbopack
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. 