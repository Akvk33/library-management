import { useState } from "react";

export default function AuthPage({ onLogin, onRegister }) {
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [busy, setBusy] = useState("");

  async function submitLogin(event) {
    event.preventDefault();
    setBusy("login");

    try {
      await onLogin(loginForm);
    } catch {
      return;
    } finally {
      setBusy("");
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setBusy("register");

    try {
      await onRegister(registerForm);
    } catch {
      return;
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel panel">
        <h1>LeafShelf</h1>

        <div className="nav nav-tabs auth-tabs" role="tablist" aria-label="Authentication forms">
          <button
            type="button"
            className={activeTab === "login" ? "nav-link auth-tab-button active" : "nav-link auth-tab-button"}
            onClick={() => setActiveTab("login")}
            aria-selected={activeTab === "login"}
          >
            Login
          </button>
          <button
            type="button"
            className={activeTab === "register" ? "nav-link auth-tab-button active" : "nav-link auth-tab-button"}
            onClick={() => setActiveTab("register")}
            aria-selected={activeTab === "register"}
          >
            Register
          </button>
        </div>

        {activeTab === "login" ? (
          <form className="auth-form" onSubmit={submitLogin}>
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                placeholder="reader@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="Minimum 6 characters"
              />
            </label>
            <button type="submit" disabled={busy === "login"}>
              {busy === "login" ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitRegister}>
            <label>
              Name
              <input
                value={registerForm.name}
                onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                placeholder="Ava"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                placeholder="ava@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                placeholder="Minimum 6 characters"
              />
            </label>
            <button type="submit" disabled={busy === "register"}>
              {busy === "register" ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
