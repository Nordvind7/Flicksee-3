import React from 'react';
import { Link } from 'react-router-dom';
import type { FriendSummary } from '../lib/api';

const FriendCard: React.FC<{ friend: FriendSummary }> = ({ friend }) => {
  const initial = (friend.firstName ?? friend.username ?? '?').charAt(0).toUpperCase();
  return (
    <Link
      to={`/friends/${friend.id}`}
      className="group flex items-center gap-3 p-3 rounded-2xl bg-ink-700/70 hover:bg-ink-600 ring-1 ring-white/5 hover:ring-white/10 transition-all"
    >
      {friend.photoUrl ? (
        <img
          src={friend.photoUrl}
          alt=""
          className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/30 to-ink-500 flex items-center justify-center text-lg font-semibold text-white ring-2 ring-white/10">
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink-50 truncate">
          {friend.firstName ?? friend.username ?? 'Без имени'}
        </div>
        {friend.username && (
          <div className="text-sm text-ink-200 truncate">@{friend.username}</div>
        )}
      </div>
      {friend.unseenCount > 0 && (
        <span className="bg-accent text-white text-xs font-semibold rounded-full px-2.5 py-1 min-w-[1.75rem] text-center shadow-glow-accent">
          {friend.unseenCount}
        </span>
      )}
      <span className="text-ink-300 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100">
        →
      </span>
    </Link>
  );
};

export default FriendCard;
