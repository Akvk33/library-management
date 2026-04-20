import { useState } from "react";
import { showInfo } from "../lib/alerts";

export default function MyBorrowsPage({ borrows, onCheckDue, onPayBorrow }) {
  const [loading, setLoading] = useState({});
  const [loading, setLoading] = useState({});

  async function handleCheckDue(borrowId) {
    setLoading((prev) => ({ ...prev, [`check-${borrowId}`]: true }));
    try {
      await onCheckDue(borrowId);
    } finally {
      setLoading((prev) => ({ ...prev, [`check-${borrowId}`]: false }));
    }
  }

  async function handlePayBorrow(borrowId) {
    setLoading((prev) => ({ ...prev, [`pay-${borrowId}`]: true }));
    try {
      await onPayBorrow(borrowId);
    } finally {
      setLoading((prev) => ({ ...prev, [`pay-${borrowId}`]: false }));
    }
  }
  async function handleRead(borrow) {
    if (borrow.status === "accepted") {
      await showInfo("Read enabled", `${borrow.book?.title} is available to read until ${formatDate(borrow.dueDate)}.`);
      return;
    }

    if (borrow.status === "expired") {
      await showInfo("Payment required", "This borrow is overdue. Complete the borrow payment to continue reading.");
    }
  }

  return (
    <section className="page-section">
      <div className="list-grid">
        {borrows.length === 0 ? (
          <article className="panel">
            <h3>No borrow requests yet</h3>
          </article>
        ) : (
          borrows.map((borrow) => {
            const canRead = borrow.status === "accepted";
            const mustPay = borrow.status === "expired";
            const canComplete = borrow.status === "accepted" || borrow.status === "expired";

            return (
              <article className="panel borrow-card" key={borrow.id}>
                <div className="card-head">
                  <h3>{borrow.book?.title}</h3>
                  <span className={`status-pill status-${borrow.status}`}>{borrow.status}</span>
                </div>
                <p>Author: {borrow.book?.author || "Unknown"}</p>
                <p>Quantity: {borrow.quantity}</p>
                <p>Due date: {formatDate(borrow.dueDate)}</p>
                <p>Request expires: {formatDate(borrow.requestExpiresAt)}</p>
                <div className="card-actions tri-actions">
                  <button onClick={() => handleCheckDue(borrow.id)} disabled={loading[`check-${borrow.id}`]}>
                    {loading[`check-${borrow.id}`] && <span className="spinner"></span>}
                    {loading[`check-${borrow.id}`] ? "Checking..." : "Check Due"}
                  </button>
                  <button onClick={() => handleRead(borrow)} disabled={!canRead && !mustPay}>
                    Read
                  </button>
                  <button onClick={() => handlePayBorrow(borrow.id)} disabled={!canComplete || loading[`pay-${borrow.id}`]}>
                    {loading[`pay-${borrow.id}`] && <span className="spinner"></span>}
                    {loading[`pay-${borrow.id}`] ? "Completing..." : "Complete Borrow"}
                  </button>
                </div>
              </article>
            );
          })
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
