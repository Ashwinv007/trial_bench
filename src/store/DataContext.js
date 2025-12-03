import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, getDoc, doc, query, where, orderBy, documentId } from 'firebase/firestore';
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
  const [clientProfiles, setClientProfiles] = useState({});

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

  const prefetchClientProfile = useCallback(async (clientId) => {
    if (!clientId || clientProfiles[clientId]?.loading || clientProfiles[clientId]?.fetchedAt) {
        return;
    }

    if (!db || !hasPermission('leads:view')) {
        return;
    }

    setClientProfiles(prev => ({ ...prev, [clientId]: { loading: true } }));

    try {
        const clientDocRef = doc(db, 'leads', clientId);
        const clientDocSnap = await getDoc(clientDocRef);

        if (clientDocSnap.exists()) {
            const clientData = { id: clientDocSnap.id, ...clientDocSnap.data() };
            setClientProfiles(prev => ({
                ...prev,
                [clientId]: {
                    ...prev[clientId],
                    loading: true,
                    client: clientData
                }
            }));

            const promises = {};
            if (hasPermission('agreements:view')) {
                const agreementsQuery = query(collection(db, 'agreements'), where('leadId', '==', clientId));
                promises.agreements = getDocs(agreementsQuery);
            }
            if (hasPermission('members:view')) {
                const primaryMembersQuery = query(collection(db, 'members'), where('leadId', '==', clientId));
                promises.members = getDocs(primaryMembersQuery);
            }

            // Using await Promise.allSettled to avoid failing all if one promise rejects
            const results = await Promise.allSettled(Object.values(promises));
            const resolvedPromises = Object.keys(promises).reduce((acc, key, index) => {
                if (results[index].status === 'fulfilled') {
                    acc[key] = results[index].value;
                }
                return acc;
            }, {});

            let clientAgreementsData = [];
            if (resolvedPromises.agreements) {
                clientAgreementsData = resolvedPromises.agreements.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            let clientInvoicesData = [];
            if (hasPermission('invoices:view') && clientAgreementsData.length > 0) {
                const agreementIds = clientAgreementsData.map(a => a.id);
                if (agreementIds.length > 0) {
                    const invoicesQuery = query(collection(db, 'invoices'), where('agreementId', 'in', agreementIds));
                    const invoicesSnapshot = await getDocs(invoicesQuery);
                    clientInvoicesData = invoicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                }
            }

            let uniqueMembers = [];
            if (resolvedPromises.members) {
                 const primaryMembers = resolvedPromises.members.docs.map(d => ({ id: d.id, ...d.data() }));
                 const subMemberIds = primaryMembers.flatMap(member => member.subMembers || []).filter(Boolean);

                 if (subMemberIds.length > 0) {
                     const chunks = [];
                     for (let i = 0; i < subMemberIds.length; i += 30) {
                         chunks.push(subMemberIds.slice(i, i + 30));
                     }
                     const subMemberPromises = chunks.map(chunk => getDocs(query(collection(db, 'members'), where(documentId(), 'in', chunk))));
                     const subMemberSnapshots = await Promise.all(subMemberPromises);
                     const subMembers = subMemberSnapshots.flatMap(snapshot => snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                     const allRelatedMembers = [...primaryMembers, ...subMembers];
                     uniqueMembers = Array.from(new Map(allRelatedMembers.map(m => [m.id, m])).values());
                 } else {
                     uniqueMembers = primaryMembers;
                 }
                 
                 uniqueMembers.sort((a, b) => {
                     if (a.primary && !b.primary) return -1;
                     if (!a.primary && b.primary) return 1;
                     return (a.name || '').localeCompare(b.name || '');
                 });
            }

            setClientProfiles(prev => ({
                ...prev,
                [clientId]: {
                    ...prev[clientId],
                    loading: false,
                    agreements: clientAgreementsData,
                    invoices: clientInvoicesData,
                    members: uniqueMembers,
                    fetchedAt: Date.now()
                }
            }));

        } else {
            setClientProfiles(prev => ({ ...prev, [clientId]: { loading: false, error: 'Not Found' } }));
        }
    } catch (error) {
        console.error("Error prefetching client data:", error);
        setClientProfiles(prev => ({ ...prev, [clientId]: { loading: false, error: error.message } }));
    }
  }, [clientProfiles, hasPermission]);

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
        
        if (leadIds.length === 0) {
            setAgreements(agreementsData);
            return;
        }

        const leadPromises = leadIds.map(id => getDoc(doc(db, 'leads', id)));
        const leadSnapshots = await Promise.all(leadPromises);
        const leadsMap = new Map(leadSnapshots.map(snap => [snap.id, snap.data()]).filter(data => data[1]));

        const combinedData = agreementsData.map(agreement => {
            const leadData = leadsMap.get(agreement.leadId);
            return leadData ? { ...leadData, ...agreement, id: agreement.id } : agreement;
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
    refreshData,
    clientProfiles,
    prefetchClientProfile
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
