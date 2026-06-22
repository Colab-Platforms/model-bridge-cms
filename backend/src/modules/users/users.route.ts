import { Router } from "express";
import auth from "../../shared/middlewares/auth.js";
import { getCurrentUserController } from "./users.controller.js";

const router = Router();

router.get("/me", auth("USER", "ADMIN", "SUPERADMIN"), getCurrentUserController);

export default router;
