const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const message = document.querySelector("#authMessage");
const hasAuthRedirect = new URLSearchParams(location.search).has("auth");

if (hasAuthRedirect) {
  API.clearAuth();
}

const currentUser = API.user();
if (currentUser && !hasAuthRedirect) {
  const destination = currentUser.role === "admin"
    ? "/admin.html"
    : "/sessions.html";
  location.replace(destination);
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const button = loginForm.querySelector("button[type=submit]");
  if (button.disabled) return;

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Signing in…";

  try {
    const email = loginForm.elements.email.value;
    const password = loginForm.elements.password.value;
    const data = await API.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    API.saveAuth(data);
    const destination = data.user.role === "admin"
      ? "/admin.html"
      : "/sessions.html";
    location.replace(destination);
  } catch (error) {
    API.showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

registerForm.addEventListener("submit", async event => {
  event.preventDefault();

  const button = registerForm.querySelector("button[type=submit]");
  if (button.disabled) return;

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Creating account…";

  try {
    const name = registerForm.elements.name.value;
    const email = registerForm.elements.email.value.trim();
    const password = registerForm.elements.password.value;

    await API.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });

    API.showMessage(message, "Account created. You can now log in.", "success");
    registerForm.reset();
    loginForm.elements.email.value = email.toLowerCase();
  } catch (error) {
    API.showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});
