// ===== Firebase Configuration & Initialization =====
const firebaseConfig = {
    apiKey: "AIzaSyBqpxxJk9ZnnqA-cevLNNSINi_N1eNsJVE",
    authDomain: "sasha-attendance.firebaseapp.com",
    projectId: "sasha-attendance",
    storageBucket: "sasha-attendance.firebasestorage.app",
    messagingSenderId: "877665920737",
    appId: "1:877665920737:web:8ee1f32f908e27af6d39a0",
    measurementId: "G-KG7SNVGC31"
};

const firebaseApp = firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
const db = firebase.firestore();

// Secondary app for creating users without logging out admin
let secondaryApp;
try { secondaryApp = firebase.app('secondary'); } catch { secondaryApp = firebase.initializeApp(firebaseConfig, 'secondary'); }
const secondaryAuth = secondaryApp.auth();

// ===== Firestore Helpers =====
const col = (name) => db.collection(name);

// ===== Firebase-backed API =====
const API = {
    // Auth — sign in with Firebase Auth
    login: async function (email, password) {
        const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const uid = cred.user.uid;
        const doc = await col('employees').doc(uid).get();
        if (!doc.exists) throw new Error('Employee profile not found. Contact admin.');
        return { id: uid, ...doc.data() };
    },

    // Employees
    getEmployees: async function () {
        const snap = await col('employees').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    getEmployeeById: async function (id) {
        const doc = await col('employees').doc(id).get();
        if (!doc.exists) throw new Error('Employee not found');
        return { id: doc.id, ...doc.data() };
    },
    recordEmployee: async function (data) {
        // Create Firebase Auth user via secondary app (so admin stays logged in)
        const cred = await secondaryAuth.createUserWithEmailAndPassword(data.email, data.password_hash || data.password || 'default123');
        await secondaryAuth.signOut();
        const uid = cred.user.uid;

        // Save employee profile to Firestore
        const profile = {
            employee_code: data.employee_code || '',
            name: data.name,
            email: data.email,
            role: data.role || 'employee',
            department: data.department || '',
            employee_type: data.employee_type || (data.role === 'intern' ? 'intern' : 'full-time'),
            created_at: data.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        await col('employees').doc(uid).set(profile);

        // Create default leave balance
        await col('leave_balances').doc(uid).set({
            casual_left: 10, sick_left: 7, paid_left: 12, personal_left: 3
        });

        return { id: uid, ...profile };
    },

    // Attendance
    getAttendance: async function () {
        const snap = await col('attendance').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    getAttendanceByEmployee: async function (id) {
        const snap = await col('attendance').where('employee_id', '==', id).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    recordAttendance: async function (data) {
        const docRef = await col('attendance').add(data);
        return { id: docRef.id, ...data };
    },
    updateAttendance: async function (id, data) {
        await col('attendance').doc(id).update(data);
        return { id, ...data };
    },

    // Leaves
    getLeaves: async function () {
        const snap = await col('leaves').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    getLeavesByEmployee: async function (id) {
        const snap = await col('leaves').where('employee_id', '==', id).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    getLeaveBalance: async function (id) {
        const doc = await col('leave_balances').doc(id).get();
        if (!doc.exists) return { casual_left: 10, sick_left: 7, paid_left: 12, personal_left: 3 };
        return doc.data();
    },
    applyLeave: async function (data) {
        const docRef = await col('leaves').add(data);
        return { id: docRef.id, ...data };
    },
    updateLeaveStatus: async function (id, status, approved_by) {
        const updateData = {
            status,
            approved_by,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        await col('leaves').doc(id).update(updateData);

        // Update leave balance if approved
        if (status === 'approved') {
            const leaveDoc = await col('leaves').doc(id).get();
            const leave = leaveDoc.data();
            const balDoc = await col('leave_balances').doc(leave.employee_id).get();
            if (balDoc.exists) {
                const bal = balDoc.data();
                const key = `${leave.leave_type}_left`;
                if (typeof bal[key] === 'number') {
                    await col('leave_balances').doc(leave.employee_id).update({
                        [key]: Math.max(0, bal[key] - leave.total_days)
                    });
                }
            }
        }

        return { id, ...updateData };
    },
};

// ===== Attendance Utilities =====
function calculateHoursWorked(inTime, outTime, breaks, hybrid, wfhSegments) {
    const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const getOverlap = (s1, e1, s2, e2) => Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));

    const sessions = [];
    if (hybrid && hybrid.officeIn && hybrid.officeOut && hybrid.wfhIn && hybrid.wfhOut) {
        sessions.push({ s: toMin(hybrid.officeIn), e: toMin(hybrid.officeOut) });
        sessions.push({ s: toMin(hybrid.wfhIn), e: toMin(hybrid.wfhOut) });
    } else if (wfhSegments && wfhSegments.length > 0) {
        wfhSegments.forEach(seg => { if (seg.start && seg.end) sessions.push({ s: toMin(seg.start), e: toMin(seg.end) }); });
    } else if (inTime && outTime) {
        sessions.push({ s: toMin(inTime), e: toMin(outTime) });
    } else { return null; }

    const rawBreaks = (breaks || []).filter(b => b.start && b.end).map(b => ({ s: toMin(b.start), e: toMin(b.end) })).sort((a, b) => a.s - b.s);
    const mergedBreaks = [];
    if (rawBreaks.length > 0) {
        let cur = { ...rawBreaks[0] };
        for (let i = 1; i < rawBreaks.length; i++) {
            if (rawBreaks[i].s < cur.e) cur.e = Math.max(cur.e, rawBreaks[i].e);
            else { mergedBreaks.push(cur); cur = { ...rawBreaks[i] }; }
        }
        mergedBreaks.push(cur);
    }

    let net = 0;
    sessions.forEach(s => {
        let dur = s.e - s.s, ded = 0;
        mergedBreaks.forEach(b => { ded += getOverlap(s.s, s.e, b.s, b.e); });
        net += dur - ded;
    });
    return Math.max(0, +(net / 60).toFixed(2));
}

function determineStatus(hours, employee) {
    if (hours === null) return 'absent';
    if (employee.employee_type === 'intern' && hours < 3) return 'insufficient_hours';
    if (hours < 1) return 'absent';
    return 'present';
}

function formatHours(h) {
    if (h === null || h === undefined) return '—';
    const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
}

function getStatusColor(status) {
    switch (status) {
        case 'present': return 'badge-green';
        case 'insufficient_hours': return 'badge-amber';
        case 'absent': return 'badge-red';
        default: return '';
    }
}

function getStateLabel(state) {
    switch (state) {
        case 'office': return 'Office';
        case 'wfh': return 'Work from Home';
        case 'hybrid': return 'Hybrid (Office + WFH)';
        case 'holiday': return 'Holiday';
        case 'leave': return 'On Leave';
        default: return state;
    }
}

function getLeaveStatusColor(status) {
    switch (status) {
        case 'approved': return 'badge-green';
        case 'rejected': return 'badge-red';
        default: return 'badge-amber';
    }
}

function generateUUID() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
