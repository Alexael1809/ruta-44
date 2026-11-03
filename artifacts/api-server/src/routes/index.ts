import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import marketplaceRouter from "./marketplace";
import uploadRouter from "./upload";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(marketplaceRouter);
router.use(uploadRouter);
router.use(importRouter);

export default router;
