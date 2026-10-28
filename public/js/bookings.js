API.requireUser();

const bookingsList = document.querySelector("#bookingsList");
const waitlistList = document.querySelector("#waitlistList");
const message = document.querySelector("#bookingsMessage");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function makeBookingCard(booking) {
  const canCancel = booking.status === "confirmed" &&
    new Date(booking.session.startsAt) > new Date();
  let checkInCode = "";

  if (booking.status === "confirmed") {
    const code = booking.checkInCode || "Assigned at confirmation";
    checkInCode = `<p>Check-in code: <code>${escapeHtml(code)}</code></p>`;
  }

  let cancelButton = "";
  if (canCancel) {
    cancelButton = `<button class="secondary" data-cancel="${booking._id}">Cancel booking</button>`;
  }

  return `
    <article class="booking-card">
      <div>
        <h3>${escapeHtml(SessionTime.formatDate(booking.session.startsAt))}</h3>
        <p>Status: <strong>${escapeHtml(booking.status)}</strong></p>
        ${checkInCode}
      </div>
      ${cancelButton}
    </article>`;
}

function makeWaitlistCard(entry) {
  return `
    <article class="booking-card">
      <div>
        <h3>${escapeHtml(SessionTime.formatDate(entry.session.startsAt))}</h3>
        <p>Status: Waiting for a seat</p>
      </div>
      <button class="secondary" data-leave="${entry.session._id}">Leave waitlist</button>
    </article>`;
}

async function cancelBooking(button) {
  button.disabled = true;

  try {
    const result = await API.request(`/api/bookings/${button.dataset.cancel}`, {
      method: "DELETE"
    });
    API.showMessage(message, result.message, "success");
    await loadBookings();
  } catch (error) {
    API.showMessage(message, error.message, "error");
    button.disabled = false;
  }
}

async function leaveWaitlist(button) {
  button.disabled = true;

  try {
    const result = await API.request(`/api/bookings/waitlist/${button.dataset.leave}`, {
      method: "DELETE"
    });
    API.showMessage(message, result.message, "success");
    await loadBookings();
  } catch (error) {
    API.showMessage(message, error.message, "error");
    button.disabled = false;
  }
}

async function loadBookings() {
  bookingsList.innerHTML = "<p>Loading bookings…</p>";

  try {
    const data = await API.request("/api/bookings/my");
    const bookings = data.bookings
      .filter(booking => booking.session)
      .sort((first, second) =>
        new Date(first.session.startsAt) - new Date(second.session.startsAt)
      );
    const waitlist = data.waitlist.filter(entry => entry.session);

    if (bookings.length === 0) {
      bookingsList.innerHTML = '<div class="empty">You have no bookings yet.</div>';
    } else {
      bookingsList.innerHTML = bookings.map(makeBookingCard).join("");
    }

    if (waitlist.length === 0) {
      waitlistList.innerHTML = '<div class="empty">You are not on any waitlist.</div>';
    } else {
      waitlistList.innerHTML = waitlist.map(makeWaitlistCard).join("");
    }

    bookingsList.querySelectorAll("[data-cancel]").forEach(button => {
      button.addEventListener("click", () => cancelBooking(button));
    });
    waitlistList.querySelectorAll("[data-leave]").forEach(button => {
      button.addEventListener("click", () => leaveWaitlist(button));
    });
  } catch (error) {
    bookingsList.innerHTML = "";
    waitlistList.innerHTML = "";
    API.showMessage(message, error.message, "error");
  }
}

document.querySelector("#logoutBtn").addEventListener("click", API.logout);
loadBookings();
