import { FastifyInstance } from "fastify"
import { z } from 'zod'
import { knex } from "../database"
import { randomUUID } from "crypto"
import { checkSessionIdExists } from "../middlewares/check-session-id-exists"

export async function transactionsRoutes(app: FastifyInstance) {
    app.get('/', {
        preHandler: [checkSessionIdExists]
    }, async (request, reply) => {
        checkSessionIdExists(request, reply)
        const { sessionId } = request.cookies

        const transactions = await knex('transactions').where('session_id', sessionId).select()

        return reply.status(200).send({ transactions })
    })

    app.get('/:id', {
        preHandler: [checkSessionIdExists]
    }, async (request, reply) => {
        const { sessionId } = request.cookies

        const getTransactionParamsSchema = z.object({
            id: z.string().uuid(),
        })
        const { id } = getTransactionParamsSchema.parse(request.params);
        const transaction = await knex('transactions').where({
            session_id: sessionId,
            id
        }).first()

        return reply.status(200).send({ transaction })
    })

    app.get('/summary', {
        preHandler: [checkSessionIdExists]
    }, async (request, reply) => {
        const { sessionId } = request.cookies

        const summary = await knex('transactions').where('session_id', sessionId).sum('amount', { as: 'amount' }).first()

        return reply.status(200).send({ summary })

    })

    app.post('/', async (request, reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit'])
        })

        const { title, amount, type } = createTransactionBodySchema.parse(request.body)

        let sessionId = request.cookies.sessionId

        if (!sessionId) {
            sessionId = randomUUID()

            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
            })
        }

        await knex('transactions').insert({
            id: crypto.randomUUID(),
            title,
            amount: type == 'credit' ? amount : amount * -1,
            session_id: sessionId
        })

        return reply.status(201).send()
    })

    app.put('/:id', async (request, reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit'])
        })

        const body = createTransactionBodySchema.safeParse(request.body)
        if (!body.success) {
            let messageError = ""
            if (body.error.errors[0].path.at(0) == "amount") {
                messageError = "Amount inválido"
            }
            return reply.status(400).send(messageError)
        }
        const { title, amount, type } = body.data;

        const getTransactionParamsSchema = z.object({
            id: z.string().uuid(),
        })
        const { id } = getTransactionParamsSchema.parse(request.params);

        let sessionId = request.cookies.sessionId

        if (!sessionId) {
            sessionId = randomUUID()
            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
            })
        }

        const updatedTransaction = await knex('transactions')
            .returning('*')
            .update({
                title,
                amount: type == 'credit' ? amount : amount * -1,
            }, '*').where('id', id)
        console.log();


        return reply.status(200).send({ transaction: updatedTransaction[0] })
    })
}