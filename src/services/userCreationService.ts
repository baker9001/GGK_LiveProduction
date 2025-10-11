import { supabase } from '../lib/supabase';

export interface CreateUserPayload {
  email: string;
  password?: string;
  full_name: string;
  role: string;
  entity_id?: string;
  entity_type?: string;
}

export const userCreationService = {
  async createUser(payload: CreateUserPayload) {
    const { data, error } = await supabase.functions.invoke('create-teacher-student-user', {
      body: payload
    });

    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateEmail(userId: string, newEmail: string) {
    const { data, error } = await supabase.functions.invoke('update-user-email', {
      body: { userId, newEmail }
    });

    if (error) throw error;
    return data;
  },

  async updatePasswordMetadata(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .update({
        password_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePassword(userId: string, newPassword: string) {
    const { data, error } = await supabase.functions.invoke('update-user-password', {
      body: { userId, newPassword }
    });

    if (error) throw error;
    return data;
  }
};

export async function createUser(payload: CreateUserPayload) {
  return userCreationService.createUser(payload);
}

export async function updateUserProfile(userId: string, updates: any) {
  return userCreationService.updateUserProfile(userId, updates);
}

export async function getUserProfile(userId: string) {
  return userCreationService.getUserProfile(userId);
}
