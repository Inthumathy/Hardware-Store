import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShoppingBag, ShoppingCart, Package, Wrench, LayoutDashboard, ShieldCheck, LogOut, Store, ClipboardList, Menu, X } from "lucide-react";
import { useState } from "react";

export default function SiteChrome({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (["/login", "/register", "/customer"].includes(pathname)) return children;
  const admin = user?.role === "ADMIN";
  const worker = user?.role === "WORKER";
  const links = admin ? [
    ["/admin", "Overview", LayoutDashboard], ["/admin/products", "Products", ShoppingBag],
    ["/admin/orders", "Orders", Package], ["/admin/repairs", "Repair bookings", Wrench],
    ["/admin/nic-requests", "NIC requests", ShieldCheck]
  ] : worker ? [["/worker", "Worker dashboard", LayoutDashboard]] : [
    ["/customer", "Dashboard", LayoutDashboard], ["/products", "Shop products", ShoppingBag],
    ["/cart", "My cart", ShoppingCart], ["/orders", "My orders", Package],
    ["/customer/repairs", "Repair services", Wrench],
    ["/my-repair-bookings", "My bookings", ClipboardList],
    ["/customer/verification", "Account", ShieldCheck]
  ];
  const heading = links.find(([path]) => path === pathname)?.[1] || (pathname.startsWith('/orders/') ? 'Order details' : 'Hardware Store');
  return <div className="hs-app-shell">
    {open && <button className="hs-overlay" aria-label="Close menu" onClick={() => setOpen(false)} />}
    <aside className={`hs-sidebar ${open ? 'is-open' : ''}`}>
      <Link to={admin ? '/admin' : worker ? '/worker' : '/customer'} className="hs-brand" onClick={() => setOpen(false)}>
        <span className="hs-brand-mark"><Store size={23}/></span><span><strong>HARDWARE</strong><small>STORE MANAGEMENT</small></span>
      </Link>
      <span className="hs-menu-label">MAIN MENU</span>
      <nav aria-label="Main navigation">{links.map(([path, label, Icon]) => <NavLink key={path} to={path} end={path === '/admin' || path === '/customer'} onClick={() => setOpen(false)} className={({isActive}) => `hs-nav-link ${isActive ? 'is-active' : ''}`}><Icon size={19}/>{label}</NavLink>)}</nav>
      <div className="hs-sidebar-footer"><div className="hs-sidebar-tip"><strong>Built for your next project</strong><span>Everything for hardware shopping and services.</span></div>
      {user ? <button className="hs-logout" onClick={() => { logout(); navigate('/login',{replace:true}); }}><LogOut size={18}/> Sign out</button> : <Link className="hs-logout" to="/login">Sign in</Link>}</div>
    </aside>
    <div className="hs-workspace"><header className="hs-topbar"><div className="hs-topbar-title"><button className="hs-mobile-toggle" aria-label="Open menu" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button><div><span>HARDWARE STORE / {admin ? 'ADMIN' : worker ? 'WORKER' : 'CUSTOMER'}</span><strong>{heading}</strong></div></div><div className="hs-topbar-right"><span className="hs-account-dot">{(user?.full_name || 'G').charAt(0).toUpperCase()}</span><div><strong>{user?.full_name || 'Guest'}</strong><small>{user?.role || 'Visitor'}</small></div></div></header><div className="hs-page-frame">{children}</div></div>
  </div>;
}
