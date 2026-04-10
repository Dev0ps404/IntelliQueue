import express from "express";
import { login, me, register } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { authLoginSchema, authRegisterSchema } from "../validation/schemas.js";

const router = express.Router();

router.post("/register", validateRequest(authRegisterSchema), register);
router.post("/login", validateRequest(authLoginSchema), login);
router.get("/me", authenticate(true), me);

export default router;
