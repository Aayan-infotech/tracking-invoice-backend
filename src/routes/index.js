import express from 'express';
import authRoutes from './auth.route.js';
import userRoutes from './users.route.js';
import projectRoutes from './projects.route.js';
import pagesRoutes from './pages.route.js'; 

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/pages', pagesRoutes);


export default router;