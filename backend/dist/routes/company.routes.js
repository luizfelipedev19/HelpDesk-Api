"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companiesRouter = void 0;
const express_1 = require("express");
const company_controller_1 = require("../controllers/company.controller");
exports.companiesRouter = (0, express_1.Router)();
exports.companiesRouter.post('/:id', company_controller_1.companyController.create);
