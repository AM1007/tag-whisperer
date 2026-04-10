import { Router } from 'express';
import { subscribe, confirm, unsubscribeHandler, getSubscriptions } from '../controllers/subscriptionController.js';

const router = Router();

router.post('/subscribe', subscribe);
router.get('/confirm/:token', confirm);
router.get('/unsubscribe/:token', unsubscribeHandler);
router.get('/subscriptions', getSubscriptions);

export default router;