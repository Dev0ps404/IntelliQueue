import express from "express";
import {
  createToken,
  getMyTokenQr,
  getMyToken,
  getQueue,
} from "../controllers/tokenController.js";
import { authenticate } from "../middleware/auth.js";
import { tokenCreateLimiter } from "../middleware/rateLimiters.js";
import { validateRequest } from "../middleware/validate.js";
import {
  createTokenSchema,
  tokenNumberParamSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.post(
  "/create",
  tokenCreateLimiter,
  authenticate(false),
  validateRequest(createTokenSchema),
  createToken,
);
router.get("/queue", authenticate(false), getQueue);
router.get(
  "/my/:tokenNumber",
  authenticate(false),
  validateRequest(tokenNumberParamSchema),
  getMyToken,
);
router.get(
  "/my/:tokenNumber/qr",
  authenticate(false),
  validateRequest(tokenNumberParamSchema),
  getMyTokenQr,
);

export default router;
