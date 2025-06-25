// Enhanced SSH utilities with proper challenge file handling
// File: src/utils/sshUtils.js

const API_BASE = 'http://localhost:3001';

/**
 * Generate a challenge for SSH signing and create downloadable file
 */
export function generateChallenge() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `ELECTION_VERIFY_${timestamp}_${random}`;
}

/**
 * Create and download challenge file for SSH signing
 */
export function createChallengeFile(challenge) {
    const blob = new Blob([challenge], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fresh_challenge.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Copy SSH signing command to clipboard
 */
export function copySigningCommand(challenge) {
    const command = `echo -n "${challenge}" | ssh-keygen -Y sign -f ~/.ssh/id_rsa -n election`;
    
    navigator.clipboard.writeText(command).then(() => {
        alert(`Challenge: ${challenge}\n\nCommand copied to clipboard:\n${command}\n\nRun this command in your terminal, then paste the signature output.`);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = command;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(`Command copied to clipboard:\n${command}\n\nRun this command in your terminal, then paste the signature output.`);
    });
}

/**
 * Basic SSH public key validation
 */
export function isValidSSHKey(publicKey) {
    if (!publicKey || typeof publicKey !== 'string') return false;
    
    // Check for basic SSH key format (supports rsa, ed25519, ecdsa)
    const sshKeyRegex = /^(ssh-rsa|ssh-ed25519|ssh-ecdsa)\s+[A-Za-z0-9+/]+=*(\s+.*)?$/;
    return sshKeyRegex.test(publicKey.trim());
}

/**
 * Extract fingerprint from SSH public key (simplified)
 */
export function getSSHFingerprint(publicKey) {
    try {
        const keyPart = publicKey.split(' ')[1];
        if (!keyPart) return 'INVALID_KEY';
        
        // Create a simple hash-based fingerprint
        const hash = btoa(unescape(encodeURIComponent(keyPart))).slice(-12);
        return `DEMO_${hash}`;
    } catch (error) {
        return 'INVALID_KEY';
    }
}

/**
 * Parse SSH key info
 */
export function parseSSHKey(publicKey) {
    const parts = publicKey.trim().split(/\s+/);
    return {
        type: parts[0] || 'unknown',
        key: parts[1] || '',
        comment: parts.slice(2).join(' ') || 'No comment',
        fingerprint: getSSHFingerprint(publicKey)
    };
}

/**
 * Validate SSH signature format
 */
export function isValidSSHSignature(signature) {
    if (!signature || typeof signature !== 'string') return false;
    
    // Check for SSH signature format
    return signature.includes('-----BEGIN SSH SIGNATURE-----') && 
           signature.includes('-----END SSH SIGNATURE-----');
}

/**
 * API calls for SSH operations
 */
export async function registerSSHKey(walletAddress, publicKey) {
    console.log('Registering SSH key for wallet:', walletAddress);
    
    const response = await fetch(`${API_BASE}/api/ssh/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, publicKey: publicKey.trim() })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to register SSH key');
    }
    
    console.log('SSH key registered successfully:', data);
    return data;
}

export async function verifySSHChallenge(walletAddress, challenge, signature) {
    console.log('Verifying SSH challenge for wallet:', walletAddress);
    
    if (!isValidSSHSignature(signature)) {
        throw new Error('Invalid SSH signature format. Must be a complete SSH signature block.');
    }
    
    const response = await fetch(`${API_BASE}/api/ssh/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            walletAddress, 
            challenge: challenge.trim(), 
            signature: signature.trim() 
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'SSH verification failed');
    }
    
    console.log('SSH verification successful:', data);
    return data;
}

export async function getSSHKeyStatus(walletAddress) {
    console.log('Checking SSH key status for wallet:', walletAddress);
    
    const response = await fetch(`${API_BASE}/api/ssh/status/${walletAddress}`);
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get SSH key status');
    }
    
    console.log('SSH key status:', data);
    return data;
}