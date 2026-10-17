"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../service/auth.service");
const auth_schema_1 = require("../schema/auth.schema");
exports.authController = {
    async loginAgent(req, res) {
        const { email, password } = auth_schema_1.loginSchema.parse(req.body);
        res.json(await auth_service_1.authService.login(email, password, ['atendente']));
    },
    async loginAdmin(req, res) {
        const { email, password } = auth_schema_1.loginSchema.parse(req.body);
        console.log('loginAdmin called with email:', email);
        console.log('loginAdmin called with password:', password); // Debugging line
        res.json(await auth_service_1.authService.login(email, password, ['admin']));
    },
};
