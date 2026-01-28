
// File ini dipindahkan ke api/_db.ts untuk mencegah konflik routing Vercel.
// Jangan gunakan file ini.
export default (req: any, res: any) => res.status(404).json({ error: "Endpoint deprecated. Internal Use Only." });
