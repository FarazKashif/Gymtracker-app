import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { USER_ID } from '../db/seed';

export function useUser() {
  return useLiveQuery(() => db.users.get(USER_ID), []);
}
