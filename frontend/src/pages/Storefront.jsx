import React, { useEffect, useState } from 'react';
import '../styles/Storefront.css';

const Storefront = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        // Preloader timeout
        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.style.opacity = '0';
            setTimeout(() => { if (preloader) preloader.style.display = 'none'; }, 500);
        }, 2000);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="storefront-body">
            {/* PRELOADER */}
            <div className="preloader" id="preloader">
                <div className="preloader-inner">
                    <div className="preloader-logo">
                        <span className="preloader-icon"><i className="fa-solid fa-leaf"></i></span>
                        <span className="preloader-brand">Echo<em>Friendly</em></span>
                    </div>
                    <div className="preloader-bar"><div className="preloader-fill"></div></div>
                    <p className="preloader-text">Initialising global systems...</p>
                </div>
            </div>

            <header className={`header ${scrolled ? 'scrolled' : ''}`}>
                <nav className="nav-container">
                    <div className="logo">
                        <span className="logo-icon"><i className="fa-solid fa-leaf"></i></span>
                        Echo<em>Friendly</em>
                    </div>
                    <ul className="nav-links">
                        <li><a href="#home">Home</a></li>
                        <li><a href="#impact">Impact</a></li>
                        <li><a href="#solutions">Solutions</a></li>
                        <li><a href="#pillars">About</a></li>
                    </ul>
                    <div className="nav-right">
                        <button className="btn btn-ghost" onClick={() => window.location.href = '/admin'}>
                            <i className="fa-regular fa-user"></i> Admin Login
                        </button>
                        <button className="btn btn-cta">Get in Touch</button>
                    </div>
                </nav>
            </header>

            <main>
                <section id="home" class="hero">
                    <div class="hero-overlay-bg"></div>
                    <div class="hero-inner">
                        <div class="hero-left">
                            <div class="hero-badge">Leading Sustainable Infrastructure</div>
                            <h1>Global Scale.<br/><em>Local Heart.</em></h1>
                            <p>Empowering multinational industries to achieve ecological excellence through cutting-edge, data-driven organic solutions.</p>
                            <div class="hero-actions">
                                <button class="btn btn-primary">Explore Solutions</button>
                                <button class="btn btn-ghost" style={{color:'white'}}>Our Impact</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="impact" class="impact-stats">
                    <div class="impact-inner">
                        <div class="impact-text">
                            <h2>Numbers That Define Our Commitment</h2>
                            <p>Over a decade of measurable environmental progress across 15 global regions.</p>
                        </div>
                        <div class="stats-container">
                            <div class="stat-item"><h2>250M+</h2><p>Metric Tons CO₂ Reduced</p></div>
                            <div class="stat-item"><h2>15+</h2><p>Operational Regions</p></div>
                            <div class="stat-item"><h2>2,100+</h2><p>Projects Delivered</p></div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <div className="footer-bottom">
                    <p>&copy; 2026 EchoFriendly Multinational S.A. All Rights Reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Storefront;
