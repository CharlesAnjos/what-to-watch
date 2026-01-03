# 🎬 WhatToWatch - Movie Roulette

A web app that fetches movies from a public Letterboxd list and creates a roulette to randomly select a movie for you to watch.

## 🚀 Features

- Enter any public Letterboxd list URL
- Fetches all movies from the list
- Beautiful animated roulette to randomly select a movie
- Shows movie poster, title, year, and links back to Letterboxd
- Modern, responsive UI with smooth animations

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Backend**: Vercel Serverless Functions
- **Hosting**: Vercel (deployed from GitHub)

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd whattowatch
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

**Note**: For local development with API functions, you have two options:

- **Option A (Recommended)**: Use Vercel CLI for full-stack development:
```bash
npm i -g vercel
vercel dev
```

- **Option B**: Use Vite dev server (frontend only, API won't work locally):
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## 🌐 Deployment to Vercel

### Option 1: Deploy via GitHub (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project" and select your GitHub repository
4. Vercel will automatically detect the configuration and deploy

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

## 📝 Usage

1. Find a public Letterboxd list (yours or someone else's)
2. Copy the list URL (e.g., `https://letterboxd.com/username/list/list-name/`)
3. Paste it into the input field
4. Click "Load List" to fetch all movies
5. Click "Spin the Roulette!" to randomly select a movie

## ⚠️ Notes

- The app only works with **public** Letterboxd lists
- Letterboxd doesn't have a public API, so the app uses web scraping
- Make sure the list URL is correct and the list is public
- Rate limiting may apply if making too many requests

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.