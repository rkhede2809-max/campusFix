function StatsCards({ complaints }) {
  const total = complaints.length;
  const pending = complaints.filter((item) => item.status === 'Pending').length;
  const inProgress = complaints.filter((item) => item.status === 'In Progress').length;
  const resolved = complaints.filter((item) => item.status === 'Resolved').length;

  const stats = [
    { label: 'Total complaints', value: total },
    { label: 'Pending', value: pending },
    { label: 'In progress', value: inProgress },
    { label: 'Resolved', value: resolved }
  ];

  return (
    <section className="stats-grid">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </section>
  );
}

export default StatsCards;
