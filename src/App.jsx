import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { SessionPage } from './pages/Session';
import { SessionLive } from './pages/SessionLive';
import { Planner } from './pages/Planner';
import { Diet } from './pages/Diet';
import { Body } from './pages/Body';
import { Log } from './pages/Log';
import { Analytics } from './pages/Analytics';

export default function App() {
  return (
    <BrowserRouter basename="/Gymtracker-app">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/session/:id" element={<SessionLive />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/diet" element={<Diet />} />
          <Route path="/body" element={<Body />} />
          <Route path="/log" element={<Log />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
