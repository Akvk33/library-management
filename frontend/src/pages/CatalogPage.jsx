import { useState } from "react";

export default function CatalogPage({ books, onBorrow, sessionUser }) {
  const [quantities, setQuantities] = useState({});
  const [borrowing, setBorrowing] = useState({});

  async function submitBorrow(bookId) {
    const quantity = Number(quantities[bookId] || 1);
    setBorrowing((prev) => ({ ...prev, [bookId]: true }));
    try {
      await onBorrow(bookId, quantity);
    } finally {
      setBorrowing((prev) => ({ ...prev, [bookId]: false }));
    }
    setQuantities((current) => ({ ...current, [bookId]: 1 }));
  }

  return (
    <section className="page-section">
      <div className="catalog-grid">
        {books.map((book) => (
          <article className="book-card" key={book.id}>
            <div className="card-head">
              <h3>{book.title}</h3>
              <span className={`status-pill ${book.stock > 0 ? "status-accepted" : "status-expired"}`}>
                {book.stock > 0 ? "available" : "out"}
              </span>
            </div>
            <p className="book-meta">{book.author}</p>
            <div className="book-stats">
              <span>Price: ${Number(book.price).toFixed(2)}</span>
              <span>Stock: {book.stock}</span>
            </div>
            <div className="borrow-form">
              <input
                type="number"
                min="1"
                value={quantities[book.id] || 1}
                onChange={(event) =>
                  setQuantities((current) => ({
                    ...current,
                    [book.id]: event.target.value
                  }))
                }
              />
              <button onClick={() => submitBorrow(book.id)} disabled={!sessionUser || book.stock < 1 || borrowing[book.id]}>
                {borrowing[book.id] && <span className="spinner"></span>}
                {borrowing[book.id] ? "Requesting..." : "Request"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
