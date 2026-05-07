import React, { useState, useEffect } from 'react';
import { authService, handleRedirectSession } from '../services/authService';

const LoginPage = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handle the "Return" from Google Auth
    useEffect(() => {
        let isMounted = true;
        const checkSession = async () => {
            const user = await handleRedirectSession();
            if (user && isMounted) {
                // Signal App.jsx to unlock and go to profile
                window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'profile' }));
            }
        };
        checkSession();
        return () => { isMounted = false; };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegistering) {
                await authService.signup(email, password);
                alert("Check your email for verification!");
            } else {
                await authService.login(email, password);
                // Signal App.jsx to unlock and go to profile
                window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'profile' }));
            }
        } catch (err) {
            setError(err.response?.data?.error || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            await authService.loginWithGoogle(window.location.origin);
        } catch (err) {
            setError("Google Login failed");
        }
    };

    return (
        <div style={styles.card}>
            <h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>

            {error && <p style={styles.error}>{error}</p>}

            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.input}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={styles.input}
                />
                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? 'Processing...' : isRegistering ? 'Sign Up' : 'Sign In'}
                </button>
            </form>

            <div style={styles.divider}>OR</div>

            <button onClick={handleGoogle} style={styles.googleButton}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/40px-Google_%22G%22_logo.svg.png" alt="G" style={{ width: 18, marginRight: 10 }} />
                Continue with Google
            </button>

            <p style={styles.toggleText}>
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                <span onClick={() => setIsRegistering(!isRegistering)} style={styles.link}>
                    {isRegistering ? 'Sign In' : 'Sign Up'}
                </span>
            </p>
        </div>
    );
};

const styles = {
    card: {
        background: 'white',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
    },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' },
    input: { padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' },
    button: { padding: '0.8rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    googleButton: { display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box', justifyContent: 'center', padding: '0.8rem', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' },
    error: { color: '#dc3545', fontSize: '0.9rem', marginBottom: '10px' },
    divider: { margin: '1.5rem 0', color: '#888', fontSize: '0.8rem' },
    toggleText: { marginTop: '1.5rem', fontSize: '0.9rem' },
    link: { color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }
};

export default LoginPage;