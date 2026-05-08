import { Context } from "grammy";
import { Conversation, ConversationFlavor } from "@grammyjs/conversations";

export interface UserProfile {
  telegram_id: number;
  age: number;
  weight: number;
  height: number;
  sex: "male" | "female";
  activity_level: string;
  bmr: number;
  tdee: number;
}

export interface Meal {
  id?: number;
  user_id: number;
  raw_text: string;
  calories_estimated: number;
  timestamp: string;
  notes?: string;
}

export type MyContext = Context & ConversationFlavor;
export type MyConversation = Conversation<MyContext>;
