import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import channelsRouter from "./channels";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(channelsRouter);
router.use(messagesRouter);

export default router;
