import { useState } from 'react';
import { Avatar as MUIAvatar, Divider, Drawer, IconButton, Menu, MenuItem, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import {
  AccountCircleRounded,
  BarChartRounded,
  DashboardRounded,
  FactCheckRounded,
  AutoAwesomeRounded,
  MenuRounded,
  ReceiptRounded,
  SettingsRounded,
  LogoutRounded,
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const links = [
  { to: '/', label: 'Dashboard', icon: <DashboardRounded fontSize="small" /> },
  { to: '/transactions', label: 'Transactions', icon: <ReceiptRounded fontSize="small" /> },
  { to: '/compliance', label: 'Compliance', icon: <FactCheckRounded fontSize="small" /> },
  { to: '/invoices', label: 'Invoices', icon: <ReceiptRounded fontSize="small" /> },
  { to: '/reports', label: 'Reports', icon: <BarChartRounded fontSize="small" /> },
  { to: '/ai-agent', label: 'AI Agent', icon: <AutoAwesomeRounded fontSize="small" /> },
  { to: '/settings', label: 'Settings', icon: <SettingsRounded fontSize="small" /> },
];

function SidebarContent({ onNavigate, collapsed = false }) {
  return (
    <div className={`sidebar-inner ${collapsed ? 'sidebar-inner-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img src={`${import.meta.env.BASE_URL}ledgerwise-logo.png`} alt="Ledgerwise logo" />
          {!collapsed && <div className="brand">Ledger<span style={{ color: 'yellow' }}>wise</span></div>}
          
        </div>
      </div>
     

      <nav className="sidebar-nav">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={onNavigate}
          >
            <span className="nav-icon">{icon}</span>
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const profileOpen = Boolean(profileAnchor);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    setProfileAnchor(null);
    navigate('/login');
  };

  const profileName = user?.name || 'Demo User';
  const profileEmail = user?.email || 'demo@example.com';
  const pageName = links.find((link) => link.to === location.pathname)?.label || 'Dashboard';

  return (
    <div className="app-shell d-flex min-vh-100">
      {isMobile ? (
        <>
          <header className="mobile-topbar d-flex align-items-center justify-content-between">
            <div className="topbar-leading">
              <IconButton aria-label="open navigation" className="hamburger-button" onClick={() => setMobileOpen(true)}>
                <MenuRounded />
              </IconButton>
              <strong className="topbar-page-name">{pageName}</strong>
            </div>
            <ProfileButton
              name={profileName}
              email={profileEmail}
              open={profileOpen}
              onOpen={(event) => setProfileAnchor(event.currentTarget)}
              onClose={() => setProfileAnchor(null)}
              onLogout={handleLogout}
              anchorEl={profileAnchor}
              compact
            />
          </header>

          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            slotProps={{
              paper: {
                className: 'sidebar-drawer-paper',
              },
            }}
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        </>
      ) : (
        <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <SidebarContent
            onNavigate={() => {}}
            collapsed={sidebarCollapsed}
          />
        </aside>
      )}

      <main className="main-content flex-grow-1 min-h-screen">
        {!isMobile && (
          <header className="topbar">
            <div className="topbar-leading">
              <Tooltip title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
                <IconButton
                  aria-label={sidebarCollapsed ? 'expand sidebar' : 'collapse sidebar'}
                  className="topbar-menu-button"
                  onClick={() => setSidebarCollapsed((value) => !value)}
                >
                  <MenuRounded />
                </IconButton>
              </Tooltip>
              <strong className="topbar-page-name">{pageName}</strong>
            </div>
            <ProfileButton
              name={profileName}
              email={profileEmail}
              open={profileOpen}
              onOpen={(event) => setProfileAnchor(event.currentTarget)}
              onClose={() => setProfileAnchor(null)}
              onLogout={handleLogout}
              anchorEl={profileAnchor}
            />
          </header>
        )}
        {children}
      </main>
    </div>
  );
}

function ProfileButton({ name, email, open, onOpen, onClose, onLogout, anchorEl, compact = false }) {
  return (
    <>
      <Tooltip title="Open profile">
        <IconButton
          aria-label="open profile menu"
          aria-controls={open ? 'profile-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          className={`profile-button ${compact ? 'profile-button-compact' : ''}`}
          onClick={onOpen}
        >
          <MUIAvatar className="profile-avatar">{name.charAt(0).toUpperCase()}</MUIAvatar>
        </IconButton>
      </Tooltip>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        MenuListProps={{ 'aria-labelledby': 'profile-button' }}
        PaperProps={{ className: 'profile-menu-paper' }}
      >
        <div className="profile-menu-header">
          <AccountCircleRounded className="profile-menu-icon" />
          <div>
            <strong>{name}</strong>
            <span>{email}</span>
          </div>
        </div>
        <Divider />
        <MenuItem onClick={onClose}>View profile</MenuItem>
        <MenuItem onClick={onClose}>Account settings</MenuItem>
        <Divider />
        <MenuItem onClick={onLogout}><LogoutRounded fontSize="small" /> <span>Sign out</span></MenuItem>
      </Menu>
    </>
  );
}
