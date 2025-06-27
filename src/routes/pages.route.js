import { Router } from "express";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { PageSchema } from "../validators/pageValidator.js";
import { getAllPages, addPage, updatePage, deletePage, getPage } from "../controllers/page.controller.js";



const router = Router();

router.get('/', verifyJWT, getAllPages);
router.post('/', verifyJWT, validateRequest(PageSchema), addPage);
router.put('/:pageId', verifyJWT, validateRequest(PageSchema), updatePage);
router.delete('/:pageId', verifyJWT, deletePage);


router.get('/get-page', getPage);



export default router;
