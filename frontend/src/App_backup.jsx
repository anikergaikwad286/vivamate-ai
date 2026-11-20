
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  BrainCircuit,
  Mic,
  BarChart3,
  History,
  Settings,
  Bell,
  Search,
  Upload,
  ArrowUpRight,
  Clock,
  Target,
  Trophy,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import Login from "./Login";
import UploadPage from "./UploadPage";
import VoiceViva from "./VoiceViva";
import "./App.css";

function App() {
  const [active, setActive] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "My Projects", icon: FileText },
    { name: "AI Viva", icon: BrainCircuit },
    { name: "Voice Viva", icon: Mic },
    { name: "Performance", icon: BarChart3 },
    { name: "Viva History", icon: History },
  ];

  const stats = [
    { title: "Total Vivas", value: "12", note: "+3 this week", icon: BrainCircuit },
    { title: "Average Score", value: "82%", note: "+8% improvement", icon: Target },
    { title: "Practice Hours", value: "8.5h", note: "This month", icon: Clock },
    { title: "Best Score", value: "96%", note: "Excellent work!", icon: Trophy },
  ];

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? "show" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><BrainCircuit size={27} /></div>
          <div>
            <h2>VivaMate<span> AI</span></h2>
            <small>SMART VIVA PLATFORM</small>
          </div>
          <button className="close-menu" onClick={() => setMenuOpen(false)}>
            <X />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;

            if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
              <button
                key={item.name}
                className={`nav-item ${active === item.name ? "active" : ""}`}
                onClick={() => {
                  setActive(item.name);
                  setMenuOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                {active === item.name && <ChevronRight size={16} />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <Sparkles size={22} />
            <h3>Ready to improve?</h3>
            <p>Practice smarter with AI-powered viva sessions.</p>
            <button onClick={() => setActive("AI Viva")}>
              Start Practicing <ArrowUpRight size={16} />
            </button>
          </div>

          <button className="nav-item" onClick={() => setActive("Settings")}>
            <Settings size={19} /> Settings
          </button>

          <div className="profile">
            <div className="avatar">AG</div>
            <div>
              <strong>Aniket Gaikwad</strong>
              <small>BTech CSE Student</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>

          <div className="breadcrumb">
            Workspace / <strong>{active}</strong>
          </div>

          <div className="top-actions">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search anything..." />
            </div>

            <button className="icon-button">
              <Bell size={20} /><i />
            </button>

            <div className="top-avatar">AG</div>
          </div>
        </header>

        {active === "Dashboard" ? (
          <div className="content">
            <section className="welcome">
              <div>
                <div className="date-label">STUDENT WORKSPACE</div>
                <h1>Welcome back, Aniket! <span>ðŸ‘‹</span></h1>
                <p>Ready to ace your next viva? Let's make every answer count.</p>
              </div>

              <button className="primary-btn" onClick={() => setActive("AI Viva")}>
                <BrainCircuit size={18} /> Start New Viva
              </button>
            </section>

            <section className="hero-card">
              <div className="hero-content">
                <div className="hero-tag">
                  <Sparkles size={15} /> AI-POWERED LEARNING
                </div>

                <h2>Master your project.<br />Own your viva.</h2>

                <p>
                  Upload your project report and let AI prepare
                  personalized viva questions just for you.
                </p>

                <button onClick={() => setActive("My Projects")}>
                  Explore Your Projects <ArrowUpRight size={17} />
                </button>
              </div>

              <div className="hero-art">
                <BrainCircuit size={115} strokeWidth={1} />
              </div>

              <div className="hero-glow" />
            </section>

            <section className="stats-grid">
              {stats.map((stat) => {
                const Icon = stat.icon;

                if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
                  <div className="stat-card" key={stat.title}>
                    <div className="stat-top">
                      <span>{stat.title}</span>
                      <div className="stat-icon"><Icon size={20} /></div>
                    </div>
                    <h2>{stat.value}</h2>
                    <small>{stat.note}</small>
                  </div>
                );
              })}
            </section>

            <section className="dashboard-grid">
              <div className="panel projects-panel">
                <div className="panel-heading">
                  <div>
                    <h3>My Projects</h3>
                    <p>Your uploaded project reports</p>
                  </div>

                  <button className="text-btn" onClick={() => setActive("My Projects")}>
                    View all <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="project-row">
                  <div className="project-icon"><FileText /></div>

                  <div className="project-info">
                    <strong>VivaMate AI</strong>
                    <small>Innovation Project Â· PDF Report</small>
                  </div>

                  <span className="status">Ready</span>

                  <button className="round-arrow" onClick={() => setActive("AI Viva")}>
                    <ArrowUpRight size={17} />
                  </button>
                </div>

                <div
                  className="upload-area"
                  onClick={() => setActive("My Projects")}
                >
                  <Upload size={23} />
                  <strong>Upload a new project</strong>
                  <span>Add your project report to get started</span>
                </div>
              </div>

              <div className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Activity</h3>
                    <p>Your learning progress</p>
                  </div>
                </div>

                <div className="activity-item">
                  <div className="activity-icon cyan"><BrainCircuit /></div>
                  <div>
                    <strong>AI Viva Practice</strong>
                    <small>Completed a practice session</small>
                  </div>
                  <span>Today</span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon green"><Trophy /></div>
                  <div>
                    <strong>Score improved</strong>
                    <small>You achieved 92% accuracy</small>
                  </div>
                  <span>Yesterday</span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon purple"><FileText /></div>
                  <div>
                    <strong>Project uploaded</strong>
                    <small>VivaMate AI report added</small>
                  </div>
                  <span>2 days ago</span>
                </div>
              </div>
            </section>

            <section className="panel quick-panel">
              <div className="panel-heading">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Choose how you want to practice today</p>
                </div>
              </div>

              <div className="quick-grid">
                <button onClick={() => setActive("AI Viva")}>
                  <BrainCircuit />
                  <span>
                    <strong>AI Mock Viva</strong>
                    <small>Practice with AI questions</small>
                  </span>
                  <ArrowUpRight />
                </button>

                <button onClick={() => setActive("Voice Viva")}>
                  <Mic />
                  <span>
                    <strong>Voice Practice</strong>
                    <small>Answer using your voice</small>
                  </span>
                  <ArrowUpRight />
                </button>

                <button onClick={() => setActive("Performance")}>
                  <BarChart3 />
                  <span>
                    <strong>View Performance</strong>
                    <small>Analyze your progress</small>
                  </span>
                  <ArrowUpRight />
                </button>
              </div>
            </section>

            <footer>Â© 2026 VivaMate AI Â· Learn. Practice. Excel.</footer>
          </div>

        ) : active === "My Projects" ? (
          <UploadPage />

        ) : active === "Voice Viva" ? (
          <VoiceViva />

        ) : (
          <div className="content placeholder-page">
            <div className="date-label">VIVAMATE AI WORKSPACE</div>
            <h1>{active}</h1>

            <p>This section is ready for the next development step.</p>

            <div className="panel coming-soon">
              <Sparkles size={35} />
              <h2>{active} Module</h2>
              <p>
                We will build this feature and connect it to the AI backend
                step by step.
              </p>

              <button
                className="primary-btn"
                onClick={() => setActive("Dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;






