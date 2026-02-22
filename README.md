<p align="center">
  <img src="https://img.shields.io/badge/🚩_FlagTime-CTF_Countdown_Dashboard-00e0ff?style=for-the-badge&labelColor=0a0e1a" alt="FlagTime" />
</p>

<h1 align="center">🚩 FlagTime ⏱️</h1>

<p align="center">
  <strong>Real-time countdown dashboard for CTF competitions & custom events</strong><br/>
  Track multiple events, auto-fetch from CTFtime, and never miss a deadline.
</p>

<p align="center">
  <a href="https://uchihashahin01.github.io/FlagTime/">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-e040fb?style=for-the-badge&labelColor=0a0e1a" alt="Live Demo" />
  </a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🏴 **CTFtime Integration** | Paste any CTFtime URL and the event details are auto-fetched instantly |
| ✏️ **Manual Events** | Add custom countdowns for training sessions, deadlines, or anything else |
| ⏱️ **Live Countdowns** | Animated timers tick down every second with flip animations |
| 📊 **Smart Sorting** | Events auto-sort: **Live → Upcoming → Ended** |
| 💾 **Persistent Storage** | All events saved in localStorage — survives page refreshes |
| 🎨 **Dark Glassmorphic UI** | Modern design with gradients, glow effects, and micro-animations |
| 📱 **Fully Responsive** | Looks great on desktop, tablet, and mobile |

---

## 🚀 Quick Start

### Use the Live Site (No Install)

👉 **[uchihashahin01.github.io/FlagTime](https://uchihashahin01.github.io/FlagTime/)**

Just open the link and start adding events!

### Run Locally

```bash
# Clone the repo
git clone https://github.com/uchihashahin01/FlagTime.git
cd FlagTime

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📖 How to Use

### Adding a CTFtime Event

1. Click the **"+ Add Your First Event"** button (or the **+** FAB)
2. Stay on the **🏴 CTFtime URL** tab
3. Paste a CTFtime event URL, e.g.:
   ```
   https://ctftime.org/event/2575
   ```
4. Click **"Fetch & Add Event"**
5. The event card appears with a live countdown, format badge, and weight score

### Adding a Custom Event

1. Click the **+** button to open the modal
2. Switch to the **✏️ Manual Entry** tab
3. Fill in:
   - **Event Title** — e.g. "Team Training Session"
   - **Start Date & Time**
   - **End Date & Time**
   - **Description** *(optional)*
4. Click **"Add Event"**

### Removing an Event

- Click the **✕** button on any event card
- Click **"Confirm?"** to delete

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Vite** | Lightning-fast build tool |
| **React** | Component-based UI |
| **Vanilla CSS** | Custom design system with CSS variables |
| **CTFtime API** | Auto-fetch event data |
| **localStorage** | Client-side persistence |
| **GitHub Actions** | Automated deployment to GitHub Pages |

---

## 📁 Project Structure

```
FlagTime/
├── src/
│   ├── components/
│   │   ├── AddEventModal.jsx    # Two-tab modal (CTFtime / Manual)
│   │   ├── CountdownTimer.jsx   # Animated countdown display
│   │   ├── DashboardHeader.jsx  # Branding header
│   │   ├── EmptyState.jsx       # Empty dashboard CTA
│   │   └── EventCard.jsx        # Event card with badges & timer
│   ├── hooks/
│   │   └── useEvents.js         # State management + localStorage
│   ├── services/
│   │   └── ctftime.js           # CTFtime API integration
│   ├── App.jsx                  # Main dashboard layout
│   ├── App.css
│   ├── index.css                # Design system & global styles
│   └── main.jsx                 # Entry point
├── .github/workflows/
│   └── deploy.yml               # GitHub Pages deployment
├── index.html
├── vite.config.js
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

<p align="center">
  Powered by <a href="https://acergion.github.io"><strong>ACERGION</strong></a>
</p>
