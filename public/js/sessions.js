API.requireUser();

const sessionsList = document.querySelector("#sessionsList");
const message = document.querySelector("#sessionMessage");
const dateFilter = document.querySelector("#dateFilter");

dateFilter.value = "";
let isLoadingSessions = false;
let reloadAfterCurrent = false;
let refreshTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function makeSessionCard(session) {
  const isPast = new Date(session.startsAt) <= new Date();
  const buttonText = session.seatsRemaining > 0 ? "Book session" : "Join waitlist";

  return `
    <article class="session-card">
      <div>
        <h3>${escapeHtml(SessionTime.formatDate(session.startsAt))}</h3>
        <p>${session.seatsRemaining} seats remaining · 1 hour · Capacity ${session.capacity}</p>
      </div>
      <button data-book="${session._id}" ${isPast ? "disabled" : ""}>${buttonText}</button>
    </article>`;
}

async function bookSession(button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Processing…";

  try {
    const result = await API.request(`/api/bookings/${button.dataset.book}`, {
      method: "POST",
      body: "{}"
    });
    API.showMessage(message, result.message, "success");
    await loadSessions();
  } catch (error) {
    API.showMessage(message, error.message, "error");
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function loadSessions() {
  if (isLoadingSessions) {
    reloadAfterCurrent = true;
    return;
  }
  isLoadingSessions = true;
  sessionsList.innerHTML = "<p>Loading sessions…</p>";

  try {
    const date = dateFilter.value;
    const url = date
      ? `/api/sessions?date=${encodeURIComponent(date)}`
      : "/api/sessions";
    const data = await API.request(url);
    if (message.classList.contains("error")) {
      API.showMessage(message, "");
    }

    if (data.sessions.length === 0) {
      sessionsList.innerHTML = '<div class="empty">No sessions for this date.</div>';
      return;
    }

    sessionsList.innerHTML = data.sessions.map(makeSessionCard).join("");
    sessionsList.querySelectorAll("[data-book]").forEach(button => {
      button.addEventListener("click", () => bookSession(button));
    });
  } catch (error) {
    sessionsList.innerHTML = `
      <div class="empty">
        <p>Could not load sessions.</p>
        <button id="retrySessionsBtn" type="button" class="secondary">Retry loading sessions</button>
      </div>`;
    sessionsList.querySelector("#retrySessionsBtn").addEventListener("click", () => {
      API.showMessage(message, "");
      loadSessions();
    });
    API.showMessage(message, `${error.message} You can try again after checking your connection.`, "error");
  } finally {
    isLoadingSessions = false;
    if (reloadAfterCurrent) {
      reloadAfterCurrent = false;
      await loadSessions();
    }
  }
}

function scheduleSessionRefresh() {
  clearTimeout(refreshTimer);
  if (document.hidden) return;

  refreshTimer = setTimeout(async () => {
    await loadSessions();
    scheduleSessionRefresh();
  }, 15000);
}

document.querySelector("#logoutBtn").addEventListener("click", API.logout);
dateFilter.addEventListener("change", () => {
  API.showMessage(message, "");
  loadSessions();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(refreshTimer);
    return;
  }

  loadSessions().finally(scheduleSessionRefresh);
});

loadSessions().finally(scheduleSessionRefresh);
