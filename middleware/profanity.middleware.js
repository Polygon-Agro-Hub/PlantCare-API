'use strict';

const { getFilter } = require('../services/profanity-filter');

/**
 * Middleware factory that inspects specified body fields for banned/profane words.
 *
 * Example usage:
 * router.post('/add/post', authenticate, upload.single('postimage'), checkProfanity(['heading', 'message']), postsEp.createPost);
 */
const checkProfanity = (fields = []) => {
  return async (req, res, next) => {
    try {
      const filter = await getFilter();

      for (const field of fields) {
        const text = req.body[field];
        if (text && typeof text === 'string' && filter.test(text)) {
          return res.status(422).json({
            status: 'error',
            code: 'PROFANITY_DETECTED',
            message: 'Your message contains prohibited or inappropriate language.',
            field,
          });
        }
      }

      next();
    } catch (err) {
      console.error('[ProfanityMiddleware] Error executing filter check:', err);
      next(); // Don't block requests if filter check encounters an internal exception
    }
  };
};

module.exports = checkProfanity;
