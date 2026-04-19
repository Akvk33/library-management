import { showInfo } from "../lib/alerts";

export default function MyBorrowsPage({ borrows, onCheckDue, onPayBorrow }) {
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
                  <button onClick={() => onCheckDue(borrow.id)} disabled={!canComplete}>
                    Check Due
                  </button>
                  <button onClick={() => handleRead(borrow)} disabled={!canRead && !mustPay}>
                    Read
                  </button>
                  <button onClick={() => onPayBorrow(borrow.id)} disabled={!canComplete}>
                    Complete Borrow
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
