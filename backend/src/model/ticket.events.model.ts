export interface TicketEvents  {
    id: string,
    ticketId: string,
    actorId: string | null,
    eventType: string,
    oldValue: string | null,
    newValue: string | null
}

export interface CreateEventInput {
    ticketId: string,
    actorId: string | null,
    eventType: string,
    oldValue: string | null,
    newValue: string | null
}

export type PublicTicketEvents = TicketEvents;


export interface TicketEventsRow {
    id_event: string, 
    ticket_id: string,
    actor_id: string | null,
    event_type: string,
    old_value: string | null,
    new_value: string | null
}

export function rowToTicketEvents(row: TicketEventsRow): TicketEvents {
    return {
        id: row.id_event,
        ticketId: row.ticket_id,
        actorId: row.actor_id,
        eventType: row.event_type,
        oldValue: row.old_value,
        newValue: row.new_value,
    }
}

export function toPublicTicketEvents(ticketEvents: TicketEvents): PublicTicketEvents {
    const{...publicTicketEvents} = ticketEvents;
    return publicTicketEvents;
}