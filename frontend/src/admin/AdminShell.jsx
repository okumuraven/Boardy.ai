import { useState, useEffect } from 'react';
import KuzanaMark from '../components/KuzanaMark';
import './AdminShell.css';
import './AdminPrimitives.css';
import MembersListView from './members/MembersListView';
import MemberDetailView from './members/MemberDetailView';
import MatchesListView from './matches/MatchesListView';
import MatchDetailView from './matches/MatchDetailView';
import DeclineReasonsView from './matches/DeclineReasonsView';
import SchedulesListView from './schedules/SchedulesListView';
import ScheduleDetailView from './schedules/ScheduleDetailView';
import StatsView from './stats/StatsView';
import AdminAccountsView from './admins/AdminAccountsView';
import AuditLogView from './admins/AuditLogView';
import BuddyPairingsView from './buddy_pairings/BuddyPairingsView';
import BuddyConcernsView from './buddy_pairings/BuddyConcernsView';
import FeedbackListView from './feedback/FeedbackListView';
import AnnouncementsView from './announcements/AnnouncementsView';
import DiscussionTopicsView from './discussion_topics/DiscussionTopicsView';
import BiziApplicationsListView from './bizi_applications/BiziApplicationsListView';
import BiziApplicationDetailView from './bizi_applications/BiziApplicationDetailView';

const TABS = [
  { key: 'members', label: 'Members' },
  { key: 'matches', label: 'Matches' },
  { key: 'decline_reasons', label: 'Decline reasons' },
  { key: 'schedules', label: 'Schedules' },
  { key: 'buddy_pairings', label: 'Buddy Pairs' },
  { key: 'buddy_concerns', label: 'Buddy Concerns' },
  { key: 'bizi_applications', label: 'Bizi Applications' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'discussion_topics', label: 'Discussion Topics' },
  { key: 'stats', label: 'Stats' },
];

// Admin-account management and the audit trail are the highest-risk
// surface in the whole panel (§6) - hidden entirely for Moderator/
// Support, not just gated after the fact. The backend re-checks
// admin_role on every one of these actions regardless (§4) - this is
// purely so a non-Superadmin never even sees the tab exists.
const SUPERADMIN_TABS = [
  { key: 'admins', label: 'Admins' },
  { key: 'audit_log', label: 'Audit log' },
];

// The Google Calendar OAuth round-trip (Phase D, ScheduleCallPanel's
// "Connect your Google Calendar" button) is a full browser redirect to
// Google and back - no React state survives that. sessionStorage +
// this one query-param read is how the admin lands back on the exact
// Bizi application they were booking a call for, same problem the
// member app's own `?calendar_connected=1&match_id=...` redirect solves
// for matched-member scheduling.
const readCalendarRedirectState = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    connected: params.has('calendar_connected'),
    error: params.has('calendar_connect_error'),
    returnBiziId: sessionStorage.getItem('kuzana_admin_return_bizi_id'),
  };
};

// Same no-router-library convention as the member app (main.jsx's single
// pathname branch) - tab + selected-id local state instead of a routing
// dependency, since nothing here needs a shareable/bookmarkable URL yet.
export default function AdminShell({ admin, onLogout }) {
  const [{ connected: justConnectedCalendar, error: calendarConnectError, returnBiziId }] = useState(readCalendarRedirectState);
  const [tab, setTab] = useState(() => (justConnectedCalendar || calendarConnectError) ? 'bizi_applications' : 'members');
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [selectedBiziApplicationId, setSelectedBiziApplicationId] = useState(() => (justConnectedCalendar && returnBiziId) ? returnBiziId : null);
  const isSuperadmin = admin.admin_role === 'superadmin';
  const visibleTabs = isSuperadmin ? [...TABS, ...SUPERADMIN_TABS] : TABS;

  useEffect(() => {
    if (justConnectedCalendar || calendarConnectError) {
      sessionStorage.removeItem('kuzana_admin_return_bizi_id');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [justConnectedCalendar, calendarConnectError]);

  const changeTab = (key) => {
    setTab(key);
    setSelectedMemberId(null);
    setSelectedMatchId(null);
    setSelectedScheduleId(null);
    setSelectedBiziApplicationId(null);
  };

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <span className="admin-topbar-title">
          <KuzanaMark />
          Kuzana Connect <span className="accent-text">Admin</span>
        </span>
        <div className="admin-topbar-who">
          <span>{admin.full_name || admin.email}</span>
          <span className="admin-role-pill">{admin.admin_role}</span>
          <button className="btn-ghost btn-sm" onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div className="admin-nav">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            className={`admin-nav-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => changeTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {calendarConnectError && (
        <div className="panel warn" style={{ margin: '1rem 1.5rem 0' }}>
          <p style={{ color: 'var(--warn)', margin: 0, fontSize: '0.85rem' }}>
            Couldn't connect your Google Calendar. Please try again.
          </p>
        </div>
      )}

      <div className="admin-content">
        {tab === 'members' && (
          selectedMemberId ? (
            <MemberDetailView memberId={selectedMemberId} admin={admin} onBack={() => setSelectedMemberId(null)} />
          ) : (
            <MembersListView onSelect={setSelectedMemberId} />
          )
        )}

        {tab === 'matches' && (
          selectedMatchId ? (
            <MatchDetailView matchId={selectedMatchId} admin={admin} onBack={() => setSelectedMatchId(null)} />
          ) : (
            <MatchesListView onSelect={setSelectedMatchId} />
          )
        )}

        {tab === 'decline_reasons' && <DeclineReasonsView />}

        {tab === 'schedules' && (
          selectedScheduleId ? (
            <ScheduleDetailView scheduleId={selectedScheduleId} onBack={() => setSelectedScheduleId(null)} />
          ) : (
            <SchedulesListView onSelect={setSelectedScheduleId} />
          )
        )}

        {tab === 'buddy_pairings' && <BuddyPairingsView admin={admin} />}
        {tab === 'buddy_concerns' && <BuddyConcernsView admin={admin} />}

        {tab === 'bizi_applications' && (
          selectedBiziApplicationId ? (
            <BiziApplicationDetailView applicationId={selectedBiziApplicationId} admin={admin} onBack={() => setSelectedBiziApplicationId(null)} />
          ) : (
            <BiziApplicationsListView onSelect={setSelectedBiziApplicationId} />
          )
        )}

        {tab === 'feedback' && <FeedbackListView />}
        {tab === 'announcements' && <AnnouncementsView admin={admin} />}
        {tab === 'discussion_topics' && <DiscussionTopicsView admin={admin} />}

        {tab === 'stats' && <StatsView />}

        {tab === 'admins' && isSuperadmin && <AdminAccountsView admin={admin} />}
        {tab === 'audit_log' && isSuperadmin && <AuditLogView />}
      </div>
    </div>
  );
}
