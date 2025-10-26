// app.js - Simple localStorage "backend" for demo
(function() {
    // Utility storage keys
    const KEY = 'hostel_app_v1';

    function read() {
        const raw = localStorage.getItem(KEY);
        if (!raw) {
            const init = { hostels: [], owners: [], students: [], rooms: [], payments: [], sessions: [] };
            localStorage.setItem(KEY, JSON.stringify(init));
            return init;
        }
        return JSON.parse(raw);
    }

    function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

    // Public API
    window.createHostel = function(owner) {
        const data = read();
        // generate hostel id: OwnerName + random 4-digit
        const id = owner.ownerName.replace(/\s+/g, '').slice(0, 8) + '-' + Math.floor(1000 + Math.random() * 9000);
        const hostel = {
            id,
            hostelName: owner.hostelName,
            location: owner.location,
            wifi: owner.wifi,
            floors: owner.floors,
            roomsPerFloor: owner.roomsPerFloor,
            ownerName: owner.ownerName,
            contact: owner.contact,
            created: Date.now()
        };
        data.hostels.push(hostel);
        // save owner account
        data.owners.push({ contact: owner.contact, ownerName: owner.ownerName, hostelId: id, password: 'ownerpass' });
        // create default rooms
        const total = hostel.floors * hostel.roomsPerFloor;
        for (let i = 1; i <= total; i++) {
            const rnum = 'R' + i;
            data.rooms.push({ hostelId: id, number: rnum, occupant: null });
        }
        write(data);
        return id;
    };

    window.getHostels = function() { return read().hostels; };
    window.getHostelById = function(id) { return read().hostels.find(h => h.id === id); };
    window.getHostelByOwner = function(contact) {
        const d = read();
        const h = d.hostels.find(h => h.contact === contact || h.contact == contact);
        if (h) return h; // fallback: owner record
        const owner = d.owners.find(o => o.contact === contact);
        if (owner) return d.hostels.find(h => h.id === owner.hostelId);
        return null;
    };

    window.joinHostel = function(student, hostelId) {
        const data = read();
        const hostel = data.hostels.find(h => h.id === hostelId);
        if (!hostel) return { success: false, message: 'Hostel ID not found.' };
        // create student record
        const phone = student.phone;
        if (data.students.find(s => s.phone === phone && s.hostelId === hostelId)) return { success: false, message: 'Student already joined this hostel.' };
        const sd = { studentName: student.studentName, phone, org: student.org, room: student.room || null, hostelId, joined: Date.now() };
        data.students.push(sd);
        // student account (username = phone)
        data.sessions.push({ role: 'student', username: phone, password: 'studentpass' });
        write(data);
        return { success: true };
    };

    window.getRooms = function(hostelId) { return read().rooms.filter(r => r.hostelId === hostelId); };
    window.addRoom = function(hostelId, number) {
        const d = read();
        d.rooms.push({ hostelId, number, occupant: null });
        write(d);
    };
    window.deleteRoom = function(hostelId, number) {
        const d = read();
        d.rooms = d.rooms.filter(r => !(r.hostelId === hostelId && r.number === number));
        write(d);
    };

    window.getStudentsInHostel = function(hostelId) { return read().students.filter(s => s.hostelId === hostelId); };
    window.getStudent = function(phone) { return read().students.find(s => s.phone === phone); };

    window.addPayment = function(hostelId, studentPhone, studentName, amount) {
        const d = read();
        d.payments.push({ hostelId, studentPhone, studentName, amount, date: Date.now() });
        write(d);
    };
    window.getPayments = function(hostelId) { return read().payments.filter(p => p.hostelId === hostelId); };

    // Simple auth & session
    window.login = function(role, username, password) {
        const d = read();
        if (role === 'owner') {
            const owner = d.owners.find(o => o.contact === username);
            if (!owner) return { success: false, message: 'Owner not found.' };
            // demo password match skipped
            localStorage.setItem('hostel_session', JSON.stringify({ role: 'owner', username: owner.contact }));
            return { success: true };
        } else {
            const student = d.students.find(s => s.phone === username);
            if (!student) return { success: false, message: 'Student not found.' };
            localStorage.setItem('hostel_session', JSON.stringify({ role: 'student', username: student.phone }));
            return { success: true };
        }
    };

    window.logout = function() {
        localStorage.removeItem('hostel_session');
        location.href = 'index.html';
    };
    window.getCurrentUser = function() { return JSON.parse(localStorage.getItem('hostel_session') || 'null'); };
    window.ensureLoggedIn = function(role) {
        const s = getCurrentUser();
        if (!s || s.role !== role) {
            alert('Please login as ' + role);
            location.href = 'login.html';
        }
    };

    window.getPayments = window.getPayments; // expose

    window.vacateHostel = function(phone) {
        const d = read();
        d.students = d.students.filter(s => s.phone !== phone);
        // remove payments? keep history
        write(d);
    };

    window.requestRoomChange = function(phone, newRoom) {
        // store a simple request in payments as a "request" record for demo
        const d = read();
        d.payments.push({ hostelId: 'request', studentPhone: phone, studentName: phone, amount: 0, date: Date.now(), note: 'Room change to ' + newRoom });
        write(d);
    };

    // helper to get owner by contact
    window.getOwnerByContact = function(contact) { return read().owners.find(o => o.contact === contact); };

    // on first load, ensure KEY exists
    read();

})();