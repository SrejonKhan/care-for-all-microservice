import { useState, useEffect } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function App() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch gateway health on mount
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch health:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Care For All - Admin Panel</h1>
        <p className="subtitle">Donation Platform Management</p>
      </header>

      <main className="main">
        <section className="card">
          <h2>🚧 Work in Progress</h2>
          <p>
            This is a placeholder admin panel. The backend microservices are
            fully scaffolded and ready for implementation.
          </p>
        </section>

        <section className="card">
          <h3>Gateway Status</h3>
          {loading ? (
            <p>Loading...</p>
          ) : health ? (
            <div className="status-grid">
              <div>
                <strong>Status:</strong> {health.status}
              </div>
              <div>
                <strong>Service:</strong> {health.service}
              </div>
              <div>
                <strong>Version:</strong> {health.version}
              </div>
              <div>
                <strong>Uptime:</strong> {Math.floor(health.uptime)}s
              </div>
            </div>
          ) : (
            <p className="error">Failed to connect to gateway</p>
          )}
        </section>

        <section className="card">
          <h3>Available Services</h3>
          <ul className="services-list">
            <li>✅ Gateway (API Gateway)</li>
            <li>✅ Auth Service (Authentication)</li>
            <li>✅ Campaign Service (Campaign CRUD)</li>
            <li>✅ Pledge Service (Pledge State Machine)</li>
            <li>✅ Payment Service (Payment Processing)</li>
            <li>✅ Totals Service (Campaign Totals)</li>
            <li>✅ Chat Service (Real-time Chat)</li>
          </ul>
        </section>

        <section className="card">
          <h3>Quick Links</h3>
          <div className="links-grid">
            <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer">
              📚 API Documentation
            </a>
            <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">
              📊 Grafana Dashboard
            </a>
            <a href="http://localhost:16686" target="_blank" rel="noopener noreferrer">
              🔍 Jaeger Tracing
            </a>
            <a href="http://localhost:5601" target="_blank" rel="noopener noreferrer">
              📋 Kibana Logs
            </a>
            <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer">
              📈 Prometheus
            </a>
            <a href="http://localhost:15672" target="_blank" rel="noopener noreferrer">
              🐰 RabbitMQ UI
            </a>
          </div>
        </section>

        <section className="card">
          <h3>TODO: Implement Business Logic</h3>
          <ul>
            <li>Campaign management UI</li>
            <li>Pledge and payment tracking</li>
            <li>User management</li>
            <li>Real-time chat interface</li>
            <li>Analytics dashboard</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>Care For All Microservices Platform - Hackathon 2025</p>
      </footer>
    </div>
  );
}

export default App;

