import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, getDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { AuthContext } from './Context';

export const DataContext = createContext();

export const useData = () => {
    return useContext(DataContext);
}

export const DataProvider = ({ children }) => {
  const { user, hasPermission } = useContext(AuthContext);

  // States for data
  const [leads, setLeads] = useState([]);
  const [members, setMembers] = useState([]);
  const [pastMembers, setPastMembers] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [clients, setClients] = useState([]);

  // States for loading status
  const [loading, setLoading] = useState({
    leads: true,
    members: true,
    pastMembers: true,
    agreements: true,
    invoices: true,
    expenses: true,
    clients: true,
  });

  const [refreshing, setRefreshing] = useState({
    leads: false,
    members: false,
    pastMembers: false,
    agreements: false,
    invoices: false,
    expenses: false,
    clients: false,
  });

  const fetchData = useCallback(async (collectionName, setter, permissionKey, loadingKey, queryConstraints = []) => {
    if (!db || !hasPermission(permissionKey)) {
        setLoading(prev => ({ ...prev, [loadingKey]: false }));
        setRefreshing(prev => ({ ...prev, [loadingKey]: false }));
        return;
    }
    setRefreshing(prev => ({ ...prev, [loadingKey]: true }));
    try {
        const collRef = collection(db, collectionName);
        const q = query(collRef, ...queryConstraints);
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data);
    } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
    } finally {
        setLoading(prev => ({ ...prev, [loadingKey]: false }));
        setRefreshing(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [hasPermission]);

  const fetchAgreementsWithLeads = useCallback(async () => {
    if (!db || !hasPermission('agreements:view')) {
      setLoading(prev => ({ ...prev, agreements: false }));
      return;
    }
    setRefreshing(prev => ({ ...prev, agreements: true }));
    try {
        const agreementsSnapshot = await getDocs(collection(db, 'agreements'));
        const agreementsData = agreementsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const leadIds = [...new Set(agreementsData.map(a => a.leadId).filter(Boolean))];
        const leadPromises = leadIds.map(id => getDoc(doc(db, 'leads', id)));
        const leadSnapshots = await Promise.all(leadPromises);
        const leadsMap = new Map(leadSnapshots.map(snap => [snap.id, snap.data()]).filter(data => data[1]));

        const combinedData = agreementsData.map(agreement => {
            const leadData = leadsMap.get(agreement.leadId);
            return leadData ? { ...leadData, ...agreement } : agreement;
        });

        setAgreements(combinedData);
    } catch (error) {
        console.error("Error fetching agreements with leads:", error);
    } finally {
        setLoading(prev => ({ ...prev, agreements: false }));
        setRefreshing(prev => ({ ...prev, agreements: false }));
    }
  }, [hasPermission]);

  useEffect(() => {
    if (user) {
        fetchData('leads', setLeads, 'leads:view', 'leads', [orderBy('createdAt', 'desc')]);
        fetchData('members', setMembers, 'members:view', 'members', [orderBy('name')]);
        fetchData('past_members', setPastMembers, 'past_members:view', 'pastMembers', [orderBy('removedAt', 'desc')]);
        fetchData('invoices', setInvoices, 'invoices:view', 'invoices', [orderBy('createdAt', 'desc')]);
        fetchData('expenses', setExpenses, 'expenses:view', 'expenses');
        fetchData('expense_categories', setExpenseCategories, 'expenses:view', 'expenses');
        fetchAgreementsWithLeads();
    }
  }, [user, hasPermission, fetchData, fetchAgreementsWithLeads]);

  useEffect(() => {
    if (leads.length > 0) {
        setLoading(prev => ({...prev, clients: true}));
        const clientData = leads.filter(lead => lead.status === 'Converted');
        setClients(clientData);
        setLoading(prev => ({...prev, clients: false}));
    }
  }, [leads]);

  const refreshData = useCallback((dataType) => {
    switch(dataType) {
      case 'leads':
        fetchData('leads', setLeads, 'leads:view', 'leads', [orderBy('createdAt', 'desc')]);
        break;
      case 'members':
        fetchData('members', setMembers, 'members:view', 'members', [orderBy('name')]);
        break;
      case 'pastMembers':
        fetchData('past_members', setPastMembers, 'past_members:view', 'pastMembers', [orderBy('removedAt', 'desc')]);
        break;
      case 'invoices':
        fetchData('invoices', setInvoices, 'invoices:view', 'invoices', [orderBy('createdAt', 'desc')]);
        break;
      case 'expenses':
        fetchData('expenses', setExpenses, 'expenses:view', 'expenses');
        fetchData('expense_categories', setExpenseCategories, 'expenses:view', 'expenses');
        break;
      case 'agreements':
        fetchAgreementsWithLeads();
        break;
      default:
        console.warn(`Unknown data type to refresh: ${dataType}`);
    }
  }, [fetchData, fetchAgreementsWithLeads]);

  const value = {
    leads,
    setLeads,
    members,
    setMembers,
    pastMembers,
    setPastMembers,
    agreements,
    setAgreements,
    invoices,
    setInvoices,
    expenses,
    setExpenses,
    expenseCategories,
    setExpenseCategories,
    clients,
    setClients,
    loading,
    refreshing,
    refreshData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
