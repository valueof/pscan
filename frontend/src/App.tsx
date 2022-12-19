import React, { useEffect, useState } from 'react';
import './App.css';

function ServerStatus() {
  const [status, setStatus] = useState('not connected')

  useEffect(() => {
    const checkStatus = async () => {
      const resp = await fetch('/status', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      let st = '❌ not connected'
      if (resp.ok) {
        const data = await resp.json()
        if (data.status === 'ok') {
          st = '✅ connected'
        } else {
          st = '❌ unexpected response'
        }
      }

      setStatus(st)
    }

    checkStatus()
    const iv = setInterval(checkStatus, 5000)
    return () => {
      clearInterval(iv)
    }
  }, [])

  return <span className="App-status">{status}</span>
}

function History() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    const fetchHistory = async () => {
      const resp = await fetch('/history', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!resp.ok) {
        console.error('/history failed')
        return
      }

      const data = await resp.json()
      setHistory(data)
    }

    fetchHistory()
    const iv = setInterval(fetchHistory, 5000)
    return () => {
      clearInterval(iv)
    }
  }, [])

  if (history.length === 0) {
    return null
  }

  return (
    <div className="App-history">
      <h4>previous scans</h4>
      <ul>
        {history.map((action: Action) => (
          <li key={action.dateScanned}>{action.address} ({action.dateScanned})</li>
        ))}
      </ul>
    </div>
  )
}

type ScanResultsProps = {
  results: {
    address: string,
    ports: {
      port: number,
      status: string,
    }[]
  }
}

function ScanResults({results}: ScanResultsProps) {
  const address = results.address
  const ports = results.ports

  if (ports.length === 0) {
    return null
  }

  let closed = 0
  const open: {port: number, status: string}[] = []

  for (let p of ports) {
    if (p.status === 'closed') {
      closed = closed + 1
      continue
    }

    open.push({
      port: p.port,
      status: p.status,
    })
  }

  return (
    <div className="App-results">
      <div>showing results for <strong>{address}</strong></div>
      <table>
        <tbody>
          {open.map((p: {port: number, status: string}) => (
            <tr key={p.port}>
              <td className="port">{address}:{p.port}</td>
              <td className={`status status--${p.status}`}>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>not showing {closed} closed ports</div>
    </div>
  )
}

type Action = {
  address: string,
  dateScanned: string,
}

function App() {
    const [address, setAddress] = useState('')
    const [results, setResults] = useState({address: '', ports: []})

    const handleScan = async (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault()

      if (/^\s*$/.test(address)) {
        alert('no address')
        return
      }

      const resp = await fetch('/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({address})
      })

      if (!resp.ok) {
        console.error('/scan failed')
        return
      }

      const results = await resp.json()
      setResults(results)
    }

    return (
      <div className="App">
        <header className="App-header">
          <h1>pscan: toy port scanner</h1>
          <ServerStatus />
        </header>

        <div className="App-contents">
          <form className="App-form" onSubmit={handleScan}>
            <label htmlFor="address">address:</label>
            <input type="text" value={address} size={42} placeholder="scanme.nmap.org"
              onChange={(ev) => setAddress(ev.target.value)} />
            <button type="submit">scan</button>
          </form>

          <ScanResults results={results} />
          <History />
        </div>
      </div>
    )
}

export default App;
