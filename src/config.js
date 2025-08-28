// config.js - Browser-compatible configuration
const config = {
  // Backend URLs by environment
  backend: {
    development: "http://localhost:3001",
    production: "http://eirvote-load-balancer-1407164548.eu-west-1.elb.amazonaws.com:3001",
    staging: "http://staging-eirvote-backend.com:3001"
  },
  
  // Blockchain configuration
  blockchain: {
    contractAddress: "0xd254b557670c3d7a37ac1c26d863187e71442f94",
    adminWallet: "0x1Da5916E8443b0f028d2bdA63b8639eF609e9bDe",
    networkId: "1", // Mainnet by default
    rpcUrl: "https://mainnet.infura.io/v3/your-key"
  },
  
  // Application settings
  app: {
    name: "Eirvote",
    version: "1.0.0",
    environment: "development", // set from production to development
    debug: false, // disabled in production
    maxCandidates: 20,
    voteTimeoutMinutes: 60
  },
  
  // Security settings
  security: {
    enableSSHAuth: true,
    enablePasswordAuth: true,
    sessionTimeout: 3600000 // 1 hour
  },
  
  // AWS configuration (for when IAM is implemented)
  aws: {
    region: "eu-west-1",
    s3Bucket: "eirvote-29763",
    secretsManagerPrefix: "eirvote/",
    cloudWatchLogGroup: "/eirvote/application"
  }
};

// Environment detection
config.getCurrentBackendUrl = () => {
  const env = config.app.environment;
  if (env === "production") return config.backend.production;
  if (env === "staging") return config.backend.staging;
  return config.backend.development;
};

// Feature flags
config.features = {
  enableAuditLogging: config.app.environment === "production",
  enableCloudWatch: config.app.environment === "production",
  enableVoteEncryption: true,
  enableMerkleVerification: true,
  enableMultiLanguage: false,
  enableMobileSupport: false,
  enableBiometricAuth: false,
  enableMultiAZ: false
};

// Validation function
config.validate = () => {
  const errors = [];
  
  if (!config.blockchain.contractAddress.startsWith('0x')) {
    errors.push("Invalid contract address format");
  }
  
  if (!config.blockchain.adminWallet.startsWith('0x')) {
    errors.push("Invalid admin wallet format");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default config;