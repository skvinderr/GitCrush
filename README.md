<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome" />
  
  <br />
  <br />

  <h1>❤️ GitCrush</h1>
  <p><b>Ready to exit Vim and enter a relationship?</b><br /> Join thousands of developers seeking true love in open source.</p>

  <br />
</div>

## 📖 About GitCrush

GitCrush is a Tinder-like dating and networking application exclusively designed for developers. It leverages the GitHub API to authenticate users, analyze their code repositories, and generate customized algorithmic matchmaking scores based on programming languages, experience levels, and coding habits (like "Night Owl" or "Morning Bird"). 

Stop arguing over spaces vs. tabs. Swipe right on developers who share your tech stack!

## 🚀 Features

- **GitHub OAuth Integration:** Instant login, bypassing tedious forms.
- **Smart Tech Stack Matching:** An internal algorithm processes developers' top languages to find highly compatible pairs.
- **Interactive Swipe UI:** Tinder-style intuitive swipe mechanics built using Framer Motion (Swipe Right to Crush, Left to Pass, Up for Super Star!).
- **AI Profile & Bio Generation:** Automatically generates a witty, customized bio and archetype based on commit patterns using OpenAI.
- **Real-Time Developer Chat:** Secure, instantaneous messaging between matched profiles using WebSockets (`Socket.io`).
- **Global Leaderboard:** Track the most "crushed" developers and top contributors within the community.
- **Live Search & Active Sync:** Fast profile lookups and real-time GitHub activity tracking.

## 🛠️ Tech Stack

**Frontend:**
- [React (Vite)](https://vitejs.dev/) - UI Library
- [Tailwind CSS](https://tailwindcss.com/) - Styling (Custom Brutalist Design)
- [Framer Motion](https://www.framer.com/motion/) - Animations & Swipe Interactions
- [React Router](https://reactrouter.com/) - Navigation

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) - Server & API
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [MongoDB](https://www.mongodb.com/) - Database
- [Socket.io](https://socket.io/) - Real-time WebSocket communication
- [Passport.js](https://www.passportjs.org/) - GitHub OAuth Authentication 

## 💻 Getting Started

Follow these steps to get GitCrush running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URL)
- A GitHub OAuth App ([Create one here](https://github.com/settings/applications/new))

### 1. Clone the repository

```bash
git clone https://github.com/your-username/git-tinder.git
cd git-tinder
```

### 2. Configure Environment Variables

Create a `.env` file in the **`server`** directory with the following variables:

```env
PORT=5000
DATABASE_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/gitcrush?retryWrites=true&w=majority
SESSION_SECRET=a_super_secret_string_here
CLIENT_URL=http://localhost:5173
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OPENAI_API_KEY=your_openai_api_key_here
```

Create a `.env` file in the **`client`** directory:

```env
VITE_API_URL=http://localhost:5000
```

### 3. Backend Setup

Open a terminal and navigate to the server folder:

```bash
cd server
npm install

# Push the Prisma schema to set up your MongoDB collections
npx prisma db push

# Start the local development server
npm run dev
```

### 4. Frontend Setup

Open a new terminal and navigate to the client folder:

```bash
cd client
npm install

# Start the Vite development server
npm run dev
```

The application will now be running at `http://localhost:5173`. 

## 🤝 Contributing

Contributions, issues, and feature requests are always welcome!
Feel free to check [issues page](https://github.com/your-username/git-tinder/issues) if you want to contribute.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">Made with 💖 by Aditya, for developers.</div>
