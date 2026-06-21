import React from 'react';
import { Link } from 'react-router-dom';
import type { FriendSummary } from '../lib/api';

const FriendCard: React.FC<{ friend: FriendSummary }> = ({ friend }) => {
  const initial = (friend.firstName ?? friend.username ?? '?').charAt(0).toUpperCase();
  return (
    <Link
      to={`/friends/${friend.id}`}
      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors"
    >
      {friend.photoUrl ? (
        <img src={friend.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-lg">
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {friend.firstName ?? friend.username ?? 'Без имени'}
        </div>
        {friend.username && (
          <div className="text-sm text-neutral-400 truncate">@{friend.username}</div>
        )}
      </div>
      {friend.unseenCount > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] text-center">
          {friend.unseenCount}
        </span>
      )}
    </Link>
  );
};

export default FriendCard;
