const cron   = require('node-cron');
const PostalRequest     = require('../models/PostalRequest');
const Application       = require('../models/Application');
const postalEmailService = require('../utils/postalEmailService');
const emailService = require('../utils/emailService');

/**
 * Expiration Job
 * Runs every minute to find DOCUMENT_PENDING applications whose deadline
 * has passed and transition them to EXPIRED.
 */
const startExpirationJob = () => {
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Running document deadline expiration check...');
    try {
      const now = new Date();

      // ─── Check PostalRequests ──────────────────────────────────────────
      const expiredPostal = await PostalRequest.find({
        status:           'DOCUMENT_PENDING',
        documentDeadline: { $lt: now }
      });

      if (expiredPostal.length > 0) {
        console.log(`[CRON] Found ${expiredPostal.length} expired postal request(s).`);

        for (const req of expiredPostal) {
          req.status    = 'EXPIRED';
          req.expiredAt = now;
          await req.save();

          console.log(`[CRON] ⏰ Postal Expired: ${req.applicationNumber} (student: ${req.studentId})`);

          if (!req.expiryEmailSent) {
            try {
              await Promise.all([
                postalEmailService.notifyAdminExpired(req, req.studentId),
                postalEmailService.notifyStudentExpired(req, req.studentId)
              ]);
              req.expiryEmailSent = true;
              await req.save();
              console.log(`[CRON] ✅ Postal expiry emails sent for ${req.applicationNumber}`);
            } catch (mailErr) {
              console.error(`[CRON] ❌ Postal expiry emails failed for ${req.applicationNumber}:`, mailErr.message);
            }
          }
        }
      }

      // ─── Check Applications ────────────────────────────────────────────
      const expiredApps = await Application.find({
        status:           'PendingDocuments',
        documentDeadline: { $lt: now }
      });

      if (expiredApps.length > 0) {
        console.log(`[CRON] Found ${expiredApps.length} expired application(s).`);

        for (const app of expiredApps) {
          app.status    = 'Rejected'; // Mark as rejected due to expired deadline
          app.expiredAt = now;
          await app.save();

          console.log(`[CRON] ⏰ Application Expired: ${app._id} (email: ${app.email})`);

          if (!app.expiryEmailSent) {
            try {
              await Promise.all([
                emailService.notifyAdminApplicationExpired(app),
                emailService.notifyStudentApplicationExpired(app)
              ]);
              app.expiryEmailSent = true;
              await app.save();
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
