const loginErrors: Record<string, string> = {
  request: 'The login request was rejected. Reload the page and try again.',
  credentials: 'Invalid credentials',
  busy: 'Too many login attempts. Try again shortly.',
  generic: 'An error occurred during login',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const errorCode = (await searchParams).error ?? '';
  const limited = /^limited-(\d+)$/.exec(errorCode);
  const error = limited
    ? `Too many login attempts. Try again in ${limited[1]} minute(s).`
    : loginErrors[errorCode];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Engagement Manager</h1>
        </div>
        <form action="/api/auth/login" method="post">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input type="text" id="username" name="username" className="form-input" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input type="password" id="password" name="password" className="form-input" required />
          </div>
          {error && <div className="text-error mb-4 text-center">{error}</div>}
          <button type="submit" className="btn-secondary" style={{ width: 'fit-content', margin: '0 auto', display: 'block', outline: 'none' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
