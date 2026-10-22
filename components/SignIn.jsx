import { useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function SignIn({ onClose }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  async function sendLink(event) {
    event.preventDefault();
    setStatus("Sending…");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Only existing users get a link; new sign-ups are turned off
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    setStatus(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker sign-in" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <h2>Sign in</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <form onSubmit={sendLink}>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Send link</button>
        </form>
        {status && <p>{status}</p>}
      </div>
    </div>
  );
}
