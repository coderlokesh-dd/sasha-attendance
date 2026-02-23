// ===== Leave Page =====
async function renderLeavePage() {
    const app = document.getElementById('app');
    app.innerHTML = renderDashboardLayout('<h1 class="page-title">Leave Management</h1><p class="text-muted">Loading...</p>');
    updateLeaveBadge();

    const user = Auth.user;

    let myLeaves = [], allLeaves = [], balance = null, employees = [];
    try {
        [myLeaves, balance] = await Promise.all([
            API.getLeavesByEmployee(user.id),
            API.getLeaveBalance(user.id),
        ]);
        myLeaves.sort((a, b) => b.created_at.localeCompare(a.created_at));
        if (Auth.isAdmin) {
            [allLeaves, employees] = await Promise.all([API.getLeaves(), API.getEmployees()]);
            allLeaves.sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
    } catch { }

    let leaveType = 'casual', fromDate = '', toDate = '', reason = '';

    function render() {
        let adminSection = '';
        if (Auth.isAdmin) {
            adminSection = `
        <div class="card card-admin">
          <div class="card-header"><div class="card-title">All Leave Requests (Admin)</div></div>
          <div class="card-content">
            <div class="table-wrapper"><table>
              <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>${allLeaves.map(l => {
                const applicant = employees.find(e => e.id === l.employee_id);
                const name = applicant?.name || l.employee_id;
                const role = applicant?.role || 'employee';
                const isSelf = l.employee_id === user.id;
                let canApprove = !isSelf && (user.role === 'hr' || user.role === 'manager');
                let actions = '—';
                if (l.status === 'pending') {
                    if (canApprove) {
                        actions = `<div class="flex gap-2"><button class="btn btn-outline btn-sm btn-approve leave-action" data-id="${l.id}" data-action="approved">Approve</button><button class="btn btn-outline btn-sm btn-reject leave-action" data-id="${l.id}" data-action="rejected">Reject</button></div>`;
                    } else if (isSelf) { actions = '<span class="text-xs text-muted italic">Awaiting Approval</span>'; }
                    else { actions = '<span class="text-xs text-muted italic">Restricted</span>'; }
                }
                return `<tr>
                  <td class="font-medium"><div>${name}</div><div class="text-xs text-muted capitalize">${role}</div></td>
                  <td class="capitalize">${l.leave_type}</td><td>${l.from_date}</td><td>${l.to_date}</td><td>${l.total_days}</td>
                  <td><span class="badge ${getLeaveStatusColor(l.status)}">${l.status}</span></td>
                  <td>${actions}</td>
                </tr>`;
            }).join('')}</tbody>
            </table></div>
          </div>
        </div>`;
        }

        const content = `
      <h1 class="page-title">Leave Management</h1>
      <div class="card">
        <div class="card-header"><div class="card-title">${ICONS.calendar} Apply for Leave</div></div>
        <div class="card-content">
          <div class="form-grid form-grid-4">
            <div class="form-group">
              <label class="form-label">Leave Type</label>
              <select class="form-select" id="leaveType">
                <option value="casual" ${leaveType === 'casual' ? 'selected' : ''}>Casual</option>
                <option value="sick" ${leaveType === 'sick' ? 'selected' : ''}>Sick</option>
                <option value="paid" ${leaveType === 'paid' ? 'selected' : ''}>Paid</option>
                <option value="personal" ${leaveType === 'personal' ? 'selected' : ''}>Personal</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">From</label><input class="form-input" type="date" id="leaveFrom" value="${fromDate}" /></div>
            <div class="form-group"><label class="form-label">To</label><input class="form-input" type="date" id="leaveTo" value="${toDate}" /></div>
            <div class="form-group"><label class="form-label">Reason</label><textarea class="form-textarea" id="leaveReason" rows="1" placeholder="Brief reason...">${reason}</textarea></div>
          </div>
          <button class="btn btn-primary mt-4" id="applyLeave">Apply Leave</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">My Leave Requests</div></div>
        <div class="card-content">
          <div class="table-wrapper"><table>
            <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Reason</th></tr></thead>
            <tbody>${myLeaves.length === 0 ? '<tr><td colspan="6" class="table-empty">No leave requests</td></tr>' :
                myLeaves.map(l => `<tr>
                <td class="capitalize font-medium">${l.leave_type}</td><td>${l.from_date}</td><td>${l.to_date}</td><td>${l.total_days}</td>
                <td><span class="badge ${getLeaveStatusColor(l.status)}">${l.status}</span></td>
                <td class="truncate">${l.reason || '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
      </div>
      ${adminSection}`;

        document.querySelector('.main-content .space-y').innerHTML = content;
        attachEvents();
    }

    function attachEvents() {
        document.getElementById('leaveType').onchange = (e) => leaveType = e.target.value;
        document.getElementById('leaveFrom').onchange = (e) => fromDate = e.target.value;
        document.getElementById('leaveTo').onchange = (e) => toDate = e.target.value;
        document.getElementById('leaveReason').oninput = (e) => reason = e.target.value;

        document.getElementById('applyLeave').onclick = async () => {
            if (!fromDate || !toDate) { showToast('Please select dates', '', 'destructive'); return; }
            const from = new Date(fromDate), to = new Date(toDate);
            if (to < from) { showToast('Invalid date range', '', 'destructive'); return; }
            const totalDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

            const overlap = myLeaves.some(l => {
                if (l.status === 'rejected') return false;
                return !(toDate < l.from_date || fromDate > l.to_date);
            });
            if (overlap) { showToast('Overlapping leave request', '', 'destructive'); return; }

            if (balance) {
                const key = `${leaveType}_left`;
                if (typeof balance[key] === 'number' && balance[key] < totalDays) {
                    showToast('Insufficient leave balance', '', 'destructive'); return;
                }
            }

            try {
                await API.applyLeave({
                    id: generateUUID(), employee_id: user.id, leave_type: leaveType,
                    from_date: fromDate, to_date: toDate, total_days: totalDays,
                    status: 'pending', reason, approved_by: null, approved_at: null,
                    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                });
                showToast('Leave applied!', `${totalDays} day(s) ${leaveType} leave`);
                fromDate = ''; toDate = ''; reason = '';
                myLeaves = await API.getLeavesByEmployee(user.id);
                myLeaves.sort((a, b) => b.created_at.localeCompare(a.created_at));
                if (Auth.isAdmin) { allLeaves = await API.getLeaves(); allLeaves.sort((a, b) => b.created_at.localeCompare(a.created_at)); }
                render();
            } catch { showToast('Error', 'Failed to apply leave.', 'destructive'); }
        };

        // Admin actions
        document.querySelectorAll('.leave-action').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id, action = btn.dataset.action;
                try {
                    await API.updateLeaveStatus(id, action, user.id);
                    showToast('Status updated', 'Leave request processed.');
                    allLeaves = await API.getLeaves(); allLeaves.sort((a, b) => b.created_at.localeCompare(a.created_at));
                    myLeaves = await API.getLeavesByEmployee(user.id); myLeaves.sort((a, b) => b.created_at.localeCompare(a.created_at));
                    render();
                    updateLeaveBadge();
                } catch { showToast('Error', 'Failed to update status.', 'destructive'); }
            };
        });
    }

    render();
}
