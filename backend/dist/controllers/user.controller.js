"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const user_service_1 = require("../service/user.service");
const user_schema_1 = require("../schema/user.schema");
exports.userController = {
    async createUser(req, res) {
        const body = user_schema_1.createUserSchema.parse(req.body);
        const user = await user_service_1.userService.register(body, req.user.companyId);
        res.status(201).json(user);
    },
    async list(req, res) {
        const { limit, offset } = user_schema_1.listUsersQuerySchema.parse(req.query);
        res.json(await user_service_1.userService.list(req.user.companyId, limit, offset));
    },
    async getById(req, res) {
        const { id } = user_schema_1.userIdParamsSchema.parse(req.params);
        res.json(await user_service_1.userService.getById(id, req.user.companyId));
    },
    async desativarUser(req, res) {
        const { id } = user_schema_1.userIdParamsSchema.parse(req.params);
        await user_service_1.userService.desactive(id, req.user.companyId);
        res.status(204).send();
    }
};
