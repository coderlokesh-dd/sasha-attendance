// ===== Admin Employees Page =====
async function renderAdminEmployeesPage() {
  const app = document.getElementById('app');
  app.innerHTML = renderDashboardLayout('<h1 class="page-title">Employees</h1><p class="text-muted">Loading...</p>');
  updateLeaveBadge();

  let employees = [];
  try { employees = await API.getEmployees(); } catch { }

  let showModal = false;
  let formState = { employeeCode: '', name: '', email: '', password: '', role: 'employee', department: '', showPassword: false };

  function render() {
    const content = `
      <div class="page-header">
        <h1 class="page-title">Employees</h1>
        <button class="btn btn-primary" id="addEmpBtn">${ICONS.userPlus} Add Employee</button>
      </div>
      <div class="card">
        <div class="card-content" style="padding-top:20px;">
          <div class="table-wrapper"><table>
            <thead><tr><th>Employee ID</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Type</th></tr></thead>
            <tbody>${employees.length === 0 ? '<tr><td colspan="6" class="table-empty">No employees</td></tr>' :
        employees.map(e => `<tr>
                <td class="font-mono font-medium">${e.employee_code || '—'}</td>
                <td class="font-medium"><a href="#/admin/employees/${e.id}" style="color:var(--primary)">${e.name}</a></td>
                <td>${e.email}</td>
                <td class="capitalize">${e.role}</td>
                <td>${e.department}</td>
                <td class="capitalize">${(e.employee_type || '').replace('_', ' ')}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
      </div>
      ${showModal ? renderModal() : ''}`;

    document.querySelector('.main-content .space-y').innerHTML = content;
    attachEvents();
  }

  function renderModal() {
    return `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Add New Employee</span>
            <button class="modal-close" id="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Employee ID</label><input class="form-input" id="empCode" placeholder="e.g. EMP006" value="${formState.employeeCode}" /></div>
            <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="empName" value="${formState.name}" /></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="empEmail" type="email" value="${formState.email}" /></div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="password-wrapper">
                <input class="form-input" id="empPassword" type="${formState.showPassword ? 'text' : 'password'}" value="${formState.password}" />
                <button type="button" class="password-toggle" id="toggleEmpPass">${formState.showPassword ? ICONS.eyeOff : ICONS.eye}</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select class="form-select" id="empRole">
                <option value="employee" ${formState.role === 'employee' ? 'selected' : ''}>Employee</option>
                <option value="intern" ${formState.role === 'intern' ? 'selected' : ''}>Intern</option>
                <option value="hr" ${formState.role === 'hr' ? 'selected' : ''}>HR</option>
                <option value="manager" ${formState.role === 'manager' ? 'selected' : ''}>Manager</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Department</label><input class="form-input" id="empDept" value="${formState.department}" /></div>
            <button class="btn btn-primary btn-full" id="submitEmp">Add Employee</button>
          </div>
        </div>
      </div>`;
  }

  function attachEvents() {
    document.getElementById('addEmpBtn').onclick = () => { showModal = true; render(); };

    if (showModal) {
      document.getElementById('closeModal').onclick = () => { showModal = false; render(); };
      document.getElementById('modalOverlay').onclick = (e) => { if (e.target.id === 'modalOverlay') { showModal = false; render(); } };
      document.getElementById('toggleEmpPass').onclick = () => { formState.showPassword = !formState.showPassword; render(); };

      // Bind form inputs to state
      ['empCode', 'empName', 'empEmail', 'empPassword', 'empDept'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => {
          const map = { empCode: 'employeeCode', empName: 'name', empEmail: 'email', empPassword: 'password', empDept: 'department' };
          formState[map[id]] = e.target.value;
        };
      });
      document.getElementById('empRole').onchange = (e) => formState.role = e.target.value;

      document.getElementById('submitEmp').onclick = async () => {
        const { name, email, password, role, department, employeeCode } = formState;
        if (!name || !email || !password) { showToast('Missing fields', 'Name, email, and password are required.', 'destructive'); return; }
        if (password.length < 6) { showToast('Weak password', 'Password must be at least 6 characters.', 'destructive'); return; }
        try {
          await API.recordEmployee({
            employee_code: employeeCode, name, email, password,
            role, department, employee_type: role === 'intern' ? 'intern' : 'full-time',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          });
          showToast('Employee added!', `${name} has been registered.`);
          formState = { employeeCode: '', name: '', email: '', password: '', role: 'employee', department: '', showPassword: false };
          showModal = false;
          employees = await API.getEmployees();
          render();
        } catch (err) { showToast('Error', err.message || 'Failed to add employee.', 'destructive'); }
      };
    }
  }

  render();
}
