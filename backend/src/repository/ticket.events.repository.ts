import { Pool, PoolClient } from "pg";
import { pool } from "../config/db.config";
import { CreateEventInput, rowToTicketEvents, TicketEvents } from "../model/ticket.events.model";

const COLUMNS = 'id_event, ticket_id, actor_id, event_type, old_value, new_value'

export const ticketEventsRepository = { 
    async create(event: CreateEventInput, db: Pool | PoolClient = pool) {
        await db.query(
            `insert into ticket_events(ticket_id, actor_id, event_type, old_value, new_value)
            values ($1, $2, $3, $4, $5)`,
            [event.ticketId, event.actorId, event.eventType, event.oldValue, event.newValue],
        );
    },

    async getEvents(ticketId: string): Promise<TicketEvents[]> {
       const {rows} = await pool.query(
            `select ${COLUMNS} from ticket_events
            where ticket_id = $1 order by created_at desc`,
            [ticketId],
        );

        return rows.map(rowToTicketEvents);
    },
};