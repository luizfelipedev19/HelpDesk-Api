"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use((0, auth_middleware_1.authorize)('admin'));
//rotas do usuário
exports.usersRouter.post('/', user_controller_1.userController.createUser);
exports.usersRouter.get('/', user_controller_1.userController.list);
exports.usersRouter.get('/:id', user_controller_1.userController.getById);
exports.usersRouter.put('/desativar/:id', user_controller_1.userController.desativarUser);
