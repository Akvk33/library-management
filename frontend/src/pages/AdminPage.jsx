import { useMemo, useRef, useState } from "react";

const defaultBookForm = {
  title: "",
  author: "",
  price: "",
  stock: ""
};

const defaultUserForm = {
  name: "",
  email: "",
  password: "",
  role: "member"
};

export default function AdminPage({
  books,
  users,
  roles,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}) {
  const [bookForm, setBookForm] = useState(defaultBookForm);
  const [editingBookId, setEditingBookId] = useState("");
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [editingUserId, setEditingUserId] = useState("");
  const [busyBookId, setBusyBookId] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [submittingBook, setSubmittingBook] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const roleOptions = useMemo(() => roles.map((role) => role.name), [roles]);
  const bookFormRef = useRef(null);
  const userFormRef = useRef(null);

  function scrollToForm(targetRef) {
    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitBook(event) {
    event.preventDefault();
    setSubmittingBook(true);
    try {
      const payload = {
        ...bookForm,
        price: Number(bookForm.price),
        stock: Number(bookForm.stock)
      };

      if (editingBookId) {
        await onUpdateBook(editingBookId, payload);
      } else {
        await onAddBook(payload);
      }

      setBookForm(defaultBookForm);
      setEditingBookId("");
    } finally {
      setSubmittingBook(false);
    }
  }

  async function submitUser(event) {
    event.preventDefault();
    setSubmittingUser(true);
    try {
      const payload = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role
      };

      if (userForm.password.trim()) {
        payload.password = userForm.password;
      }

      if (editingUserId) {
        await onUpdateUser(editingUserId, payload);
      } else {
        await onCreateUser({ ...payload, password: userForm.password });
      }

      setUserForm(defaultUserForm);
      setEditingUserId("");
    } finally {
      setSubmittingUser(false);
    }
  }

  function startEditBook(book) {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      price: String(book.price),
      stock: String(book.stock)
    });
    scrollToForm(bookFormRef);
  }

  function cancelEditBook() {
    setEditingBookId("");
    setBookForm(defaultBookForm);
  }

  function startEditUser(user) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role || "member"
    });
    scrollToForm(userFormRef);
  }

  function cancelEditUser() {
    setEditingUserId("");
    setUserForm(defaultUserForm);
  }

  async function removeBook(bookId) {
    setBusyBookId(bookId);

    try {
      await onDeleteBook(bookId);
      if (editingBookId === bookId) {
        cancelEditBook();
      }
    } finally {
      setBusyBookId("");
    }
  }

  async function removeUser(userId) {
    setBusyUserId(userId);

    try {
      await onDeleteUser(userId);
      if (editingUserId === userId) {
        cancelEditUser();
      }
    } finally {
      setBusyUserId("");
    }
  }

  async function changeRole(userId, role) {
    setBusyUserId(userId);

    try {
      await onUpdateUser(userId, { role });
    } finally {
      setBusyUserId("");
    }
  }

  return (
    <section className="page-section admin-page-grid">
      <div className="admin-top-grid">
        <article className="panel form-panel" ref={bookFormRef}>
          <div className="section-head align-start">
            <div>
              <h2>{editingBookId ? "Update Book" : "Add Book"}</h2>
              <p>{editingBookId ? "Edit the selected book and save your changes." : "Create a new catalog entry from here."}</p>
            </div>
            {editingBookId ? (
              <button type="button" className="btn secondary-action-button" onClick={cancelEditBook}>
                Cancel
              </button>
            ) : null}
          </div>
          <form onSubmit={submitBook}>
            <label>
              Title
              <input value={bookForm.title} onChange={(event) => setBookForm({ ...bookForm, title: event.target.value })} />
            </label>
            <label>
              Author
              <input value={bookForm.author} onChange={(event) => setBookForm({ ...bookForm, author: event.target.value })} />
            </label>
            <label>
              Price
              <input type="number" min="0" step="0.01" value={bookForm.price} onChange={(event) => setBookForm({ ...bookForm, price: event.target.value })} />
            </label>
            <label>
              Stock
              <input type="number" min="0" step="1" value={bookForm.stock} onChange={(event) => setBookForm({ ...bookForm, stock: event.target.value })} />
            </label>
            <button type="submit" disabled={submittingBook}>
              {submittingBook && <span className="spinner"></span>}
              {submittingBook ? "Saving..." : (editingBookId ? "Save Book" : "Add Book")}
            </button>
          </form>
        </article>

        <article className="panel form-panel" ref={userFormRef}>
          <div className="section-head align-start">
            <div>
              <h2>{editingUserId ? "Update User" : "Add User"}</h2>
              <p>{editingUserId ? "Edit the selected account details and save the changes." : "Create a new account and assign the right role immediately."}</p>
            </div>
            {editingUserId ? (
              <button type="button" className="btn secondary-action-button" onClick={cancelEditUser}>
                Cancel
              </button>
            ) : null}
          </div>
          <form onSubmit={submitUser}>
            <label>
              Name
              <input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
            </label>
            <label>
              Password {editingUserId ? "(optional)" : ""}
              <input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
            </label>
            <label>
              Role
              <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                {roleOptions.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleName}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={submittingUser}>
              {submittingUser && <span className="spinner"></span>}
              {submittingUser ? "Saving..." : (editingUserId ? "Save User" : "Add User")}
            </button>
          </form>
        </article>
      </div>

      <div className="admin-bottom-grid">
        <article className="panel admin-table-panel">
          <div className="section-head">
            <div>
              <h2>Users</h2>
              <p>Review email, role, and account identity in one place.</p>
            </div>
            <span>{users.length} total</span>
          </div>
          <div className="info-table compact-list">
            <div className="info-table-head user-grid" style={{display:"none"}}>
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Action</span>
            </div>
            {users.map((user) => (
              <div className="info-table-row user-grid" key={user.id}>
                <div className="table-primary-cell">
                  <strong>{user.name}</strong>
                  <small>{user.id}</small>
                </div>
                <div className="email-cell" title={user.email}>{user.email}</div>
                <div>
                  <select
                    value={user.role || "member"}
                    onChange={(event) => changeRole(user.id, event.target.value)}
                    disabled={busyUserId === user.id}
                  >
                    {roleOptions.map((roleName) => (
                      <option key={roleName} value={roleName}>
                        {roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="table-actions-group">
                  <button type="button" className="btn secondary-action-button" onClick={() => startEditUser(user)}>
                    Edit
                  </button>
                  <button className="danger-button table-action-button" onClick={() => removeUser(user.id)} disabled={busyUserId === user.id}>
                    {busyUserId === user.id && <span className="spinner"></span>}
                    {busyUserId === user.id ? "Working..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel admin-table-panel">
          <div className="section-head">
            <div>
              <h2>Books</h2>
              <p>Update or remove titles from the catalog.</p>
            </div>
            <span>{books.length} total</span>
          </div>
          <div className="info-table compact-list">
            <div className="info-table-head book-grid" style={{display:"none"}}>
              <span>Title</span>
              <span>Author</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Action</span>
            </div>
            {books.map((book) => (
              <div className="info-table-row book-grid" key={book.id}>
                <div className="table-primary-cell">
                  <strong>{book.title}</strong>
                  <small>{book.id}</small>
                </div>
                <div>{book.author}</div>
                <div>${Number(book.price).toFixed(2)}</div>
                <div>{book.stock}</div>
                <div className="table-actions-group">
                  <button type="button" className="btn secondary-action-button" onClick={() => startEditBook(book)}>
                    Edit
                  </button>
                  <button className="danger-button table-action-button" onClick={() => removeBook(book.id)} disabled={busyBookId === book.id}>
                    {busyBookId === book.id && <span className="spinner"></span>}
                    {busyBookId === book.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
