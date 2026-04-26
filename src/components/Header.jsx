/**
 * Header
 * 
 * Top bar with app branding and brief instructions.
 * Linear-style: dark sticky header with minimal, precise typography.
 */
import { Diamond } from 'lucide-react';

function Header() {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">
            <Diamond size={18} strokeWidth={2} color="#7170ff" fill="#5e6ad2" />
          </span>
          <h1 className="logo-text">PathFinder</h1>
          <span className="logo-badge">VISUALIZER</span>
        </div>
      </div>

      <div className="header-center">
        <p className="header-subtitle">
          Real-time pathfinding on OpenStreetMap road networks
        </p>
      </div>

      <div className="header-right" />
    </header>
  );
}

export default Header;
