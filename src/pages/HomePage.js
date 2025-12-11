import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { usePermissions } from '../auth/usePermissions';

const getPageTitle = (pathname) => {
  const titles = {
    '/': 'Dashboard',
    '/leads': 'Leads',
    '/add-lead': 'Add Lead',
    '/members': 'Members',
    '/past-members': 'Past Members',
    '/agreements': 'Agreements',
    '/invoices': 'Invoices',
    '/expenses': 'Expenses',
    '/settings': 'Settings',
    '/logs': 'Logs',
  };
  
  if (pathname.startsWith('/lead/')) return 'Edit Lead';
  if (pathname.startsWith('/member/')) return 'Client Profile';

  return titles[pathname] || 'Dashboard';
};

const SIDEBAR_WIDTH = '256px';

function HomePage() {
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = usePermissions();
  const [notifications, setNotifications] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(false); // Close mobile sidebar when switching to desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!db || !hasPermission) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const allNotifications = [];

      // Fetch Follow-ups (Leads)
      if (hasPermission('leads:view')) {
        const leadsCollection = collection(db, 'leads');
        const leadsSnapshot = await getDocs(leadsCollection);
        leadsSnapshot.forEach(doc => {
          const lead = doc.data();
          if (lead.activities) {
            lead.activities.forEach(activity => {
              if (activity.hasFollowUp && activity.followUpDays) {
                const addedDate = new Date(activity.timestamp);
                const dueDate = new Date(addedDate);
                dueDate.setDate(addedDate.getDate() + parseInt(activity.followUpDays, 10));
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate.getTime() === today.getTime()) {
                  allNotifications.push({
                    id: `followup-${doc.id}-${activity.timestamp}`,
                    title: 'Follow-up Reminder',
                    description: `Follow up with ${lead.name} regarding "${activity.description}"`,
                    isRead: false,
                    type: 'followUp'
                  });
                }
              }
            });
          }
        });
      }

      // Fetch Expiring Agreements
      if (hasPermission('agreements:view')) {
        const agreementsCollection = collection(db, 'agreements');
        const q = query(agreementsCollection, where('status', '==', 'active'));
        const agreementsSnapshot = await getDocs(q);
        agreementsSnapshot.forEach(doc => {
          const agreement = doc.data();
          if (agreement.endDate) {
            // Handle both Timestamp and string formats for graceful migration
            let endDate;
            if (typeof agreement.endDate.toDate === 'function') {
              endDate = agreement.endDate.toDate(); // Firestore Timestamp
            } else {
              endDate = new Date(agreement.endDate); // String date
            }
            endDate.setHours(0, 0, 0, 0); // Normalize endDate to the start of the day
            
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let message = '';
            if (diffDays === 30 || diffDays === 15 || (diffDays >= 0 && diffDays <= 7)) {
                message = `Agreement for ${agreement.memberLegalName || agreement.name} is expiring in ${diffDays} day(s).`;
            } else if (diffDays < 0 && diffDays >= -1) {
                message = `Agreement for ${agreement.memberLegalName || agreement.name} has expired.`;
            }


            if (message) {
              allNotifications.push({
                id: `agreement-${doc.id}`,
                title: 'Agreement Expiration',
                description: message,
                isRead: false,
                type: 'agreement'
              });
            }
          }
        });
      }

      // Fetch Birthday Reminders
      if (hasPermission('members:view')) {
        const membersPromise = getDocs(collection(db, 'members'));
        const pastMembersPromise = getDocs(collection(db, 'past_members'));
        
        const [membersSnapshot, pastMembersSnapshot] = await Promise.all([membersPromise, pastMembersPromise]);

        const processMember = (doc, isPast = false) => {
          const member = doc.data();
          if (member.birthdayDay && member.birthdayMonth) {
            const birthday = new Date(today.getFullYear(), parseInt(member.birthdayMonth, 10) - 1, parseInt(member.birthdayDay, 10));
            birthday.setHours(0,0,0,0);

            if (birthday.getTime() === today.getTime()) {
              allNotifications.push({
                id: `${isPast ? 'past-' : ''}birthday-${doc.id}`,
                title: isPast ? 'Past Member Birthday' : 'Birthday Reminder',
                description: `It's ${member.name}'s birthday today!${isPast ? ' (Past Member)' : ''}`,
                isRead: false,
                type: 'birthday'
              });
            } else if (birthday.getTime() === tomorrow.getTime()) {
              allNotifications.push({
                id: `${isPast ? 'past-' : ''}birthday-tomorrow-${doc.id}`,
                title: 'Upcoming Birthday',
                description: `${member.name}'s birthday is tomorrow!${isPast ? ' (Past Member)' : ''}`,
                isRead: false,
                type: 'birthday'
              });
            }
          }
        };

        membersSnapshot.forEach(doc => processMember(doc, false));
        pastMembersSnapshot.forEach(doc => processMember(doc, true));
      }
      
      setNotifications(allNotifications);
    };

    fetchNotifications();
  }, [db, hasPermission]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flexGrow: 1
        }}
      >
        <Header 
          pageTitle={pageTitle} 
          notifications={notifications} 
          setNotifications={setNotifications}
          onMenuClick={handleMenuClick}
        />
        <main style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default HomePage;