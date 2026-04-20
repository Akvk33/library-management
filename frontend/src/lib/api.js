  const SESSION_USER_KEY = "leafshelf_session_user";
  const ACCESS_TOKEN_KEY = "leafshelf_access_token";
  const REFRESH_TOKEN_KEY = "leafshelf_refresh_token";
  const API = "https://library-management-jy5z.onrender.com";

  console.log("ENV:", import.meta.env);
  console.log("API:", import.meta.env.VITE_API_URL);

  function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  function persistAccessToken(token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  function persistRefreshToken(token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  function clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  function clearRefreshToken() {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  async function refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`
      }
    });

    const payload = await response.json();
    if (!response.ok) {
      clearAuthStorage();
      throw new Error(payload?.message || payload?.error || "Unable to refresh token");
    }

    const accessToken = payload?.data?.access_token;
    if (!accessToken) {
      clearAuthStorage();
      throw new Error("Invalid refresh response");
    }

    persistAccessToken(accessToken);
    return accessToken;
  }

  async function request(path, options = {}) {
    const token = getAccessToken();
    const requestOptions = { ...options };
    delete requestOptions._retry;

    const response = await fetch(`${API}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestOptions.headers || {})
      },
      ...requestOptions
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      const message = payload?.message || payload?.error || "Request failed";
      if (response.status === 401 && !options._retry) {
        try {
          await refreshToken();
          return request(path, { ...options, _retry: true });
        } catch (err) {
          throw new Error(err.message || message);
        }
      }
      throw new Error(message);
    }

    return payload;
  }

  export async function login(credentials) {
    const payload = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });

    persistAccessToken(payload?.data?.access_token);
    persistRefreshToken(payload?.data?.refresh_token);
    const user = normalizeAuthUser(payload?.data);
    persistSessionUser(user);
    return user;
  }

  export async function registerUser(data) {
    const payload = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data)
    });

    persistAccessToken(payload?.data?.access_token);
    persistRefreshToken(payload?.data?.refresh_token);
    const user = normalizeAuthUser(payload?.data);
    persistSessionUser(user);
    return user;
  }

  export async function fetchCurrentUser() {
    const payload = await request("/auth/me");
    const user = normalizeAuthUser(payload?.data);
    persistSessionUser(user);
    return user;
  }

  export async function logout() {
    await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: getRefreshToken() })
    });
    clearAuthStorage();
  }

  export async function fetchRoles() {
    const payload = await request("/roles");
    return payload?.data || [];
  }

  export async function fetchUsers() {
    const payload = await request("/users");
    return payload?.data || [];
  }

  export async function createUser(data) {
    const payload = await request("/users/insert", {
      method: "POST",
      body: JSON.stringify(data)
    });

    return payload?.data;
  }

  export async function updateUser(userId, data) {
    const payload = await request(`/users/update/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });

    return payload?.data;
  }

  export async function deleteUser(userId) {
    const payload = await request(`/users/delete/${userId}`, {
      method: "DELETE"
    });

    return payload?.message || "User deleted successfully";
  }

  export async function fetchBooks() {
    const payload = await request("/books");
    return payload?.data || [];
  }

  export async function createBook(data) {
    const payload = await request("/books/insert", {
      method: "POST",
      body: JSON.stringify(data)
    });

    return payload?.data;
  }

  export async function updateBook(bookId, data) {
    const payload = await request(`/books/update/${bookId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });

    return payload?.data;
  }

  export async function deleteBook(bookId) {
    const payload = await request(`/books/delete/${bookId}`, {
      method: "DELETE"
    });

    return payload?.message || "Book deleted successfully";
  }

  export async function createBorrowRequest(bookId, quantity) {
    const payload = await request(`/borrow/request/${bookId}`, {
      method: "POST",
      body: JSON.stringify({ quantity })
    });

    return payload?.data;
  }

  export async function fetchBorrows() {
    const payload = await request("/borrows");
    return payload?.data || [];
  }

  export async function fetchMyBorrows() {
    const payload = await request("/borrows/me");
    return payload?.data || [];
  }

  export async function acceptBorrow(borrowId) {
    const payload = await request(`/borrow/accept/${borrowId}`);
    return payload?.message || "Borrow accepted";
  }

  export async function rejectBorrow(borrowId) {
    const payload = await request(`/borrow/reject/${borrowId}`, {
      method: "PATCH"
    });

    return payload?.message || "Borrow rejected";
  }

  export async function payBorrow(borrowId) {
    const payload = await request(`/borrow/pay/${borrowId}`, {
      method: "PATCH"
    });

    return payload?.message || "Borrow paid successfully";
  }

  export async function checkDueDate(borrowId) {
    const payload = await request(`/borrow/checkdue/${borrowId}`);
    return {
      id: borrowId,
      ...payload?.data,
      message: payload?.message
    };
  }

  export function getPersistedSessionUser() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_USER_KEY) || "null");
    } catch {
      return null;
    }
  }

  export function persistSessionUser(user) {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  }

  export function clearSessionUser() {
    localStorage.removeItem(SESSION_USER_KEY);
  }

  export function clearAuthStorage() {
    clearAccessToken();
    clearSessionUser();
  }

  function normalizeAuthUser(baseUser) {
    if (!baseUser) {
      return null;
    }

    return {
      id: baseUser.userId || baseUser.id || null,
      name: baseUser.name || "User",
      email: baseUser.email || "",
      role: baseUser.role || "unknown",
      createdAt: baseUser.created_at || baseUser.createdAt || null
    };
  }
