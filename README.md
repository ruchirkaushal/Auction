# 🏏 IPL 2026 Auction Game

A high-stakes, real-time IPL auction simulation built with **React** and **Vite**. Experience the thrill of the auction room, manage your budget, and build the ultimate dream team to conquer the 2026 season.

**Created by: Ruchir M Kaushal**

---

## 🔥 Features

- **Real-Time Bidding**: Fast-paced auction mechanics with dynamic price increments.
- **Smart AI Opponents**: Compete against AI teams with unique bidding personalities (Aggressive, Tactical, Conservative).
- **Official 2025/26 Player Data**: Comprehensive database featuring star ratings and realistic base prices.
- **Team Management**: Real-time purse tracking, squad limits, and overseas player constraints.
- **Advanced UI/UX**: Premium design with smooth animations, live leaderboards, and tactical heatmaps.
- **Multiplayer Mode**: Local multiplayer support for up to 10 human players.
- **Squad Export**: Download your final squad as a text file for sharing.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **State Management**: Zustand & React Hooks
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Build Tool**: Vite

## 🚀 Troubleshooting

- **Auction skip?** If the game loads an old auction state, click the `Pause` button in the top right and select `RESET ALL TEAMS` to start fresh from the registration screen.
- **Can't bid?** Ensure you have registered your name and team at the start. If you skip registration, the auction will run with AI teams only.
- **Budget Lock?** Each team must maintain a minimum budget (₹20 Lakhs per remaining spot) to fill their squad. If your current purse minus this reserve is less than the next bid, you will be "Budget Locked".

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **npm** or **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd ipl-2026-auction-game
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env.local` file and add your Gemini API Key for AI-driven team suggestions (optional):
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000` to start bidding!

## 📸 Screenshots

*(Add your screenshots here to showcase the premium UI)*

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.


---
<p align="center">Made with ❤️ for Cricket Fans</p>
# Auction
