API.requireUser("admin");

const message = document.querySelector("#adminMessage");
const sessionSelect = document.querySelector("#adminSessionSelect");
const bookingsList = document.querySelector("#adminBookings");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

async function loadSessions() {
  const data = await API.request("/api/sessions");

  if (data.sessions.length === 0) {
    sessionSelect.innerHTML = '<option value="">No sessions yet</option>';
    return;
  }

  sessionSelect.innerHTML = data.sessions.map(session => `
    <option value="${session._id}">
      ${escapeHtml(SessionTime.formatDate(session.startsAt))} — ${session.bookedCount}/${session.capacity}
    </option>`
  ).join("");
}

function makeBookingRow(booking) {
  const name = booking.member ? booking.member.name : "Deleted member";
  const email = booking.member ? booking.member.email : "";

  return `
    <article class="booking-card">
      <div>
        <strong>${escapeHtml(name)}</strong>
        <p>${escapeHtml(email)} · ${escapeHtml(booking.status)}</p>
      </div>
    </article>`;
}

function makeWaitlistRow(entry, position) {
  const name = entry.member ? entry.member.name : "Member";
  const email = entry.member ? entry.member.email : "";

  return `
    <article class="booking-card">
      <div>
        <strong>${position}. ${escapeHtml(name)}</strong>
        <p>${escapeHtml(email)}</p>
      </div>
    </article>`;
}

async function showBookings() {
  if (!sessionSelect.value) {
    bookingsList.innerHTML = '<div class="empty">Create a session to see bookings.</div>';
    return;
  }

  bookingsList.innerHTML = "<p>Loading bookings…</p>";

  try {
    const data = await API.request(
      `/api/sessions/${sessionSelect.value}/bookings`
    );
    let html = `<p><strong>Bookings (${data.bookings.length})</strong></p>`;

    if (data.bookings.length === 0) {
      html += '<div class="empty">No bookings for this session.</div>';
    } else {
      html += data.bookings.map(makeBookingRow).join("");
    }

    html += `<p><strong>Waitlist (${data.waitlist.length})</strong></p>`;
    if (data.waitlist.length === 0) {
      html += '<div class="empty">Waitlist is empty.</div>';
    } else {
      html += data.waitlist.map((entry, index) =>
        makeWaitlistRow(entry, index + 1)
      ).join("");
    }

    bookingsList.innerHTML = html;
  } catch (error) {
    bookingsList.innerHTML = "";
    API.showMessage(message, error.message, "error");
  }
}

async function createSession(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    if (!form.elements.startsAt.value) {
      throw new Error("Choose a date and start hour.");
    }

    const startsAt = SessionTime
      .fromIndiaLocalDateTime(form.elements.startsAt.value)
      .toISOString();
    const result = await API.request("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ startsAt })
    });

    API.showMessage(message, result.message, "success");
    form.reset();
    await loadSessions();
    await showBookings();
  } catch (error) {
    API.showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function checkInMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    const result = await API.request("/api/admin/checkin", {
      method: "POST",
      body: JSON.stringify({ code: form.elements.code.value.trim() })
    });

    API.showMessage(message, result.message, "success");
    form.reset();
    await showBookings();
  } catch (error) {
    API.showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
}

document.querySelector("#logoutBtn").addEventListener("click", API.logout);
document.querySelector("#createSessionForm").addEventListener("submit", createSession);
document.querySelector("#checkinForm").addEventListener("submit", checkInMember);
sessionSelect.addEventListener("change", showBookings);

async function loadAdminDashboard() {
  try {
    await loadSessions();
    await showBookings();
  } catch (error) {
    API.showMessage(message, error.message, "error");
  }
}

loadAdminDashboard();
