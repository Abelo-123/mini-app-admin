/**
 * Admin Routes — Paxyo Admin Panel Backend
 *
 * Provides JWT-like token auth and CRUD endpoints for:
 * - Dashboard statistics
 * - User management (list, balance, role)
 * - Order history (all users)
 * - Deposit history (all users)
 * - Settings management
 */
import { Router } from 'express';
import crypto from 'crypto';
import pool from '../config/database.js';

const router = Router();

// ─── Simple Token Auth ──────────────────────────────────────────
// In production, use a proper JWT library. This is a lightweight approach.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'paxyo2026';
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

// Store active tokens in memory (cleared on server restart)
const activeTokens = new Set();

function generateToken() {
    const token = crypto.randomBytes(48).toString('hex');
    activeTokens.add(token);
    return token;
}

function requireAdmin(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = auth.slice(7);
    if (!activeTokens.has(token)) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next();
}

// ─── Login ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = generateToken();
        return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// Apply admin auth to all routes below
router.use(requireAdmin);

// ─── Dashboard ──────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
    try {
        const [[{ totalUsers }]] = await pool.execute('SELECT COUNT(*) as totalUsers FROM auth');
        const [[{ totalOrders }]] = await pool.execute('SELECT COUNT(*) as totalOrders FROM orders');
        const [[{ totalDeposits }]] = await pool.execute("SELECT COUNT(*) as totalDeposits FROM deposits WHERE status IN ('completed', 'success')");
        const [[{ totalRevenue }]] = await pool.execute("SELECT COALESCE(SUM(amount), 0) as totalRevenue FROM deposits WHERE status IN ('completed', 'success')");

        const [recentOrders] = await pool.execute(`
            SELECT o.*, a.username, a.first_name 
            FROM orders o 
            LEFT JOIN auth a ON o.user_id = a.tg_id 
            ORDER BY o.created_at DESC LIMIT 10
        `);

        const [recentDeposits] = await pool.execute(`
            SELECT d.*, a.username, a.first_name 
            FROM deposits d 
            LEFT JOIN auth a ON d.user_id = a.tg_id 
            ORDER BY d.created_at DESC LIMIT 10
        `);

        return res.json({
            totalUsers: Number(totalUsers),
            totalOrders: Number(totalOrders),
            totalDeposits: Number(totalDeposits),
            totalRevenue: Number(totalRevenue),
            recentOrders,
            recentDeposits,
        });
    } catch (err) {
        console.error('[admin/dashboard]', err);
        return res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// ─── Users ──────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause = 'WHERE tg_id LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ?';
            const s = `%${search}%`;
            params = [s, s, s, s];
        }

        const [[{ total }]] = await pool.execute(
            `SELECT COUNT(*) as total FROM auth ${whereClause}`, params
        );

        const [users] = await pool.execute(
            `SELECT * FROM auth ${whereClause} ORDER BY last_login DESC LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        );

        return res.json({ users, total: Number(total) });
    } catch (err) {
        console.error('[admin/users]', err);
        return res.status(500).json({ error: 'Failed to load users' });
    }
});

router.post('/users/balance', async (req, res) => {
    try {
        const { tg_id, amount } = req.body;
        if (!tg_id || amount === undefined) {
            return res.status(400).json({ error: 'tg_id and amount are required' });
        }

        await pool.execute('UPDATE auth SET balance = balance + ? WHERE tg_id = ?', [amount, tg_id]);
        const [[user]] = await pool.execute('SELECT balance FROM auth WHERE tg_id = ?', [tg_id]);

        // Log the transaction
        await pool.execute(
            `INSERT INTO transactions (user_id, type, amount, balance_after, reference_type, description, created_at)
             VALUES (?, 'admin_adjustment', ?, ?, 'admin', 'Admin balance adjustment', NOW())`,
            [tg_id, amount, user.balance]
        );

        return res.json({ success: true, newBalance: parseFloat(user.balance) });
    } catch (err) {
        console.error('[admin/users/balance]', err);
        return res.status(500).json({ error: 'Failed to update balance' });
    }
});

router.post('/users/role', async (req, res) => {
    try {
        const { tg_id, role } = req.body;
        if (!tg_id || !role) {
            return res.status(400).json({ error: 'tg_id and role are required' });
        }

        await pool.execute('UPDATE auth SET role = ? WHERE tg_id = ?', [role, tg_id]);
        return res.json({ success: true });
    } catch (err) {
        console.error('[admin/users/role]', err);
        return res.status(500).json({ error: 'Failed to update role' });
    }
});

// ─── Orders ─────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (search) {
            whereClause += ' AND (o.user_id LIKE ? OR a.username LIKE ? OR a.first_name LIKE ? OR o.target_link LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        if (status) {
            whereClause += ' AND o.status = ?';
            params.push(status);
        }

        const [[{ total }]] = await pool.execute(
            `SELECT COUNT(*) as total FROM orders o LEFT JOIN auth a ON o.user_id = a.tg_id ${whereClause}`, params
        );

        const [orders] = await pool.execute(
            `SELECT o.*, a.username, a.first_name 
             FROM orders o 
             LEFT JOIN auth a ON o.user_id = a.tg_id 
             ${whereClause} 
             ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        );

        return res.json({ orders, total: Number(total) });
    } catch (err) {
        console.error('[admin/orders]', err);
        return res.status(500).json({ error: 'Failed to load orders' });
    }
});

// ─── Deposits ───────────────────────────────────────────────────
router.get('/deposits', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (search) {
            whereClause += ' AND (d.user_id LIKE ? OR a.username LIKE ? OR a.first_name LIKE ? OR d.tx_ref LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        if (status) {
            whereClause += ' AND d.status = ?';
            params.push(status);
        }

        const [[{ total }]] = await pool.execute(
            `SELECT COUNT(*) as total FROM deposits d LEFT JOIN auth a ON d.user_id = a.tg_id ${whereClause}`, params
        );

        const [deposits] = await pool.execute(
            `SELECT d.*, a.username, a.first_name 
             FROM deposits d 
             LEFT JOIN auth a ON d.user_id = a.tg_id 
             ${whereClause} 
             ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        );

        return res.json({ deposits, total: Number(total) });
    } catch (err) {
        console.error('[admin/deposits]', err);
        return res.status(500).json({ error: 'Failed to load deposits' });
    }
});

// ─── Settings ───────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

        return res.json({
            rate_multiplier: settings.rate_multiplier || '55',
            discount_percent: settings.discount_percent || '0',
            holiday_name: settings.holiday_name || '',
            maintenance_mode: settings.maintenance_mode || '0',
            user_can_order: settings.user_can_order || '1',
            marquee_text: settings.marquee_text || '',
        });
    } catch (err) {
        console.error('[admin/settings]', err);
        return res.status(500).json({ error: 'Failed to load settings' });
    }
});

router.post('/settings', async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'key is required' });

        // Upsert: INSERT ... ON DUPLICATE KEY UPDATE
        await pool.execute(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [key, value, value]
        );

        return res.json({ success: true });
    } catch (err) {
        console.error('[admin/settings]', err);
        return res.status(500).json({ error: 'Failed to update setting' });
    }
});

export default router;
