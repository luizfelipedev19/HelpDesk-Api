"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketController = void 0;
const ticket_service_1 = require("../service/ticket.service");
const ticket_schema_1 = require("../schema/ticket.schema");
const app_errors_1 = require("../errors/app-errors");
exports.ticketController = {
    async create(req, res) {
        //valido se existe usuário autenticado
        if (!req.user) {
            throw new app_errors_1.AppError('Não autenticado', 401);
        }
        //capturo o id do usuario e sua empresa
        const { id: userId, companyId } = req.user;
        const body = ticket_schema_1.createTicketSchema.parse(req.body);
        res.status(201).json(await ticket_service_1.ticketService.createTicket({
            ...body,
            companyId: companyId,
            createdBy: userId,
            assignedTo: body.assignedTo ?? null,
        }));
    },
    async findById(req, res) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        res.status(200).json(await ticket_service_1.ticketService.findById(id, req.user.companyId));
    },
    async findAll(req, res) {
        const limiDefault = 50;
        const offsetDefault = 1;
        const limit = req.body | limiDefault;
        const offset = req.body | offsetDefault;
        res.status(200).json(await ticket_service_1.ticketService.findAll(req.user.companyId, limit, offset));
    },
    async update(req, res) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = req.body;
        res.status(201).json(await ticket_service_1.ticketService.updateTicket(id, req.user.companyId, data));
    },
    async delete(req, res) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        res.status(204).json(await ticket_service_1.ticketService.deleteTicket(id, req.user.companyId));
    }
};
