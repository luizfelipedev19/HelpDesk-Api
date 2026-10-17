"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketPriority = exports.TicketStatus = exports.TicketSource = void 0;
exports.rowToTicket = rowToTicket;
exports.toPublicTicket = toPublicTicket;
var TicketSource;
(function (TicketSource) {
    TicketSource["Manual"] = "MANUAL";
})(TicketSource || (exports.TicketSource = TicketSource = {}));
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["Aberto"] = "ABERTO";
    TicketStatus["EmAtendimento"] = "EM_ATENDIMENTO";
    TicketStatus["AguardandoCliente"] = "AGUARDANDO_CLIENTE";
    TicketStatus["Resolvido"] = "RESOLVIDO";
    TicketStatus["Fechado"] = "FECHADO";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var TicketPriority;
(function (TicketPriority) {
    TicketPriority["Baixa"] = "BAIXA";
    TicketPriority["Media"] = "MEDIA";
    TicketPriority["Alta"] = "ALTA";
    TicketPriority["Urgente"] = "URGENTE";
})(TicketPriority || (exports.TicketPriority = TicketPriority = {}));
function rowToTicket(row) {
    return {
        id: row.id_ticket,
        companyId: row.company_id,
        subject: row.subject,
        description: row.description,
        status: row.status,
        priority: row.priority,
        source: row.source,
        categoryId: row.category_id,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        contactEmail: row.contact_email,
        createdBy: row.created_by,
        assignedTo: row.assigned_to
    };
}
function toPublicTicket(ticket) {
    const { ...publicTicket } = ticket;
    return publicTicket;
}
