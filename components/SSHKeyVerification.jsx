import React, { useState, useEffect } from 'react';
import { 
    generateChallenge, 
    verifySSHChallenge, 
    getSSHKeyStatus, 
    registerSSHKey, 
    isValidSSHKey, 
    parseSSHKey,
    copySigningCommand,
    createChallengeFile,
    isValidSSHSignature
} from '../utils/sshUtils';

function SSHKeyVerification({ walletAddress, onVerified }) {
    const [step, setStep] = useState('checking'); // checking, register, verify, error
    const [challenge, setChallenge] = useState('');
    const [signature, setSignature] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [keyInfo, setKeyInfo] = useState(null);
    const [showInstructions, setShowInstructions] = useState(false);

    // Check if admin already has SSH key registered
    useEffect(() => {
        checkSSHKeyStatus();
    }, [walletAddress]);

    const checkSSHKeyStatus = async () => {
        try {
            setLoading(true);
            const status = await getSSHKeyStatus(walletAddress);
            if (status.hasKey) {
                // Key is registered, proceed to verification
                setStep('verify');
                setChallenge(generateChallenge());
                setKeyInfo(status.keyInfo);
            } else {
                // Need to register key first
                setStep('register');
            }
        } catch (error) {
            console.error('Error checking SSH status:', error);
            setStep('register'); // Default to registration
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterKey = async () => {
        if (!isValidSSHKey(publicKey)) {
            setError('Invalid SSH public key format. Must start with ssh-rsa, ssh-ed25519, or ssh-ecdsa');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await registerSSHKey(walletAddress, publicKey);
            const parsedKey = parseSSHKey(publicKey);
            setKeyInfo({
                fingerprint: parsedKey.fingerprint,
                comment: parsedKey.comment,
                type: parsedKey.type
            });
            setStep('verify');
            setChallenge(generateChallenge());
            alert('SSH key registered successfully! Now proceeding to verification step.');
        } catch (error) {
            setError('Failed to register SSH key: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySignature = async () => {
        if (!signature.trim()) {
            setError('Please enter the SSH signature');
            return;
        }

        if (!isValidSSHSignature(signature)) {
            setError('Invalid signature format. Please paste the complete SSH signature including BEGIN/END lines.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await verifySSHChallenge(walletAddress, challenge, signature);
            if (result.verified) {
                alert('SSH verification successful! Welcome to the admin panel.');
                onVerified(keyInfo?.fingerprint || result.fingerprint || 'verified');
            } else {
                setError('SSH signature verification failed. Please try again.');
                setSignature('');
                setChallenge(generateChallenge()); // New challenge
            }
        } catch (error) {
            setError('Verification error: ' + error.message);
            setSignature('');
            setChallenge(generateChallenge()); // New challenge
        } finally {
            setLoading(false);
        }
    };

    const handleCopyChallenge = () => {
        copySigningCommand(challenge);
    };

    const handleDownloadChallenge = () => {
        createChallengeFile(challenge);
        alert('Challenge file downloaded as "fresh_challenge.txt". Now run:\nssh-keygen -Y sign -f ~/.ssh/id_rsa -n election fresh_challenge.txt');
    };

    const regenerateChallenge = () => {
        setChallenge(generateChallenge());
        setSignature('');
        setError('');
    };

    if (step === 'checking' || loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <h3>🔍 {step === 'checking' ? 'Checking SSH Key Status...' : 'Processing...'}</h3>
                <p>Verifying admin credentials for {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 2s linear infinite',
                    margin: '1rem auto'
                }}></div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '700px',
            margin: '2rem auto',
            padding: '2rem',
            border: '2px solid #2196f3',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
        }}>
            <h2 style={{ color: '#1976d2', marginTop: 0 }}>
                SSH Admin Authentication
            </h2>

            {step === 'register' && (
                <div>
                    <h3>Step 1: Register Your SSH Public Key</h3>
                    <p>As a new admin, you need to register your SSH public key for secure access.</p>
                    
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            SSH Public Key:
                        </label>
                        <textarea
                            value={publicKey}
                            onChange={(e) => setPublicKey(e.target.value)}
                            placeholder="Paste your SSH public key here (starts with ssh-rsa, ssh-ed25519, or ssh-ecdsa...)"
                            style={{
                                width: '100%',
                                height: '100px',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '0.9rem'
                            }}
                        />
                        <small style={{ color: '#666' }}>
                            Get your public key with: <code>cat ~/.ssh/id_rsa.pub</code> or <code>cat ~/.ssh/id_ed25519.pub</code>
                        </small>
                    </div>

                    <button
                        onClick={handleRegisterKey}
                        disabled={loading || !publicKey.trim()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: publicKey.trim() ? '#4caf50' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: publicKey.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? 'Registering...' : 'Register SSH Key'}
                    </button>
                </div>
            )}

            {step === 'verify' && (
                <div>
                    <h3>Step 2: Sign Authentication Challenge</h3>
                    {keyInfo && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#e8f5e9',
                            border: '1px solid #4caf50',
                            borderRadius: '4px',
                            marginBottom: '1rem'
                        }}>
                            <strong>Registered Key:</strong> {keyInfo.fingerprint}<br />
                            <strong>Type:</strong> {keyInfo.type}<br />
                            <strong>Comment:</strong> {keyInfo.comment}
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            Challenge to Sign:
                        </label>
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#e3f2fd',
                            border: '1px solid #2196f3',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            wordBreak: 'break-all',
                            position: 'relative'
                        }}>
                            {challenge}
                            <button
                                onClick={regenerateChallenge}
                                style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#ff9800',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                🔄
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={handleCopyChallenge}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#2196f3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Copy Command
                            </button>
                            
                            <button
                                onClick={handleDownloadChallenge}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Download Challenge File
                            </button>

                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#ff9800',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Instructions
                            </button>
                        </div>
                    </div>

                    {showInstructions && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '4px',
                            marginBottom: '1rem'
                        }}>
                            <h4>How to Generate SSH Signature:</h4>
                            <ol style={{ marginBottom: '0' }}>
                                <li>Either copy the command above OR download the challenge file</li>
                                <li>Open your terminal</li>
                                <li>If you copied the command, paste and run it</li>
                                <li>If you downloaded the file, run: <code>ssh-keygen -Y sign -f ~/.ssh/id_rsa -n election fresh_challenge.txt</code></li>
                                <li>This will create a <code>fresh_challenge.txt.sig</code> file</li>
                                <li>Copy the contents of that .sig file and paste it below</li>
                            </ol>
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            SSH Signature:
                        </label>
                        <textarea
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            placeholder="Paste the SSH signature here (should start with -----BEGIN SSH SIGNATURE-----)"
                            style={{
                                width: '100%',
                                height: '150px',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '0.9rem'
                            }}
                        />
                        <small style={{ color: '#666' }}>
                            The signature should be the complete output from the ssh-keygen command, including BEGIN and END lines.
                        </small>
                    </div>

                    <button
                        onClick={handleVerifySignature}
                        disabled={loading || !signature.trim()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: signature.trim() ? '#4caf50' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: signature.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? 'Verifying...' : 'Verify & Access Admin Panel'}
                    </button>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#ffebee',
                    border: '1px solid #f44336',
                    borderRadius: '4px',
                    marginTop: '1rem',
                    color: '#d32f2f'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                fontSize: '0.9rem'
            }}>
                <strong>Security Note:</strong> This SSH verification ensures only authorized administrators 
                can access the election management system. Your private key never leaves your computer.
            </div>
        </div>
    );
}

export default SSHKeyVerification;