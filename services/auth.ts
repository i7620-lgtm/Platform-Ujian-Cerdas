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
        // Local cache fallback for instant offline/speed retrieval
        let cachedData: any = {};
        try {
            const raw = localStorage.getItem(`profile_extended_${session.user.id}`);
            if (raw) cachedData = JSON.parse(raw);
        } catch {}

        return {
            id: session.user.id,
            fullName: profile.full_name,
            accountType: profile.role as AccountType,
            school: profile.school,
            regency: profile.regency,
            nip: profile.nip || meta.nip || cachedData.nip || '',
            nipType: (profile.nip_type || meta.nipType || cachedData.nipType || 'NIP') as 'NIP' | 'NIPPPK',
            headmasterName: profile.headmaster_name || meta.headmasterName || cachedData.headmasterName || '',
            headmasterNip: profile.headmaster_nip || meta.headmasterNip || cachedData.headmasterNip || '',
            headmasterNipType: (profile.headmaster_nip_type || meta.headmasterNipType || cachedData.headmasterNipType || 'NIP') as 'NIP' | 'NIPPPK',
            email: session.user.email,
            isPremium: profile.is_premium,

            // Instansi & Kop Sekolah
            dinasPendidikan: profile.dinas_pendidikan || meta.dinasPendidikan || cachedData.dinasPendidikan || 'DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA',
            npsn: profile.npsn || meta.npsn || cachedData.npsn || '',
            alamatSekolah: profile.alamat_sekolah || meta.alamatSekolah || cachedData.alamatSekolah || '',
            desaKelurahan: profile.desa_kelurahan || meta.desaKelurahan || cachedData.desaKelurahan || '',
            kecamatan: profile.kecamatan || meta.kecamatan || cachedData.kecamatan || '',
            provinsi: profile.provinsi || meta.provinsi || cachedData.provinsi || 'Bali',
            kodePos: profile.kode_pos || meta.kodePos || cachedData.kodePos || '',
            emailSekolah: profile.email_sekolah || meta.emailSekolah || cachedData.emailSekolah || '',
            teleponSekolah: profile.telepon_sekolah || meta.teleponSekolah || cachedData.teleponSekolah || '',
            websiteSekolah: profile.website_sekolah || meta.websiteSekolah || cachedData.websiteSekolah || '',
            faksimile: profile.faksimile || meta.faksimile || cachedData.faksimile || '',
            logoSekolahUrl: profile.logo_sekolah_url || meta.logoSekolahUrl || cachedData.logoSekolahUrl || '',
            logoDinasUrl: profile.logo_dinas_url || meta.logoDinasUrl || cachedData.logoDinasUrl || '',
            isAksaraBaliActive: profile.is_aksara_bali_active ?? meta.isAksaraBaliActive ?? cachedData.isAksaraBaliActive ?? true,
            aksaraBaliPemda: profile.aksara_bali_pemda || meta.aksaraBaliPemda || cachedData.aksaraBaliPemda || '',
            aksaraBaliDinas: profile.aksara_bali_dinas || meta.aksaraBaliDinas || cachedData.aksaraBaliDinas || '',
            aksaraBaliSekolah: profile.aksara_bali_sekolah || meta.aksaraBaliSekolah || cachedData.aksaraBaliSekolah || '',
            aksaraBaliAlamat: profile.aksara_bali_alamat || meta.aksaraBaliAlamat || cachedData.aksaraBaliAlamat || '',
            kopDividerStyle: profile.kop_divider_style || meta.kopDividerStyle || cachedData.kopDividerStyle || 'double',
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
        const dbUpdates: Record<string, any> = {};
        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.school !== undefined) dbUpdates.school = updates.school;
        if (updates.regency !== undefined) dbUpdates.regency = updates.regency;
        if (updates.nip !== undefined) dbUpdates.nip = updates.nip;
        if (updates.nipType !== undefined) dbUpdates.nip_type = updates.nipType;
        if (updates.headmasterName !== undefined) dbUpdates.headmaster_name = updates.headmasterName;
        if (updates.headmasterNip !== undefined) dbUpdates.headmaster_nip = updates.headmasterNip;
        if (updates.headmasterNipType !== undefined) dbUpdates.headmaster_nip_type = updates.headmasterNipType;

        // Custom Kop Sekolah fields for DB table (if table has these columns)
        if (updates.dinasPendidikan !== undefined) dbUpdates.dinas_pendidikan = updates.dinasPendidikan;
        if (updates.npsn !== undefined) dbUpdates.npsn = updates.npsn;
        if (updates.alamatSekolah !== undefined) dbUpdates.alamat_sekolah = updates.alamatSekolah;
        if (updates.desaKelurahan !== undefined) dbUpdates.desa_kelurahan = updates.desaKelurahan;
        if (updates.kecamatan !== undefined) dbUpdates.kecamatan = updates.kecamatan;
        if (updates.provinsi !== undefined) dbUpdates.provinsi = updates.provinsi;
        if (updates.kodePos !== undefined) dbUpdates.kode_pos = updates.kodePos;
        if (updates.emailSekolah !== undefined) dbUpdates.email_sekolah = updates.emailSekolah;
        if (updates.teleponSekolah !== undefined) dbUpdates.telepon_sekolah = updates.teleponSekolah;
        if (updates.websiteSekolah !== undefined) dbUpdates.website_sekolah = updates.websiteSekolah;
        if (updates.faksimile !== undefined) dbUpdates.faksimile = updates.faksimile;
        if (updates.logoSekolahUrl !== undefined) dbUpdates.logo_sekolah_url = updates.logoSekolahUrl;
        if (updates.logoDinasUrl !== undefined) dbUpdates.logo_dinas_url = updates.logoDinasUrl;
        if (updates.isAksaraBaliActive !== undefined) dbUpdates.is_aksara_bali_active = updates.isAksaraBaliActive;
        if (updates.aksaraBaliPemda !== undefined) dbUpdates.aksara_bali_pemda = updates.aksaraBaliPemda;
        if (updates.aksaraBaliDinas !== undefined) dbUpdates.aksara_bali_dinas = updates.aksaraBaliDinas;
        if (updates.aksaraBaliSekolah !== undefined) dbUpdates.aksara_bali_sekolah = updates.aksaraBaliSekolah;
        if (updates.aksaraBaliAlamat !== undefined) dbUpdates.aksara_bali_alamat = updates.aksaraBaliAlamat;
        if (updates.kopDividerStyle !== undefined) dbUpdates.kop_divider_style = updates.kopDividerStyle;

        // Save immediately to local persistent cache for zero-latency retrieval
        try {
            const cacheKey = `profile_extended_${id}`;
            const existingRaw = localStorage.getItem(cacheKey);
            const currentCache = existingRaw ? JSON.parse(existingRaw) : {};
            localStorage.setItem(cacheKey, JSON.stringify({ ...currentCache, ...updates }));
        } catch (e) {
            console.warn("Local storage cache warning:", e);
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update(dbUpdates)
                .eq('id', id);
            if (error) {
                // If custom columns don't exist in SQL profiles table, fallback to core fields
                const { 
                    nip, nip_type, headmaster_name, headmaster_nip, headmaster_nip_type,
                    dinas_pendidikan, npsn, alamat_sekolah, desa_kelurahan, kecamatan,
                    provinsi, kode_pos, email_sekolah, telepon_sekolah, website_sekolah,
                    faksimile, logo_sekolah_url, logo_dinas_url, is_aksara_bali_active,
                    aksara_bali_pemda, aksara_bali_dinas, aksara_bali_sekolah, aksara_bali_alamat,
                    kop_divider_style,
                    ...baseUpdates 
                } = dbUpdates;
                await supabase.from('profiles').update(baseUpdates).eq('id', id);
            }
        } catch {
            const baseUpdates: any = {
                full_name: updates.fullName,
                school: updates.school,
                regency: updates.regency,
            };
            await supabase.from('profiles').update(baseUpdates).eq('id', id).catch(() => {});
        }

        // Sync metadata & credentials via Supabase Auth (supports nested JSON attributes flawlessly)
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
                dinasPendidikan: updates.dinasPendidikan,
                npsn: updates.npsn,
                alamatSekolah: updates.alamatSekolah,
                desaKelurahan: updates.desaKelurahan,
                kecamatan: updates.kecamatan,
                provinsi: updates.provinsi,
                kodePos: updates.kodePos,
                emailSekolah: updates.emailSekolah,
                teleponSekolah: updates.teleponSekolah,
                websiteSekolah: updates.websiteSekolah,
                faksimile: updates.faksimile,
                logoSekolahUrl: updates.logoSekolahUrl,
                logoDinasUrl: updates.logoDinasUrl,
                isAksaraBaliActive: updates.isAksaraBaliActive,
                aksaraBaliPemda: updates.aksaraBaliPemda,
                aksaraBaliDinas: updates.aksaraBaliDinas,
                aksaraBaliSekolah: updates.aksaraBaliSekolah,
                aksaraBaliAlamat: updates.aksaraBaliAlamat,
                kopDividerStyle: updates.kopDividerStyle,
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
