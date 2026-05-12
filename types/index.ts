export type UserRole = "director" | "administrator" | "nurse" | "media" | "store" | "parent";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  push_notification_enabled: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  show_cabin_info: boolean;
  deposit_amount: number;
  deposit_due_date: string | null;
  tuition_amount: number;
  tuition_due_date: string | null;
  session_closed: boolean;
  created_at: string;
}

export interface Camper {
  id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  photo_url: string | null;
  cabin: string | null;
  counselor_name: string | null;
  session_id: string | null;
  store_balance: number;
  camper_code: string;
  is_staff: boolean;
  created_at: string;
}

export interface ParentCamperLink {
  id: string;
  parent_id: string;
  camper_id: string;
  approved: boolean;
  linked_at: string;
  camper?: Camper;
  parent?: User;
}

export interface TuitionPayment {
  id: string;
  camper_id: string;
  parent_id: string;
  amount: number;
  type: "deposit" | "balance";
  square_payment_id: string | null;
  paid_at: string;
}

export interface StoreTransaction {
  id: string;
  camper_id: string;
  amount: number;
  type: "credit" | "debit";
  note: string | null;
  staff_id: string | null;
  created_at: string;
  camper?: Camper;
  staff?: User;
}

export interface Message {
  id: string;
  from_parent_id: string;
  to_camper_id: string;
  body: string;
  sent_at: string;
  status: "unread" | "delivered";
  delivered_at: string | null;
  from_parent?: User;
  to_camper?: Camper;
}

export interface Photo {
  id: string;
  url: string;
  caption: string | null;
  date_taken: string;
  uploaded_by: string | null;
  created_at: string;
  tags?: PhotoTag[];
}

export interface PhotoTag {
  id: string;
  photo_id: string;
  camper_id: string;
  tagged_by: string | null;
  created_at: string;
  camper?: Camper;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  posted_by: string | null;
  created_at: string;
  posted_by_user?: User;
}

export interface InfoPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_by: string | null;
  updated_at: string;
}

export interface SessionBalanceChoice {
  id: string;
  camper_id: string;
  parent_id: string;
  session_id: string;
  choice: "refund" | "donate";
  balance_at_close: number;
  chosen_at: string;
}
