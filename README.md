
Eirvote Blockchain Voting System

Live Demo: 
Frontend: https://d3btbzdb8l10rt.cloudfront.net
Smart Contract: 0xe9249d97aefe2f7c819685db584de4e966b6061a
Transactions: https://sepolia.etherscan.io/address/0xe9249d97aefe2f7c819685db584de4e966b6061a

Architecture:
React Frontend (CloudFront) ↔ Node.js API (EC2 + ALB) ↔ Ethereum Smart Contract

Technology Stack:
Frontend: React 18 with Ethers.js for blockchain interaction and MetaMask integration
Backend: Node.js Express server with DynamoDB storage
Blockchain: Solidify smart contracts deployed on Ethereum Sepolia testnet.
Infrastructure: AWS CloudFront, S3, EC2, Application Load Balancer, and DynamoDB
Security: ZKPs, commitment-reveal protocol, and Merkle tree verification. 


Prerequisites:
Node.js, MetaMask browser extension, Sepolia ETH from:
https://cloud.google.com/application/web3/faucet/ethereum/sepolia

Usage: 
Voters: Connect MetaMask -> Select “Voter” role -> Rank candidates -> Submit vote
Admins: Connect admin wallet -> Call election -> Add candidates -> Manage voting phases -> Execute 4-step counting
Observers: Monitor real-time blockchain events and audit trails

Key Features:
The system has a multi-role architecture with interfaces for voters, administrators, and observers. Blockchain integration allows for immutable vote recording through Ethereum smart contracts with event monitoring. 


Frontend deployment: 
npm run build 
aws s3 sync dist/ s3://eirvote-29763 --delete 
aws cloudfront create-invalidation --distribution-id E38CR2MTJJ9QP0 --paths "/*"
