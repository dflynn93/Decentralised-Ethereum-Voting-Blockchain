import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminData, DB } from './dynamo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialise default data on startup
async function initialiseData() {
    try {
        // Ensure default admin exists
        await adminData.addAdmin('0x1Da5916E8443b0f028d2bdA63b8639eF609e9bDe');
        console.log('DynamoDB initialised with default admin');
    } catch (error) {
        console.error('DynamoDB initialisation error:', error);
    }
}

// Call on server startup
initialiseData();

// Middleware
app.use(cors());
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// === IAM Integration Functions ===

// Function to check if running on EC2 with IAM role
function checkIAMCapabilties() {
    const hasInstanceProfile = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    const hasCredentials = process.env.AWS_ACCESS_KEY_ID;

    return {
        hasIAMRole: hasInstanceProfile && !hasCredentials,
        hasCredentials: !!hasCredentials,
        region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu_west-1',
        environment: hasInstanceProfile ? 'aws' : 'local'
    };
}

// Enhanced logging with CloudWatch Integration (when IAM role is available)
function logAdminAction(action, walletAddress, details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        action,
        walletAddress,
        details,
        source: 'eirvote_backend'
    };

    // Console logging (always available)
    console.log(`Admin Action: ${action} by ${walletAddress} - ${details}`);

    // Add CloudWatch logging when IAM role is configured
    const iamInfo = checkIAMCapabilties();
    if (iamInfo.hasIAMRole) {
        try {
            const AWS = require('aws-sdk');
            const cloudWatchLogs = new AWS.cloudWatchLogs({ region: iamInfo.region });
            
            const params = {
                logGroupName: '/eirvote/application',
                logStreamName: `admin-actions-${new Date().toISOString().split('T')[0]}`,
                logEvents: [{
                    message: JSON.stringify(logEntry),
                    timestamp: Date.now()
                }]
            };

            cloudWatchLogs.putLogEvents(params).promise()
                .then(() => console.log('CloudWatch log sent successfully'))
                .catch(err => console.log('CloudWatch logging failed:', err.message));
        } catch (error) {
            console.log('CloudWatch not available:', error.message);
        }      
    } else {
        console.log('CloudWatch logging not available (no IAM role)');
    }

    return logEntry;
}


// POST /api/admin/verify - Password verification
app.post('/api/admin/verify', async (req, res) => {
    const { walletAddress, password } = req.body;
    
    try {
        // Check if wallet is admin using DynamoDB
        const isAdmin = await adminData.isAdmin(walletAddress);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Access denied. Not an admin wallet.' });
        }
        
        // Check password (you can store this in DynamoDB too if needed)
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
        
        if (password === ADMIN_PASSWORD) {
            res.json({
                success: true,
                message: 'Admin access granted',
                walletAddress: walletAddress
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Incorrect admin password'
            });
        }
    } catch (error) {
        console.error('Admin verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});


// === HEALTH AND STATUS ROUTES ===

// Simple root route for Load Balancer health checks
app.get('/', (req, res) => {
    res.json({ message: 'Eirvote Backend Server', status: 'running', version: '1.0.0', timestamp: new Date().toISOString()})
});

// Basic health check
app.get('/api/health', (req, res) => {

    const iamInfo = checkIAMCapabilties();

    res.json({ 
        status: 'Server running', 
        timestamp: new Date().toISOString(),
        adminWalletsConfigured: adminWallets.length,
        iam: {
            hasROle: iamInfo.hasIAMRole,
            environment: iamInfo.environment,
            region: iamInfo.region
        },
        security: {
            adminPasswordEnabled: true,
            auditLoggingEnabled: true
        }
    });
});

// IAM status endpoint
app.get('/api/iam/status', (req, res) => {
    const iamInfo = checkIAMCapabilties();

    res.json({
        iam: iamInfo,
        recommendations: iamInfo.hasIAMRole ? [
            'IAM role detected - excellent security posture',
            'CloudWatch logging available',
            'Secrets Manager integration possible'
        ] : [
            'Consider implementing IAM role for EC2 instance',
            'Remove hardcoded credentials',
            'Enable CloudWatch logging with proper permissions'
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server runnnig on http://0.0.0.0:${PORT}`);
    console.log(`Backend ready for Load Balancer traffic`);
})

export default app;