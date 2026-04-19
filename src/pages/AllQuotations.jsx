import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, Search, Filter, Trash2, Copy, ArrowUpDown } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { SectionTitle, StatusChip, EmptyState } from '../components/ui.jsx';
import { formatINR, formatDate } from '../utils/format.js';
import { STATUS_OPTIONS } from '../data/defaultConfig.js';

const AllQuotations = () => {
  const { quotations, deleteQuotation, duplicateQuotation, showToast } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = [...quotations];
    if (statusFilter !== 'All') {
      list = list.filter((q) => q.status === statusFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.client?.fullName?.toLowerCase().includes(s) ||
          q.referenceNumber?.toLowerCase().includes(s) ||
          q.client?.address?.toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => {
      let va, vb;
      if (sortField === 'createdAt') {
        va = new Date(a.createdAt).getTime();
        vb = new Date(b.createdAt).getTime();
      } else if (sortField === 'value') {
        va = a.pricing?.grandTotal || 0;
        vb = b.pricing?.grandTotal || 0;
      } else if (sortField === 'name') {
        va = a.client?.fullName?.toLowerCase() || '';
        vb = b.client?.fullName?.toLowerCase() || '';
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      } else if (sortField === 'size') {
        va = a.system?.systemSizeKw || 0;
        vb = b.system?.systemSizeKw || 0;
      }
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [quotations, search, statusFilter, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleDuplicate = (e, id) => {
    e.stopPropagation();
    const copy = duplicateQuotation(id);
    if (copy) {
      showToast('Quotation duplicated');
      navigate(`/quotations/${copy.id}/edit`);
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this quotation? This cannot be undone.')) {
      deleteQuotation(id);
      showToast('Quotation deleted');
    }
  };

  const SortBtn = ({ field, children }) => (
    <button
      className="flex items-center gap-1 hover:text-navy-dark transition"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className="w-3 h-3 opacity-50" />
    </button>
  );

  return (
    <div>
      <SectionTitle
        title="All Quotations"
        subtitle={`${quotations.length} quotation${quotations.length !== 1 ? 's' : ''} total`}
        right={
          <button className="btn-primary" onClick={() => navigate('/quotations/new')}>
            <FilePlus2 className="w-5 h-5" /> New Quotation
          </button>
        }
      />

      {/* Search & filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Search by client name, reference, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cream-600" />
          {['All', ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-pill text-xs font-bold transition ${
                statusFilter === s
                  ? 'bg-navy-dark text-white'
                  : 'bg-white text-cream-600 border border-cream-200 hover:border-navy-dark'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No quotations found"
          description={search || statusFilter !== 'All' ? 'Try a different search or filter.' : 'Create your first quotation to see it here.'}
          action={
            !search && statusFilter === 'All' ? (
              <button className="btn-primary" onClick={() => navigate('/quotations/new')}>
                <FilePlus2 className="w-4 h-4" /> Create Quotation
              </button>
            ) : null
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cream-600 uppercase tracking-wider border-b border-cream-100">
                <th className="text-left px-6 py-3 font-semibold">
                  <SortBtn field="name">Client</SortBtn>
                </th>
                <th className="text-left px-6 py-3 font-semibold">
                  <SortBtn field="createdAt">Date</SortBtn>
                </th>
                <th className="text-left px-6 py-3 font-semibold">
                  <SortBtn field="size">System</SortBtn>
                </th>
                <th className="text-right px-6 py-3 font-semibold">
                  <SortBtn field="value">Value</SortBtn>
                </th>
                <th className="text-center px-6 py-3 font-semibold">Status</th>
                <th className="text-right px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-cream-100 hover:bg-cream-100/40 cursor-pointer transition"
                  onClick={() => navigate(`/quotations/${q.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-navy-dark">{q.client?.fullName || '—'}</div>
                    <div className="text-xs text-cream-600 mt-0.5">{q.referenceNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-cream-800">{formatDate(q.createdAt)}</td>
                  <td className="px-6 py-4 text-cream-800">
                    {q.system?.systemSizeKw ? `${q.system.systemSizeKw} kW` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-heading font-bold text-navy-dark">
                    {formatINR(q.pricing?.grandTotal || 0)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusChip status={q.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-2 rounded hover:bg-cream-100 text-cream-600 hover:text-navy-dark transition"
                        title="Duplicate"
                        onClick={(e) => handleDuplicate(e, q.id)}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded hover:bg-rose-50 text-cream-600 hover:text-rose-600 transition"
                        title="Delete"
                        onClick={(e) => handleDelete(e, q.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllQuotations;
