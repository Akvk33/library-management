import { Offcanvas } from "bootstrap";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

function navLinkClass({ isActive }) {
  return isActive ? "nav-link custom-nav-link active" : "nav-link custom-nav-link";
}

export default function AppLayout({ sessionUser, onLogout }) {
  const navigate = useNavigate();

  function closeOffcanvas() {
    const offcanvasElement = document.getElementById("libraryNavOffcanvas");
    if (!offcanvasElement) {
      return;
    }

    const instance = Offcanvas.getOrCreateInstance(offcanvasElement);
    instance.hide();
  }

  function handleMobileNavigate(path) {
    navigate(path);
    closeOffcanvas();
  }

  async function handleMobileLogout() {
    closeOffcanvas();
    await onLogout();
  }

  return (
    <div className="app-shell">
      <Backdrop />

      <nav className="navbar navbar-expand-lg fixed-top library-navbar">
        <div className="container-fluid shell-container px-3 px-lg-4">
          <NavLink className="navbar-brand library-brand" to="/dashboard">
            LeafShelf
          </NavLink>

          <div className="d-flex align-items-center gap-2 order-lg-3">
            <button
              type="button"
              className="profile-trigger"
              data-bs-toggle="modal"
              data-bs-target="#profileModal"
              aria-label="Open profile information"
            >
              <span className="profile-trigger__avatar">{sessionUser?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            </button>
            <button
              className="navbar-toggler border-0 shadow-none library-toggler"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#libraryNavOffcanvas"
              aria-controls="libraryNavOffcanvas"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>
          </div>

          <div className="collapse navbar-collapse order-lg-2">
            <div className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/catalog" className={navLinkClass}>
                Borrow
              </NavLink>
              <NavLink to="/my-borrows" className={navLinkClass}>
                My Borrows
              </NavLink>
              {sessionUser?.role === "admin" ? (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              ) : null}
              {sessionUser?.role === "librarian" ? (
                <NavLink to="/librarian" className={navLinkClass}>
                  Librarian
                </NavLink>
              ) : null}
              <button className="btn nav-logout-button ms-lg-2" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className="offcanvas offcanvas-end library-offcanvas"
        tabIndex="-1"
        id="libraryNavOffcanvas"
        aria-labelledby="libraryNavOffcanvasLabel"
      >
        <div className="offcanvas-header border-0 pb-0">
          <div>
            <h5 className="offcanvas-title" id="libraryNavOffcanvasLabel">
              LeafShelf
            </h5>
            <p className="offcanvas-subtitle mb-0">Move through the library from one place.</p>
          </div>
          <button type="button" className="btn-close shadow-none" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div className="offcanvas-body d-grid gap-3">
          <div className="mobile-profile-card">
            <span className="mobile-profile-avatar">{sessionUser?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            <div>
              <strong>{sessionUser?.name}</strong>
              <p className="mb-0">{sessionUser?.role}</p>
            </div>
          </div>

          <div className="navbar-nav gap-2">
            <button type="button" className="nav-link custom-nav-link mobile-nav-link" onClick={() => handleMobileNavigate("/dashboard")}>
              Dashboard
            </button>
            <button type="button" className="nav-link custom-nav-link mobile-nav-link" onClick={() => handleMobileNavigate("/catalog")}>
              Borrow
            </button>
            <button type="button" className="nav-link custom-nav-link mobile-nav-link" onClick={() => handleMobileNavigate("/my-borrows")}>
              My Borrows
            </button>
            {sessionUser?.role === "admin" ? (
              <button type="button" className="nav-link custom-nav-link mobile-nav-link" onClick={() => handleMobileNavigate("/admin")}>
                Admin
              </button>
            ) : null}
            {sessionUser?.role === "librarian" ? (
              <button type="button" className="nav-link custom-nav-link mobile-nav-link" onClick={() => handleMobileNavigate("/librarian")}>
                Librarian
              </button>
            ) : null}
          </div>

          <button className="btn nav-logout-button mt-auto" onClick={handleMobileLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="modal fade" id="profileModal" tabIndex="-1" aria-labelledby="profileModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content profile-modal-content border-0">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title" id="profileModalLabel">
                Profile Info
              </h5>
              <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <div className="modal-body">
              <div className="profile-modal-hero">
                <span className="profile-modal-avatar">{sessionUser?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                <div>
                  <h3>{sessionUser?.name}</h3>
                  <p className="mb-0">{sessionUser?.email}</p>
                </div>
              </div>
              <div className="profile-info-grid">
                <article>
                  <span>Role</span>
                  <strong>{sessionUser?.role || "unknown"}</strong>
                </article>
                <article>
                  <span>User ID</span>
                  <strong>{sessionUser?.id || "not available"}</strong>
                </article>
                <article>
                  <span>Joined</span>
                  <strong>{formatDate(sessionUser?.createdAt)}</strong>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="page-stack app-content-shell">
        <Outlet />
      </main>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString();
}

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="blob blob-one" />
      <div className="blob blob-two" />
      <div className="grid-glow" />
    </div>
  );
}
