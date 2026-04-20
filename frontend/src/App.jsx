import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { RequireAuth, RequireRole } from "./components/RouteGuards";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import CatalogPage from "./pages/CatalogPage";
import MyBorrowsPage from "./pages/MyBorrowsPage";
import AdminPage from "./pages/AdminPage";
import LibrarianPage from "./pages/LibrarianPage";
import {
  acceptBorrow,
  checkDueDate,
  createBook,
  createBorrowRequest,
  createUser,
  deleteBook,
  deleteUser,
  fetchBooks,
  fetchBorrows,
  fetchCurrentUser,
  fetchMyBorrows,
  fetchRoles,
  fetchUsers,
  getPersistedSessionUser,
  clearAuthStorage,
  login,
  logout,
  payBorrow,
  registerUser,
  rejectBorrow,
  updateBook,
  updateUser
} from "./lib/api";
import { showError, showInfo, showSuccess } from "./lib/alerts";

export default function App() {
  const [sessionUser, setSessionUser] = useState(() => getPersistedSessionUser());
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [myBorrows, setMyBorrows] = useState([]);
  const [status, setStatus] = useState("Loading library data...");
  const [error, setError] = useState("");

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (sessionUser?.id) {
      void refreshSessionData(sessionUser);
      setStatus(`Signed in as ${sessionUser.name}.`);
    } else {
      setUsers([]);
      setBorrows([]);
      setMyBorrows([]);
      setStatus("Please sign in to access the library dashboard.");
    }
  }, [sessionUser?.id]);

  async function loadBaseData() {
    try {
      const [roleData, bookData] = await Promise.all([fetchRoles(), fetchBooks()]);
      setRoles(roleData);
      setBooks(bookData);
      setError("");
    } catch (err) {
      setError(err.message);
      setStatus("Unable to load the library right now.");
    }
  }

  async function loadBooks() {
    const bookData = await fetchBooks();
    setBooks(bookData);
    return bookData;
  }

  async function refreshUsers(user = sessionUser) {
    if (user?.role !== "admin") {
      setUsers([]);
      return [];
    }

    const userData = await fetchUsers();
    setUsers(userData);
    return userData;
  }

  async function refreshBorrowData(user = sessionUser) {
    if (!user) {
      setBorrows([]);
      setMyBorrows([]);
      return;
    }

    const tasks = [fetchMyBorrows()];
    if (["admin", "librarian"].includes(user.role)) {
      tasks.push(fetchBorrows());
    }

    const [myBorrowData, borrowData] = await Promise.all(tasks);
    setMyBorrows(myBorrowData || []);
    setBorrows(borrowData || myBorrowData || []);
  }

  async function refreshSessionData(user = sessionUser) {
    if (!user) {
      return;
    }

    try {
      const currentUser = await fetchCurrentUser();
      setSessionUser((existingUser) =>
        existingUser &&
        existingUser.id === currentUser.id &&
        existingUser.role === currentUser.role &&
        existingUser.name === currentUser.name &&
        existingUser.email === currentUser.email
          ? existingUser
          : currentUser
      );
      await Promise.all([
        refreshBorrowData(currentUser),
        currentUser.role === "admin" ? refreshUsers(currentUser) : Promise.resolve([])
      ]);
    } catch (err) {
      if (err.message === "Unauthorized") {
        clearAuthStorage();
        setSessionUser(null);
      }
      throw err;
    }
  }

  async function handleLogin(form) {
    try {
      const user = await login(form);
      setSessionUser(user);
      setError("");
      setStatus(`Welcome back, ${user.name}.`);
      await showSuccess("Logged in", `${user.name} is now signed in.`);
    } catch (err) {
      await showError("Login failed", err.message);
      throw err;
    }
  }

  async function handleRegister(form) {
    try {
      const user = await registerUser(form);
      setSessionUser(user);
      setError("");
      setStatus(`Account created for ${user.name}.`);
      await showSuccess("Account created", `${user.name} joined as a member.`);
    } catch (err) {
      await showError("Registration failed", err.message);
      throw err;
    }
  }

  async function handleLogout() {
    try {
      await logout();
      setSessionUser(null);
      setError("");
      setStatus("You have been logged out.");
      await showInfo("Logged out", "Your session has been closed.");
    } catch (err) {
      await showError("Logout failed", err.message);
    }
  }

  async function handleBorrow(bookId, quantity) {
    try {
      const borrow = await createBorrowRequest(bookId, quantity);
      await Promise.all([refreshBorrowData(), loadBooks()]);
      setStatus(`Borrow request created for ${borrow.bookName}.`);
      await showSuccess("Borrow requested", `${borrow.bookName} is waiting for librarian approval.`);
      return borrow;
    } catch (err) {
      await showError("Borrow request failed", err.message);
      throw err;
    }
  }

  async function handleAddBook(form) {
    try {
      const created = await createBook(form);
      await loadBooks();
      setStatus(`Book added: ${created.title}.`);
      await showSuccess("Book added", `${created.title} was added to the catalog.`);
      return created;
    } catch (err) {
      await showError("Add book failed", err.message);
      throw err;
    }
  }

  async function handleDeleteBook(bookId) {
    try {
      const message = await deleteBook(bookId);
      await loadBooks();
      setStatus(message);
      await showSuccess("Book deleted", message);
      return message;
    } catch (err) {
      await showError("Delete failed", err.message);
      throw err;
    }
  }

  async function handleUpdateBook(bookId, form) {
    try {
      const updated = await updateBook(bookId, form);
      await loadBooks();
      setStatus(`Book updated: ${updated.title}.`);
      await showSuccess("Book updated", `${updated.title} was updated successfully.`);
      return updated;
    } catch (err) {
      await showError("Book update failed", err.message);
      throw err;
    }
  }

  async function handleCreateUser(form) {
    try {
      const created = await createUser(form);
      await refreshUsers();
      setStatus(`User added: ${created.name}.`);
      await showSuccess("User created", `${created.name} was added successfully.`);
      return created;
    } catch (err) {
      await showError("User creation failed", err.message);
      throw err;
    }
  }

  async function handleUpdateUser(userId, form) {
    try {
      const updated = await updateUser(userId, form);
      await refreshUsers();
      if (sessionUser?.id === userId) {
        await refreshSessionData();
      }
      setStatus(`User updated: ${updated.name}.`);
      await showSuccess("User updated", `${updated.name} was updated successfully.`);
      return updated;
    } catch (err) {
      await showError("User update failed", err.message);
      throw err;
    }
  }

  async function handleDeleteUser(userId) {
    try {
      const message = await deleteUser(userId);
      await refreshUsers();
      setStatus(message);
      await showSuccess("User deleted", message);
      return message;
    } catch (err) {
      await showError("User deletion failed", err.message);
      throw err;
    }
  }

  async function handleAcceptBorrow(borrowId) {
    try {
      const message = await acceptBorrow(borrowId);
      await Promise.all([refreshBorrowData(), loadBooks()]);
      setStatus(message);
      await showSuccess("Request accepted", message);
      return message;
    } catch (err) {
      await showError("Accept failed", err.message);
      throw err;
    }
  }

  async function handleRejectBorrow(borrowId) {
    try {
      const message = await rejectBorrow(borrowId);
      await refreshBorrowData();
      setStatus(message);
      await showSuccess("Request rejected", message);
      return message;
    } catch (err) {
      await showError("Reject failed", err.message);
      throw err;
    }
  }

  async function handlePayBorrow(borrowId) {
    try {
      const message = await payBorrow(borrowId);
      await Promise.all([refreshBorrowData(), loadBooks()]);
      setStatus(message);
      await showSuccess("Borrow completed", message);
      return message;
    } catch (err) {
      await showError("Completion failed", err.message);
      throw err;
    }
  }

  async function handleCheckDue(borrowId) {
    try {
      const due = await checkDueDate(borrowId);
      const text = `${due.message}${due.dueDate ? ` Due: ${new Date(due.dueDate).toLocaleString()}` : ""}`;
      setStatus(text);
      await refreshBorrowData();
      await showInfo("Borrow status", text);
      return due;
    } catch (err) {
      await showError("Unable to check due date", err.message);
      throw err;
    }
  }

  const appStats = useMemo(
    () => ({
      totalBooks: books.length,
      totalBorrows: myBorrows.length,
      pendingBorrows: borrows.filter((borrow) => borrow.status === "pending").length,
      activeBorrows: myBorrows.filter((borrow) => borrow.status === "accepted").length,
      totalUsers: users.length
    }),
    [books, borrows, myBorrows, users]
  );

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          sessionUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage onLogin={handleLogin} onRegister={handleRegister} />
          )
        }
      />

      <Route element={<RequireAuth sessionUser={sessionUser} />}>
        <Route
          element={
            <AppLayout
              sessionUser={sessionUser}
              onLogout={handleLogout}
            />
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage sessionUser={sessionUser} stats={appStats} />} />
          <Route
            path="/catalog"
            element={<CatalogPage books={books} onBorrow={handleBorrow} sessionUser={sessionUser} />}
          />
          <Route
            path="/my-borrows"
            element={<MyBorrowsPage borrows={myBorrows} onCheckDue={handleCheckDue} onPayBorrow={handlePayBorrow} />}
          />
          <Route element={<RequireRole sessionUser={sessionUser} role="admin" />}>
            <Route
              path="/admin"
              element={
                <AdminPage
                  books={books}
                  users={users}
                  roles={roles}
                  onAddBook={handleAddBook}
                  onUpdateBook={handleUpdateBook}
                  onDeleteBook={handleDeleteBook}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              }
            />
          </Route>
          <Route element={<RequireRole sessionUser={sessionUser} role="librarian" />}>
            <Route
              path="/librarian"
              element={<LibrarianPage borrows={borrows} onAcceptBorrow={handleAcceptBorrow} onRejectBorrow={handleRejectBorrow} />}
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={sessionUser ? "/dashboard" : "/auth"} replace />} />
    </Routes>
  );
}
