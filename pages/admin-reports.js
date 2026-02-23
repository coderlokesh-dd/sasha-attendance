// ===== Admin Reports Page =====
async function renderAdminReportsPage() {
    const app = document.getElementById('app');
    app.innerHTML = renderDashboardLayout('<h1 class="page-title">Reports &amp; Analytics</h1><p class="text-muted">Loading...</p>');
    updateLeaveBadge();

    let employees = [], attendance = [], leaves = [];
    try {
        [employees, attendance, leaves] = await Promise.all([API.getEmployees(), API.getAttendance(), API.getLeaves()]);
    } catch { }

    // Date helpers
    function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
    function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
    function startOfWeek(d) { const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.getFullYear(), d.getMonth(), diff); }
    function endOfWeek(d) { const s = startOfWeek(d); return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6); }
    function fmtDate(d) { return d.toISOString().split('T')[0]; }
    function fmtMonth(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

    const now = new Date();
    let filterType = 'month';
    let dateRange = { from: fmtDate(startOfMonth(now)), to: fmtDate(endOfMonth(now)) };
    let selectedMonth = fmtMonth(now);
    let activeTab = 'monthly';

    function filterAttendance(data) {
        const from = dateRange.from, to = dateRange.to;
        return data.filter(item => item.date >= from && item.date <= to);
    }

    function computeData() {
        const filtered = filterAttendance(attendance);
        const departments = [...new Set(employees.map(e => e.department))];
        const deptSummary = departments.map(dept => {
            const deptEmps = employees.filter(e => e.department === dept);
            const deptAtt = filtered.filter(a => deptEmps.some(e => e.id === a.employee_id));
            return { dept, total: deptEmps.length, present: deptAtt.filter(a => a.status === 'present').length, absent: deptAtt.filter(a => a.status === 'absent').length, insufficient: deptAtt.filter(a => a.status === 'insufficient_hours').length };
        });
        const empSummary = employees.map(emp => {
            const empAtt = filtered.filter(a => a.employee_id === emp.id);
            const presentDays = empAtt.filter(a => a.status === 'present').length;
            const totalHours = empAtt.reduce((s, a) => s + (a.hours_worked || 0), 0);
            const empLeaves = leaves.filter(l => l.employee_id === emp.id && l.status === 'approved' && l.from_date >= dateRange.from && l.from_date <= dateRange.to);
            const latestWork = empAtt.length > 0 ? [...empAtt].sort((a, b) => b.date.localeCompare(a.date))[0].work_done : '—';
            return { ...emp, presentDays, totalHours, leaveDays: empLeaves.reduce((s, l) => s + l.total_days, 0), latestWork };
        });
        const today = new Date().toISOString().split('T')[0];
        const todayAtt = attendance.filter(a => a.date === today);
        const absentEmployees = employees.filter(emp => !todayAtt.some(a => a.employee_id === emp.id));
        return { deptSummary, empSummary, absentEmployees, today };
    }

    function render() {
        const data = computeData();
        const filterLabel = filterType === 'day' ? dateRange.from : `${dateRange.from} to ${dateRange.to}`;

        let filterInputs = '';
        if (filterType === 'month') filterInputs = `<input class="form-input" type="month" id="monthPicker" value="${selectedMonth}" style="width:160px;" />`;
        else if (filterType === 'day') filterInputs = `<input class="form-input" type="date" id="dayPicker" value="${dateRange.from}" style="width:160px;" />`;
        else if (filterType === 'custom') filterInputs = `<div class="flex items-center gap-2"><input class="form-input" type="date" id="customFrom" value="${dateRange.from}" style="width:140px;" /><span class="text-xs text-muted">to</span><input class="form-input" type="date" id="customTo" value="${dateRange.to}" style="width:140px;" /></div>`;

        // Tab contents
        const monthlyTab = `<div class="card"><div class="card-header"><div class="card-title">Summary — ${filterLabel}</div></div><div class="card-content"><div class="table-wrapper"><table>
      <thead><tr><th>Employee</th><th>Department</th><th>Present Days</th><th>Total Hours</th><th>Leave Days</th>${filterType === 'day' ? '<th>Work Done</th>' : ''}</tr></thead>
      <tbody>${data.empSummary.map(e => `<tr>
        <td class="font-medium"><a href="#/admin/employees/${e.id}" style="color:var(--primary)">${e.name}</a></td>
        <td>${e.department}</td><td>${e.presentDays}</td><td>${formatHours(e.totalHours)}</td><td>${e.leaveDays}</td>
        ${filterType === 'day' ? `<td class="truncate" title="${(e.latestWork || '').replace(/"/g, '&quot;')}">${e.latestWork || '—'}</td>` : ''}
      </tr>`).join('')}</tbody>
    </table></div></div></div>`;

        const deptTab = `<div class="card"><div class="card-header"><div class="card-title">Department-wise Report</div></div><div class="card-content"><div class="table-wrapper"><table>
      <thead><tr><th>Department</th><th>Employees</th><th>Present</th><th>Absent</th><th>Insufficient Hours</th></tr></thead>
      <tbody>${data.deptSummary.map(d => `<tr>
        <td class="font-medium">${d.dept}</td><td>${d.total}</td>
        <td><span class="badge badge-green">${d.present}</span></td>
        <td><span class="badge badge-red">${d.absent}</span></td>
        <td><span class="badge badge-amber">${d.insufficient}</span></td>
      </tr>`).join('')}</tbody>
    </table></div></div></div>`;

        const absentTab = `<div class="card"><div class="card-header"><div class="card-title">Absent Today — ${data.today}</div></div><div class="card-content"><div class="table-wrapper"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th></tr></thead>
      <tbody>${data.absentEmployees.length === 0 ? '<tr><td colspan="4" class="table-empty">Everyone is present!</td></tr>' :
                data.absentEmployees.map(e => `<tr>
          <td class="font-medium"><a href="#/admin/employees/${e.id}" style="color:var(--primary)">${e.name}</a></td>
          <td>${e.email}</td><td>${e.department}</td><td class="capitalize">${e.role}</td>
        </tr>`).join('')}</tbody>
    </table></div></div></div>`;

        const content = `
      <div class="page-header">
        <h1 class="page-title">Reports &amp; Analytics</h1>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label class="form-label text-xs">Filter By</label>
          <div class="flex gap-2 items-center" style="flex-wrap:wrap;">
            <select class="form-select" id="filterType" style="width:120px;">
              <option value="day" ${filterType === 'day' ? 'selected' : ''}>Day</option>
              <option value="week" ${filterType === 'week' ? 'selected' : ''}>This Week</option>
              <option value="month" ${filterType === 'month' ? 'selected' : ''}>Month</option>
              <option value="custom" ${filterType === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
            ${filterInputs}
            <button class="btn btn-outline btn-icon" id="exportBtn" title="Export to Excel">${ICONS.download}</button>
          </div>
        </div>
      </div>
      <div class="tabs-list">
        <button class="tab-btn ${activeTab === 'monthly' ? 'active' : ''}" data-tab="monthly">${ICONS.chart} Monthly</button>
        <button class="tab-btn ${activeTab === 'department' ? 'active' : ''}" data-tab="department">${ICONS.users} Department</button>
        <button class="tab-btn ${activeTab === 'absent' ? 'active' : ''}" data-tab="absent">${ICONS.alert} Absent Today</button>
      </div>
      <div class="tab-content ${activeTab === 'monthly' ? 'active' : ''}" id="tab-monthly">${monthlyTab}</div>
      <div class="tab-content ${activeTab === 'department' ? 'active' : ''}" id="tab-department">${deptTab}</div>
      <div class="tab-content ${activeTab === 'absent' ? 'active' : ''}" id="tab-absent">${absentTab}</div>`;

        document.querySelector('.main-content .space-y').innerHTML = content;
        attachEvents();
    }

    function attachEvents() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => { activeTab = btn.dataset.tab; render(); };
        });

        // Filter
        document.getElementById('filterType').onchange = (e) => {
            filterType = e.target.value;
            const now = new Date();
            if (filterType === 'day') dateRange = { from: fmtDate(now), to: fmtDate(now) };
            else if (filterType === 'week') dateRange = { from: fmtDate(startOfWeek(now)), to: fmtDate(endOfWeek(now)) };
            else if (filterType === 'month') { const [y, m] = selectedMonth.split('-').map(Number); const d = new Date(y, m - 1); dateRange = { from: fmtDate(startOfMonth(d)), to: fmtDate(endOfMonth(d)) }; }
            render();
        };

        const mp = document.getElementById('monthPicker');
        if (mp) mp.onchange = (e) => { selectedMonth = e.target.value; const [y, m] = selectedMonth.split('-').map(Number); const d = new Date(y, m - 1); dateRange = { from: fmtDate(startOfMonth(d)), to: fmtDate(endOfMonth(d)) }; render(); };

        const dp = document.getElementById('dayPicker');
        if (dp) dp.onchange = (e) => { dateRange = { from: e.target.value, to: e.target.value }; render(); };

        const cf = document.getElementById('customFrom');
        if (cf) cf.onchange = (e) => { dateRange.from = e.target.value; render(); };
        const ct = document.getElementById('customTo');
        if (ct) ct.onchange = (e) => { dateRange.to = e.target.value; render(); };

        // Export
        document.getElementById('exportBtn').onclick = () => {
            const data = computeData();
            const wb = XLSX.utils.book_new();

            const monthlyData = data.empSummary.map(e => ({ Name: e.name, Department: e.department, 'Present Days': e.presentDays, 'Total Hours': formatHours(e.totalHours), 'Leave Days': e.leaveDays, 'Work Done': e.latestWork || '—' }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyData), 'Monthly Summary');

            const deptData = data.deptSummary.map(d => ({ Department: d.dept, 'Total Employees': d.total, Present: d.present, Absent: d.absent, 'Insufficient Hours': d.insufficient }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptData), 'Department Summary');

            const filtered = filterAttendance(attendance);
            const detailedData = filtered.map(a => {
                const emp = employees.find(e => e.id === a.employee_id);
                return { Name: emp?.name || a.employee_id, Date: a.date, Department: emp?.department || '—', 'In Time': a.in_time || '—', 'Out Time': a.out_time || '—', 'Hours Worked': formatHours(a.hours_worked), 'Work Done': a.work_done || '—', Status: (a.status || '').replace('_', ' ') };
            }).sort((a, b) => b.Date.localeCompare(a.Date));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailedData), 'Detailed Attendance');

            XLSX.writeFile(wb, `Attendance_Report_${dateRange.from}_to_${dateRange.to}.xlsx`);
        };
    }

    render();
}
