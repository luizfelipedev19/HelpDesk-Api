"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superadminRouter = exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', auth_controller_1.authController.loginAgent);
exports.superadminRouter = (0, express_1.Router)();
exports.superadminRouter.post('/login', auth_controller_1.authController.loginAdmin);
