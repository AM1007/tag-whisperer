import { Router } from 'express';
import { subscribe, confirm, unsubscribeHandler } from '../controllers/subscriptionController.js';

const router = Router();

router.post('/subscribe', subscribe);
router.get('/confirm/:token', confirm);
router.get('/unsubscribe/:token', unsubscribeHandler);

export default router;