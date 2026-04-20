import { useMemo, useState } from "react";

export default function LibrarianPage({ borrows, onAcceptBorrow, onRejectBorrow }) {
  const [loading, setLoading] = useState({});
  const pendingBorrows = useMemo(() => borrows.filter((borrow) => borrow.status === "pending"), [borrows]);

  async function handleAccept(borrowId) {
    setLoading((prev) => ({ ...prev, [`accept-${borrowId}`]: true }));
    try {
      await onAcceptBorrow(borrowId);
    } finally {
      setLoading((prev) => ({ ...prev, [`accept-${borrowId}`]: false }));
    }
  }

  async function handleReject(borrowId) {
    setLoading((prev) => ({ ...prev, [`reject-${borrowId}`]: true }));
    try {
      await onRejectBorrow(borrowId);
    } finally {
      setLoading((prev) => ({ ...prev, [`reject-${borrowId}`]: false }));
    }
  }

  return (
    <section className="page-section">
      <div className="list-grid">
        {pendingBorrows.length === 0 ? (
          <article className="panel">
            <h3>No pending requests</h3>
          </article>
        ) : (
          pendingBorrows.map((borrow) => (
            <article className="panel borrow-card" key={borrow.id}>
              <div className="card-head">
                <h3>{borrow.book?.title}</h3>
                <span className="status-pill status-pending">pending</span>
              </div>
              <p>User: {borrow.user?.name}</p>
              <p>Role: {borrow.user?.role}</p>
              <p>Quantity: {borrow.quantity}</p>
              <p>Requested: {formatDate(borrow.createdAt)}</p>
              <p>Auto cancel: {formatDate(borrow.requestExpiresAt)}</p>
              <div className="card-actions split-actions">
                <button onClick={() => handleAccept(borrow.id)} disabled={loading[`accept-${borrow.id}`]}>
                  {loading[`accept-${borrow.id}`] && <span className="spinner"></span>}
                  {loading[`accept-${borrow.id}`] ? "Accepting..." : "Accept"}
                </button>
                <button className="danger-button" onClick={() => handleReject(borrow.id)} disabled={loading[`reject-${borrow.id}`]}>
                  {loading[`reject-${borrow.id}`] && <span className="spinner"></span>}
                  {loading[`reject-${borrow.id}`] ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}
