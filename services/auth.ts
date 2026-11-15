import { supabase } from '../lib/supabase';
import type { TeacherProfile, AccountType, UserProfile } from '../types';

const PROFILE_EXTENDED_PREFIX = 'profile_extended_';
const PROFILE_CORE_COLUMNS = 'id, full_name, role, school, regency, is_premium';
const PROFILE_LIST_COLUMNS = 'id, full_name, role, school, is_premium';

export class AuthService {
    private clearProfileExtendedCache(userId?: string): void {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return;
            if (userId) {
                localStorage.removeItem(`${PROFILE_EXTENDED_PREFIX}${userId}`);
                return;
            }
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(PROFILE_EXTENDED_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        } catch {
            /* ignore localStorage access errors */
        }
    }

    private mapToTeacherProfile(
        userId: string,
        email: string | undefined,
        meta: Record<string, any>,
        profile: Record<string, any>,
        cachedData: Record<string, any> = {}
    ): TeacherProfile {
        return {
            id: userId,
            fullName: profile.full_name,
            accountType: profile.role as AccountType,
            school: profile.school,
            regency: profile.regency,
            nip: profile.nip || meta.nip || cachedData.nip || '',
            nipType: (profile.nip_type || meta.nipType || cachedData.nipType || 'NIP') as 'NIP' | 'NIPPPK',
            headmasterName: profile.headmaster_name || meta.headmasterName || cachedData.headmasterName || '',
            headmasterNip: profile.headmaster_nip || meta.headmasterNip || cachedData.headmasterNip || '',
            headmasterNipType: (profile.headmaster_nip_type || meta.headmasterNipType || cachedData.headmasterNipType || 'NIP') as 'NIP' | 'NIPPPK',
            email,
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

    async getCurrentUser(): Promise<TeacherProfile | null> {
        const auth = supabase.auth;
        const { data: { session }, error: sessionError } = await auth.getSession();

        if (sessionError) {
            if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
                await auth.signOut().catch(() => {});
                this.clearProfileExtendedCache();
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

        const meta = session.user.user_metadata || {};

        if (!profile) {
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: session.user.id,
                    full_name: meta.full_name || meta.name || 'Pengguna',
                    school: '-',
                    regency: '-',
                    role: 'guru'
                })
                .select(PROFILE_CORE_COLUMNS)
                .single();

            if (insertError || !newProfile) return null;
            return this.mapToTeacherProfile(session.user.id, session.user.email, meta, newProfile);
        }

        // Local cache fallback for instant offline/speed retrieval
        let cachedData: Record<string, any> = {};
        try {
            const raw = localStorage.getItem(`${PROFILE_EXTENDED_PREFIX}${session.user.id}`);
            if (raw) cachedData = JSON.parse(raw);
        } catch {
            /* ignore malformed cache */
        }

        return this.mapToTeacherProfile(session.user.id, session.user.email, meta, profile, cachedData);
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

        let profile = await this.getCurrentUser();
        if (!profile) {
            await new Promise(r => setTimeout(r, 150));
            profile = await this.getCurrentUser();
        }

        if (!profile) throw new Error('Gagal memuat profil pengguna. Silakan hubungi admin.');
        return profile;
    }

    async signOut() {
        await supabase.auth.signOut();
        this.clearProfileExtendedCache();
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
            const cacheKey = `${PROFILE_EXTENDED_PREFIX}${id}`;
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
                const baseUpdates: Record<string, any> = {};
                if (dbUpdates.full_name !== undefined) baseUpdates.full_name = dbUpdates.full_name;
                if (dbUpdates.school !== undefined) baseUpdates.school = dbUpdates.school;
                if (dbUpdates.regency !== undefined) baseUpdates.regency = dbUpdates.regency;
                if (Object.keys(baseUpdates).length > 0) {
                    await supabase.from('profiles').update(baseUpdates).eq('id', id);
                }
            }
        } catch {
            try {
                const baseUpdates: Record<string, any> = {};
                if (updates.fullName !== undefined) baseUpdates.full_name = updates.fullName;
                if (updates.school !== undefined) baseUpdates.school = updates.school;
                if (updates.regency !== undefined) baseUpdates.regency = updates.regency;
                if (Object.keys(baseUpdates).length > 0) {
                    await supabase.from('profiles').update(baseUpdates).eq('id', id);
                }
            } catch {
                /* ignore fallback failure */
            }
        }

        // Sync metadata & credentials via Supabase Auth (supports nested JSON attributes flawlessly)
        const authUserUpdates: Record<string, any> = {
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

        const PAGE_SIZE = 1000;
        const allProfiles: Record<string, unknown>[] = [];
        let from = 0;

        while (true) {
            const { data: pageRows, error } = await supabase
                .from('profiles')
                .select(PROFILE_LIST_COLUMNS)
                .order('full_name', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

            if (error) throw error;
            if (!pageRows || pageRows.length === 0) break;

            allProfiles.push(...(pageRows as Record<string, unknown>[]));
            if (pageRows.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        return allProfiles.map((p: Record<string, unknown>) => ({
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

        const updateData: Record<string, any> = { role: newRole, school: newSchool };
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