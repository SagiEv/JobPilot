import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added this
import { authService, handleRedirectSession } from '../services/authService';

const LoginPage = () => {
    const navigate = useNavigate(); // Initialize navigation
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handle the "Return" from Google Auth
    useEffect(() => {
        const checkSession = async () => {
            const user = await handleRedirectSession();
            if (user) {
                navigate('/profile'); // Redirect to profile if Google login succeeded
            }
        };
        checkSession();
    }, [navigate]);

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
                navigate('/profile'); // Success! Go to profile
            }
        } catch (err) {
            setError(err.response?.data?.error || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            // Note: redirectTo should be the URL where your app is running
            await authService.loginWithGoogle(window.location.origin);
        } catch (err) {
            setError("Google Login failed");
        }
    };

    return (
        <div style={styles.container}>
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
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Reference_Icon.svg" alt="G" style={{ width: 18, marginRight: 10 }} />
                    Continue with Google
                </button>

                <p style={styles.toggleText}>
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <span onClick={() => setIsRegistering(!isRegistering)} style={styles.link}>
                        {isRegistering ? 'Sign In' : 'Sign Up'}
                    </span>
                </p>
            </div>
        </div>
    );
};

// Simple inline styles for demonstration
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6' },
    card: { background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' },
    input: { padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' },
    button: { padding: '0.8rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    googleButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8rem', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
    error: { color: 'red', fontSize: '0.9rem' },
    divider: { margin: '1.5rem 0', color: '#888', fontSize: '0.8rem' },
    toggleText: { marginTop: '1rem', fontSize: '0.9rem' },
    link: { color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }
};

export default LoginPage;