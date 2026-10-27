const API = {
  user() {
    try {
      const user = JSON.parse(localStorage.getItem("gymUser") || "null");
      const hasValidRole = user &&
        (user.role === "member" || user.role === "admin");

      if (!user || typeof user.id !== "string" ||
          typeof user.name !== "string" || !hasValidRole) {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  },

  saveAuth(data) {
    const validResponse = data &&
      typeof data.token === "string" &&
      data.user &&
      typeof data.user.id === "string" &&
      (data.user.role === "member" || data.user.role === "admin");

    if (!validResponse) {
      throw new Error("The server returned an invalid login response.");
    }

    localStorage.removeItem("gymToken");
    localStorage.setItem("gymUser", JSON.stringify(data.user));
  },

  clearAuth() {
    localStorage.removeItem("gymToken");
    localStorage.removeItem("gymUser");
  },

  async logout() {
    try {
      await API.request("/api/auth/logout", { method: "POST" });
      API.clearAuth();
      location.replace("/index.html");
    } catch (error) {
      API.showMessage(
        document.querySelector(".message"),
        error.message,
        "error"
      );
    }
  },

  async request(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin"
      });
    } catch {
      throw new Error("Unable to reach the server. Check your connection and try again.");
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an unexpected response. Please try again.");
    }

    if (!data || typeof data !== "object" ||
        typeof data.success !== "boolean") {
      throw new Error("The server returned an unexpected response. Please try again.");
    }

    if (!response.ok || !data.success) {
      const isProtectedApi = !url.startsWith("/api/auth/");
      if (response.status === 401 && isProtectedApi) {
        API.clearAuth();
        if (location.pathname !== "/index.html" && location.pathname !== "/") {
          location.replace("/index.html");
        }
      }

      const message = typeof data.message === "string"
        ? data.message
        : `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  },

  requireUser(requiredRole) {
    const user = API.user();

    if (!user) {
      location.replace("/index.html");
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      location.replace("/sessions.html");
      return null;
    }

    document.querySelectorAll("[data-user-name]").forEach(element => {
      element.textContent = user.name;
    });
    document.querySelectorAll("[data-user-role]").forEach(element => {
      element.textContent = user.role;
    });
    document.querySelectorAll("[data-admin-only]").forEach(element => {
      element.hidden = user.role !== "admin";
    });

    return user;
  },

  showMessage(element, text, type = "info") {
    if (!element) return;

    element.textContent = text;
    element.className = `message ${type}`;
    element.hidden = !text;
  }
};

window.API = API;
