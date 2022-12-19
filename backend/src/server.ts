import * as express from 'express'
import {Socket} from 'net'
import * as sqlite3 from 'sqlite3'
import {open} from 'sqlite'

(async () => {
    const server = express()
    const port = 8080

    server.use(express.json());
    server.use(express.urlencoded({ extended: true }));

    async function scanPort(host: string, port: number): Promise<[number, string]> {
        return new Promise((resolve, reject) => {
            const s = new Socket()

            s.on('connect', () => {
                resolve([port, 'open'])
            })

            s.on('timeout', () => {
                resolve([port, 'filtered'])
            })

            s.on('error', () => {
                resolve([port, 'closed'])
            })

            s.setTimeout(1000)
            s.connect(port, host)
        })
    }

    server.get('/status', (req: express.Request, res: express.Response) => {
        res.status(200).json({status: 'ok'})
    })

    server.post('/scan', async (req: express.Request, res: express.Response) => {
        const address = req.body.address
        const promises = []

        for (let p = 1; p <= 1024; p++) {
            promises.push(scanPort(address, p))
        }

        const responses = await Promise.allSettled(promises)
        const ports: {port: number, status: string}[] = []


        for (const resp of responses) {
            if (resp.status === 'rejected') {
                continue
            }

            const [port, status] = resp.value
            ports.push({port, status})
        }

        await db.run("INSERT INTO history (address, dateScanned) VALUES (:addr, datetime('now'))", {
            ':addr': address
        })

        ports.sort((a, b) => a.port - b.port)
        res.status(200).json({address, ports})
    })

    server.get('/history', async (req: express.Request, res: express.Response) => {
        const history = await db.all('SELECT address, dateScanned FROM history ORDER BY dateScanned DESC')
        res.status(200).json(history)
    })

    const db = await open({
        filename: 'pscan.db',
        driver: sqlite3.Database,
    })

    await db.exec('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT, dateScanned INTEGER)')

    server.listen(port, () => {
        return console.log(`listening at localhost:${port}`)
    })
})()