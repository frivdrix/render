import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';

const router = Router();

// GET settings
router.get('/', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    success: true,
    settings: {
      ...settings,
      googleClientSecret: settings.googleClientSecret ? '••••••••' : '',
    },
  });
});

// PUT update settings
router.put('/', (req: Request, res: Response) => {
  try {
    const { googleClientId, googleClientSecret, googleRedirectUri, appBaseUrl, trackingDomain, globalDeliverabilitySafety } = req.body;

    const updates: Record<string, any> = {};
    if (googleClientId !== undefined) updates.googleClientId = googleClientId.trim();
    if (googleClientSecret && googleClientSecret !== '••••••••') updates.googleClientSecret = googleClientSecret.trim();
    if (googleRedirectUri !== undefined) updates.googleRedirectUri = googleRedirectUri.trim();
    if (appBaseUrl !== undefined) updates.appBaseUrl = appBaseUrl.trim();
    if (trackingDomain !== undefined) updates.trackingDomain = trackingDomain.trim();
    if (globalDeliverabilitySafety !== undefined) updates.globalDeliverabilitySafety = Boolean(globalDeliverabilitySafety);

    const updated = db.updateSettings(updates);
    res.json({
      success: true,
      settings: {
        ...updated,
        googleClientSecret: updated.googleClientSecret ? '••••••••' : '',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
