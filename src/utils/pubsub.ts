import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

export const EVENTS = {
  ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
  ATTENDANCE_UPDATED: 'ATTENDANCE_UPDATED',
} as const;
