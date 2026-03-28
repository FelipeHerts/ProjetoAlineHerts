import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Patient, Session, Payment, PatientPresentation, Prontuario } from '../types';

// ── Patients ──────────────────────────────────────────────
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name');
      if (error) throw error;
      setPatients(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createPatient = async (p: Omit<Patient, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('patients').insert(p).select().single();
    if (error) throw error;
    setPatients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updatePatient = async (id: string, p: Partial<Patient>) => {
    const { data, error } = await supabase.from('patients').update(p).eq('id', id).select().single();
    if (error) throw error;
    setPatients(prev => prev.map(x => x.id === id ? data : x));
    return data;
  };

  const deletePatient = async (id: string) => {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) throw error;
    setPatients(prev => prev.filter(x => x.id !== id));
  };

  return { patients, loading, error, refetch: fetch, createPatient, updatePatient, deletePatient };
}

// ── Sessions ──────────────────────────────────────────────
export function useSessions(patientId?: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('sessions').select('*, patient:patients(id,name)').order('date_time', { ascending: false });
      if (patientId) q = q.eq('patient_id', patientId);
      const { data } = await q;
      setSessions(data || []);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createSession = async (s: Omit<Session, 'id' | 'created_at' | 'patient'>) => {
    const { data, error } = await supabase.from('sessions').insert(s).select('*, patient:patients(id,name)').single();
    if (error) throw error;
    setSessions(prev => [data, ...prev]);
    return data;
  };

  const updateSession = async (id: string, s: Partial<Session>) => {
    const { data, error } = await supabase.from('sessions').update(s).eq('id', id).select('*, patient:patients(id,name)').single();
    if (error) throw error;
    setSessions(prev => prev.map(x => x.id === id ? data : x));
    return data;
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) throw error;
    setSessions(prev => prev.filter(x => x.id !== id));
  };

  return { sessions, loading, refetch: fetch, createSession, updateSession, deleteSession };
}

// ── Payments ──────────────────────────────────────────────
export function usePayments(patientId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('payments').select('*, patient:patients(id,name), session:sessions(id,date_time)').order('created_at', { ascending: false });
      if (patientId) q = q.eq('patient_id', patientId);
      const { data } = await q;
      setPayments(data || []);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime: atualiza automaticamente quando o webhook do MP altera um pagamento
  useEffect(() => {
    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments' },
        (payload) => {
          setPayments(prev => prev.map(p =>
            p.id === payload.new.id ? { ...p, ...payload.new } as Payment : p
          ));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const createPayment = async (p: Omit<Payment, 'id' | 'created_at' | 'patient' | 'session'>) => {
    const { data, error } = await supabase.from('payments').insert(p).select('*, patient:patients(id,name)').single();
    if (error) throw error;
    setPayments(prev => [data, ...prev]);
    return data;
  };

  const updatePayment = async (id: string, p: Partial<Payment>) => {
    const { data, error } = await supabase.from('payments').update(p).eq('id', id).select('*, patient:patients(id,name)').single();
    if (error) throw error;
    setPayments(prev => prev.map(x => x.id === id ? data : x));
    return data;
  };

  const deletePayment = async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
    setPayments(prev => prev.filter(x => x.id !== id));
  };

  return { payments, loading, refetch: fetch, createPayment, updatePayment, deletePayment };
}

// ── Prontuário ──────────────────────────────────────────────
export function useProntuario(patientId: string) {
  const [records, setRecords] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('prontuario').select('*').eq('patient_id', patientId).order('date', { ascending: false });
      setRecords(data || []);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createRecord = async (r: Omit<Prontuario, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('prontuario').insert(r).select().single();
    if (error) throw error;
    setRecords(prev => [data, ...prev]);
    return data;
  };

  const updateRecord = async (id: string, r: Partial<Prontuario>) => {
    const { data, error } = await supabase.from('prontuario').update(r).eq('id', id).select().single();
    if (error) throw error;
    setRecords(prev => prev.map(x => x.id === id ? data : x));
    return data;
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from('prontuario').delete().eq('id', id);
    if (error) throw error;
    setRecords(prev => prev.filter(x => x.id !== id));
  };

  return { records, loading, refetch: fetch, createRecord, updateRecord, deleteRecord };
}

// ── Presentation ──────────────────────────────────────────────
export function usePresentation(patientId: string) {
  const [presentation, setPresentation] = useState<PatientPresentation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('patient_presentation').select('*').eq('patient_id', patientId).maybeSingle();
      setPresentation(data);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (p: Partial<PatientPresentation>) => {
    if (presentation) {
      const { data, error } = await supabase.from('patient_presentation').update(p).eq('id', presentation.id).select().single();
      if (error) throw error;
      setPresentation(data);
      return data;
    } else {
      const { data, error } = await supabase.from('patient_presentation').insert({ ...p, patient_id: patientId }).select().single();
      if (error) throw error;
      setPresentation(data);
      return data;
    }
  };

  return { presentation, loading, save };
}
