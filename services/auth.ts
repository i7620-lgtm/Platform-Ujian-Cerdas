import { supabase } from '../lib/supabase';
import type { TeacherProfile, AccountType, UserProfile } from '../types';

export class AuthService {
    async getCurrentUser(): Promise<TeacherProfile | null> {
        const auth = supabase.auth;
        const { data: { session }, error: sessionError } = await auth.getSession();
        
        if (sessionError) {
            if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
                await auth.signOut().catch(() => {});
            }
            return null;
        }
        
        if (!session?.user) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

        if (error) return null;

        if (!profile) {
            const meta = session.user.user_metadata || {};
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: session.user.id,
                    full_name: meta.full_name || meta.name || 'Pengguna',
                    school: '-',
                    regency: '-',
                    role: 'guru'
                })
                .select()
                .single();
            
            if (insertError || !newProfile) return null;

            return {
                id: session.user.id,
                fullName: newProfile.full_name,
                accountType: newProfile.role as AccountType,
                school: newProfile.school,
                regency: newProfile.regency,
                nip: meta.nip || '',
                nipType: meta.nipType || 'NIP',
                headmasterName: meta.headmasterName || '',
                headmasterNip: meta.headmasterNip || '',
                headmasterNipType: meta.headmasterNipType || 'NIP',
                email: session.user.email,
                isPremium: newProfile.is_premium
            };
        }

        const meta = session.user.user_metadata || {};
        return {
            id: session.user.id,
            fullName: profile.full_name,
            accountType: profile.role as AccountType,
            school: profile.school,
            regency: profile.regency,
            nip: profile.nip || meta.nip || '',
            nipType: (profile.nip_type || meta.nipType || 'NIP') as 'NIP' | 'NIPPPK',
            headmasterName: profile.headmaster_name || meta.headmasterName || '',
            headmasterNip: profile.headmaster_nip || meta.headmasterNip || '',
            headmasterNipType: (profile.headmaster_nip_type || meta.headmasterNipType || 'NIP') as 'NIP' | 'NIPPPK',
            email: session.user.email,
            isPremium: profile.is_premium
        };
    }

    async _verifyRole(allowedRoles: AccountType[]): Promise<TeacherProfile> {
        const profile = await this.getCurrentUser();
        if (!profile || !allowedRoles.includes(profile.accountType)) {
            throw new Error("Akses Ditolak: Peran pengguna tidak valid atau telah dimodifikasi.");
        }
        return profile;
    }

    async signUpWithEmail(email: string, password: string, fullName: string, school: string, regency: string): Promise<TeacherProfile> {
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: fullName,
                    school: school,
                    regency: regency,
                    role: 'guru'
                }
            }
        });

        if (authError || !authData.user) {
            throw new Error(authError?.message || 'Gagal mendaftar. Email mungkin sudah terdaftar.');
        }

        return {
            id: authData.user.id,
            fullName: fullName,
            accountType: 'guru',
            school: school,
            regency: regency,
            email: email,
            isPremium: false
        };
    }

    async signInWithEmail(email: string, password: string): Promise<TeacherProfile> {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Email atau password salah.');
        
        await new Promise(r => setTimeout(r, 500));

        const profile = await this.getCurrentUser();
        
        if (!profile) throw new Error('Gagal memuat profil pengguna. Silakan hubungi admin.');
        return profile;
    }

    async signOut() {
        await supabase.auth.signOut();
    }

    async updateTeacherProfile(id: string, updates: Partial<TeacherProfile> & { password?: string }): Promise<void> {
        const dbUpdates: Record<string, string | undefined> = {};
        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.school !== undefined) dbUpdates.school = updates.school;
        if (updates.regency !== undefined) dbUpdates.regency = updates.regency;
        if (updates.accountType !== undefined) dbUpdates.role = updates.accountType;
        if (updates.nip !== undefined) dbUpdates.nip = updates.nip;
        if (updates.nipType !== undefined) dbUpdates.nip_type = updates.nipType;
        if (updates.headmasterName !== undefined) dbUpdates.headmaster_name = updates.headmasterName;
        if (updates.headmasterNip !== undefined) dbUpdates.headmaster_nip = updates.headmasterNip;
        if (updates.headmasterNipType !== undefined) dbUpdates.headmaster_nip_type = updates.headmasterNipType;

        try {
            const { error } = await supabase
                .from('profiles')
                .update(dbUpdates)
                .eq('id', id);
            if (error) {
                // If custom columns don't exist in SQL profiles table, fallback to core fields
                const { nip, nip_type, headmaster_name, headmaster_nip, headmaster_nip_type, ...baseUpdates } = dbUpdates;
                await supabase.from('profiles').update(baseUpdates).eq('id', id);
            }
        } catch {
            const { nip, nip_type, headmaster_name, headmaster_nip, headmaster_nip_type, ...baseUpdates } = dbUpdates;
            await supabase.from('profiles').update(baseUpdates).eq('id', id).catch(() => {});
        }

        // Sync metadata & credentials via Supabase Auth
        const authUserUpdates: any = {
            data: {
                full_name: updates.fullName,
                school: updates.school,
                regency: updates.regency,
                nip: updates.nip,
                nipType: updates.nipType,
                headmasterName: updates.headmasterName,
                headmasterNip: updates.headmasterNip,
                headmasterNipType: updates.headmasterNipType,
            }
        };

        if (updates.email && updates.email.trim()) {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user && userData.user.email !== updates.email.trim()) {
                authUserUpdates.email = updates.email.trim();
            }
        }

        if (updates.password && updates.password.trim().length > 0) {
            authUserUpdates.password = updates.password.trim();
        }

        const { error: authError } = await supabase.auth.updateUser(authUserUpdates);
        if (authError) {
            console.warn("Auth user metadata sync warning:", authError.message);
        }
    }

    async getAllUsers(): Promise<UserProfile[]> {
        await this._verifyRole(['super_admin']);

        const { data: profiles, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        
        return profiles.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            fullName: p.full_name as string,
            accountType: p.role as AccountType,
            school: p.school as string,
            email: '-',
            isPremium: p.is_premium as boolean | undefined
        }));
    }

    async updateUserRole(userId: string, newRole: AccountType, newSchool: string, isPremium?: boolean): Promise<void> {
        await this._verifyRole(['super_admin']);

        const updateData: any = { role: newRole, school: newSchool };
        if (isPremium !== undefined) {
            updateData.is_premium = isPremium;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
        
        if (error) throw error;
    }
}

export const authService = new AuthService();
