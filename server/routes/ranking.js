const express = require('express');
const router = express.Router();
const rankingService = require('../services/rankingService');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/ranking
 * Public leaderboard — no auth required
 * Query: period=all-time|weekly|monthly  limit=20  offset=0
 */
router.get('/', async (req, res) => {
  try {
    const { period = 'all-time', limit = 20, offset = 0 } = req.query;
    const validPeriods = ['all-time', 'weekly', 'monthly'];

    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Período inválido. Use: all-time, weekly ou monthly.' });
    }

    const leaderboard = await rankingService.getLeaderboard({
      period,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});

/**
 * GET /api/ranking/players
 * List all identities (auth required — host or admin)
 * Query: search  createdBy  limit  offset
 */
router.get('/players', authenticateToken, requireRole(['admin', 'host']), async (req, res) => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query;

    const createdBy = req.user.role === 'admin' ? null : req.user.userId;

    const players = await rankingService.listIdentities({
      search,
      createdBy,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ players });
  } catch (error) {
    console.error('Erro ao listar jogadores:', error);
    res.status(500).json({ error: 'Erro ao listar jogadores.' });
  }
});

/**
 * GET /api/ranking/:handle
 * Public player profile
 */
router.get('/:handle', async (req, res) => {
  try {
    const handle = req.params.handle.replace(/^@/, '');
    const profile = await rankingService.getPlayerProfile(handle);

    if (!profile) {
      return res.status(404).json({ error: 'Jogador não encontrado.' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil do jogador.' });
  }
});

/**
 * POST /api/ranking/players
 * Create a new player identity (host or admin)
 * Body: { handle, displayName }
 */
router.post('/players', authenticateToken, requireRole(['admin', 'host']), async (req, res) => {
  try {
    const { handle, displayName } = req.body;

    if (!handle || !displayName) {
      return res.status(400).json({ error: 'handle e displayName são obrigatórios.' });
    }

    const identity = await rankingService.createPlayerIdentity(handle, displayName, req.user.userId);

    res.status(201).json({
      success: true,
      message: `Jogador @${identity.handle} criado com sucesso.`,
      player: identity
    });
  } catch (error) {
    console.error('Erro ao criar jogador:', error);
    const status = error.message.includes('já está em uso') || error.message.includes('inválido') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * PUT /api/ranking/players/:id
 * Update handle or display name (admin or creating host)
 * Body: { handle?, displayName? }
 */
router.put('/players/:id', authenticateToken, requireRole(['admin', 'host']), async (req, res) => {
  try {
    const { handle, displayName } = req.body;
    const updated = await rankingService.updatePlayerIdentity(
      parseInt(req.params.id),
      { handle, displayName },
      req.user.userId,
      req.user.role
    );

    res.json({
      success: true,
      message: 'Jogador atualizado com sucesso.',
      player: updated
    });
  } catch (error) {
    console.error('Erro ao atualizar jogador:', error);
    const status = error.message.includes('permissão') ? 403
      : error.message.includes('não encontrado') ? 404
      : error.message.includes('uso') || error.message.includes('inválido') ? 400
      : 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * DELETE /api/ranking/players/:id
 * Remove player identity — admin only
 */
router.delete('/players/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await rankingService.deleteIdentity(parseInt(req.params.id));
    res.json({ success: true, message: 'Jogador removido do ranking.' });
  } catch (error) {
    console.error('Erro ao remover jogador:', error);
    res.status(500).json({ error: 'Erro ao remover jogador.' });
  }
});

module.exports = router;
