// ===== Attendance Page =====
async function renderAttendancePage() {
    const app = document.getElementById('app');
    app.innerHTML = renderDashboardLayout('<h1 class="page-title">Attendance</h1><p class="text-muted">Loading...</p>');
    updateLeaveBadge();

    const user = Auth.user;
    let records = [];
    try { records = await API.getAttendanceByEmployee(user.id); records.sort((a, b) => b.date.localeCompare(a.date)); } catch { }

    // State
    let date = new Date().toISOString().split('T')[0];
    let state = 'office';
    let inTime = '09:00', outTime = '17:30';
    let officeIn = '09:00', officeOut = '13:00', wfhIn = '14:00', wfhOut = '18:00';
    let wfhSegments = [{ start: '09:00', end: '13:00' }];
    let hasBreak = true;
    let breaks = [{ start: '13:00', end: '13:30' }];
    let workDone = '';

    function getExistingRecord() { return records.find(r => r.date === date) || null; }

    function populateFromRecord(rec) {
        if (!rec) return;
        state = rec.state;
        inTime = rec.in_time || '09:00'; outTime = rec.out_time || '17:30';
        if (rec.state === 'hybrid') {
            officeIn = rec.office_in_time || '09:00'; officeOut = rec.office_out_time || '13:00';
            wfhIn = rec.wfh_in_time || '14:00'; wfhOut = rec.wfh_out_time || '18:00';
        } else if (rec.state === 'wfh' && rec.wfh_segments?.length) {
            wfhSegments = [...rec.wfh_segments];
        }
        if (rec.breaks?.length) { hasBreak = true; breaks = [...rec.breaks]; } else { hasBreak = false; }
        workDone = rec.work_done || '';
    }

    populateFromRecord(getExistingRecord());

    function render() {
        const existing = getExistingRecord();
        const todayStr = new Date().toISOString().split('T')[0];

        // Time inputs based on state
        let timeFields = '';
        if (state === 'hybrid') {
            timeFields = `
        <div class="form-group"><label class="form-label">Office In Time</label><input class="form-input" type="time" id="officeIn" value="${officeIn}" /></div>
        <div class="form-group"><label class="form-label">Office Out Time</label><input class="form-input" type="time" id="officeOut" value="${officeOut}" /></div>
        <div class="form-group"><label class="form-label">WFH In Time</label><input class="form-input" type="time" id="wfhIn" value="${wfhIn}" /></div>
        <div class="form-group"><label class="form-label">WFH Out Time</label><input class="form-input" type="time" id="wfhOut" value="${wfhOut}" /></div>`;
        } else if (state === 'wfh') {
            timeFields = `<div class="form-full"><label class="form-label">Work Sessions</label><div id="wfhSegmentsContainer">${wfhSegments.map((s, i) => `
          <div class="form-row mt-4">
            <div class="form-group" style="flex:1"><label class="form-label text-xs text-muted">Start</label><input class="form-input seg-start" data-i="${i}" type="time" value="${s.start}" /></div>
            <div class="form-group" style="flex:1"><label class="form-label text-xs text-muted">End</label><input class="form-input seg-end" data-i="${i}" type="time" value="${s.end}" /></div>
            <button class="btn btn-ghost btn-icon seg-remove" data-i="${i}" ${wfhSegments.length <= 1 ? 'disabled' : ''} style="margin-top:18px;">${ICONS.trash}</button>
          </div>`).join('')
                }</div><button class="btn btn-outline btn-sm btn-full mt-4" id="addSegment">${ICONS.plus} Add Another Session</button></div>`;
        } else {
            timeFields = `
        <div class="form-group"><label class="form-label">In Time</label><input class="form-input" type="time" id="inTime" value="${inTime}" /></div>`;
        }

        // Breaks
        let breakFields = '';
        if (hasBreak) {
            breakFields = `<div class="form-full"><label class="form-label">Breaks</label><div id="breaksContainer">${breaks.map((b, i) => `
          <div class="form-row mt-4">
            <input class="form-input brk-start" data-i="${i}" type="time" value="${b.start}" style="flex:1" />
            <input class="form-input brk-end" data-i="${i}" type="time" value="${b.end}" style="flex:1" />
            <button class="btn btn-ghost btn-icon brk-remove" data-i="${i}" style="flex-shrink:0">${ICONS.trash}</button>
          </div>`).join('')
                }</div><button class="btn btn-outline btn-sm btn-full mt-4" id="addBreak">${ICONS.plus} Add Another Break</button></div>`;
        }

        // Out time (only for office state)
        let outField = '';
        if (state !== 'hybrid' && state !== 'wfh') {
            outField = `<div class="form-group"><label class="form-label">Out Time</label><input class="form-input" type="time" id="outTime" value="${outTime}" /></div>`;
        }

        const isInternalSupport = user.role === 'hr' || user.role === 'manager';
        const content = `
      <h1 class="page-title">Attendance</h1>
      <div class="card">
        <div class="card-header"><div class="card-title">${existing ? 'Edit Attendance' : 'Mark Attendance'}</div></div>
        <div class="card-content">
          <div class="form-grid form-grid-3">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" id="attDate" value="${date}" max="${todayStr}" />
            </div>
            <div class="form-group">
              <label class="form-label">State</label>
              <select class="form-select" id="attState">
                <option value="office" ${state === 'office' ? 'selected' : ''}>Office</option>
                <option value="wfh" ${state === 'wfh' ? 'selected' : ''}>Work from Home</option>
                <option value="hybrid" ${state === 'hybrid' ? 'selected' : ''}>Hybrid (Office + WFH)</option>
              </select>
            </div>
            ${timeFields}
            <div class="form-full">
              <div class="checkbox-row">
                <input type="checkbox" id="noBreak" ${!hasBreak ? 'checked' : ''} />
                <label class="form-label" for="noBreak" style="cursor:pointer">No Break? (Continuous Work)</label>
              </div>
            </div>
            ${breakFields}
            ${outField}
            <div class="form-full form-group">
              <label class="form-label">Work Done${!isInternalSupport ? ' <span class="required">*</span>' : ''}</label>
              <textarea class="form-textarea" id="workDone" placeholder="Briefly describe what you worked on...">${workDone}</textarea>
            </div>
          </div>
          <button class="btn btn-primary mt-4" id="submitAtt">${ICONS.plus} ${existing ? 'Update Attendance' : 'Mark Attendance'}</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">My Records</div></div>
        <div class="card-content">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>State</th><th>In</th><th>Out</th><th>Hours</th><th>Work Done</th><th>Status</th></tr></thead>
              <tbody>
                ${records.length === 0 ? '<tr><td colspan="7" class="table-empty">No records yet</td></tr>' :
                records.map(r => `<tr>
                    <td class="font-medium">${r.date}</td>
                    <td>${getStateLabel(r.state)}</td>
                    <td>${r.state === 'hybrid' ? `<div class="text-xs">Off: ${r.office_in_time || '—'}<br>WFH: ${r.wfh_in_time || '—'}</div>` :
                        r.state === 'wfh' && r.wfh_segments?.length ? `<div class="text-xs">${r.wfh_segments.map(s => s.start).join('<br>')}</div>` :
                            r.in_time || '—'}</td>
                    <td>${r.state === 'hybrid' ? `<div class="text-xs">Off: ${r.office_out_time || '—'}<br>WFH: ${r.wfh_out_time || '—'}</div>` :
                        r.state === 'wfh' && r.wfh_segments?.length ? `<div class="text-xs">${r.wfh_segments.map(s => s.end).join('<br>')}</div>` :
                            r.out_time || '—'}</td>
                    <td>${formatHours(r.hours_worked)}</td>
                    <td class="truncate" title="${(r.work_done || '').replace(/"/g, '&quot;')}">${r.work_done || '—'}</td>
                    <td><span class="badge ${getStatusColor(r.status)}">${(r.status || '').replace('_', ' ')}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

        document.querySelector('.main-content .space-y').innerHTML = content;
        attachEvents();
    }

    function attachEvents() {
        document.getElementById('attDate').onchange = (e) => {
            date = e.target.value;
            const rec = getExistingRecord();
            if (rec) populateFromRecord(rec); else { workDone = ''; }
            render();
        };
        document.getElementById('attState').onchange = (e) => { state = e.target.value; render(); };
        document.getElementById('noBreak').onchange = (e) => {
            hasBreak = !e.target.checked;
            if (hasBreak && breaks.length === 0) breaks = [{ start: '13:00', end: '13:30' }];
            render();
        };

        // Time inputs
        const bind = (id, setter) => { const el = document.getElementById(id); if (el) el.onchange = (e) => setter(e.target.value); };
        bind('inTime', v => inTime = v);
        bind('outTime', v => outTime = v);
        bind('officeIn', v => officeIn = v);
        bind('officeOut', v => officeOut = v);
        bind('wfhIn', v => wfhIn = v);
        bind('wfhOut', v => wfhOut = v);

        // WFH segments
        document.querySelectorAll('.seg-start').forEach(el => el.onchange = (e) => { wfhSegments[+e.target.dataset.i].start = e.target.value; });
        document.querySelectorAll('.seg-end').forEach(el => el.onchange = (e) => { wfhSegments[+e.target.dataset.i].end = e.target.value; });
        document.querySelectorAll('.seg-remove').forEach(el => el.onclick = () => { wfhSegments.splice(+el.dataset.i, 1); render(); });
        const addSeg = document.getElementById('addSegment');
        if (addSeg) addSeg.onclick = () => { wfhSegments.push({ start: '', end: '' }); render(); };

        // Breaks
        document.querySelectorAll('.brk-start').forEach(el => el.onchange = (e) => { breaks[+e.target.dataset.i].start = e.target.value; });
        document.querySelectorAll('.brk-end').forEach(el => el.onchange = (e) => { breaks[+e.target.dataset.i].end = e.target.value; });
        document.querySelectorAll('.brk-remove').forEach(el => el.onclick = () => { breaks.splice(+el.dataset.i, 1); render(); });
        const addBrk = document.getElementById('addBreak');
        if (addBrk) addBrk.onclick = () => { breaks.push({ start: '', end: '' }); render(); };

        // Work done
        const wd = document.getElementById('workDone');
        if (wd) wd.oninput = (e) => workDone = e.target.value;

        // Submit
        document.getElementById('submitAtt').onclick = handleSubmit;
    }

    async function handleSubmit() {
        const todayStr = new Date().toISOString().split('T')[0];
        if (date > todayStr) { showToast('Invalid Date', 'Attendance cannot be marked for future dates.', 'destructive'); return; }

        const finalBreaks = hasBreak ? breaks.filter(b => b.start && b.end) : [];
        if (hasBreak && breaks.some(b => !b.start || !b.end)) { showToast('Invalid Break', 'Please fill all break times.', 'destructive'); return; }
        if (state === 'wfh' && wfhSegments.some(s => !s.start || !s.end)) { showToast('Invalid Segments', 'Please fill all segment times.', 'destructive'); return; }
        const isInternalSupport = user.role === 'hr' || user.role === 'manager';
        if (!isInternalSupport && !workDone.trim()) { showToast('Work Done Required', 'Please describe what you worked on.', 'destructive'); return; }

        let hours = 0, finalInTime = inTime, finalOutTime = outTime;
        const hybridData = { officeIn, officeOut, wfhIn, wfhOut };
        if (state === 'hybrid') {
            hours = calculateHoursWorked(null, null, finalBreaks, hybridData);
            finalInTime = officeIn < wfhIn ? officeIn : wfhIn;
            finalOutTime = officeOut > wfhOut ? officeOut : wfhOut;
        } else if (state === 'wfh') {
            hours = calculateHoursWorked(null, null, finalBreaks, undefined, wfhSegments);
            if (wfhSegments.length > 0) {
                const sorted = [...wfhSegments].sort((a, b) => a.start.localeCompare(b.start));
                finalInTime = sorted[0].start; finalOutTime = sorted[sorted.length - 1].end;
            }
        } else {
            hours = calculateHoursWorked(inTime, outTime, finalBreaks);
        }

        const status = determineStatus(hours, user);
        const recordData = {
            employee_id: user.id, date, state, in_time: finalInTime, out_time: finalOutTime,
            breaks: finalBreaks, hours_worked: hours, status, work_done: workDone,
            updated_at: new Date().toISOString(),
            ...(state === 'hybrid' ? { office_in_time: officeIn, office_out_time: officeOut, wfh_in_time: wfhIn, wfh_out_time: wfhOut } : {}),
            ...(state === 'wfh' ? { wfh_segments: wfhSegments } : {}),
        };

        try {
            const existing = getExistingRecord();
            if (existing) {
                await API.updateAttendance(existing.id, { ...existing, ...recordData });
                showToast('Attendance updated!', `Updated log for ${date}`);
            } else {
                await API.recordAttendance({ ...recordData, id: generateUUID(), created_at: new Date().toISOString() });
                showToast('Attendance marked!', `Logged for ${date}`);
            }
            records = await API.getAttendanceByEmployee(user.id);
            records.sort((a, b) => b.date.localeCompare(a.date));
            populateFromRecord(getExistingRecord());
            render();
        } catch { showToast('Error', 'Failed to save attendance.', 'destructive'); }
    }

    render();
}
