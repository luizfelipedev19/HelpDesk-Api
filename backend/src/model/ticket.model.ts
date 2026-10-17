export enum TicketSource {
    Manual = 'MANUAL'
}

export enum TicketStatus {
    Aberto = 'ABERTO',
    EmAtendimento = 'EM_ATENDIMENTO',
    AguardandoCliente = 'AGUARDANDO_CLIENTE',
    Resolvido = 'RESOLVIDO',
    Fechado = 'FECHADO'
}

export enum TicketPriority {
    Baixa = 'BAIXA',
    Media = 'MEDIA',
    Alta = 'ALTA',
    Urgente = 'URGENTE'
}

export interface Ticket {
    id: string;
    companyId: string;
    categoryId: string;
    createdBy: string;
    assignedTo: string | null;
    subject: string;
    description: string;
    status: string;
    priority: string;
    source: TicketSource;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
}

export type PublicTicket = Ticket;

export interface TicketChange {
    field: string;
    eventType: string;
    oldValue: string | null;
    newValue: string | null;
}

const EVENT_TYPE_BY_FIELD = {
    status: 'status_changed',
    priority: 'priority_changed',
    assignedTo: 'assigned',
} as const;

const TRACKED_FIELDS = Object.keys(EVENT_TYPE_BY_FIELD) as (keyof typeof EVENT_TYPE_BY_FIELD)[];

export function diffTicket(before: Ticket, data: UpdateTicketInput): TicketChange[] {
    const changes: TicketChange[] = [];

    for (const field of TRACKED_FIELDS) {
        const newValue = data[field];

        if(newValue === undefined) continue //campo não veio nessa requisição


        const oldValue = before[field];

        if(oldValue !== newValue) {
            changes.push({ 
                field,
                eventType: EVENT_TYPE_BY_FIELD[field],
                oldValue: oldValue ?? null,
                newValue: newValue ?? null, 
            });
        }
    }

    return changes;
}

export interface CreateTicketInput {
    companyId: string;
    categoryId: string;
    createdBy: string;
    priority: TicketPriority;
    source: TicketSource;
    assignedTo: string | null;
    subject: string;
    description: string;
    status: TicketStatus;
    contactPhone?: string;
    contactName?: string;
    contactEmail?: string;
}

export interface UpdateTicketInput {
    subject?: string;
    description?: string;
    status?: TicketStatus;
    priority?: TicketPriority
    source?: TicketSource;
    assignedTo?: string;
    contactPhone?: string;
    contactName?: string;
    contactEmail?: string;
}

export interface TicketRow {
    id_ticket: string;
    company_id: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    source: TicketSource;
    category_id: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    created_by: string;
    assigned_to: string | null;
}

export function rowToTicket(row: TicketRow): Ticket {
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

    }
}

export function toPublicTicket(ticket: Ticket): PublicTicket {
    const{...publicTicket} = ticket;
    return publicTicket;
}