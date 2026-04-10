import { Router } from 'express';
import { subscribe, confirm, unsubscribeHandler, getSubscriptions } from '../controllers/subscriptionController.js';
import { apiKeyAuth } from '../middleware/apiKey.js';

const router = Router();

router.post('/subscribe', apiKeyAuth, subscribe);
router.get('/confirm/:token', confirm);
router.get('/unsubscribe/:token', unsubscribeHandler);
router.get('/subscriptions', apiKeyAuth, getSubscriptions);

export default router;