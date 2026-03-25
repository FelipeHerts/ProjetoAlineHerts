
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import PacienteDetalhe from './pages/PacienteDetalhe';
import Agenda from './pages/Agenda';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="pacientes/:id" element={<PacienteDetalhe />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
