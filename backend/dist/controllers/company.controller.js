"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyController = void 0;
const company_service_1 = require("../service/company.service");
const company_schema_1 = require("../schema/company.schema");
exports.companyController = {
    async create(req, res) {
        const body = company_schema_1.createCompanySchema.parse(req.body);
        res.status(201).json(await company_service_1.companyService.register(body));
    },
};
