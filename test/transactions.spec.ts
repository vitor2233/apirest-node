import { expect, it, beforeAll, afterAll, describe, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../src/app'

describe('Rotas transaction', () => {
    beforeAll(async () => {
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach(() => {
        execSync('npm run knex migrate:rollback --all')
        execSync('npm run knex migrate:latest')
    })

    it('should be able to create a new transaction', async () => {
        //Fazer chamada http para criar transação

        const response = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 50,
                type: 'credit'
            })

        expect(response.statusCode).toEqual(201)
    })

    it('should be able to list all transactions', async () => {
        const createTransactionResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 50,
                type: 'credit'
            })

        const cookies = createTransactionResponse.get('Set-Cookie')

        const listTransactionsResponse = await request(app.server)
            .get('/transactions')
            .set('Cookie', cookies)
            .send()

        expect(listTransactionsResponse.body.transactions).toEqual([
            expect.objectContaining({
                title: 'New transaction',
                amount: 50,
            })
        ])
        expect(listTransactionsResponse.statusCode).toEqual(200)
    })

    it('should be able to get a specific transaction', async () => {
        const createTransactionResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 50,
                type: 'credit'
            })

        const cookies = createTransactionResponse.get('Set-Cookie')

        const listTransactionsResponse = await request(app.server)
            .get('/transactions')
            .set('Cookie', cookies)
            .send()

        const transactionId = listTransactionsResponse.body.transactions[0].id

        const uniqueTransactionResponse = await request(app.server)
            .get('/transactions/' + transactionId)
            .set('Cookie', cookies)
            .send()

        expect(uniqueTransactionResponse.body.transaction).toEqual(
            expect.objectContaining({
                title: 'New transaction',
                amount: 50,
            })
        )
        expect(listTransactionsResponse.statusCode).toEqual(200)
    })

    it('should be able to get the summary', async () => {
        const createTransactionResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 500,
                type: 'credit'
            })

        const cookies = createTransactionResponse.get('Set-Cookie')

        await request(app.server)
            .post('/transactions')
            .set('Cookie', cookies)
            .send({
                title: 'Debit transaction',
                amount: 100,
                type: 'debit'
            })

        const summaryResponse = await request(app.server)
            .get('/transactions/summary')
            .set('Cookie', cookies)
            .send()

        expect(summaryResponse.body.summary).toEqual(
            { amount: 400 }
        )
        expect(summaryResponse.statusCode).toEqual(200)
    })
})

