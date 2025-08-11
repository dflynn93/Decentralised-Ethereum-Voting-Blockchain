import React from 'react';

const Footer = () => {
    return (
        <footer style={{
            backgroundColor: '#0056b3', // Electoral Commission blue
            color: 'white',
            padding: '40px 0 20px 0',
            marginTop: '60px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI",  Roboto, "Helvetica Neue", Arial, sans-serif',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                textAlign: 'center',
            }}>
                {/* Main Footer Content */}
                <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '30px',
                    marginBottom: '30px',                    
                    }}>
                        {/* Contact Information */}
                        <div> 
                            <h3 style={{
                                margin: '0 0 15px 0',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                            }}>
                              Contact Information
                            </h3>
                              <address style={{
                                fontSize: 'normal',
                                lineHeight: '1.6',
                            }}>
                                <strong>An Coimisiún Toghcháin</strong><br/>
                                <strong>Electoral Commission</strong><br/>
                                Block M<br/>
                                Dublin Castle<br/>
                                Dublin 2<br/>
                                D02 X8X8
                            </address>
                            <p style={{ margin: '15px 0 0 0' }}>
                                <a href="#" style={{ 
                                    color: 'white', 
                                    textDecoration: 'underline' 
                                }}>
                                    Contact Us
                                </a>
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h3 style={{
                                margin: '0 0 15px 0',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                            }}>
                                Voting Information
                            </h3>
                            <nav>
                                <ul style={{
                                    listStyle: 'none',
                                    padding: '0',
                                    margin: '0',
                                }}>
                                    <li style={{ marginBottom: '8px' }}>
                                        <a href="#" style={{ 
                                            color: 'white', 
                                            textDecoration: 'underline' 
                                        }}>
                                            How to Vote
                                        </a>
                                    </li>
                                    <li style={{ marginBottom: '8px' }}>
                                        <a href="#" style={{ 
                                            color: 'white', 
                                            textDecoration: 'underline' 
                                        }}>
                                            Voter Registration
                                        </a>
                                    </li>
                                    <li style={{ marginBottom: '8px' }}>
                                        <a href="#" style={{ 
                                            color: 'white', 
                                            textDecoration: 'underline' 
                                        }}>
                                            Election Results
                                        </a>
                                    </li>
                                    <li style={{ marginBottom: '8px' }}>
                                        <a href="#" style={{ 
                                            color: 'white', 
                                            textDecoration: 'underline' 
                                        }}>
                                            Frequently Asked Questions
                                        </a>
                                    </li>
                                </ul>
                            </nav>
                        </div>

                        {/* Newsletter Signup */}
                        <div>
                            <h3 style={{
                                margin: '0 0 15px 0',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                            }}>
                                Stay Updated
                            </h3>
                            <p style={{ margin: '0 0 15px', lineHeight: '1.5' }}>
                                <a href="#" style={{ 
                                    color: 'white', 
                                    textDecoration: 'underline' 
                                }}>
                                    Sign up for updates from the Electoral Commission 
                                </a>
                            </p>
                            <div style={{ marginTop: '20px' }}>
                                <h4 style={{
                                    margin: '0 0 10px',
                                    fontSize: '1rem',
                                }}>
                                    Follow us online
                                </h4>
                                <div style={{
                                    display: 'flex',
                                    gap: '15px'
                                }}         
                                >
                                    <a href="#" style={{ 
                                        color: 'white', 
                                        fontSize: '1.5rem',
                                        textDecoration: 'none' 
                                    }}>
                                        <i className="fab fa-facebook-f"></i> Facebook
                                    </a>
                                    <a href="#" style={{ 
                                        color: 'white',
                                        fontSize: '1.5rem', 
                                        textDecoration: 'none' 
                                    }}>
                                        <i className="fab fa-twitter"></i> Twitter
                                    </a>
                                    <a href="#" style={{ 
                                        color: 'white', 
                                        fontSize: '1.5rem', 
                                        textDecoration: 'none' 
                                    }}>
                                        <i className="fab fa-instagram"></i> Instagram
                                    </a>      
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Bottom Bar */}
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                    paddingTop: '20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    {/* Copyright */}
                    <div style={{ fontSize: '0.9rem' }}>
                        © 2025 The Electoral Commission
                    </div>

                    {/* Legal Links */}
                    <nav>
                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            flexWrap: 'wrap',
                            fontSize: '0.9rem'
                        }}>
                            <a href="#" style={{ 
                                color: 'white', 
                                textDecoration: 'underline'
                            }}>
                                Privacy Policy
                            </a>
                            <a href="#" style={{ 
                                color: 'white', 
                                textDecoration: 'underline'
                            }}>
                                Cookie Policy
                            </a>
                            <a href="#" style={{ 
                                color: 'white', 
                                textDecoration: 'underline', 
                                fontSize: '0.9rem' 
                            }}>
                                Our Governance
                            </a>
                            <a href="#" style={{
                                color: 'white',
                                textDecoration: 'underline'
                            }}>
                                Accessibility Statement
                            </a>
                        </div>
                    </nav>
                </div>

                {/* Blockchain Technology Notice */}
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '5px',
                    textAlign: 'center',
                    fontSize: '0.9rem'
                }}>
                    <strong> Secure Blockchain Voting Technology</strong><br/>
                    This platform uses advanced blockchain technology to ensure transparent, 
                    tamper-proof, and verifiable elections. All votes are cryptographically secured 
                    and permanently recorded on the blockchain.
                </div>


                
            </div>
        </footer>               
    );
};

export default Footer;