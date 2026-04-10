import express from "express";
import {
  advanceQueue,
  getAnalytics,
  getQueueEvents,
  getFlowConfig,
  getLiveQueue,
  getStats,
  patchFlowConfig,
  patchPrioritizeToken,
  patchTokenStatus,
} from "../controllers/adminController.js";
import { authorizeRoles, authenticate } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import {
  paginationQuerySchema,
  prioritizeTokenSchema,
  queueFlowSchema,
  tokenStatusSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.use(authenticate(true), authorizeRoles("admin"));

router.get("/queue", getLiveQueue);
router.patch(
  "/tokens/:tokenId/status",
  validateRequest(tokenStatusSchema),
  patchTokenStatus,
);
router.patch(
  "/tokens/:tokenId/prioritize",
  validateRequest(prioritizeTokenSchema),
  patchPrioritizeToken,
);
router.get("/stats", getStats);
router.get("/analytics", getAnalytics);
router.get("/events", validateRequest(paginationQuerySchema), getQueueEvents);
router.get("/flow", getFlowConfig);
router.patch("/flow", validateRequest(queueFlowSchema), patchFlowConfig);
router.post("/flow/advance", advanceQueue);

export default router;
