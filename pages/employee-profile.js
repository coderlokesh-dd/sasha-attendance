// ===== Employee Profile Page =====
async function renderEmployeeProfilePage(id) {
    const app = document.getElementById('app');
    app.innerHTML = renderDashboardLayout('<p class="text-muted">Loading employee details...</p>');
    updateLeaveBadge();

    let employees = [], attendance = [], leaves = [];
    try {
        [employees, attendance, leaves] = await Promise.all([
            API.getEmployees(),
            API.getAttendanceByEmployee(id),
            API.getLeaves(),
        ]);
        attendance.sort((a, b) => b.date.localeCompare(a.date));
        leaves = leaves.filter(l => l.employee_id === id).sort((a, b) => b.from_date.localeCompare(a.from_date));
    } catch { }

    const employee = employees.find(e => e.id === id);
    if (!employee) {
        document.querySelector('.main-content .space-y').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;">
        <h2 style="font-size:1.2rem;font-weight:600;">Employee not found</h2>
        <button class="btn btn-ghost mt-4" onclick="Router.navigate('/admin/employees')">${ICONS.chevronLeft} Back to Employees</button>
      </div>`;
        return;
    }

    const totalHours = attendance.reduce((s, r) => s + (r.hours_worked || 0), 0);
    const presentDays = attendance.filter(r => r.status === 'present').length;
    const approvedLeaves = leaves.filter(l => l.status === 'approved').length;

    const content = `
    <div class="flex items-center justify-between">
      <button class="btn btn-ghost btn-sm" onclick="history.back()">${ICONS.chevronLeft} Back</button>
      <h1 class="page-title page-title-syne">Employee Report</h1>
    </div>

    <div class="profile-grid">
      <div class="card card-glass" style="border:none;">
        <div class="card-header" style="display:flex;align-items:center;gap:16px;flex-direction:row;">
          <div class="profile-avatar">${ICONS.userIcon}</div>
          <div>
            <div class="card-title" style="font-size:1.2rem;">${employee.name}</div>
            <p class="text-xs text-muted">${employee.email}</p>
          </div>
        </div>
        <div class="card-content" style="padding-top:16px;">
          <div class="profile-info-row"><span class="label">Department:</span><span class="value">${employee.department}</span></div>
          <div class="profile-info-row"><span class="label">Role:</span><span class="value">${employee.role}</span></div>
          <div class="profile-info-row"><span class="label">Type:</span><span class="value">${(employee.employee_type || '').replace('_', ' ')}</span></div>
        </div>
      </div>

      <div class="profile-stats">
        <div class="card card-glass" style="border:none;">
          <div class="card-header" style="padding-bottom:8px;"><div class="stat-label flex items-center gap-2">${ICONS.clock} Total Hours</div></div>
          <div class="card-content"><div class="stat-value">${formatHours(totalHours)}</div></div>
        </div>
        <div class="card card-glass" style="border:none;">
          <div class="card-header" style="padding-bottom:8px;"><div class="stat-label flex items-center gap-2">${ICONS.calendar} Days Present</div></div>
          <div class="card-content"><div class="stat-value" style="color:#059669;">${presentDays}</div></div>
        </div>
        <div class="card card-glass" style="border:none;">
          <div class="card-header" style="padding-bottom:8px;"><div class="stat-label flex items-center gap-2">${ICONS.calendar} Leaves Taken</div></div>
          <div class="card-content"><div class="stat-value" style="color:#2563eb;">${approvedLeaves}</div></div>
        </div>
      </div>
    </div>

    <div class="card card-glass" style="border:none;overflow:hidden;">
      <div class="card-header" style="border-bottom:1px solid rgba(0,0,0,.05)"><div class="card-title">Attendance History</div></div>
      <div class="card-content" style="padding:0;">
        <div class="table-wrapper"><table>
          <thead style="background:rgba(0,0,0,.03);"><tr><th>Date</th><th>State</th><th>In</th><th>Out</th><th>Hours</th><th>Work Done</th><th>Status</th></tr></thead>
          <tbody>${attendance.length === 0 ? '<tr><td colspan="7" class="table-empty">No attendance records found</td></tr>' :
            attendance.map(r => `<tr>
              <td class="font-medium">${r.date}</td>
              <td>${getStateLabel(r.state)}</td>
              <td>${r.in_time || '—'}</td>
              <td>${r.out_time || '—'}</td>
              <td>${formatHours(r.hours_worked)}</td>
              <td class="truncate" title="${(r.work_done || '').replace(/"/g, '&quot;')}">${r.work_done || '—'}</td>
              <td><span class="badge ${getStatusColor(r.status)}">${(r.status || '').replace('_', ' ')}</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>

    <div class="card card-glass" style="border:none;overflow:hidden;">
      <div class="card-header" style="border-bottom:1px solid rgba(0,0,0,.05)"><div class="card-title">Leave Records</div></div>
      <div class="card-content" style="padding:0;">
        <div class="table-wrapper"><table>
          <thead style="background:rgba(0,0,0,.03);"><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>${leaves.length === 0 ? '<tr><td colspan="5" class="table-empty">No leave records found</td></tr>' :
            leaves.map(l => `<tr>
              <td class="capitalize">${l.leave_type}</td>
              <td>${l.from_date}</td>
              <td>${l.to_date}</td>
              <td>${l.total_days}</td>
              <td><span class="badge ${getLeaveStatusColor(l.status)}">${l.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>`;

    document.querySelector('.main-content .space-y').innerHTML = content;
}
