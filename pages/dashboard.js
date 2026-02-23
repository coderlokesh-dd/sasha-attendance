// ===== Dashboard Page =====
async function renderDashboardPage() {
  const app = document.getElementById('app');
  app.innerHTML = renderDashboardLayout('<div class="page-title">Dashboard</div><p class="text-muted">Loading...</p>');
  updateLeaveBadge();

  try {
    const [attendance, leaves, balance] = await Promise.all([
      API.getAttendanceByEmployee(Auth.user.id),
      API.getLeavesByEmployee(Auth.user.id),
      API.getLeaveBalance(Auth.user.id),
    ]);

    // Compute stats
    const totalHours = attendance.reduce((s, a) => s + (a.hours_worked || 0), 0);
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const avgHours = presentDays > 0 ? totalHours / presentDays : 0;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

    let adminSection = '';
    if (Auth.isAdmin) {
      const [allEmployees, allAttendance, allLeaves] = await Promise.all([
        API.getEmployees(), API.getAttendance(), API.getLeaves()
      ]);
      const today = new Date().toISOString().split('T')[0];
      const todayAtt = allAttendance.filter(a => a.date === today);
      const presentToday = todayAtt.length;
      const absentToday = allEmployees.length - presentToday;
      const pendingAll = allLeaves.filter(l => l.status === 'pending').length;

      adminSection = `
        <div class="card card-admin">
          <div class="card-header"><div class="card-title">${ICONS.users} Admin Overview</div></div>
          <div class="card-content">
            <div class="stats-grid stats-grid-3">
              <div class="card card-glass">
                <div class="card-header"><div class="stat-header"><span class="stat-label">Present Today</span></div></div>
                <div class="card-content"><div class="stat-value" style="color:#059669;">${presentToday}</div><div class="stat-sub">of ${allEmployees.length} employees</div></div>
              </div>
              <div class="card card-glass">
                <div class="card-header"><div class="stat-header"><span class="stat-label">Absent Today</span></div></div>
                <div class="card-content"><div class="stat-value" style="color:#dc2626;">${absentToday}</div></div>
              </div>
              <div class="card card-glass">
                <div class="card-header"><div class="stat-header"><span class="stat-label">Pending Leaves</span></div></div>
                <div class="card-content"><div class="stat-value" style="color:#d97706;">${pendingAll}</div></div>
              </div>
            </div>
          </div>
        </div>`;
    }



    const content = `
      <h1 class="page-title">Dashboard</h1>
      <div class="stats-grid stats-grid-2">
        <div class="card card-glass">
          <div class="card-header"><div class="stat-header"><span class="stat-label">Total Hours</span>${ICONS.clock}</div></div>
          <div class="card-content"><div class="stat-value">${formatHours(totalHours)}</div></div>
        </div>
        <div class="card card-glass">
          <div class="card-header"><div class="stat-header"><span class="stat-label">Days Present</span>${ICONS.calendar}</div></div>
          <div class="card-content"><div class="stat-value" style="color:#059669;">${presentDays}</div></div>
        </div>
        <div class="card card-glass">
          <div class="card-header"><div class="stat-header"><span class="stat-label">Avg Hours/Day</span>${ICONS.chart}</div></div>
          <div class="card-content"><div class="stat-value">${formatHours(avgHours)}</div></div>
        </div>
        <div class="card card-glass">
          <div class="card-header"><div class="stat-header"><span class="stat-label">Pending Leaves</span>${ICONS.calendar}</div></div>
          <div class="card-content"><div class="stat-value" style="color:#d97706;">${pendingLeaves}</div></div>
        </div>
      </div>
      ${adminSection}`;

    document.querySelector('.main-content .space-y').innerHTML = content;
  } catch (err) {
    document.querySelector('.main-content .space-y').innerHTML = `<h1 class="page-title">Dashboard</h1><p class="text-muted">Error loading data. Is the backend running?</p>`;
  }
}
