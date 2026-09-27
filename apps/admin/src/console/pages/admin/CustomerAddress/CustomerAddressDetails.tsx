import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getCustomerAddressById,
  deleteCustomerAddress,
  CustomerAddressResponseDto,
  CUSTOMER_ADDRESS_UPDATED_EVENT,
} from '@/services/customerAddressService';

export const CustomerAddressDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { justCreated?: boolean; justUpdated?: boolean } };

  const [item, setItem] = useState<CustomerAddressResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState(
    location.state?.justCreated ? 'Address created.' : location.state?.justUpdated ? 'Address updated.' : ''
  );

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const data = await getCustomerAddressById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setError(err?.message || 'Could not load address from the API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (banner) {
      const t = setTimeout(() => setBanner(''), 3000);
      return () => clearTimeout(t);
    }
  }, [banner]);

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await deleteCustomerAddress(item.id);
      toast.success('Address deleted.');
      navigate('/admin/customer-addresses');
    } catch (err: any) {
      const msg = err?.message || 'Could not delete address.';
      setError(msg);
      toast.error(msg);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
        Loading address from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-lock me-1" /> This address belongs to another customer — you don't have permission
        to view it. <Link to="/admin/customer-addresses">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Address not found — it may have been deleted.{' '}
        <Link to="/admin/customer-addresses">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 820 }}>
      {banner && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2">
          <i className="fa-solid fa-circle-check" /> {banner}
        </div>
      )}
      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-exclamation me-1" /> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/customer-addresses" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-address-book text-info me-2" />
            Address Details
          </h1>
        </div>
        <div className="btn-group btn-group-sm">
          <Link to={`/admin/customer-addresses/edit/${item.id}`} className="btn btn-outline-primary">
            <i className="fa-solid fa-pen me-1" /> Edit
          </Link>
          <button type="button" className="btn btn-outline-danger" onClick={() => setShowDeleteModal(true)}>
            <i className="fa-solid fa-trash me-1" /> Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Label</span>
            <span className="fw-semibold">
              <i className="fa-solid fa-tag text-secondary me-1" /> {item.label}
            </span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Default Address</span>
            {item.isDefault ? (
              <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle">
                <i className="fa-solid fa-star me-1" /> Yes
              </span>
            ) : (
              <span className="text-muted">No</span>
            )}
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Customer Profile</span>
            <span className="font-monospace small">{item.customerProfileId}</span>
          </div>

          <div className="col-12">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Address Line</span>
            <span>
              <i className="fa-solid fa-location-dot text-secondary me-1" /> {item.addressLine}
            </span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">City</span>
            <span>{item.city}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">District</span>
            <span>{item.district}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Country</span>
            <span>{item.country}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Concurrency Token</span>
            <span className="badge text-bg-light border font-monospace">{item.rowVersion}</span>
          </div>

          <div className="col-12">
            <hr />
          </div>

          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Created: {new Date(item.createdAtUtc).toLocaleString()}
          </div>
          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Last Updated:{' '}
            {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" /> Delete Address
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete address <strong>{item.label}</strong> ({item.addressLine})? This is a soft delete.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin me-1" /> Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-trash me-1" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAddressDetails;
