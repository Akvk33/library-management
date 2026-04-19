export default function DashboardPage({ sessionUser, stats }) {
  const cards = [
    {
      label: "Books",
      value: stats.totalBooks,
      note: "titles in your active catalog",
      accent: "warm",
      detail: "Fresh additions and available inventory live here."
    },
    {
      label: "My Borrows",
      value: stats.totalBorrows,
      note: "requests tied to your account",
      accent: "forest",
      detail: "Everything you requested, completed, or still need to track."
    },
    {
      label: "Pending Queue",
      value: stats.pendingBorrows,
      note: "waiting for review",
      accent: "sun",
      detail: "Librarian action is still needed before access opens."
    },
    {
      label: "Active Reads",
      value: stats.activeBorrows,
      note: "currently inside due date",
      accent: "ocean",
      detail: "These borrows are still readable before payment is required."
    }
  ];

  if (sessionUser?.role === "admin") {
    cards.push({
      label: "Users",
      value: stats.totalUsers,
      note: "accounts under admin control",
      accent: "plum",
      detail: "Use the admin panel to add, remove, and reassign roles."
    });
  }

  return (
    <section className="page-section dashboard-shell">
      <article className="panel dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Welcome back, {sessionUser?.name}</h2>
            <p>{sessionUser?.role} access is active and your library workspace is ready.</p>
          </div>
          <div className="dashboard-hero-badge">
            <span>Live Session</span>
            <strong>{sessionUser?.role}</strong>
          </div>
        </div>
      </article>

      <div className="dashboard-grid polished-grid">
        {cards.map((card) => (
          <article className={`metric-card dashboard-card accent-${card.accent}`} key={card.label}>
            <div className="dashboard-card-top">
              <span>{card.label}</span>
              <span className="dashboard-chip">{card.note}</span>
            </div>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
            <div className="dashboard-progress">
              <div className="dashboard-progress-bar" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
