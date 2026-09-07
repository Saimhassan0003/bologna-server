const cron               = require('node-cron');
const PostalRequest      = require('../models/PostalRequest');
const Application        = require('../models/Application');
const postalEmailService = require('../utils/postalEmailService');
const emailService       = require('../utils/emailService');

/**
 * Expiration Job
 * Runs every minute to find DOCUMENT_PENDING applications/postal-requests
 * whose deadline has passed and transition them to EXPIRED.
 */
const startExpirationJob = () => {
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Running document deadline expiration check...');
    try {
      const now = new Date();

      // ─── Check PostalRequests ──────────────────────────────────────────────
      const expiredPostal = await PostalRequest.findExpired();

      if (expiredPostal.length > 0) {
        console.log(`[CRON] Found ${expiredPostal.length} expired postal request(s).`);

        for (const req of expiredPostal) {
          await PostalRequest.updateById(req.id, {
            status:    'EXPIRED',
            expiredAt: now
          });

          console.log(`[CRON] ⏰ Postal Expired: ${req.applicationNumber} (student: ${req.studentId})`);

          if (!req.expiryEmailSent) {
            try {
              // Refresh object so emails have the latest status
              const refreshed = await PostalRequest.findById(req.id);
              await Promise.all([
                postalEmailService.notifyAdminExpired(refreshed, refreshed.studentId),
                postalEmailService.notifyStudentExpired(refreshed, refreshed.studentId)
              ]);
              await PostalRequest.updateById(req.id, { expiryEmailSent: true });
              console.log(`[CRON] ✅ Postal expiry emails sent for ${req.applicationNumber}`);
            } catch (mailErr) {
              console.error(`[CRON] ❌ Postal expiry emails failed for ${req.applicationNumber}:`, mailErr.message);
            }
          }
        }
      }

      // ─── Check Applications ────────────────────────────────────────────────
      const expiredApps = await Application.findExpired();

      if (expiredApps.length > 0) {
        console.log(`[CRON] Found ${expiredApps.length} expired application(s).`);

        for (const app of expiredApps) {
          await Application.updateById(app.id, {
            status:    'Rejected',
            expiredAt: now
          });

          console.log(`[CRON] ⏰ Application Expired: ${app.id} (email: ${app.email})`);

          if (!app.expiryEmailSent) {
            try {
              const refreshed = await Application.findById(app.id);
              await Promise.all([
                emailService.notifyAdminApplicationExpired(refreshed),
                emailService.notifyStudentApplicationExpired(refreshed)
              ]);
              await Application.updateById(app.id, { expiryEmailSent: true });
              console.log(`[CRON] ✅ Application expiry emails sent for ${app.email}`);
            } catch (mailErr) {
              console.error(`[CRON] ❌ Application expiry emails failed for ${app.email}:`, mailErr.message);
            }
          }
        }
      }
    } catch (err) {
      console.error('[CRON ERROR] Expiration check failed:', err.message);
    }
  });

  console.log('[CRON] ✅ Expiration background job scheduled (runs every minute).');
};

module.exports = { startExpirationJob };
